using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace SaborTuc.Api.Security;

/// <summary>Autentica al cadete y agrega al request sus restaurantes asignados.</summary>
[AttributeUsage(AttributeTargets.Method | AttributeTargets.Class)]
public sealed class CourierKeyAttribute : Attribute, IAuthorizationFilter
{
    public const string RestaurantIdsItemKey = "SaborTuc.CourierRestaurantIds";

    public void OnAuthorization(AuthorizationFilterContext context)
    {
        var cfg = context.HttpContext.RequestServices.GetRequiredService<IConfiguration>();
        var given = context.HttpContext.Request.Headers["X-Courier-Key"].ToString();
        var courier = cfg.GetSection("Operations:Couriers").GetChildren()
            .FirstOrDefault(section => SecretComparer.Matches(section["ApiKey"], given));

        if (courier is null)
        {
            context.Result = new UnauthorizedObjectResult(new { message = "Clave del cadete inválida o ausente (header X-Courier-Key)." });
            return;
        }

        var restaurantIds = courier.GetSection("RestaurantIds").Get<string[]>() ?? Array.Empty<string>();
        if (restaurantIds.Length == 0)
        {
            context.Result = new ObjectResult(new { message = "Este cadete no tiene restaurantes asignados." }) { StatusCode = 403 };
            return;
        }

        context.HttpContext.Items[RestaurantIdsItemKey] = restaurantIds;
    }
}
