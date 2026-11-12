using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.Options;
using SaborTuc.Api.Models;

namespace SaborTuc.Api.Services;

public record PaymentInit(string Reference, string? PaymentUrl, string Status);
public record PaymentInfo(string OrderId, string Status, decimal? Amount = null, string? Currency = null);

/// <summary>Configuración de la pasarela de pagos (sección "PaymentGateway" de appsettings.json).</summary>
public class PaymentGatewayOptions
{
    /// <summary>"External" (gateway genérico) o "MercadoPago" (Checkout Pro Orders API).</summary>
    public string Provider { get; set; } = "MercadoPago";

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
    /// <summary>Access Token privado para Mercado Pago; configurar con user-secrets o variable de entorno.</summary>
    public string AccessToken { get; set; } = "";
    public string SuccessUrl { get; set; } = "";
    public string FailureUrl { get; set; } = "";
    public string PendingUrl { get; set; } = "";

}

/// <summary>Checkout Pro de Mercado Pago mediante la API Orders (/v1/orders).</summary>
public sealed class MercadoPagoOrdersGateway : IPaymentGateway
{
    private readonly HttpClient _http;
    private readonly PaymentGatewayOptions _opt;
    private readonly ILogger<MercadoPagoOrdersGateway> _log;

    public MercadoPagoOrdersGateway(HttpClient http, IOptions<PaymentGatewayOptions> options, ILogger<MercadoPagoOrdersGateway> log)
    {
        _http = http;
        _opt = options.Value;
        _log = log;
        if (!string.IsNullOrWhiteSpace(_opt.AccessToken))
            _http.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", _opt.AccessToken);
    }

    public async Task<PaymentInit> CreatePaymentAsync(Order order, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(_opt.AccessToken))
            throw new PaymentGatewayException("Falta configurar PaymentGateway:AccessToken para Mercado Pago.");
        if (order.Discount != 0)
            throw new PaymentGatewayException("La integración actual no admite descuentos en el checkout de Mercado Pago.");

        var items = order.Items.Select(item => new
        {
            external_code = item.ProductId,
            title = item.Name,
            quantity = item.Quantity,
            unit_price = item.Price.ToString("0.00", System.Globalization.CultureInfo.InvariantCulture),
        }).ToList<object>();
        if (order.DeliveryFee > 0)
            items.Add(new { title = "Costo de envío", quantity = 1, unit_price = order.DeliveryFee.ToString("0.00", System.Globalization.CultureInfo.InvariantCulture) });
        if (order.ServiceFee > 0)
            items.Add(new { title = "Tasa de servicio", quantity = 1, unit_price = order.ServiceFee.ToString("0.00", System.Globalization.CultureInfo.InvariantCulture) });

        var body = new Dictionary<string, object>
        {
            ["type"] = "online",
            ["processing_mode"] = "manual",
            ["capture_mode"] = "automatic_async",
            ["external_reference"] = order.Id,
            ["total_amount"] = order.Total.ToString("0.00", System.Globalization.CultureInfo.InvariantCulture),
            ["description"] = $"Pedido {order.Id} - {order.RestaurantName}",
            ["payer"] = new { email = order.CustomerEmail },
            ["items"] = items,
        };

        var onlineConfig = new Dictionary<string, string>();
        if (!string.IsNullOrWhiteSpace(_opt.SuccessUrl)) onlineConfig["success_url"] = WithOrderReturn(_opt.SuccessUrl, "success", order.Id);
        if (!string.IsNullOrWhiteSpace(_opt.FailureUrl)) onlineConfig["failure_url"] = WithOrderReturn(_opt.FailureUrl, "failure", order.Id);
        if (!string.IsNullOrWhiteSpace(_opt.PendingUrl)) onlineConfig["pending_url"] = WithOrderReturn(_opt.PendingUrl, "pending", order.Id);
        if (onlineConfig.Count > 0)
        {
            if (onlineConfig.ContainsKey("success_url")) onlineConfig["auto_return"] = "approved";
            body["config"] = new { online = onlineConfig };
        }

        using var request = new HttpRequestMessage(HttpMethod.Post, "v1/orders")
        {
            Content = JsonContent.Create(body),
        };
        request.Headers.TryAddWithoutValidation("X-Idempotency-Key", order.Id);
        using var response = await _http.SendAsync(request, ct);
        if (!response.IsSuccessStatusCode)
        {
            var errorBody = await response.Content.ReadAsStringAsync(ct);
            var requestId = response.Headers.TryGetValues("x-request-id", out var requestIds)
                ? requestIds.FirstOrDefault()
                : null;
            if (errorBody.Length > 4000) errorBody = errorBody[..4000];
            _log.LogError(
                "Mercado Pago respondió {Status} al crear el pago del pedido {OrderId}. X-Request-Id={RequestId}; respuesta={ResponseBody}",
                (int)response.StatusCode, order.Id, requestId, errorBody);
            throw new PaymentGatewayException($"Mercado Pago respondió {(int)response.StatusCode} al iniciar el pago.");
        }

        using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync(ct));
        var root = doc.RootElement;
        var id = ReadString(root, "id");
        var checkoutUrl = ReadString(root, "checkout_url");
        if (string.IsNullOrWhiteSpace(id) || string.IsNullOrWhiteSpace(checkoutUrl))
            throw new PaymentGatewayException("Mercado Pago no devolvió el id de la orden y checkout_url esperados.");
        return new PaymentInit(id, checkoutUrl, PaymentStatuses.Pendiente);
    }

    public async Task<PaymentInfo?> GetPaymentAsync(string paymentId, CancellationToken ct = default)
    {
        using var response = await _http.GetAsync($"v1/orders/{Uri.EscapeDataString(paymentId)}", ct);
        if (response.StatusCode == HttpStatusCode.NotFound) return null;
        if (!response.IsSuccessStatusCode)
            throw new PaymentGatewayException($"Mercado Pago respondió {(int)response.StatusCode} al consultar la orden.");

        using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync(ct));
        var root = doc.RootElement;
        var status = ReadString(root, "status");
        var detail = ReadString(root, "status_detail");
        var amountText = ReadString(root, "total_amount");
        decimal? amount = decimal.TryParse(amountText, System.Globalization.NumberStyles.Number,
            System.Globalization.CultureInfo.InvariantCulture, out var parsed) ? parsed : null;
        var paidText = ReadString(root, "total_paid_amount");
        var fullyPaid = decimal.TryParse(paidText, System.Globalization.NumberStyles.Number,
            System.Globalization.CultureInfo.InvariantCulture, out var paid) && amount.HasValue && paid >= amount.Value;
        var currency = ReadString(root, "currency");
        var mapped = string.Equals(currency, "ARS", StringComparison.OrdinalIgnoreCase)
            ? MapOrderStatus(status, detail, fullyPaid) : PaymentStatuses.Pendiente;
        return new PaymentInfo(ReadString(root, "external_reference") ?? "", mapped, amount, currency);
    }

    public static string MapOrderStatus(string? status, string? detail, bool fullyPaid)
    {
        var s = (status ?? "").Trim().ToLowerInvariant();
        var d = (detail ?? "").Trim().ToLowerInvariant();
        if (s == "processed" && d == "accredited" && fullyPaid) return PaymentStatuses.Aprobado;
        if (s is "cancelled" or "canceled" or "failed" || d is "expired" or "rejected" or "cancelled" or "canceled")
            return PaymentStatuses.Rechazado;
        return PaymentStatuses.Pendiente;
    }

    private static string? ReadString(JsonElement root, string name)
    {
        if (!root.TryGetProperty(name, out var value)) return null;
        return value.ValueKind == JsonValueKind.String ? value.GetString() : value.ToString();
    }

    private static string WithOrderReturn(string baseUrl, string result, string orderId) =>
        $"{baseUrl}{(baseUrl.Contains('?') ? '&' : '?')}payment={Uri.EscapeDataString(result)}&orderId={Uri.EscapeDataString(orderId)}";
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
