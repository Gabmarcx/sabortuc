using Microsoft.AspNetCore.Mvc;
using SaborTuc.Api.Security;
using SaborTuc.Api.Services;

namespace SaborTuc.Api.Controllers;

public class PaymentNotification
{
    /// <summary>Id del pago en la pasarela.</summary>
    public string PaymentId { get; set; } = "";
    /// <summary>Alias aceptado por si la pasarela envía "id" en lugar de "paymentId".</summary>
    public string? Id { get; set; }
}

[ApiController]
[Route("api/payments")]
public class PaymentsController : ControllerBase
{
    private readonly OrderService _orders;
    private readonly IConfiguration _cfg;

    public PaymentsController(OrderService orders, IConfiguration cfg)
    {
        _orders = orders; _cfg = cfg;
    }

    /// <summary>
    /// Notificación (webhook) de la pasarela externa. Solo recibimos el id del pago y le preguntamos
    /// a la pasarela su estado real (IPaymentGateway.GetPaymentAsync), así un tercero no puede
    /// "aprobar" un pago falsificando el cuerpo del mensaje.
    /// Si Security:WebhookSecret está configurado, se exige el header X-Webhook-Secret.
    /// </summary>
    [HttpPost("webhook")]
    public async Task<IActionResult> Webhook([FromBody] PaymentNotification n, CancellationToken ct)
    {
        var secret = _cfg["Security:WebhookSecret"];
        if (!string.IsNullOrEmpty(secret) && !SecretComparer.Matches(secret, Request.Headers["X-Webhook-Secret"].ToString()))
            return Unauthorized(new { message = "Secreto del webhook inválido." });

        var paymentId = !string.IsNullOrWhiteSpace(n.PaymentId) ? n.PaymentId : n.Id;
        if (string.IsNullOrWhiteSpace(paymentId))
            return BadRequest(new { message = "Falta paymentId." });

        try
        {
            await _orders.HandlePaymentNotificationAsync(paymentId, ct);
            return Ok();
        }
        catch (PaymentGatewayException ex)
        {
            // 502 para que la pasarela reintente la notificación más tarde
            return StatusCode(502, new { message = ex.Message });
        }
    }
}
