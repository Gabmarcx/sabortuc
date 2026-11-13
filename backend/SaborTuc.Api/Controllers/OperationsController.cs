using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SaborTuc.Api.Data;
using SaborTuc.Api.Dtos;
using SaborTuc.Api.Security;
using SaborTuc.Api.Services;

namespace SaborTuc.Api.Controllers;

[ApiController]
[Route("api/operations")]
public class OperationsController : ControllerBase
{
    private readonly OrderService _orders;
    private readonly AppDbContext _db;

    public OperationsController(OrderService orders, AppDbContext db) { _orders = orders; _db = db; }

    [HttpGet("restaurant/{restaurantId}/orders")]
    [RestaurantOperationsKey]
    public async Task<ActionResult<List<OperationsOrderDto>>> GetRestaurantOrders(string restaurantId, CancellationToken ct) =>
        (await _orders.GetRestaurantOperationsOrdersAsync(restaurantId, ct))
            .Select(o => o.ToOperationsDto()).ToList();

    [HttpPost("restaurant/{restaurantId}/orders/{id}/accept")]
    [RestaurantOperationsKey]
    public async Task<ActionResult<OperationsOrderDto>> AcceptRestaurantOrder(string restaurantId, string id, CancellationToken ct) =>
        (await _orders.AcceptRestaurantOrderAsync(restaurantId, id, ct)).ToOperationsDto();

    [HttpPost("restaurant/{restaurantId}/orders/{id}/start-preparation")]
    [RestaurantOperationsKey]
    public async Task<ActionResult<OperationsOrderDto>> StartPreparation(string restaurantId, string id, CancellationToken ct) =>
        (await _orders.StartPreparationAsync(restaurantId, id, ct)).ToOperationsDto();

    [HttpGet("courier/restaurants")]
    [CourierKey]
    public async Task<ActionResult<List<CourierRestaurantDto>>> GetCourierRestaurants(CancellationToken ct)
    {
        var ids = GetCourierRestaurantIds();
        return await _db.Restaurants.AsNoTracking().Where(r => ids.Contains(r.Id))
            .OrderBy(r => r.Name)
            .Select(r => new CourierRestaurantDto { Id = r.Id, Name = r.Name })
            .ToListAsync(ct);
    }

    [HttpGet("courier/orders")]
    [CourierKey]
    public async Task<ActionResult<List<OperationsOrderDto>>> GetCourierOrders(CancellationToken ct) =>
        (await _orders.GetCourierOperationsOrdersAsync(GetCourierRestaurantIds(), ct))
            .Select(o => o.ToOperationsDto()).ToList();

    [HttpPost("courier/orders/{id}/start-delivery")]
    [CourierKey]
    public async Task<ActionResult<OperationsOrderDto>> StartDelivery(string id, CancellationToken ct) =>
        (await _orders.StartDeliveryAsync(id, GetCourierRestaurantIds(), ct)).ToOperationsDto();

    [HttpPost("courier/orders/{id}/deliver")]
    [CourierKey]
    public async Task<ActionResult<OperationsOrderDto>> MarkDelivered(string id, CancellationToken ct) =>
        (await _orders.MarkDeliveredAsync(id, GetCourierRestaurantIds(), ct)).ToOperationsDto();

    private string[] GetCourierRestaurantIds() =>
        HttpContext.Items[CourierKeyAttribute.RestaurantIdsItemKey] as string[] ?? Array.Empty<string>();
}
