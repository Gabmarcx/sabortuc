using System.Text.Json;
using SaborTuc.Api.Dtos;
using SaborTuc.Api.Models;

namespace SaborTuc.Api.Data;

public static class DbSeeder
{
    /// <summary>Carga los 20 restaurantes / 45 productos de demo desde Data/restaurants.seed.json la primera vez.</summary>
    public static void Seed(AppDbContext db)
    {
        if (db.Restaurants.Any()) return;

        var path = Path.Combine(AppContext.BaseDirectory, "Data", "restaurants.seed.json");
        var json = File.ReadAllText(path);
        var seed = JsonSerializer.Deserialize<List<RestaurantDto>>(json, new JsonSerializerOptions { PropertyNameCaseInsensitive = true })
                   ?? new();

        foreach (var s in seed)
        {
            db.Restaurants.Add(new Restaurant
            {
                Id = s.Id, Name = s.Name, Category = s.Category, Address = s.Address, Neighborhood = s.Neighborhood,
                Latitude = s.Coordinates.Lat, Longitude = s.Coordinates.Lng,
                Image = s.Image, CoverImage = s.CoverImage, Rating = s.Rating, ReviewsCount = s.ReviewsCount,
                IsOpen = s.IsOpen, OpeningHours = s.OpeningHours, EstimatedDeliveryTime = s.EstimatedDeliveryTime,
                DeliveryFee = s.DeliveryFee, MinOrder = s.MinOrder, PriceRange = s.PriceRange, Phone = s.Phone,
                MenuVerifiedStatus = s.MenuVerifiedStatus,
                TagsJson = JsonSerializer.Serialize(s.Tags),
                Products = s.Products.Select(p => new Product
                {
                    Id = p.Id, RestaurantId = s.Id, Name = p.Name, Description = p.Description, Category = p.Category,
                    Price = p.Price, Image = p.Image, Available = p.Available, IsPopular = p.IsPopular, Verified = p.Verified,
                }).ToList(),
            });
        }
        db.SaveChanges();
    }
}
