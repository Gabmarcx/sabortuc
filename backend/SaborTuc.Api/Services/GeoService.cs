using System.Globalization;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Options;

namespace SaborTuc.Api.Services;

public record RouteEstimate(double DistanceKm, int DurationMin, string Source);

public class OpenRouteServiceOptions
{
    public string ApiKey { get; set; } = "";
}

public interface IGeoService
{
    /// <summary>Calcula distancia y tiempo entre el restaurante y la dirección del cliente.</summary>
    Task<RouteEstimate> EstimateAsync(double originLat, double originLng, string street, string number, string neighborhood, CancellationToken ct = default);
}

/// <summary>
/// Cliente de la API externa de mapas (OpenRouteService): geocodifica la dirección del cliente y
/// calcula la ruta en auto. Si no hay API key o la API falla, usa un cálculo local aproximado
/// (distancia Haversine x 1.3) para que el sistema siga funcionando.
/// </summary>
public class GeoService : IGeoService
{
    private const string BaseUrl = "https://api.openrouteservice.org";

    // Centros aproximados de los barrios (usados solo cuando no se puede geocodificar).
    private static readonly Dictionary<string, (double Lat, double Lng)> NeighborhoodCenters = new(StringComparer.OrdinalIgnoreCase)
    {
        ["Centro"] = (-26.8290, -65.2060),
        ["Centro Histórico"] = (-26.8320, -65.2025),
        ["Plaza Independencia"] = (-26.8309, -65.2038),
        ["Barrio Norte"] = (-26.8130, -65.2100),
        ["Barrio Sur"] = (-26.8400, -65.2050),
    };

    private readonly HttpClient _http;
    private readonly string _apiKey;
    private readonly ILogger<GeoService> _log;

    public GeoService(HttpClient http, IOptions<OpenRouteServiceOptions> opts, ILogger<GeoService> log)
    {
        _http = http;
        _apiKey = opts.Value.ApiKey;
        _log = log;
    }

    public async Task<RouteEstimate> EstimateAsync(double originLat, double originLng, string street, string number, string neighborhood, CancellationToken ct = default)
    {
        if (!string.IsNullOrWhiteSpace(_apiKey))
        {
            try
            {
                var dest = await GeocodeAsync(street, number, neighborhood, ct);
                if (dest is not null)
                {
                    var route = await RouteAsync(originLat, originLng, dest.Value.Lat, dest.Value.Lng, ct);
                    if (route is not null) return route;
                }
            }
            catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException or JsonException)
            {
                _log.LogWarning(ex, "Falló la API de mapas; se usa el cálculo local de respaldo.");
            }
        }

        // Respaldo: centro del barrio + Haversine
        var (lat, lng) = NeighborhoodCenters.TryGetValue(neighborhood, out var c) ? c : NeighborhoodCenters["Centro"];
        var km = Math.Round(Haversine(originLat, originLng, lat, lng) * 1.3, 1);
        return new RouteEstimate(km, (int)Math.Ceiling(km / 25.0 * 60) + 5, "estimado");
    }

    private async Task<(double Lat, double Lng)?> GeocodeAsync(string street, string number, string neighborhood, CancellationToken ct)
    {
        var text = Uri.EscapeDataString($"{street} {number}, {neighborhood}, San Miguel de Tucumán, Tucumán, Argentina");
        var url = $"{BaseUrl}/geocode/search?api_key={_apiKey}&text={text}&boundary.country=AR&focus.point.lon=-65.21&focus.point.lat=-26.83&size=1";
        using var resp = await _http.GetAsync(url, ct);
        resp.EnsureSuccessStatusCode();
        using var doc = JsonDocument.Parse(await resp.Content.ReadAsStringAsync(ct));
        var features = doc.RootElement.GetProperty("features");
        if (features.GetArrayLength() == 0) return null;
        var coords = features[0].GetProperty("geometry").GetProperty("coordinates");
        return (coords[1].GetDouble(), coords[0].GetDouble()); // ORS devuelve [lon, lat]
    }

    private async Task<RouteEstimate?> RouteAsync(double lat1, double lng1, double lat2, double lng2, CancellationToken ct)
    {
        var body = JsonSerializer.Serialize(new { coordinates = new[] { new[] { lng1, lat1 }, new[] { lng2, lat2 } } });
        using var req = new HttpRequestMessage(HttpMethod.Post, $"{BaseUrl}/v2/directions/driving-car")
        {
            Content = new StringContent(body, Encoding.UTF8, "application/json"),
        };
        req.Headers.TryAddWithoutValidation("Authorization", _apiKey);
        using var resp = await _http.SendAsync(req, ct);
        resp.EnsureSuccessStatusCode();
        using var doc = JsonDocument.Parse(await resp.Content.ReadAsStringAsync(ct));
        var routes = doc.RootElement.GetProperty("routes");
        if (routes.GetArrayLength() == 0) return null;
        var summary = routes[0].GetProperty("summary");
        var meters = summary.GetProperty("distance").GetDouble();
        var seconds = summary.GetProperty("duration").GetDouble();
        return new RouteEstimate(Math.Round(meters / 1000.0, 1, MidpointRounding.AwayFromZero), (int)Math.Ceiling(seconds / 60.0), "openrouteservice");
    }

    private static double Haversine(double lat1, double lon1, double lat2, double lon2)
    {
        const double R = 6371.0;
        double ToRad(double d) => d * Math.PI / 180.0;
        var dLat = ToRad(lat2 - lat1);
        var dLon = ToRad(lon2 - lon1);
        var a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2) +
                Math.Cos(ToRad(lat1)) * Math.Cos(ToRad(lat2)) * Math.Sin(dLon / 2) * Math.Sin(dLon / 2);
        return R * 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
    }
}
