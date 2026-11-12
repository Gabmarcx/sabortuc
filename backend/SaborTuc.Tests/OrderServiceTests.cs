using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using SaborTuc.Api.Data;
using SaborTuc.Api.Dtos;
using SaborTuc.Api.Models;
using SaborTuc.Api.Services;
using Xunit;

namespace SaborTuc.Tests;

/// <summary>Geo falso: devuelve siempre la misma distancia.</summary>
public class FakeGeo : IGeoService
{
    public double Km { get; set; } = 3;
    public Task<RouteEstimate> EstimateAsync(double originLat, double originLng, string street, string number, string neighborhood, CancellationToken ct = default) =>
        Task.FromResult(new RouteEstimate(Km, 10, "test"));
}

/// <summary>Pasarela que siempre falla (para probar la caída de la API externa).</summary>
public class FailingGateway : IPaymentGateway
{
    public Task<PaymentInit> CreatePaymentAsync(Order order, CancellationToken ct = default) =>
        throw new PaymentGatewayException("pasarela caída");
    public Task<PaymentInfo?> GetPaymentAsync(string paymentId, CancellationToken ct = default) =>
        throw new PaymentGatewayException("pasarela caída");
}

/// <summary>Stub determinista para probar reglas de pedidos sin depender de Mercado Pago.</summary>
public class StubPaymentGateway : IPaymentGateway
{
    private readonly Dictionary<string, (string OrderId, string Status)> _payments = new();

    public Task<PaymentInit> CreatePaymentAsync(Order order, CancellationToken ct = default)
    {
        var reference = "TEST-" + Guid.NewGuid().ToString("N")[..8];
        _payments[reference] = (order.Id, PaymentStatuses.Pendiente);
        return Task.FromResult(new PaymentInit(reference, "https://payments.test/checkout", PaymentStatuses.Pendiente));
    }

    public Task<PaymentInfo?> GetPaymentAsync(string paymentId, CancellationToken ct = default) =>
        Task.FromResult(_payments.TryGetValue(paymentId, out var payment)
            ? new PaymentInfo(payment.OrderId, payment.Status)
            : null);

    public bool SetStatus(string paymentId, string status)
    {
        if (!_payments.TryGetValue(paymentId, out var payment)) return false;
        _payments[paymentId] = (payment.OrderId, status);
        return true;
    }
}

public class OrderServiceTests : IDisposable
{
    private readonly SqliteConnection _conn;
    private readonly AppDbContext _db;
    private readonly FakeGeo _geo = new();
    private readonly StubPaymentGateway _gateway = new();
    private readonly OrderService _svc;

    public OrderServiceTests()
    {
        _conn = new SqliteConnection("DataSource=:memory:");
        _conn.Open();
        _db = new AppDbContext(new DbContextOptionsBuilder<AppDbContext>().UseSqlite(_conn).Options);
        _db.Database.EnsureCreated();

        _db.Restaurants.Add(new Restaurant
        {
            Id = "r1", Name = "Resto Uno", IsOpen = true, DeliveryFee = 500, MinOrder = 1000,
            EstimatedDeliveryTime = "30-40 min",
            Products =
            {
                new Product { Id = "p1", RestaurantId = "r1", Name = "Empanadas", Price = 1500, Available = true },
                new Product { Id = "p2", RestaurantId = "r1", Name = "Locro", Price = 2000, Available = false },
                new Product { Id = "p3", RestaurantId = "r1", Name = "Gaseosa", Price = 300, Available = true },
            },
        });
        _db.Restaurants.Add(new Restaurant { Id = "r2", Name = "Resto Cerrado", IsOpen = false, MinOrder = 0, Products = { new Product { Id = "c1", RestaurantId = "r2", Name = "X", Price = 100 } } });
        _db.SaveChanges();

        _svc = Build(_gateway);
    }

    private OrderService Build(IPaymentGateway gateway) =>
        new(_db, _geo, gateway, Options.Create(new BusinessOptions()), NullLogger<OrderService>.Instance);

    private static CreateOrderRequest Request(string restaurantId, string paymentMethod, params (string Product, int Qty)[] items) => new()
    {
        Customer = new CustomerDto { Name = "Ana", Phone = "381123456", Email = "ana@test.com" },
        DeliveryAddress = new DeliveryAddressDto { Street = "Muñecas", Number = "100", Neighborhood = "Centro" },
        RestaurantId = restaurantId,
        PaymentMethod = paymentMethod,
        Items = items.Select(i => new CreateOrderItemRequest { ProductId = i.Product, Quantity = i.Qty }).ToList(),
    };

    [Fact]
    public async Task Create_CalculaTotalesEnElServidor()
    {
        var order = await _svc.CreateAsync(Request("r1", PaymentMethods.EfectivoEntrega, ("p1", 2)));

        Assert.Equal(3000m, order.Subtotal);
        Assert.Equal(500m, order.DeliveryFee);
        Assert.Equal(450m, order.ServiceFee);
        Assert.Equal(3950m, order.Total);
        Assert.Equal(OrderStatuses.Recibido, order.Status);
        Assert.Equal(PaymentStatuses.Pendiente, order.PaymentStatus);
        Assert.Null(order.PaymentUrl); // efectivo: no pasa por la pasarela
    }

    [Fact]
    public async Task Create_RestauranteCerrado_Devuelve409()
    {
        var ex = await Assert.ThrowsAsync<OrderException>(() => _svc.CreateAsync(Request("r2", PaymentMethods.EfectivoEntrega, ("c1", 1))));
        Assert.Equal(409, ex.StatusCode);
    }

    [Fact]
    public async Task Create_ProductoNoDisponible_Devuelve409()
    {
        var ex = await Assert.ThrowsAsync<OrderException>(() => _svc.CreateAsync(Request("r1", PaymentMethods.EfectivoEntrega, ("p2", 1))));
        Assert.Equal(409, ex.StatusCode);
    }

    [Fact]
    public async Task Create_BajoElPedidoMinimo_Devuelve422()
    {
        var ex = await Assert.ThrowsAsync<OrderException>(() => _svc.CreateAsync(Request("r1", PaymentMethods.EfectivoEntrega, ("p3", 1))));
        Assert.Equal(422, ex.StatusCode);
    }

    [Fact]
    public async Task Create_FueraDelRadioDeEntrega_Devuelve422()
    {
        _geo.Km = 40;
        var ex = await Assert.ThrowsAsync<OrderException>(() => _svc.CreateAsync(Request("r1", PaymentMethods.EfectivoEntrega, ("p1", 1))));
        Assert.Equal(422, ex.StatusCode);
    }

    [Fact]
    public async Task Create_PagoOnline_CreaElPagoEnLaPasarela()
    {
        var order = await _svc.CreateAsync(Request("r1", PaymentMethods.MercadoPago, ("p1", 1)));

        Assert.StartsWith("TEST-", order.PaymentReference);
        Assert.False(string.IsNullOrEmpty(order.PaymentUrl));
        Assert.Equal(PaymentStatuses.Pendiente, order.PaymentStatus);
    }

    [Fact]
    public async Task PagoOnline_NoSeConfirmaHastaQueLaPasarelaLoApruebe()
    {
        var order = await _svc.CreateAsync(Request("r1", PaymentMethods.TarjetaOnline, ("p1", 1)));

        var ex = await Assert.ThrowsAsync<OrderException>(() => _svc.AdvanceAsync(order.Id));
        Assert.Equal(409, ex.StatusCode);

        // la pasarela aprueba el pago y nos avisa por el webhook
        _gateway.SetStatus(order.PaymentReference!, PaymentStatuses.Aprobado);
        await _svc.HandlePaymentNotificationAsync(order.PaymentReference!);

        var confirmed = await _svc.GetAsync(order.Id);
        Assert.Equal(PaymentStatuses.Aprobado, confirmed!.PaymentStatus);
        Assert.Equal(OrderStatuses.Confirmado, confirmed.Status);
    }

    [Fact]
    public async Task PagoRechazado_CancelaElPedido()
    {
        var order = await _svc.CreateAsync(Request("r1", PaymentMethods.MercadoPago, ("p1", 1)));

        _gateway.SetStatus(order.PaymentReference!, PaymentStatuses.Rechazado);
        await _svc.HandlePaymentNotificationAsync(order.PaymentReference!);

        var updated = await _svc.GetAsync(order.Id);
        Assert.Equal(PaymentStatuses.Rechazado, updated!.PaymentStatus);
        Assert.Equal(OrderStatuses.Cancelado, updated.Status);
    }

    [Fact]
    public async Task PasarelaCaida_CancelaElPedidoYDevuelve502()
    {
        var svc = Build(new FailingGateway());

        var ex = await Assert.ThrowsAsync<OrderException>(() => svc.CreateAsync(Request("r1", PaymentMethods.MercadoPago, ("p1", 1))));
        Assert.Equal(502, ex.StatusCode);

        var orders = await svc.ListAsync("ana@test.com");
        Assert.Single(orders);
        Assert.Equal(OrderStatuses.Cancelado, orders[0].Status);
    }

    [Theory]
    [InlineData("approved", PaymentStatuses.Aprobado)]
    [InlineData("PAID", PaymentStatuses.Aprobado)]
    [InlineData("rejected", PaymentStatuses.Rechazado)]
    [InlineData("failed", PaymentStatuses.Rechazado)]
    [InlineData("in_process", PaymentStatuses.Pendiente)]
    [InlineData(null, PaymentStatuses.Pendiente)]
    public void MapStatus_TraduceLosEstadosDeLaPasarela(string? raw, string expected) =>
        Assert.Equal(expected, ExternalPaymentGateway.MapStatus(raw));

    public void Dispose()
    {
        _db.Dispose();
        _conn.Dispose();
    }
}
