using Microsoft.EntityFrameworkCore;
using SaborTuc.Api.Data;
using SaborTuc.Api.Models;

namespace SaborTuc.Api.Services;

/// <summary>
/// Servicio de fondo (solo demo): hace avanzar solo los pedidos para poder ver el seguimiento
/// sin que un restaurante real los vaya confirmando. Se activa con Simulation:Enabled=true.
/// </summary>
public class OrderSimulator : BackgroundService
{
    // Minutos desde la creación para pasar a cada estado
    private static readonly (string Status, int Minutes)[] Schedule =
    {
        (OrderStatuses.Confirmado, 1), (OrderStatuses.EnPreparacion, 3), (OrderStatuses.EnCamino, 6), (OrderStatuses.Entregado, 12),
    };

    private readonly IServiceScopeFactory _scopes;
    private readonly ILogger<OrderSimulator> _log;

    public OrderSimulator(IServiceScopeFactory scopes, ILogger<OrderSimulator> log)
    {
        _scopes = scopes; _log = log;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try { await TickAsync(); }
            catch (Exception ex) { _log.LogWarning(ex, "Error en el simulador de pedidos"); }
            await Task.Delay(TimeSpan.FromSeconds(15), stoppingToken).ContinueWith(_ => { });
        }
    }

    private async Task TickAsync()
    {
        using var scope = _scopes.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var open = await db.Orders.Include(o => o.History)
            .Where(o => o.Status != OrderStatuses.Entregado && o.Status != OrderStatuses.Cancelado)
            .ToListAsync();

        foreach (var o in open)
        {
            // un pedido con pago online pendiente no avanza hasta que se apruebe
            if (PaymentMethods.IsOnline(o.PaymentMethod) && o.PaymentStatus != PaymentStatuses.Aprobado) continue;

            var elapsed = (DateTime.UtcNow - o.CreatedAt).TotalMinutes;
            foreach (var (status, minutes) in Schedule)
            {
                var already = Array.IndexOf(OrderStatuses.Sequence, o.Status) >= Array.IndexOf(OrderStatuses.Sequence, status);
                if (!already && elapsed >= minutes)
                {
                    o.Status = status;
                    o.History.Add(new OrderStatusHistory { OrderId = o.Id, Status = status, Timestamp = DateTime.UtcNow, Description = OrderStatuses.Descriptions[status] });
                }
            }
        }
        await db.SaveChangesAsync();
    }
}
