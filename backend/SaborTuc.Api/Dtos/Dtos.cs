namespace SaborTuc.Api.Dtos;

// Los nombres/forma de estos DTOs coinciden con los tipos de src/types/index.ts del frontend.

public class CoordinatesDto
{
    public double Lat { get; set; }
    public double Lng { get; set; }
}

public class ProductDto
{
    public string Id { get; set; } = "";
    public string RestaurantId { get; set; } = "";
    public string Name { get; set; } = "";
    public string Description { get; set; } = "";
    public string Category { get; set; } = "";
    public decimal Price { get; set; }
    public string Image { get; set; } = "";
    public bool Available { get; set; }
    public bool IsPopular { get; set; }
    public bool Verified { get; set; }
}

public class RestaurantDto
{
    public string Id { get; set; } = "";
    public string Name { get; set; } = "";
    public string Category { get; set; } = "";
    public string Address { get; set; } = "";
    public string Neighborhood { get; set; } = "";
    public CoordinatesDto Coordinates { get; set; } = new();
    public string Image { get; set; } = "";
    public string? CoverImage { get; set; }
    public double Rating { get; set; }
    public int ReviewsCount { get; set; }
    public bool IsOpen { get; set; }
    public string OpeningHours { get; set; } = "";
    public string EstimatedDeliveryTime { get; set; } = "";
    public decimal DeliveryFee { get; set; }
    public decimal MinOrder { get; set; }
    public string PriceRange { get; set; } = "$";
    public string Phone { get; set; } = "";
    public string MenuVerifiedStatus { get; set; } = "";
    public List<string> Tags { get; set; } = new();
    public List<ProductDto> Products { get; set; } = new();
}

public class AvailabilityRequest
{
    public List<string> ProductIds { get; set; } = new();
}

public class AvailabilityResponse
{
    public bool Available { get; set; }
    public bool RestaurantOpen { get; set; }
    public List<string> UnavailableProducts { get; set; } = new();
    public Dictionary<string, decimal> VerifiedPrices { get; set; } = new();
}

public class OrderQuoteRequest
{
    public List<CreateOrderItemRequest> Items { get; set; } = new();
}

public class OrderQuoteResponse
{
    public bool Available { get; set; }
    public bool RestaurantOpen { get; set; }
    public List<string> UnavailableProducts { get; set; } = new();
    public Dictionary<string, decimal> VerifiedPrices { get; set; } = new();
    public decimal Subtotal { get; set; }
    public decimal DeliveryFee { get; set; }
    public decimal ServiceFee { get; set; }
    public decimal Total { get; set; }
    public decimal MinimumOrder { get; set; }
    public bool MeetsMinimum { get; set; }
}

// ---------- Pedidos ----------

public class CustomerDto
{
    public string Name { get; set; } = "";
    public string Phone { get; set; } = "";
    public string Email { get; set; } = "";
}

public class DeliveryAddressDto
{
    public string Id { get; set; } = "";
    public string Alias { get; set; } = "";
    public string Street { get; set; } = "";
    public string Number { get; set; } = "";
    public string? Apartment { get; set; }
    public string Neighborhood { get; set; } = "";
    public string? Instructions { get; set; }
    public string City { get; set; } = "San Miguel de Tucumán";
    public bool IsDefault { get; set; }
}

public class CreateOrderItemRequest
{
    public string ProductId { get; set; } = "";
    public int Quantity { get; set; }
    public string? Notes { get; set; }
}

/// <summary>
/// Solo se toman productos y cantidades del cliente; los precios, costos de envío y totales
/// los calcula el servidor a partir de la base de datos.
/// </summary>
public class CreateOrderRequest
{
    public CustomerDto Customer { get; set; } = new();
    public DeliveryAddressDto DeliveryAddress { get; set; } = new();
    public string RestaurantId { get; set; } = "";
    public List<CreateOrderItemRequest> Items { get; set; } = new();
    public string PaymentMethod { get; set; } = "";
}

public class OrderItemDto
{
    public string ProductId { get; set; } = "";
    public string Name { get; set; } = "";
    public decimal Price { get; set; }
    public int Quantity { get; set; }
    public string? Notes { get; set; }
}

public class OrderStatusHistoryDto
{
    public string Status { get; set; } = "";
    public string Timestamp { get; set; } = "";
    public string Description { get; set; } = "";
}

public class OrderDto
{
    public string Id { get; set; } = "";
    /// <summary>Se devuelve únicamente al crear el pedido. Guardar para futuras consultas.</summary>
    public string? AccessToken { get; set; }
    public CustomerDto Customer { get; set; } = new();
    public DeliveryAddressDto DeliveryAddress { get; set; } = new();
    public string RestaurantId { get; set; } = "";
    public string RestaurantName { get; set; } = "";
    public List<OrderItemDto> Items { get; set; } = new();
    public decimal Subtotal { get; set; }
    public decimal DeliveryFee { get; set; }
    public decimal ServiceFee { get; set; }
    public decimal Discount { get; set; }
    public decimal Total { get; set; }
    public string PaymentMethod { get; set; } = "";
    public string PaymentStatus { get; set; } = "";
    public string Status { get; set; } = "";
    public string CreatedAt { get; set; } = "";
    public List<OrderStatusHistoryDto> StatusHistory { get; set; } = new();
    public string EstimatedDeliveryTime { get; set; } = "";
    public bool IsDemoOrder { get; set; }

    // Extras de la API
    public double? DistanceKm { get; set; }
    public int? RouteDurationMin { get; set; }
    /// <summary>URL de la pasarela de pagos (Mercado Pago) para completar el pago online.</summary>
    public string? PaymentUrl { get; set; }
}

/// <summary>Datos mínimos que necesita el restaurante o el cadete para operar un pedido.</summary>
public class OperationsOrderDto
{
    public string Id { get; set; } = "";
    public string RestaurantId { get; set; } = "";
    public string RestaurantName { get; set; } = "";
    public string CustomerName { get; set; } = "";
    public string CustomerPhone { get; set; } = "";
    public string Street { get; set; } = "";
    public string Number { get; set; } = "";
    public string? Apartment { get; set; }
    public string Neighborhood { get; set; } = "";
    public string? Instructions { get; set; }
    public List<OrderItemDto> Items { get; set; } = new();
    public decimal Total { get; set; }
    public string PaymentMethod { get; set; } = "";
    public string PaymentStatus { get; set; } = "";
    public string Status { get; set; } = "";
    public string CreatedAt { get; set; } = "";
    public double? DistanceKm { get; set; }
    public int? RouteDurationMin { get; set; }
}

public class CourierRestaurantDto
{
    public string Id { get; set; } = "";
    public string Name { get; set; } = "";
}

public class UpdateStatusRequest
{
    public string Status { get; set; } = "";
}

public class DeliveryEstimateDto
{
    public double DistanceKm { get; set; }
    public int DurationMin { get; set; }
    /// <summary>"openrouteservice" si vino de la API de mapas, "estimado" si se usó el cálculo local de respaldo.</summary>
    public string Source { get; set; } = "";
    public bool WithinCoverage { get; set; }
    public double MaxDeliveryKm { get; set; }
}
