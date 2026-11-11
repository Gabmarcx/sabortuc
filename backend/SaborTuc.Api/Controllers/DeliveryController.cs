using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using SaborTuc.Api.Data;
using SaborTuc.Api.Dtos;
using SaborTuc.Api.Services;

namespace SaborTuc.Api.Controllers;

[ApiController]
[Route("api/delivery")]
public class DeliveryController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IGeoService _geo;
    private readonly BusinessOptions _biz;

    public DeliveryController(AppDbContext db, IGeoService geo, IOptions<BusinessOptions> biz)
    {
        _db = db; _geo = geo; _biz = biz.Value;
    }

    /// <summary>Distancia y tiempo estimado entre un restaurante y una dirección del cliente (API de mapas).</summary>
    [HttpGet("estimate")]
    public async Task<ActionResult<DeliveryEstimateDto>> Estimate(
        [FromQuery] string restaurantId, [FromQuery] string street, [FromQuery] string number,
        [FromQuery] string neighborhood = "Centro", CancellationToken ct = default)
    {
        var r = await _db.Restaurants.AsNoTracking().FirstOrDefaultAsync(x => x.Id == restaurantId, ct);
        if (r is null) return NotFound(new { message = "Restaurante no encontrado." });

        var est = await _geo.EstimateAsync(r.Latitude, r.Longitude, street, number, neighborhood, ct);
        return new DeliveryEstimateDto
        {
            DistanceKm = est.DistanceKm, DurationMin = est.DurationMin, Source = est.Source,
            WithinCoverage = est.DistanceKm <= _biz.MaxDeliveryKm, MaxDeliveryKm = _biz.MaxDeliveryKm,
        };
    }
}
