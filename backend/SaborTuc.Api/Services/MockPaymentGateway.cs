using System.Collections.Concurrent;
using Microsoft.Extensions.Options;
using SaborTuc.Api.Models;

namespace SaborTuc.Api.Services;

/// <summary>
/// Pasarela SIMULADA para desarrollar y probar sin la API del otro grupo (PaymentGateway:Provider = "Mock").
/// Guarda los pagos en memoria y expone una página de "pago" en /api/mock-payments/{id}
/// (ver MockPaymentsController) donde se puede aprobar o rechazar el cobro.
/// Para entregar el trabajo usar Provider = "External" (ExternalPaymentGateway).
/// </summary>
public class MockPaymentGateway : IPaymentGateway
{
    private readonly ConcurrentDictionary<string, (string OrderId, string Status)> _payments = new();
    private readonly PaymentGatewayOptions _opt;

    public MockPaymentGateway(IOptions<PaymentGatewayOptions> opt) => _opt = opt.Value;

    public Task<PaymentInit> CreatePaymentAsync(Order order, CancellationToken ct = default)
    {
        var reference = "MOCK-" + Guid.NewGuid().ToString("N")[..8];
        _payments[reference] = (order.Id, PaymentStatuses.Pendiente);
        var url = $"{_opt.PublicBaseUrl.TrimEnd('/')}/api/mock-payments/{reference}";
        return Task.FromResult(new PaymentInit(reference, url, PaymentStatuses.Pendiente));
    }

    public Task<PaymentInfo?> GetPaymentAsync(string paymentId, CancellationToken ct = default) =>
        Task.FromResult<PaymentInfo?>(_payments.TryGetValue(paymentId, out var p) ? new PaymentInfo(p.OrderId, p.Status) : null);

    /// <summary>Cambia el estado de un pago simulado. Devuelve false si el pago no existe.</summary>
    public bool SetStatus(string paymentId, string status)
    {
        if (!_payments.TryGetValue(paymentId, out var p)) return false;
        _payments[paymentId] = (p.OrderId, status);
        return true;
    }
}
