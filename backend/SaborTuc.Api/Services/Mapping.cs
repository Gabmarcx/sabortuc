using System.Text.Json;
using SaborTuc.Api.Dtos;
using SaborTuc.Api.Models;

namespace SaborTuc.Api.Services;

public static class Mapping
{
    private static readonly TimeZoneInfo ArgTz = ResolveTz();

    private static TimeZoneInfo ResolveTz()
    {
        foreach (var id in new[] { "America/Argentina/Tucuman", "Argentina Standard Time" })
        {
            try { return TimeZoneInfo.FindSystemTimeZoneById(id); } catch { /* probar el siguiente */ }
        }
        return TimeZoneInfo.CreateCustomTimeZone("ART", TimeSpan.FromHours(-3), "ART", "ART");
    }

    public static string LocalTime(DateTime utc) =>
        TimeZoneInfo.ConvertTimeFromUtc(DateTime.SpecifyKind(utc, DateTimeKind.Utc), ArgTz).ToString("HH:mm");

    public static ProductDto ToDto(this Product p) => new()
    {
        Id = p.Id, RestaurantId = p.RestaurantId, Name = p.Name, Description = p.Description,
        Category = p.Category, Price = p.Price, Image = p.Image, Available = p.Available,
        IsPopular = p.IsPopular, Verified = p.Verified,
    };

    public static RestaurantDto ToDto(this Restaurant r) => new()
    {
        Id = r.Id, Name = r.Name, Category = r.Category, Address = r.Address, Neighborhood = r.Neighborhood,
        Coordinates = new CoordinatesDto { Lat = r.Latitude, Lng = r.Longitude },
        Image = r.Image, CoverImage = r.CoverImage, Rating = r.Rating, ReviewsCount = r.ReviewsCount,
        IsOpen = r.IsOpen, OpeningHours = r.OpeningHours, EstimatedDeliveryTime = r.EstimatedDeliveryTime,
        DeliveryFee = r.DeliveryFee, MinOrder = r.MinOrder, PriceRange = r.PriceRange, Phone = r.Phone,
        MenuVerifiedStatus = r.MenuVerifiedStatus,
        Tags = JsonSerializer.Deserialize<List<string>>(r.TagsJson) ?? new(),
        Products = r.Products.OrderBy(p => p.Id).Select(p => p.ToDto()).ToList(),
    };

    public static OrderDto ToDto(this Order o) => new()
    {
        Id = o.Id,
        Customer = new CustomerDto { Name = o.CustomerName, Phone = o.CustomerPhone, Email = o.CustomerEmail },
        DeliveryAddress = new DeliveryAddressDto
        {
            Id = $"addr-{o.Id}", Alias = o.AddressAlias, Street = o.Street, Number = o.Number,
            Apartment = o.Apartment, Neighborhood = o.Neighborhood, Instructions = o.Instructions,
            City = o.City, IsDefault = true,
        },
        RestaurantId = o.RestaurantId, RestaurantName = o.RestaurantName,
        Items = o.Items.Select(i => new OrderItemDto
        {
            ProductId = i.ProductId, Name = i.Name, Price = i.Price, Quantity = i.Quantity, Notes = i.Notes,
        }).ToList(),
        Subtotal = o.Subtotal, DeliveryFee = o.DeliveryFee, ServiceFee = o.ServiceFee,
        Discount = o.Discount, Total = o.Total,
        PaymentMethod = o.PaymentMethod, PaymentStatus = o.PaymentStatus, Status = o.Status,
        CreatedAt = DateTime.SpecifyKind(o.CreatedAt, DateTimeKind.Utc).ToString("o"),
        StatusHistory = o.History.OrderBy(h => h.Timestamp).ThenBy(h => h.Id).Select(h => new OrderStatusHistoryDto
        {
            Status = h.Status, Timestamp = LocalTime(h.Timestamp), Description = h.Description,
        }).ToList(),
        EstimatedDeliveryTime = o.Status == OrderStatuses.Entregado ? "Completado"
            : o.Status == OrderStatuses.Cancelado ? "Cancelado" : o.EstimatedDeliveryTime,
        IsDemoOrder = false,
        DistanceKm = o.DistanceKm, RouteDurationMin = o.RouteDurationMin, PaymentUrl = o.PaymentUrl,
    };
}
