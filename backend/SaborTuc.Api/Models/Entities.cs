namespace SaborTuc.Api.Models;

public class Restaurant
{
    public string Id { get; set; } = "";
    public string Name { get; set; } = "";
    public string Category { get; set; } = "";
    public string Address { get; set; } = "";
    public string Neighborhood { get; set; } = "";
    public double Latitude { get; set; }
    public double Longitude { get; set; }
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
    /// <summary>Lista de tags serializada como JSON (["Pizza","Pastas"]).</summary>
    public string TagsJson { get; set; } = "[]";

    public List<Product> Products { get; set; } = new();
}

public class Product
{
    public string Id { get; set; } = "";
    public string RestaurantId { get; set; } = "";
    public Restaurant? Restaurant { get; set; }
    public string Name { get; set; } = "";
    public string Description { get; set; } = "";
    public string Category { get; set; } = "";
    public decimal Price { get; set; }
    public string Image { get; set; } = "";
    public bool Available { get; set; } = true;
    public bool IsPopular { get; set; }
    public bool Verified { get; set; }
}

public static class OrderStatuses
{
    public const string Recibido = "recibido";
    public const string Confirmado = "confirmado";
    public const string EnPreparacion = "en_preparacion";
    public const string EnCamino = "en_camino";
    public const string Entregado = "entregado";
    public const string Cancelado = "cancelado";

    /// <summary>Flujo normal de un pedido.</summary>
    public static readonly string[] Sequence = { Recibido, Confirmado, EnPreparacion, EnCamino, Entregado };

    public static readonly Dictionary<string, string> Descriptions = new()
    {
        [Recibido] = "Pedido registrado en SaborTUC",
        [Confirmado] = "El restaurante confirmó la comanda",
        [EnPreparacion] = "Cocinando y empaquetando el pedido",
        [EnCamino] = "Cadete en camino hacia tu dirección",
        [Entregado] = "Pedido entregado en el domicilio",
        [Cancelado] = "Pedido cancelado",
    };
}

public static class PaymentMethods
{
    public const string MercadoPago = "mercadopago";
    public const string TarjetaOnline = "tarjeta_online";
    public const string EfectivoEntrega = "efectivo_entrega";
    public const string Transferencia = "transferencia";

    public static readonly string[] All = { MercadoPago, TarjetaOnline, EfectivoEntrega, Transferencia };

    /// <summary>Medios que se procesan a través de la pasarela de pagos externa.</summary>
    public static bool IsOnline(string method) => method is MercadoPago or TarjetaOnline;
}

public static class PaymentStatuses
{
    public const string Pendiente = "pendiente";
    public const string Aprobado = "aprobado";
    public const string Rechazado = "rechazado";
}

public class Order
{
    /// <summary>Ej: SMT-2026-9041</summary>
    public string Id { get; set; } = "";

    // Cliente
    public string CustomerName { get; set; } = "";
    public string CustomerPhone { get; set; } = "";
    public string CustomerEmail { get; set; } = "";

    // Dirección de entrega
    public string AddressAlias { get; set; } = "";
    public string Street { get; set; } = "";
    public string Number { get; set; } = "";
    public string? Apartment { get; set; }
    public string Neighborhood { get; set; } = "";
    public string? Instructions { get; set; }
    public string City { get; set; } = "San Miguel de Tucumán";

    public string RestaurantId { get; set; } = "";
    public Restaurant? Restaurant { get; set; }
    public string RestaurantName { get; set; } = "";

    public decimal Subtotal { get; set; }
    public decimal DeliveryFee { get; set; }
    public decimal ServiceFee { get; set; }
    public decimal Discount { get; set; }
    public decimal Total { get; set; }

    public string PaymentMethod { get; set; } = PaymentMethods.EfectivoEntrega;
    public string PaymentStatus { get; set; } = PaymentStatuses.Pendiente;
    /// <summary>Id de preferencia / pago en la pasarela externa.</summary>
    public string? PaymentReference { get; set; }
    public string? PaymentUrl { get; set; }

    public string Status { get; set; } = OrderStatuses.Recibido;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public string EstimatedDeliveryTime { get; set; } = "";

    // Datos obtenidos de la API de mapas
    public double? DistanceKm { get; set; }
    public int? RouteDurationMin { get; set; }

    public List<OrderItem> Items { get; set; } = new();
    public List<OrderStatusHistory> History { get; set; } = new();
}

public class OrderItem
{
    public int Id { get; set; }
    public string OrderId { get; set; } = "";
    public Order? Order { get; set; }
    public string ProductId { get; set; } = "";
    public string Name { get; set; } = "";
    public decimal Price { get; set; }
    public int Quantity { get; set; }
    public string? Notes { get; set; }
}

public class OrderStatusHistory
{
    public int Id { get; set; }
    public string OrderId { get; set; } = "";
    public Order? Order { get; set; }
    public string Status { get; set; } = "";
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    public string Description { get; set; } = "";
}
