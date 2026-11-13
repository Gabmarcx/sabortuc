using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace SaborTuc.Api.Security;

/// <summary>Autentica la clave propia del restaurante indicado en la ruta.</summary>
[AttributeUsage(AttributeTargets.Method | AttributeTargets.Class)]
public sealed class RestaurantOperationsKeyAttribute : Attribute, IAuthorizationFilter
{
    public void OnAuthorization(AuthorizationFilterContext context)
    {
        var cfg = context.HttpContext.RequestServices.GetRequiredService<IConfiguration>();
        var restaurantId = context.RouteData.Values["restaurantId"]?.ToString();
        var given = context.HttpContext.Request.Headers["X-Api-Key"].ToString();
        var expected = string.IsNullOrWhiteSpace(restaurantId)
            ? null
            : cfg[$"Operations:Restaurants:{restaurantId}:ApiKey"];

        if (!SecretComparer.Matches(expected, given))
            context.Result = new UnauthorizedObjectResult(new { message = "Clave inválida para este restaurante." });
    }
}
