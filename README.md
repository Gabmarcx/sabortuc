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
- **Pasarela de pagos** (API de otro grupo): para procesar el pago del pedido.
- *(Extra)* API de mapas OpenRouteService: distancia y tiempo de entrega.

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
| Crear un pedido | `POST /api/orders` |
| Consultar pedidos (opcional `?email=`) | `GET /api/orders` |
| Consultar un pedido | `GET /api/orders/{id}` |
| Consultar el estado de un pedido | `GET /api/orders/{id}/status` |
| Cancelar un pedido | `POST /api/orders/{id}/cancel` |
| Avanzar estado (solo demo, `Demo:EnableManualAdvance`) | `POST /api/orders/{id}/advance` |
| Distancia y tiempo restaurante → cliente | `GET /api/delivery/estimate` |
| Notificación (webhook) de la pasarela de pagos | `POST /api/payments/webhook` |
| Marcar producto disponible/agotado (**requiere** `X-Api-Key`) | `PATCH /api/restaurants/{id}/products/{productId}/availability` |

Swagger: `http://localhost:5080/swagger` (botón *Authorize* para cargar la `X-Api-Key`).

## Pasarela de pagos (API externa)

Flujo de un pago online (`mercadopago` / `tarjeta_online`):

1. El cliente crea el pedido (`POST /api/orders`). El backend calcula el total y llama a la API de pagos: `POST {BaseUrl}/payments`.
2. La pasarela responde con el id del pago y el link de pago; el pedido queda con `paymentStatus = pendiente` y el frontend abre el link.
3. Cuando el cliente paga, la pasarela avisa a `POST /api/payments/webhook` con el id del pago.
4. El backend **no confía en el cuerpo del webhook**: consulta a la pasarela `GET {BaseUrl}/payments/{id}` y actualiza el pedido (`aprobado` / `rechazado`).
5. Un pedido con pago online **no puede confirmarse hasta que el pago esté aprobado**; si el pago es rechazado, el pedido se cancela. Si la pasarela está caída al crear el pedido, el pedido se cancela y la API responde `502`.

El código está en `backend/SaborTuc.Api/Services/PaymentGateway.cs` (`ExternalPaymentGateway`).

### Conectar la API del otro grupo

En `backend/SaborTuc.Api/appsettings.json` (o con variables de entorno / *user-secrets*):

```json
"PaymentGateway": {
  "Provider": "External",
  "BaseUrl": "https://pagos-del-otro-grupo.example.com/api",
  "ApiKey": "<la clave que les den>",
  "ApiKeyHeader": "X-Api-Key",
  "CreatePaymentPath": "payments",
  "GetPaymentPath": "payments/{id}",
  "NotificationUrl": "https://<tu-api-publica>/api/payments/webhook"
}
```

```bash
dotnet user-secrets set "PaymentGateway:ApiKey" "xxxx"
```

**Contrato que asume el cliente** (se ajusta únicamente en `ExternalPaymentGateway` si la API del otro grupo es distinta):

- `POST {BaseUrl}/payments` con `{ orderId, amount, currency, description, customer{name,email,phone}, paymentMethod, notificationUrl, returnUrl }`
  → responde `{ paymentId | id, paymentUrl | checkoutUrl | url, status }`
- `GET {BaseUrl}/payments/{id}` → responde `{ orderId | externalReference, status }`
- Estados aceptados: `approved/aprobado/paid/success…` → *aprobado*; `rejected/rechazado/failed/cancelled…` → *rechazado*; cualquier otro → *pendiente*.

### Modo desarrollo sin la API externa (`Provider = "Mock"`, valor por defecto)

Usa `MockPaymentGateway`: genera un link a una página simulada (`/api/mock-payments/{id}`) con botones **Aprobar / Rechazar**, que avisa al backend igual que el webhook real. Sirve para probar todo el flujo. **Para la entrega/defensa, cambiar a `Provider = "External"`.**

## API de mapas (extra)

OpenRouteService geocodifica la dirección y calcula distancia/tiempo (se guarda en el pedido y se rechazan pedidos fuera de `Business:MaxDeliveryKm`). Sin `OpenRouteService:ApiKey` usa un respaldo local (Haversine).

```bash
cd backend/SaborTuc.Api
dotnet user-secrets init
dotnet user-secrets set "OpenRouteService:ApiKey" "xxxxxxxx"   # https://openrouteservice.org (gratis)
```

## Reglas de negocio (en el servidor)

- El cliente solo envía productos y cantidades: **precios, envío, tarifa de servicio, total y estado del pago los calcula el backend**.
- No se aceptan pedidos de un restaurante cerrado, con productos no disponibles, por debajo del pedido mínimo o fuera del radio de entrega.
- Flujo de estados: `recibido → confirmado → en_preparacion → en_camino → entregado` (o `cancelado`).
- `Simulation:Enabled=true` hace avanzar los pedidos solos cada pocos minutos (solo demo; respeta el pago online pendiente).

## Seguridad

- Endpoints de administración (`PATCH .../availability`) exigen el header `X-Api-Key` = `Security:AdminApiKey`. **Cambiar la clave de desarrollo** antes de desplegar.
- El webhook puede protegerse con `Security:WebhookSecret` (header `X-Webhook-Secret`) y además re-consulta el estado real a la pasarela.
- Limitación conocida: no hay login de usuarios en la API (el alcance de la consigna no lo pide); `GET /api/orders` sin `email` lista todos los pedidos.

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
Cubren las reglas de `OrderService` (totales, restaurante cerrado, producto no disponible, pedido mínimo, radio de entrega), el flujo de pago (pendiente → aprobado → confirmable, rechazado → cancelado, pasarela caída → 502) y el cliente HTTP de la pasarela externa con respuestas simuladas.

### Base de datos
Ver `database/README.md`. Por defecto SQLite (sin instalar nada); SQL Server opcional con `database/docker-compose.yml`, `schema.sql` y `seed.sql`. La base se crea con `EnsureCreated()` al iniciar; para migraciones: `dotnet ef migrations add Inicial` y usar `Migrate()` en `Program.cs`.

## Estructura

```
backend/SaborTuc.Api
├── Controllers/   Restaurants, Orders, Payments (webhook), MockPayments (solo dev), Delivery
├── Services/      OrderService (reglas), PaymentGateway (cliente API de pagos), MockPaymentGateway, GeoService (mapas), OrderSimulator
├── Security/      AdminKey (X-Api-Key), comparación segura de secretos
├── Models/        Entidades EF Core (Restaurant, Product, Order, OrderItem, OrderStatusHistory)
├── Data/          AppDbContext, DbSeeder, restaurants.seed.json
└── Dtos/          Contratos JSON (idénticos a frontend/src/types/index.ts)
frontend/src/       Frontend React (services/api.ts consume la API)
```
