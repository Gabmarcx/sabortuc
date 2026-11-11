using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.Options;
using SaborTuc.Api.Models;

namespace SaborTuc.Api.Services;

public record PaymentInit(string Reference, string? PaymentUrl, string Status);
public record PaymentInfo(string OrderId, string Status);

/// <summary>Configuración de la pasarela de pagos (sección "PaymentGateway" de appsettings.json).</summary>
public class PaymentGatewayOptions
{
    /// <summary>"Mock" (desarrollo, sin API externa) o "External" (API de pagos real).</summary>
    public string Provider { get; set; } = "Mock";

    // ---- Solo para Provider = External ----
    /// <summary>URL base de la API de pagos, ej: https://pagos-grupo-x.azurewebsites.net/api</summary>
    public string BaseUrl { get; set; } = "";
    public string ApiKey { get; set; } = "";
    /// <summary>Header donde se envía la clave. Si es "Authorization" se envía como "Bearer {ApiKey}".</summary>
    public string ApiKeyHeader { get; set; } = "X-Api-Key";
    /// <summary>Ruta (relativa a BaseUrl) para crear un pago.</summary>
    public string CreatePaymentPath { get; set; } = "payments";
    /// <summary>Ruta para consultar un pago; {id} se reemplaza por el id del pago.</summary>
    public string GetPaymentPath { get; set; } = "payments/{id}";
    public string Currency { get; set; } = "ARS";
    /// <summary>URL de nuestro webhook, que se le informa a la pasarela para que nos avise del resultado.</summary>
    public string NotificationUrl { get; set; } = "";
    /// <summary>URL del frontend a la que vuelve el cliente después de pagar.</summary>
    public string ReturnUrl { get; set; } = "";

    // ---- Solo para Provider = Mock ----
    /// <summary>URL pública de esta API (el mock genera links de pago hacia acá).</summary>
    public string PublicBaseUrl { get; set; } = "http://localhost:5080";
}

/// <summary>
/// Contrato con la pasarela de pagos EXTERNA.
/// Estados válidos de pago: PaymentStatuses.Pendiente / Aprobado / Rechazado.
/// </summary>
public interface IPaymentGateway
{
    /// <summary>Iniciar el cobro de un pedido en la pasarela externa.</summary>
    Task<PaymentInit> CreatePaymentAsync(Order order, CancellationToken ct = default);

    /// <summary>Consultar a la pasarela el estado real de un pago. Devuelve null si no existe.</summary>
    Task<PaymentInfo?> GetPaymentAsync(string paymentId, CancellationToken ct = default);
}

/// <summary>
/// Cliente HTTP de la API de pagos externa (la del otro grupo).
///
///   POST {BaseUrl}/{CreatePaymentPath}   body: { orderId, amount, currency, description, customer{...},
///                                                paymentMethod, notificationUrl, returnUrl }
///        respuesta esperada: { paymentId | id, paymentUrl | checkoutUrl | url, status }
///   GET  {BaseUrl}/{GetPaymentPath}      respuesta esperada: { orderId | externalReference, status }
///
/// Los nombres de campos de la respuesta se leen sin distinguir mayúsculas y aceptando alias
/// habituales (ver First(...)). Si la API del compañero usa otro formato, se ajusta SOLO en esta clase.
/// </summary>
public class ExternalPaymentGateway : IPaymentGateway
{
    private readonly HttpClient _http;
    private readonly PaymentGatewayOptions _opt;
    private readonly ILogger<ExternalPaymentGateway> _log;

    public ExternalPaymentGateway(HttpClient http, IOptions<PaymentGatewayOptions> opt, ILogger<ExternalPaymentGateway> log)
    {
        _http = http; _opt = opt.Value; _log = log;

        if (!string.IsNullOrWhiteSpace(_opt.ApiKey))
        {
            if (_opt.ApiKeyHeader.Equals("Authorization", StringComparison.OrdinalIgnoreCase))
                _http.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", _opt.ApiKey);
            else
                _http.DefaultRequestHeaders.TryAddWithoutValidation(_opt.ApiKeyHeader, _opt.ApiKey);
        }
    }

    public async Task<PaymentInit> CreatePaymentAsync(Order order, CancellationToken ct = default)
    {
        var body = new
        {
            orderId = order.Id,
            amount = order.Total,
            currency = _opt.Currency,
            description = $"Pedido {order.Id} - {order.RestaurantName}",
            customer = new { name = order.CustomerName, email = order.CustomerEmail, phone = order.CustomerPhone },
            paymentMethod = order.PaymentMethod,
            notificationUrl = _opt.NotificationUrl,
            returnUrl = _opt.ReturnUrl,
        };

        using var resp = await _http.PostAsJsonAsync(_opt.CreatePaymentPath, body, ct);
        if (!resp.IsSuccessStatusCode)
        {
            _log.LogError("La pasarela respondió {Status} al crear el pago del pedido {OrderId}", (int)resp.StatusCode, order.Id);
            throw new PaymentGatewayException($"La pasarela de pagos respondió {(int)resp.StatusCode} al crear el pago.");
        }

        var root = await ReadJsonAsync(resp, ct);
        var reference = First(root, "paymentId", "id", "reference")
            ?? throw new PaymentGatewayException("La pasarela no devolvió el id del pago.");
        var url = First(root, "paymentUrl", "checkoutUrl", "initPoint", "init_point", "url");
        var status = MapStatus(First(root, "status"));
        return new PaymentInit(reference, url, status);
    }

    public async Task<PaymentInfo?> GetPaymentAsync(string paymentId, CancellationToken ct = default)
    {
        var path = _opt.GetPaymentPath.Replace("{id}", Uri.EscapeDataString(paymentId));
        using var resp = await _http.GetAsync(path, ct);
        if (resp.StatusCode == HttpStatusCode.NotFound) return null;
        if (!resp.IsSuccessStatusCode)
            throw new PaymentGatewayException($"La pasarela de pagos respondió {(int)resp.StatusCode} al consultar el pago.");

        var root = await ReadJsonAsync(resp, ct);
        var orderId = First(root, "orderId", "externalReference", "external_reference") ?? "";
        return new PaymentInfo(orderId, MapStatus(First(root, "status")));
    }

    // ---------- helpers ----------

    private static async Task<JsonElement> ReadJsonAsync(HttpResponseMessage resp, CancellationToken ct)
    {
        try
        {
            using var doc = JsonDocument.Parse(await resp.Content.ReadAsStringAsync(ct));
            return doc.RootElement.Clone();
        }
        catch (JsonException)
        {
            throw new PaymentGatewayException("La pasarela de pagos devolvió una respuesta que no es JSON válido.");
        }
    }

    /// <summary>Primer campo de texto/número presente (sin distinguir mayúsculas) entre los alias dados.</summary>
    private static string? First(JsonElement root, params string[] names)
    {
        if (root.ValueKind != JsonValueKind.Object) return null;
        foreach (var name in names)
            foreach (var prop in root.EnumerateObject())
            {
                if (!prop.Name.Equals(name, StringComparison.OrdinalIgnoreCase)) continue;
                if (prop.Value.ValueKind == JsonValueKind.String) return prop.Value.GetString();
                if (prop.Value.ValueKind == JsonValueKind.Number) return prop.Value.ToString();
            }
        return null;
    }

    /// <summary>Traduce el estado de la pasarela a los estados de SaborTUC.</summary>
    public static string MapStatus(string? raw) => (raw ?? "").Trim().ToLowerInvariant() switch
    {
        "approved" or "aprobado" or "paid" or "pagado" or "success" or "succeeded" or "accredited" => PaymentStatuses.Aprobado,
        "rejected" or "rechazado" or "failed" or "fallido" or "cancelled" or "canceled" or "denied" or "declined" => PaymentStatuses.Rechazado,
        _ => PaymentStatuses.Pendiente,
    };
}

public class PaymentGatewayException : Exception
{
    public PaymentGatewayException(string message) : base(message) { }
}
