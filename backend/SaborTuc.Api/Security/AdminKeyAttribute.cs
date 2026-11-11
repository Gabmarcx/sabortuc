using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace SaborTuc.Api.Security;

/// <summary>
/// Protege los endpoints de administración: exige el header X-Api-Key igual a Security:AdminApiKey.
/// Si la clave no está configurada, el endpoint queda cerrado.
/// </summary>
[AttributeUsage(AttributeTargets.Method | AttributeTargets.Class)]
public class AdminKeyAttribute : Attribute, IAuthorizationFilter
{
    public void OnAuthorization(AuthorizationFilterContext context)
    {
        var cfg = context.HttpContext.RequestServices.GetRequiredService<IConfiguration>();
        var given = context.HttpContext.Request.Headers["X-Api-Key"].ToString();
        if (!SecretComparer.Matches(cfg["Security:AdminApiKey"], given))
            context.Result = new UnauthorizedObjectResult(new { message = "API key de administración inválida o ausente (header X-Api-Key)." });
    }
}
