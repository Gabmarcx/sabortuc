using Microsoft.EntityFrameworkCore;
using SaborTuc.Api.Data;
using SaborTuc.Api.Services;
using SaborTuc.Api.Models;
using Microsoft.OpenApi.Models;

var builder = WebApplication.CreateBuilder(args);
var cfg = builder.Configuration;

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.AddSecurityDefinition("ApiKey", new OpenApiSecurityScheme
    {
        Type = SecuritySchemeType.ApiKey, In = ParameterLocation.Header, Name = "X-Api-Key",
        Description = "Clave de administración (Security:AdminApiKey). Solo la piden los endpoints de administración.",
    });
    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        { new OpenApiSecurityScheme { Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "ApiKey" } }, new List<string>() },
    });
});

// ---- Base de datos (SQLite por defecto; SQL Server cambiando Database:Provider) ----
var provider = cfg["Database:Provider"] ?? "Sqlite";
builder.Services.AddDbContext<AppDbContext>(opt =>
{
    if (provider.Equals("SqlServer", StringComparison.OrdinalIgnoreCase))
        opt.UseSqlServer(cfg["Database:SqlServer"]);
    else
        opt.UseSqlite(ResolveSqliteConnectionString(cfg["Database:Sqlite"], builder.Environment.ContentRootPath));
});

// ---- Configuración tipada ----
builder.Services.Configure<BusinessOptions>(cfg.GetSection("Business"));
builder.Services.Configure<OpenRouteServiceOptions>(cfg.GetSection("OpenRouteService"));

// ---- APIs externas ----
// Mapas: OpenRouteService (con respaldo local si no hay API key)
builder.Services.AddHttpClient<IGeoService, GeoService>(c => c.Timeout = TimeSpan.FromSeconds(8));

// Pagos: Mercado Pago Checkout Pro Orders API (o una API externa compatible si se configura explícitamente).
builder.Services.Configure<PaymentGatewayOptions>(cfg.GetSection("PaymentGateway"));
var payOpts = cfg.GetSection("PaymentGateway").Get<PaymentGatewayOptions>() ?? new PaymentGatewayOptions();
if (payOpts.Provider.Equals("MercadoPago", StringComparison.OrdinalIgnoreCase))
{
    // Sin credenciales, la API sigue disponible para otras operaciones; el gateway
    // dará un error claro si se intenta iniciar un pago online.
    builder.Services.AddHttpClient<IPaymentGateway, MercadoPagoOrdersGateway>(c =>
    {
        c.BaseAddress = new Uri("https://api.mercadopago.com/");
        c.Timeout = TimeSpan.FromSeconds(15);
    });
}
else if (payOpts.Provider.Equals("External", StringComparison.OrdinalIgnoreCase))
{
    if (string.IsNullOrWhiteSpace(payOpts.BaseUrl))
        throw new InvalidOperationException("PaymentGateway:BaseUrl es obligatorio cuando PaymentGateway:Provider = External.");
    builder.Services.AddHttpClient<IPaymentGateway, ExternalPaymentGateway>(c =>
    {
        c.BaseAddress = new Uri(payOpts.BaseUrl.TrimEnd('/') + "/");
        c.Timeout = TimeSpan.FromSeconds(10);
    });
}
else
{
    throw new InvalidOperationException($"PaymentGateway:Provider no soportado: '{payOpts.Provider}'. Usá 'MercadoPago' o 'External'.");
}

builder.Services.AddScoped<OrderService>();
if (cfg.GetValue<bool>("Simulation:Enabled")) builder.Services.AddHostedService<OrderSimulator>();

// ---- CORS para el frontend ----
var origins = cfg.GetSection("Cors:Origins").Get<string[]>() ?? new[] { "http://localhost:3000" };
builder.Services.AddCors(o => o.AddDefaultPolicy(p => p.WithOrigins(origins).AllowAnyHeader().AllowAnyMethod()));

var app = builder.Build();

// ---- Crear la base y cargar datos de demo ----
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.EnsureCreated();
    DbSeeder.Seed(db);
}

// ---- Errores de negocio -> respuestas HTTP con { message } ----
app.Use(async (ctx, next) =>
{
    try { await next(); }
    catch (OrderException ex)
    {
        ctx.Response.StatusCode = ex.StatusCode;
        await ctx.Response.WriteAsJsonAsync(new { message = ex.Message });
    }
});

app.UseSwagger();
app.UseSwaggerUI();
app.UseCors();
app.MapControllers();
app.MapGet("/", () => Results.Redirect("/swagger"));

app.Run();


// Resuelve la ruta del .db respecto a la carpeta del proyecto (no al directorio desde donde se ejecuta)
// y crea la carpeta si no existe. Así funciona igual con `dotnet run`, Visual Studio o cualquier PC.
static string ResolveSqliteConnectionString(string? configured, string contentRoot)
{
    var csb = new Microsoft.Data.Sqlite.SqliteConnectionStringBuilder(configured ?? "Data Source=../../database/sabortuc.db");
    if (!Path.IsPathRooted(csb.DataSource) && csb.DataSource != ":memory:")
        csb.DataSource = Path.GetFullPath(Path.Combine(contentRoot, csb.DataSource));
    Directory.CreateDirectory(Path.GetDirectoryName(csb.DataSource)!);
    return csb.ToString();
}
