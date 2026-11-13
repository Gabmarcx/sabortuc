# SaborTUC – Plataforma de pedidos y delivery

Trabajo de **Programación de Aplicaciones Distribuidas**. Sistema para gestionar pedidos de comida en San Miguel de Tucumán.

## Propuesta

Los clientes consultan restaurantes y productos, realizan pedidos, **pagan online** y consultan el estado de su pedido.

**Lo que ofrecemos mediante nuestra API**
- Consultar restaurantes y productos.
- Consultar precios y disponibilidad.
- Crear y consultar pedidos.
- Consultar el estado de un pedido.

**Lo que consumimos de APIs externas**
- **Mercado Pago Checkout Pro**: para procesar el pago online del pedido.
- **API de mapas** (integración coordinada con otro grupo): distancia y duración estimada de la entrega. Actualmente hay un cliente OpenRouteService con respaldo aproximado para desarrollo; la integración con el otro grupo está pendiente de acordar y podría organizarse como Fase 2.1. Ver [plan de integración de mapas](docs/FASE2_MAPAS.md).

```
┌──────────────┐   REST/JSON   ┌──────────────────────────┐   HTTP/JSON   ┌───────────────────────────┐
│  Frontend    │ ────────────► │  API SaborTUC (.NET 6)   │ ────────────► │ API de PAGOS (externa)    │
│  React/Vite  │ ◄──────────── │  ASP.NET Core + EF Core  │ ◄──────────── │  crear pago / consultar   │
└──────────────┘               │                          │   webhook     └───────────────────────────┘
                               │                          │ ────────────► ┌───────────────────────────┐
                               └────────────┬─────────────┘   HTTPS       │ OpenRouteService (mapas)  │
                                            │ EF Core                     └───────────────────────────┘
                                    SQLite / SQL Server
```

## Lo que ofrece nuestra API

| Funcionalidad | Endpoint |
|---|---|
| Consultar restaurantes (filtros: `search`, `category`, `neighborhood`, `onlyOpen`, `maxDeliveryFee`, `priceRange`, `sortBy`) | `GET /api/restaurants` |
| Consultar un restaurante con su carta | `GET /api/restaurants/{id}` |
| Consultar productos, precios y disponibilidad | `GET /api/restaurants/{id}/products` |
| Verificar precios y disponibilidad de un carrito | `POST /api/restaurants/{id}/availability` |
| Cotizar carrito con precios actuales, envío y tasa de servicio | `POST /api/orders/quote/{restaurantId}` |
| Crear un pedido | `POST /api/orders` |
| Consultar un pedido (header `X-Order-Access-Token`) | `GET /api/orders/{id}` |
| Consultar el estado de un pedido (header `X-Order-Access-Token`) | `GET /api/orders/{id}/status` |
| Cancelar un pedido | `POST /api/orders/{id}/cancel` |
| Avanzar estado (solo demo, requiere `Demo:EnableManualAdvance=true` y `X-Api-Key`) | `POST /api/orders/{id}/advance` |
| Distancia y tiempo restaurante → cliente | `GET /api/delivery/estimate` |
| Notificación (webhook) de la pasarela de pagos | `POST /api/payments/webhook` |
| Marcar producto disponible/agotado (**requiere** `X-Api-Key`) | `PATCH /api/restaurants/{id}/products/{productId}/availability` |
| Bandeja y acciones del restaurante (**requiere** `X-Api-Key` propio del restaurante) | `GET /api/operations/restaurant/{restaurantId}/orders`, `POST .../{id}/accept`, `POST .../{id}/start-preparation` |
| Restaurantes asignados y bandeja del cadete (**requiere** `X-Courier-Key`) | `GET /api/operations/courier/restaurants`, `GET /api/operations/courier/orders`, `POST .../{id}/start-delivery`, `POST .../{id}/deliver` |

Swagger: `http://localhost:5080/swagger` (botón *Authorize* para cargar la `X-Api-Key`).

## Fase 1 — Pasarela de pagos: Mercado Pago Checkout Pro con Orders API

Flujo de un pago online (`mercadopago` / `tarjeta_online`):

1. El backend crea el pedido y calcula el total; después crea una order de Checkout Pro en `POST https://api.mercadopago.com/v1/orders` con `X-Idempotency-Key`.
2. Mercado Pago devuelve `checkout_url`; el frontend redirige al comprador en la misma pestaña.
3. Mercado Pago notifica los cambios en `POST /api/payments/webhook`. El backend verifica `x-signature` y consulta la order real en `GET /v1/orders/{id}`.
4. El backend comprueba que la order esté acreditada y que monto, moneda y referencia coincidan. Entonces marca el pago como `aprobado` y pasa el pedido de `recibido` a `confirmado`.
5. Si el pago es rechazado, el pedido se cancela. Si Mercado Pago falla al crear el pago, el pedido se cancela y la API responde `502`.

La implementación está en `backend/SaborTuc.Api/Services/PaymentGateway.cs` (`MercadoPagoOrdersGateway`). Se eligió Orders API para Checkout Pro porque la documentación actual la recomienda para integraciones nuevas; la API de preferencias queda como alternativa legacy. [Documentación oficial de Checkout Pro](https://www.mercadopago.com.ar/developers/es/reference/online-payments/checkout-pro-orders/overview).

### Configurar y probar el ambiente de prueba

La guía paso a paso para que cada integrante prepare su entorno local está en [Tutorial de Mercado Pago y ngrok](docs/MERCADOPAGO_DESARROLLO.md). Incluye cómo trabajar con una única aplicación del grupo, obtener permisos sin compartir cuentas, guardar los valores localmente y configurar el túnel de webhooks.

Crear una aplicación de **Checkout Pro con API de Orders** desde Mercado Pago Developers. En el entorno **Prueba**, copiar el Access Token de prueba. No guardar Access Tokens ni la firma del webhook en el repositorio. Desde `backend/SaborTuc.Api`, configurar User Secrets:

```bash
dotnet user-secrets set "PaymentGateway:Provider" "MercadoPago"
dotnet user-secrets set "PaymentGateway:AccessToken" "<access-token-de-prueba-del-vendedor>"
dotnet user-secrets set "Security:WebhookSecret" "<firma-secreta-de-webhooks>"
dotnet user-secrets set "PaymentGateway:SuccessUrl" "http://localhost:3000/"
dotnet user-secrets set "PaymentGateway:FailureUrl" "http://localhost:3000/"
dotnet user-secrets set "PaymentGateway:PendingUrl" "http://localhost:3000/"
```

Para recibir webhooks desde una máquina local, mantener el backend en `http://localhost:5080` y exponerlo temporalmente con un túnel HTTPS. En **Integraciones → aplicación → Configuración de webhooks**, ambiente **Prueba**, seleccionar **Order (Mercado Pago)** y configurar `https://<host-publico>/api/payments/webhook`. Mantener abierto el túnel mientras se prueban notificaciones. `NotificationUrl` no se envía como campo de la order.

Para probar una compra con tarjeta en Checkout Pro con Orders, usar una ventana incógnita sin una sesión de Mercado Pago iniciada y una tarjeta de prueba. Si el checkout pide un email, puede ser cualquier dirección válida; no hace falta crear o usar una cuenta compradora de prueba. La vuelta del navegador solo recupera el seguimiento del pedido: **no confirma el pago**; la confirmación depende del webhook y la consulta server-side.

### Validación manual realizada

- **Pago aprobado:** se verificó que Mercado Pago envía el webhook, el backend actualiza el pago a `aprobado`, el pedido pasa a `confirmado` y el historial registra el cambio.
- **Pago rechazado:** se verificó con el titular de prueba `OTHE`; el pago se rechaza y el pedido se cancela.
- Estas pruebas se realizaron en ambiente de prueba con datos de tarjeta de prueba; no representan cobros reales.

El avance de `confirmado` a `en_preparacion`, `en_camino` y `entregado` corresponde a la operación del restaurante y del cadete, no a Mercado Pago. Las interfaces operativas se detallan en la Fase 2.

## Fase 2 — Gestión operativa del pedido

El grupo acordó completar el ciclo visible con interfaces separadas y acotadas por rol. Paneles locales:

- Restaurante: `http://localhost:3000/operaciones/restaurante`
- Cadete: `http://localhost:3000/operaciones/cadete`

El panel del restaurante permite aceptar pedidos offline (`recibido → confirmado`) e iniciar la preparación (`confirmado → en_preparacion`). Los pagos online pendientes quedan bloqueados hasta la aprobación de Mercado Pago. La transferencia se verifica manualmente fuera del sistema antes de aceptar el pedido.

El panel del cadete muestra únicamente los restaurantes asignados a su clave y los pedidos de esos restaurantes en `en_preparacion` o `en_camino`. Puede marcar la salida (`en_preparacion → en_camino`) y registrar la entrega (`en_camino → entregado`). La API vuelve a validar la asignación al cambiar el estado. Estas claves de demo no reemplazan un sistema de autenticación para producción.

Rutas operativas de la API:

- `GET /api/operations/restaurant/{restaurantId}/orders`
- `POST /api/operations/restaurant/{restaurantId}/orders/{id}/accept`
- `POST /api/operations/restaurant/{restaurantId}/orders/{id}/start-preparation`
- `GET /api/operations/courier/restaurants`
- `GET /api/operations/courier/orders`
- `POST /api/operations/courier/orders/{id}/start-delivery`
- `POST /api/operations/courier/orders/{id}/deliver`

Para la defensa local, `appsettings.json` ya trae claves demostrativas asociadas a los 20 IDs del seed. Al abrir el panel del restaurante, seleccioná el restaurante por nombre e ingresá la clave de la tabla:

| Restaurante | ID de API | Clave demo |
|---|---|---|
| Il Postino | `il-postino` | `admin1` |
| La Pizzada | `la-pizzada` | `admin2` |
| El Molino | `el-molino` | `admin3` |
| Sir Harris | `sir-harris` | `admin4` |
| El Portal – Comidas Regionales | `el-portal-regionales` | `admin5` |
| La Marina | `la-marina` | `admin6` |
| Leno | `leno` | `admin7` |
| Filipo | `filipo` | `admin8` |
| Beans Florida | `beans-florida` | `admin9` |
| Beans 25 | `beans-25` | `admin10` |
| Los Naranjos Bar y Patio | `los-naranjos` | `admin11` |
| La Leñita | `la-lenita` | `admin12` |
| El Bodegón | `el-bodegon` | `admin13` |
| Mostacho | `mostacho` | `admin14` |
| Pepinillo Hamburguesería | `pepinillo` | `admin15` |
| Ruddy's Centro | `ruddys-centro` | `admin16` |
| Mondo | `mondo` | `admin17` |
| CRAFT Barrio Norte | `craft-barrio-norte` | `admin18` |
| CAPRICE Bar | `caprice-bar` | `admin19` |
| El Cardón – Patio de Comidas Regionales | `el-cardon-regionales` | `admin20` |

El panel del cadete usa la clave `cadete` y está asignado a los 20 restaurantes de demostración. Así se pueden crear pedidos en distintos restaurantes, entrar al panel de cada uno con su clave y luego gestionar todos desde la misma cuenta demostrativa del cadete.

**Estas claves son públicas, predecibles y exclusivas para la demo con datos ficticios. No desplegar el sistema con estas claves.** Para producción se requiere autenticación real, claves privadas y autorización por restaurante/cadete. User Secrets o las variables seguras del hosting pueden sobrescribir la configuración local.

### Ejecutar sin credenciales de Mercado Pago

El proyecto selecciona Mercado Pago como pasarela y no incluye una pantalla de pago simulada. La API puede ejecutarse sin credenciales para trabajar en otras funciones y procesar pedidos con efectivo o transferencia; para iniciar pagos online se deben configurar el Access Token y el secreto de Webhooks según el [tutorial de desarrollo](docs/MERCADOPAGO_DESARROLLO.md). `mercadopago` y `tarjeta_online` se procesan por el mismo Checkout Pro de Mercado Pago. Efectivo y transferencia no se envían a una pasarela: el sistema solo registra el medio seleccionado.

### API de una pasarela de otro grupo

Si el grupo finalmente ofrece su propia API de pagos en lugar de Mercado Pago directo, se puede conservar el proveedor genérico `ExternalPaymentGateway` y configurarlo con su contrato. No mezclar las credenciales ni los webhooks de ese proveedor con Mercado Pago.

## Mapas — integración pendiente (posible Fase 2.1)

La implementación actual de `GeoService` usa OpenRouteService para geocodificar la dirección y calcular distancia/tiempo. Si no hay clave o la API falla, usa un respaldo local aproximado por barrio. La integración con el otro grupo se hará detrás de `IGeoService`; todavía hay que acordar su contrato. El plan y los puntos a confirmar están en [docs/FASE2_MAPAS.md](docs/FASE2_MAPAS.md).

```bash
cd backend/SaborTuc.Api
dotnet user-secrets set "OpenRouteService:ApiKey" "xxxxxxxx"   # https://openrouteservice.org (gratis)
```
El proyecto ya tiene configurado `UserSecretsId`; no es necesario ejecutar `dotnet user-secrets init` de nuevo.

## Reglas de negocio (en el servidor)

- El cliente solo envía productos y cantidades: **precios, envío, tarifa de servicio, total y estado del pago los calcula el backend**.
- El checkout consulta una cotización al backend para mostrar los importes actuales; al crear el pedido, el servidor los vuelve a calcular y valida las reglas de negocio.
- No se aceptan pedidos de un restaurante cerrado, con productos no disponibles, por debajo del pedido mínimo o fuera del radio de entrega.
- Flujo de estados: `recibido → confirmado → en_preparacion → en_camino → entregado` (o `cancelado`).
- `Simulation:Enabled` queda en `false` por defecto. Para una demo se puede activar explícitamente con `Simulation__Enabled=true`; respeta el pago online pendiente.
- El avance manual queda deshabilitado por defecto. Para habilitarlo en una demo, configurar `Demo__EnableManualAdvance=true` y usar `X-Api-Key` en Swagger; el botón ya no aparece en la pantalla del cliente.

## Seguridad

- Los endpoints generales de administración exigen `X-Api-Key` = `Security:AdminApiKey`. El panel operativo valida la clave `Operations:Restaurants:{restaurantId}:ApiKey` por restaurante y la clave de cada cadete contra `Operations:Couriers:{courierId}:ApiKey`, limitándolo a los IDs configurados en `RestaurantIds`. Las claves de demo predecibles están en `appsettings.json` para facilitar la defensa y **deben reemplazarse antes de cualquier despliegue**. Las pantallas conservan la clave solo en la sesión actual del navegador.
- Para Mercado Pago, el webhook valida la firma `x-signature` con `Security:WebhookSecret` y consulta el estado real de la order usando el Access Token. Para el proveedor genérico `External`, se admite el header `X-Webhook-Secret`.
- No hay login de usuarios. Cada pedido devuelve al crearse un código privado (`accessToken`); la API guarda su hash y lo requiere en `X-Order-Access-Token` para consultar, cancelar o avanzar ese pedido. El frontend conserva el código en el navegador para mostrar el historial local. Si se borran los datos del navegador, se pierde el acceso desde ese dispositivo.

## Cómo correrlo

Requisitos: [.NET SDK 6 o superior](https://dotnet.microsoft.com/download/dotnet) y [Node.js](https://nodejs.org).

```
sabortuc/
├── frontend/   React + Vite
├── backend/
│   ├── SaborTuc.Api/     API ASP.NET Core (.NET 6)
│   └── SaborTuc.Tests/   tests xUnit
└── database/   scripts SQL, docker-compose (y sabortuc.db al correr)
```

**Terminal 1 – backend**
```bash
cd backend/SaborTuc.Api
dotnet run          # http://localhost:5080  (Swagger en /swagger)
```
La primera vez descarga los paquetes NuGet y crea `database/sabortuc.db` con 20 restaurantes y 45 productos.

**Terminal 2 – frontend**
```bash
cd frontend
npm install --legacy-peer-deps
npm run dev         # http://localhost:3000  (/api se redirige al backend)
```
El frontend **no tiene datos locales de respaldo**: si el backend no está corriendo muestra un error con botón *Reintentar*.

**Tests**
```bash
cd backend/SaborTuc.Tests
dotnet test
```
La suite cubre reglas de `OrderService` (totales, restaurante cerrado, producto no disponible, pedido mínimo, radio de entrega), escenarios de pago y el cliente HTTP de la pasarela externa con respuestas simuladas. La compra de prueba de Mercado Pago descrita arriba se verificó manualmente; correr la suite antes de integrar los cambios en GitHub.

### Base de datos
Ver `database/README.md`. Por defecto SQLite (sin instalar nada); SQL Server opcional con `database/docker-compose.yml`, `schema.sql` y `seed.sql`. La base se crea con `EnsureCreated()` al iniciar; para migraciones: `dotnet ef migrations add Inicial` y usar `Migrate()` en `Program.cs`.

## Estructura

```
backend/SaborTuc.Api
├── Controllers/   Restaurants, Orders, Payments (webhook), Delivery
├── Services/      OrderService (reglas), PaymentGateway (cliente API de pagos), GeoService (mapas), OrderSimulator
├── Security/      AdminKey (X-Api-Key), comparación segura de secretos
├── Models/        Entidades EF Core (Restaurant, Product, Order, OrderItem, OrderStatusHistory)
├── Data/          AppDbContext, DbSeeder, restaurants.seed.json
└── Dtos/          Contratos JSON (idénticos a frontend/src/types/index.ts)
frontend/src/       Frontend React (services/api.ts consume la API)
```
