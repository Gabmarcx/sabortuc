# Fase 2: integración con la API de mapas del otro grupo

## Estado actual

SaborTUC ya consume OpenRouteService desde `GeoService`, detrás de la interfaz `IGeoService`. El backend necesita estimar una ruta desde el restaurante hasta la dirección ingresada por el cliente. Si OpenRouteService no está configurado o falla, hoy usa una aproximación basada en el centro del barrio. Esa aproximación sirve para desarrollo, pero no debería tomarse como una distancia real para decidir cobertura en la integración final.

## Contrato que necesita SaborTUC

La API del otro grupo debe poder resolver una estimación de ruta con:

- **Origen:** latitud y longitud del restaurante, leídas de nuestra base de datos.
- **Destino:** calle, número, barrio y ciudad/localidad del cliente.
- **Respuesta:** distancia de ruta en kilómetros y duración estimada en minutos.

En SaborTUC el contrato interno está definido por `IGeoService.EstimateAsync(originLat, originLng, street, number, neighborhood)`, que devuelve `RouteEstimate(DistanceKm, DurationMin, Source)`. La ruta concreta, nombres JSON, autenticación y URL se adaptarán al contrato que confirme el otro grupo; todavía no hay que asumir un endpoint.

## Acuerdos a cerrar entre los grupos

Antes de conectar servicios, intercambien y registren:

1. URL base por ambiente y endpoint exacto.
2. Método HTTP, headers y esquema de autenticación, incluyendo cómo compartir secretos sin subirlos al repositorio.
3. JSON de solicitud y respuesta, con nombres y tipos de campos.
4. Convención de coordenadas (`lat`/`lng`), unidades de distancia y duración, y si la distancia es por ruta vial o línea recta.
5. Qué respuesta se devuelve cuando la dirección no se encuentra o no existe una ruta.
6. Errores HTTP, límites de uso, timeout y política de reintentos.
7. URL de pruebas, datos de ejemplo y disponibilidad del servicio para la demostración.
8. Si la API solo calcula entre coordenadas, quién geocodifica la dirección del cliente.

No envíen claves de API al frontend. La llamada entre servicios debe hacerse desde el backend de SaborTUC.

## Plan de integración

1. Confirmar el contrato anterior y guardarlo en esta documentación.
2. Implementar un cliente HTTP nuevo para el proveedor del otro grupo, manteniendo `IGeoService` como interfaz del dominio.
3. Seleccionar el proveedor y su configuración en `Program.cs`; guardar URL y credenciales en configuración segura.
4. Definir qué hacer si la API de mapas no responde. En la defensa se debe distinguir una ruta real de una estimación local; no presentar el centro del barrio como geocodificación exacta.
5. Verificar manualmente: dirección dentro del radio, fuera del radio, dirección no encontrada, proveedor caído y timeout.
6. Probar el flujo completo de pedido y confirmar que `DistanceKm`, `RouteDurationMin` y el límite `Business:MaxDeliveryKm` reflejan la respuesta acordada.
7. Actualizar Swagger/README y preparar una demostración conjunta con el otro grupo.

## Criterio de aceptación

La integración está lista cuando SaborTUC obtiene del otro grupo distancia y duración con las unidades acordadas, rechaza las direcciones fuera del radio de cobertura, maneja de forma clara errores y timeouts, y permite probar el flujo sin exponer credenciales.
