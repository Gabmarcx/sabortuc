using System.Security.Cryptography;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using SaborTuc.Api.Data;
using SaborTuc.Api.Dtos;
using SaborTuc.Api.Models;

namespace SaborTuc.Api.Services;

public class BusinessOptions
{
    public decimal ServiceFee { get; set; } = 450;
    public double MaxDeliveryKm { get; set; } = 15;
}

/// <summary>Error de regla de negocio; el controller lo traduce a un código HTTP.</summary>
public class OrderException : Exception
{
    public int StatusCode { get; }
    public OrderException(int statusCode, string message) : base(message) => StatusCode = statusCode;
}

public class OrderService
{
    private readonly AppDbContext _db;
    private readonly IGeoService _geo;
    private readonly IPaymentGateway _payments;
    private readonly BusinessOptions _biz;
    private readonly ILogger<OrderService> _log;

    public OrderService(AppDbContext db, IGeoService geo, IPaymentGateway payments,
        IOptions<BusinessOptions> biz, ILogger<OrderService> log)
    {
        _db = db; _geo = geo; _payments = payments; _biz = biz.Value; _log = log;
    }

    private IQueryable<Order> OrdersWithDetails() =>
        _db.Orders.Include(o => o.Items).Include(o => o.History);

    // ---------- Consultas ----------

    // Consulta interna usada por las pruebas; no se expone como endpoint público.
    public async Task<List<Order>> ListAsync(string? email)
    {
        var q = OrdersWithDetails().AsNoTracking();
        if (!string.IsNullOrWhiteSpace(email))
        {
            var e = email.Trim().ToLower();
            q = q.Where(o => o.CustomerEmail.ToLower() == e);
        }
        var list = await q.ToListAsync();
        return list.OrderByDescending(o => o.CreatedAt).ToList();
    }

    public Task<Order?> GetAsync(string id) => OrdersWithDetails().FirstOrDefaultAsync(o => o.Id == id);

    public async Task<OrderQuoteResponse> QuoteAsync(string restaurantId, OrderQuoteRequest req, CancellationToken ct = default)
    {
        if (req.Items.Count == 0 || req.Items.Any(i => i.Quantity <= 0 || i.Quantity > 50))
            throw new OrderException(400, "La cotización debe incluir productos con cantidad entre 1 y 50.");

        var restaurant = await _db.Restaurants.Include(r => r.Products).AsNoTracking()
            .FirstOrDefaultAsync(r => r.Id == restaurantId, ct);
        if (restaurant is null) throw new OrderException(404, "El restaurante no existe.");

        var quote = new OrderQuoteResponse
        {
            RestaurantOpen = restaurant.IsOpen,
            DeliveryFee = restaurant.DeliveryFee,
            ServiceFee = _biz.ServiceFee,
            MinimumOrder = restaurant.MinOrder,
        };

        foreach (var line in req.Items)
        {
            var product = restaurant.Products.FirstOrDefault(p => p.Id == line.ProductId);
            if (product is null || !product.Available)
            {
                quote.UnavailableProducts.Add(line.ProductId);
                continue;
            }
            quote.VerifiedPrices[line.ProductId] = product.Price;
            quote.Subtotal += product.Price * line.Quantity;
        }

        quote.MeetsMinimum = quote.Subtotal >= quote.MinimumOrder;
        quote.Available = quote.RestaurantOpen && quote.UnavailableProducts.Count == 0 && quote.MeetsMinimum;
        quote.Total = quote.Subtotal + quote.DeliveryFee + quote.ServiceFee;
        return quote;
    }

    public async Task<bool> HasAccessAsync(string id, string token, CancellationToken ct = default)
    {
        var storedHash = await _db.Orders.AsNoTracking().Where(o => o.Id == id)
            .Select(o => o.AccessTokenHash).FirstOrDefaultAsync(ct);
        if (storedHash is null || string.IsNullOrWhiteSpace(token)) return false;
        var suppliedHash = Convert.ToHexString(SHA256.HashData(System.Text.Encoding.UTF8.GetBytes(token)));
        return CryptographicOperations.FixedTimeEquals(
            System.Text.Encoding.ASCII.GetBytes(storedHash), System.Text.Encoding.ASCII.GetBytes(suppliedHash));
    }

    // ---------- Creación ----------

    public async Task<Order> CreateAsync(CreateOrderRequest req, CancellationToken ct = default)
    {
        // 1) Validación de entrada
        if (string.IsNullOrWhiteSpace(req.Customer.Name) || string.IsNullOrWhiteSpace(req.Customer.Phone))
            throw new OrderException(400, "El nombre y el teléfono del cliente son obligatorios.");
        if (string.IsNullOrWhiteSpace(req.DeliveryAddress.Street) || string.IsNullOrWhiteSpace(req.DeliveryAddress.Number))
            throw new OrderException(400, "La dirección de entrega (calle y número) es obligatoria.");
        if (req.Items.Count == 0 || req.Items.Any(i => i.Quantity <= 0 || i.Quantity > 50))
            throw new OrderException(400, "El pedido debe tener al menos un producto con cantidad entre 1 y 50.");
        if (!PaymentMethods.All.Contains(req.PaymentMethod))
            throw new OrderException(400, "Medio de pago inválido.");

        // 2) Restaurante y productos desde la base de datos (fuente de verdad de precios)
        var restaurant = await _db.Restaurants.Include(r => r.Products)
            .FirstOrDefaultAsync(r => r.Id == req.RestaurantId, ct)
            ?? throw new OrderException(404, "El restaurante no existe.");
        if (!restaurant.IsOpen)
            throw new OrderException(409, $"{restaurant.Name} no está recibiendo pedidos en este momento.");

        var lines = new List<OrderItem>();
        var unavailable = new List<string>();
        foreach (var line in req.Items)
        {
            var p = restaurant.Products.FirstOrDefault(x => x.Id == line.ProductId);
            if (p is null || !p.Available) { unavailable.Add(line.ProductId); continue; }
            lines.Add(new OrderItem { ProductId = p.Id, Name = p.Name, Price = p.Price, Quantity = line.Quantity, Notes = line.Notes?.Trim() });
        }
        if (unavailable.Count > 0)
            throw new OrderException(409, $"Productos no disponibles: {string.Join(", ", unavailable)}.");

        var subtotal = lines.Sum(l => l.Price * l.Quantity);
        if (subtotal < restaurant.MinOrder)
            throw new OrderException(422, $"El pedido mínimo de {restaurant.Name} es ${restaurant.MinOrder:N0}.");

        // 3) API de mapas: distancia restaurante -> cliente
        var route = await _geo.EstimateAsync(restaurant.Latitude, restaurant.Longitude,
            req.DeliveryAddress.Street, req.DeliveryAddress.Number, req.DeliveryAddress.Neighborhood, ct);
        if (route.DistanceKm > _biz.MaxDeliveryKm)
            throw new OrderException(422, $"La dirección está a {route.DistanceKm:0.#} km; el máximo de entrega es {_biz.MaxDeliveryKm:0.#} km.");

        // 4) Armado del pedido (totales calculados en el servidor)
        var order = new Order
        {
            Id = await NextOrderIdAsync(ct),
            AccessToken = Convert.ToBase64String(RandomNumberGenerator.GetBytes(32)).TrimEnd('=').Replace('+', '-').Replace('/', '_'),
            CustomerName = req.Customer.Name.Trim(),
            CustomerPhone = req.Customer.Phone.Trim(),
            CustomerEmail = req.Customer.Email?.Trim() ?? "",
            AddressAlias = string.IsNullOrWhiteSpace(req.DeliveryAddress.Alias) ? "Dirección de pedido" : req.DeliveryAddress.Alias,
            Street = req.DeliveryAddress.Street.Trim(),
            Number = req.DeliveryAddress.Number.Trim(),
            Apartment = req.DeliveryAddress.Apartment?.Trim(),
            Neighborhood = req.DeliveryAddress.Neighborhood,
            Instructions = req.DeliveryAddress.Instructions?.Trim(),
            RestaurantId = restaurant.Id,
            RestaurantName = restaurant.Name,
            Subtotal = subtotal,
            DeliveryFee = restaurant.DeliveryFee,
            ServiceFee = _biz.ServiceFee,
            Discount = 0,
            PaymentMethod = req.PaymentMethod,
            PaymentStatus = PaymentStatuses.Pendiente,
            Status = OrderStatuses.Recibido,
            CreatedAt = DateTime.UtcNow,
            EstimatedDeliveryTime = restaurant.EstimatedDeliveryTime,
            DistanceKm = route.DistanceKm,
            RouteDurationMin = route.DurationMin,
            Items = lines,
        };
        order.AccessTokenHash = Convert.ToHexString(SHA256.HashData(System.Text.Encoding.UTF8.GetBytes(order.AccessToken)));
        order.Total = order.Subtotal + order.DeliveryFee + order.ServiceFee - order.Discount;
        order.History.Add(new OrderStatusHistory
        {
            Status = OrderStatuses.Recibido,
            Timestamp = order.CreatedAt,
            Description = $"Pedido ingresado con éxito en el sistema de {restaurant.Name}",
        });

        _db.Orders.Add(order);
        await _db.SaveChangesAsync(ct);

        // 5) Pasarela de pagos (solo medios online)
        if (PaymentMethods.IsOnline(order.PaymentMethod))
        {
            try
            {
                var init = await _payments.CreatePaymentAsync(order, ct);
                order.PaymentReference = init.Reference;
                order.PaymentUrl = init.PaymentUrl;
                order.PaymentStatus = init.Status;
                await _db.SaveChangesAsync(ct);
            }
            catch (Exception ex) when (ex is PaymentGatewayException or HttpRequestException or TaskCanceledException)
            {
                _log.LogError(ex, "Falló la pasarela de pagos para el pedido {OrderId}", order.Id);
                await ChangeStatusInternalAsync(order, OrderStatuses.Cancelado, "Cancelado: no se pudo iniciar el pago online");
                throw new OrderException(502, "No se pudo iniciar el pago online. Probá de nuevo o elegí otro medio de pago.");
            }
        }

        return order;
    }

    private async Task<string> NextOrderIdAsync(CancellationToken ct)
    {
        for (var i = 0; i < 10; i++)
        {
            var id = $"SMT-{DateTime.UtcNow.Year}-{RandomNumberGenerator.GetInt32(1000, 10000)}";
            if (!await _db.Orders.AnyAsync(o => o.Id == id, ct)) return id;
        }
        throw new OrderException(500, "No se pudo generar un número de pedido.");
    }

    // ---------- Estados ----------

    /// <summary>Pasa el pedido al siguiente estado del flujo (acción del restaurante / cadete).</summary>
    public async Task<Order> AdvanceAsync(string id)
    {
        var order = await GetAsync(id) ?? throw new OrderException(404, "Pedido no encontrado.");
        var idx = Array.IndexOf(OrderStatuses.Sequence, order.Status);
        if (idx < 0 || idx >= OrderStatuses.Sequence.Length - 1)
            throw new OrderException(409, $"El pedido ya está en estado final ({order.Status}).");

        var next = OrderStatuses.Sequence[idx + 1];
        if (next == OrderStatuses.Confirmado && PaymentMethods.IsOnline(order.PaymentMethod) && order.PaymentStatus != PaymentStatuses.Aprobado)
            throw new OrderException(409, "No se puede confirmar el pedido hasta que el pago online esté aprobado.");

        await ChangeStatusInternalAsync(order, next, OrderStatuses.Descriptions[next]);
        return order;
    }

    public async Task<Order> CancelAsync(string id)
    {
        var order = await GetAsync(id) ?? throw new OrderException(404, "Pedido no encontrado.");
        if (order.Status is OrderStatuses.EnCamino or OrderStatuses.Entregado or OrderStatuses.Cancelado)
            throw new OrderException(409, "El pedido ya no se puede cancelar.");
        await ChangeStatusInternalAsync(order, OrderStatuses.Cancelado, OrderStatuses.Descriptions[OrderStatuses.Cancelado]);
        return order;
    }

    private async Task ChangeStatusInternalAsync(Order order, string status, string description)
    {
        order.Status = status;
        order.History.Add(new OrderStatusHistory { OrderId = order.Id, Status = status, Timestamp = DateTime.UtcNow, Description = description });
        await _db.SaveChangesAsync();
    }

    // ---------- Pagos (webhook) ----------

    /// <summary>Consulta a la pasarela el estado del pago y actualiza el pedido.</summary>
    public async Task HandlePaymentNotificationAsync(string paymentId, CancellationToken ct = default)
    {
        var info = await _payments.GetPaymentAsync(paymentId, ct);
        if (info is null) return;

        // Primero por la referencia de pago que guardamos al crearlo; si no, por el id de pedido que informa la pasarela
        var order = await OrdersWithDetails().FirstOrDefaultAsync(o => o.PaymentReference == paymentId, ct);
        if (order is null && !string.IsNullOrWhiteSpace(info.OrderId))
            order = await GetAsync(info.OrderId);
        if (order is null || order.PaymentStatus == info.Status || !PaymentMethods.IsOnline(order.PaymentMethod)) return;
        if (!string.IsNullOrWhiteSpace(info.OrderId) && !string.Equals(info.OrderId, order.Id, StringComparison.Ordinal)) return;
        if (info.Amount.HasValue && info.Amount.Value != order.Total) return;
        if (!string.IsNullOrWhiteSpace(info.Currency) && !string.Equals(info.Currency, "ARS", StringComparison.OrdinalIgnoreCase)) return;

        order.PaymentStatus = info.Status;
        if (info.Status == PaymentStatuses.Rechazado && order.Status == OrderStatuses.Recibido)
            await ChangeStatusInternalAsync(order, OrderStatuses.Cancelado, "Cancelado: el pago fue rechazado");
        else if (info.Status == PaymentStatuses.Aprobado && order.Status == OrderStatuses.Recibido)
            await ChangeStatusInternalAsync(order, OrderStatuses.Confirmado, "Confirmado: pago online aprobado por Mercado Pago");
        else
            await _db.SaveChangesAsync(ct);
    }
}
