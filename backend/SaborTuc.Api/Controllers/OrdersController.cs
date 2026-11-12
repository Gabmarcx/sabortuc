using Microsoft.AspNetCore.Mvc;
using SaborTuc.Api.Dtos;
using SaborTuc.Api.Security;
using SaborTuc.Api.Services;

namespace SaborTuc.Api.Controllers;

[ApiController]
[Route("api/orders")]
public class OrdersController : ControllerBase
{
    private readonly OrderService _orders;
    private readonly IConfiguration _cfg;
    public OrdersController(OrderService orders, IConfiguration cfg) { _orders = orders; _cfg = cfg; }

    /// <summary>Cotizar un carrito con precios y cargos actuales calculados por el servidor.</summary>
    [HttpPost("quote/{restaurantId}")]
    public Task<OrderQuoteResponse> Quote(string restaurantId, [FromBody] OrderQuoteRequest req, CancellationToken ct) =>
        _orders.QuoteAsync(restaurantId, req, ct);

    /// <summary>Consultar un pedido usando el código privado devuelto al crearlo.</summary>
    [HttpGet("{id}")]
    public async Task<ActionResult<OrderDto>> Get(string id, CancellationToken ct)
    {
        if (!await HasAccess(id, ct)) return NotFound(new { message = "Pedido no encontrado." });
        var o = await _orders.GetAsync(id);
        return o is null ? NotFound(new { message = "Pedido no encontrado." }) : o.ToDto();
    }

    /// <summary>Consultar solo el estado de un pedido.</summary>
    [HttpGet("{id}/status")]
    public async Task<IActionResult> GetStatus(string id)
    {
        if (!await HasAccess(id, HttpContext.RequestAborted)) return NotFound(new { message = "Pedido no encontrado." });
        var o = await _orders.GetAsync(id);
        if (o is null) return NotFound(new { message = "Pedido no encontrado." });
        var dto = o.ToDto();
        return Ok(new { dto.Id, dto.Status, dto.PaymentStatus, dto.EstimatedDeliveryTime, dto.StatusHistory });
    }

    /// <summary>Crear un pedido. El servidor calcula precios, envío y totales.</summary>
    [HttpPost]
    public async Task<ActionResult<OrderDto>> Create([FromBody] CreateOrderRequest req, CancellationToken ct)
    {
        var order = await _orders.CreateAsync(req, ct);
        var dto = order.ToDto();
        dto.AccessToken = order.AccessToken;
        return CreatedAtAction(nameof(Get), new { id = order.Id }, dto);
    }

    /// <summary>Avance manual exclusivo del administrador para demos; requiere Demo:EnableManualAdvance=true y X-Api-Key.</summary>
    [HttpPost("{id}/advance")]
    [AdminKey]
    public async Task<ActionResult<OrderDto>> Advance(string id)
    {
        if (!_cfg.GetValue<bool>("Demo:EnableManualAdvance"))
            return StatusCode(403, new { message = "El avance manual de estados está deshabilitado." });
        return (await _orders.AdvanceAsync(id)).ToDto();
    }

    /// <summary>Cancelar un pedido que todavía no salió a reparto.</summary>
    [HttpPost("{id}/cancel")]
    public async Task<ActionResult<OrderDto>> Cancel(string id, CancellationToken ct)
    {
        if (!await HasAccess(id, ct)) return NotFound(new { message = "Pedido no encontrado." });
        return (await _orders.CancelAsync(id)).ToDto();
    }

    private Task<bool> HasAccess(string id, CancellationToken ct) =>
        _orders.HasAccessAsync(id, Request.Headers["X-Order-Access-Token"].ToString(), ct);
}
