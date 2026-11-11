using Microsoft.AspNetCore.Mvc;
using SaborTuc.Api.Dtos;
using SaborTuc.Api.Services;

namespace SaborTuc.Api.Controllers;

[ApiController]
[Route("api/orders")]
public class OrdersController : ControllerBase
{
    private readonly OrderService _orders;
    private readonly IConfiguration _cfg;
    public OrdersController(OrderService orders, IConfiguration cfg) { _orders = orders; _cfg = cfg; }

    /// <summary>Consultar pedidos (opcionalmente filtrados por email del cliente).</summary>
    [HttpGet]
    public async Task<ActionResult<List<OrderDto>>> List([FromQuery] string? email) =>
        (await _orders.ListAsync(email)).Select(o => o.ToDto()).ToList();

    /// <summary>Consultar un pedido (incluye su estado e historial).</summary>
    [HttpGet("{id}")]
    public async Task<ActionResult<OrderDto>> Get(string id)
    {
        var o = await _orders.GetAsync(id);
        return o is null ? NotFound(new { message = "Pedido no encontrado." }) : o.ToDto();
    }

    /// <summary>Consultar solo el estado de un pedido.</summary>
    [HttpGet("{id}/status")]
    public async Task<IActionResult> GetStatus(string id)
    {
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
        return CreatedAtAction(nameof(Get), new { id = order.Id }, order.ToDto());
    }

    /// <summary>Hacer avanzar el pedido al siguiente estado (acción del restaurante; solo con Demo:EnableManualAdvance=true).</summary>
    [HttpPost("{id}/advance")]
    public async Task<ActionResult<OrderDto>> Advance(string id)
    {
        if (!_cfg.GetValue<bool>("Demo:EnableManualAdvance"))
            return StatusCode(403, new { message = "El avance manual de estados está deshabilitado." });
        return (await _orders.AdvanceAsync(id)).ToDto();
    }

    /// <summary>Cancelar un pedido que todavía no salió a reparto.</summary>
    [HttpPost("{id}/cancel")]
    public async Task<ActionResult<OrderDto>> Cancel(string id) => (await _orders.CancelAsync(id)).ToDto();
}
