# Base de datos

- **SQLite (por defecto):** no hay que hacer nada. Al correr el backend se crea acá el archivo `sabortuc.db` con las tablas y los datos de demo.
- **SQL Server (opcional):**
  1. `docker compose up -d` (usa `docker-compose.yml` de esta carpeta), o usá tu propia instancia.
  2. Crear la base `SaborTuc` y ejecutar `schema.sql` y después `seed.sql`.
  3. En `backend/SaborTuc.Api/appsettings.json` poner `"Provider": "SqlServer"` y ajustar la cadena de conexión.

Tablas: `Restaurants`, `Products`, `Orders`, `OrderItems`, `OrderStatusHistory`.
Para empezar de cero con SQLite, borrar `sabortuc.db` y volver a correr el backend.
