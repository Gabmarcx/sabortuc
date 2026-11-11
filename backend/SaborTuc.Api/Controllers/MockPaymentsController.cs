using System.Net;
using Microsoft.AspNetCore.Mvc;
using SaborTuc.Api.Models;
using SaborTuc.Api.Services;

namespace SaborTuc.Api.Controllers;

/// <summary>
/// Página de pago SIMULADA. Solo funciona con PaymentGateway:Provider = "Mock"; con la pasarela
/// real devuelve 404. Aprobar/rechazar avisa al backend igual que lo haría el webhook de la pasarela.
/// </summary>
[ApiController]
[Route("api/mock-payments")]
public class MockPaymentsController : ControllerBase
{
    private readonly IPaymentGateway _gateway;
    private readonly OrderService _orders;

    public MockPaymentsController(IPaymentGateway gateway, OrderService orders)
    {
        _gateway = gateway; _orders = orders;
    }

    [HttpGet("{paymentId}")]
    public async Task<IActionResult> Checkout(string paymentId, CancellationToken ct)
    {
        if (_gateway is not MockPaymentGateway mock) return NotFound();
        var info = await mock.GetPaymentAsync(paymentId, ct);
        if (info is null) return NotFound();

        var id = WebUtility.HtmlEncode(paymentId);
        var html = Page($@"
<h1>Pasarela de pagos (simulada)</h1>
<p>Pago <b>{id}</b> del pedido <b>{WebUtility.HtmlEncode(info.OrderId)}</b></p>
<p>Estado actual: <b>{WebUtility.HtmlEncode(info.Status)}</b></p>
<form method=""post"" action=""/api/mock-payments/{id}/approve""><button class=""ok"">Aprobar pago</button></form>
<form method=""post"" action=""/api/mock-payments/{id}/reject""><button class=""no"">Rechazar pago</button></form>");
        return Content(html, "text/html; charset=utf-8");
    }

    [HttpPost("{paymentId}/approve")]
    public Task<IActionResult> Approve(string paymentId, CancellationToken ct) => Resolve(paymentId, PaymentStatuses.Aprobado, "Pago aprobado", ct);

    [HttpPost("{paymentId}/reject")]
    public Task<IActionResult> Reject(string paymentId, CancellationToken ct) => Resolve(paymentId, PaymentStatuses.Rechazado, "Pago rechazado", ct);

    private async Task<IActionResult> Resolve(string paymentId, string status, string title, CancellationToken ct)
    {
        if (_gateway is not MockPaymentGateway mock || !mock.SetStatus(paymentId, status)) return NotFound();
        // Igual que el webhook real: avisamos al backend y él consulta el estado a la pasarela.
        await _orders.HandlePaymentNotificationAsync(paymentId, ct);
        return Content(Page($"<h1>{title}</h1><p>Ya podés volver a SaborTUC: el estado del pedido se actualiza solo.</p>"), "text/html; charset=utf-8");
    }

    private static string Page(string body) => $@"<!doctype html><html lang=""es""><head><meta charset=""utf-8"">
<title>Pasarela simulada</title>
<style>body{{font-family:sans-serif;max-width:420px;margin:60px auto;padding:0 16px}}
button{{width:100%;padding:12px;margin:6px 0;border:0;border-radius:8px;color:#fff;font-size:16px;cursor:pointer}}
.ok{{background:#15803d}}.no{{background:#b91c1c}}</style></head><body>{body}</body></html>";
}
