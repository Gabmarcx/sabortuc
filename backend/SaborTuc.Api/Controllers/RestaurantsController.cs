using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SaborTuc.Api.Data;
using SaborTuc.Api.Dtos;
using SaborTuc.Api.Security;
using SaborTuc.Api.Services;

namespace SaborTuc.Api.Controllers;

[ApiController]
[Route("api/restaurants")]
public class RestaurantsController : ControllerBase
{
    private readonly AppDbContext _db;
    public RestaurantsController(AppDbContext db) => _db = db;

    /// <summary>Consultar restaurantes (con filtros y orden).</summary>
    [HttpGet]
    public async Task<ActionResult<List<RestaurantDto>>> GetAll(
        [FromQuery] string? search, [FromQuery] string? category, [FromQuery] string? neighborhood,
        [FromQuery] bool onlyOpen = false, [FromQuery] decimal? maxDeliveryFee = null,
        [FromQuery] string? priceRange = null, [FromQuery] string? sortBy = "recommended")
    {
        var q = _db.Restaurants.Include(r => r.Products).AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim().ToLower();
            q = q.Where(r => r.Name.ToLower().Contains(s) || r.Category.ToLower().Contains(s)
                || r.Neighborhood.ToLower().Contains(s) || r.Address.ToLower().Contains(s)
                || r.TagsJson.ToLower().Contains(s)
                || r.Products.Any(p => p.Name.ToLower().Contains(s) || p.Description.ToLower().Contains(s)));
        }
        if (!string.IsNullOrWhiteSpace(category) && category != "Todas") q = q.Where(r => r.Category == category);
        if (!string.IsNullOrWhiteSpace(neighborhood) && neighborhood != "Todos") q = q.Where(r => r.Neighborhood == neighborhood);
        if (onlyOpen) q = q.Where(r => r.IsOpen);

        var list = await q.ToListAsync();

        // Filtros/orden sobre decimales en memoria (SQLite no ordena decimal en SQL)
        if (maxDeliveryFee is not null) list = list.Where(r => r.DeliveryFee <= maxDeliveryFee).ToList();
        if (!string.IsNullOrWhiteSpace(priceRange))
        {
            var ranges = priceRange.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
            list = list.Where(r => ranges.Contains(r.PriceRange)).ToList();
        }

        static int Minutes(string s) => int.TryParse(new string(s.TakeWhile(char.IsDigit).ToArray()), out var m) ? m : int.MaxValue;
        list = sortBy switch
        {
            "rating" => list.OrderByDescending(r => r.Rating).ToList(),
            "deliveryFee" => list.OrderBy(r => r.DeliveryFee).ToList(),
            "deliveryTime" => list.OrderBy(r => Minutes(r.EstimatedDeliveryTime)).ToList(),
            _ => list.OrderByDescending(r => r.ReviewsCount).ToList(),
        };

        return list.Select(r => r.ToDto()).ToList();
    }

    /// <summary>Consultar un restaurante con su carta.</summary>
    [HttpGet("{id}")]
    public async Task<ActionResult<RestaurantDto>> GetById(string id)
    {
        var r = await _db.Restaurants.Include(x => x.Products).AsNoTracking().FirstOrDefaultAsync(x => x.Id == id);
        return r is null ? NotFound(new { message = "Restaurante no encontrado." }) : r.ToDto();
    }

    /// <summary>Consultar productos (precios y disponibilidad) de un restaurante.</summary>
    [HttpGet("{id}/products")]
    public async Task<ActionResult<List<ProductDto>>> GetProducts(string id)
    {
        if (!await _db.Restaurants.AnyAsync(x => x.Id == id))
            return NotFound(new { message = "Restaurante no encontrado." });
        var products = await _db.Products.AsNoTracking().Where(p => p.RestaurantId == id).ToListAsync();
        return products.OrderBy(p => p.Id).Select(p => p.ToDto()).ToList();
    }

    /// <summary>Verificar precios y disponibilidad actuales de un conjunto de productos.</summary>
    [HttpPost("{id}/availability")]
    public async Task<ActionResult<AvailabilityResponse>> CheckAvailability(string id, [FromBody] AvailabilityRequest req)
    {
        var r = await _db.Restaurants.Include(x => x.Products).AsNoTracking().FirstOrDefaultAsync(x => x.Id == id);
        if (r is null)
            return new AvailabilityResponse { Available = false, RestaurantOpen = false, UnavailableProducts = req.ProductIds };

        var res = new AvailabilityResponse { RestaurantOpen = r.IsOpen };
        foreach (var pid in req.ProductIds)
        {
            var p = r.Products.FirstOrDefault(x => x.Id == pid);
            if (p is null || !p.Available) res.UnavailableProducts.Add(pid);
            else res.VerifiedPrices[pid] = p.Price;
        }
        res.Available = r.IsOpen && res.UnavailableProducts.Count == 0;
        return res;
    }

    /// <summary>Administración: marcar un producto como disponible / agotado (requiere header X-Api-Key).</summary>
    [AdminKey]
    [HttpPatch("{id}/products/{productId}/availability")]
    public async Task<IActionResult> SetProductAvailability(string id, string productId, [FromBody] bool available)
    {
        var p = await _db.Products.FirstOrDefaultAsync(x => x.RestaurantId == id && x.Id == productId);
        if (p is null) return NotFound(new { message = "Producto no encontrado." });
        p.Available = available;
        await _db.SaveChangesAsync();
        return Ok(p.ToDto());
    }
}
