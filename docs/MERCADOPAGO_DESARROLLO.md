# Tutorial local: Mercado Pago Checkout Pro y ngrok

Esta guía explica cómo preparar el proyecto para probar pagos desde una computadora de desarrollo. Se trabaja únicamente en **Prueba**; no se deben activar ni usar credenciales de Producción. La aplicación no tiene una pasarela de pago simulada: los pagos online usan Mercado Pago.

## Antes de empezar: no todos tienen que crear una aplicación

La aplicación de Mercado Pago y sus credenciales pertenecen a una integración. Para el proyecto conviene mantener **una aplicación compartida del grupo** y dar acceso a quienes necesiten trabajar con ella. No hace falta que cada integrante cree una aplicación nueva.

Para ejecutar el proyecto y trabajar con pedidos que no requieran pago online, no hace falta configurar las credenciales. Para iniciar y confirmar pagos online mediante Mercado Pago, cada entorno que vaya a hacer esa prueba necesita el Access Token de prueba y la firma secreta del webhook. La aplicación del grupo puede ser la misma; el túnel HTTPS de ngrok debe apuntar a la computadora que está corriendo el backend.

Para evitar que cada persona comparta contraseñas, el titular de la aplicación puede invitar a sus compañeros como colaboradores de Mercado Pago Developers. Para esta tarea, necesitan el permiso de **Ver integraciones** (consultar credenciales de prueba) y el permiso de **Editar integraciones** (configurar Webhooks de prueba). El titular también puede usar **Credenciales → Compartir credenciales** cuando esa opción esté disponible. No envíen tokens, contraseñas ni códigos de verificación por el chat del grupo.

La URL de prueba de Webhooks es una configuración de la aplicación compartida. Si cada integrante ejecuta el backend en su propia PC, se debe cambiar temporalmente esa URL para que apunte al ngrok de quien prueba en ese momento. No ejecuten pruebas simultáneas con una única URL apuntando a una sola computadora. Alternativamente, designen una computadora para las pruebas integradas.

## 1. Obtener los valores de prueba

1. Entrar a [Mercado Pago Developers](https://www.mercadopago.com.ar/developers/) con la cuenta que tenga acceso a la aplicación del grupo.
2. Abrir **Tus integraciones** y elegir la aplicación de SaborTUC creada como **Checkout Pro** con **API de Orders**.
3. Confirmar que el ambiente seleccionado sea **Prueba**.
4. En **Credenciales**, copiar el **Access Token de prueba**. Es una clave privada de servidor; no usar la Public Key para esta configuración.
5. En **Configuración de webhooks**, seleccionar el ambiente **Prueba**, elegir el evento **Order (Mercado Pago)** y guardar la URL HTTPS como se indica en el paso 4. Al guardar, Mercado Pago muestra/genera la firma secreta para validar notificaciones; copiarla de manera segura.

Si la cuenta no ve la aplicación, pedirle al titular que invite esa cuenta desde la administración de colaboradores o que comparta las credenciales desde la aplicación. La otra opción es crear una aplicación propia de prueba y usar sus propios valores, pero entonces cada quien administra su configuración de Webhooks.

## 2. Guardar valores localmente con .NET User Secrets

User Secrets guarda la configuración de desarrollo fuera del repositorio. El proyecto ya tiene `UserSecretsId`, por lo que **no** hay que ejecutar `dotnet user-secrets init`.

Abrir PowerShell o Git Bash en la raíz del repositorio y ejecutar:

```powershell
cd backend/SaborTuc.Api
dotnet user-secrets set "PaymentGateway:Provider" "MercadoPago"
dotnet user-secrets set "PaymentGateway:AccessToken" "PEGAR_ACCESS_TOKEN_DE_PRUEBA"
dotnet user-secrets set "Security:WebhookSecret" "PEGAR_FIRMA_SECRETA_DE_WEBHOOKS"
```

Reemplazar los dos textos de ejemplo, sin dejar marcadores. No pegarlos en `appsettings.json`, archivos del frontend ni en GitHub. El proveedor predeterminado del proyecto es Mercado Pago. Si faltan credenciales, el backend puede iniciar y servir el resto de la aplicación, pero la creación del pago online fallará hasta que se configuren.

Para verificar qué claves están guardadas localmente sin imprimir sus valores:

```powershell
dotnet user-secrets list
```

Ese comando muestra los valores en pantalla, así que no compartir su salida si contiene secretos.

## 3. Iniciar el proyecto

En una terminal, desde la raíz del repositorio, iniciar el backend:

```powershell
cd backend/SaborTuc.Api
dotnet run
```

Verificar que diga que está escuchando en `http://localhost:5080`. Dejar esta terminal abierta.

En una segunda terminal, desde la raíz del repositorio, iniciar el frontend:

```powershell
cd frontend
npm install --legacy-peer-deps
npm run dev
```

Dejar abierta también esta terminal y navegar a `http://localhost:3000`.

## 4. Instalar y abrir el túnel ngrok

ngrok se instala en la computadora, no dentro de la carpeta del proyecto. Crear una cuenta gratuita en [ngrok](https://ngrok.com/) y seguir su [guía oficial de instalación para Windows](https://ngrok.com/downloads/windows). Luego, en una terminal, guardar el authtoken de ngrok en la configuración local de ngrok:

```powershell
ngrok config add-authtoken "PEGAR_AUTHTOKEN_DE_NGROK"
```

El authtoken de ngrok también es privado: no se agrega a User Secrets ni al repositorio. Para exponer el backend local, abrir otra terminal y ejecutar:

```powershell
ngrok http 5080
```

Dejar la terminal de ngrok abierta. Copiar el dominio HTTPS que muestra, por ejemplo `https://ejemplo.ngrok-free.app`. El nombre puede cambiar si se reinicia el túnel.

## 5. Apuntar Mercado Pago al túnel

En la aplicación de SaborTUC, abrir **Configuración de webhooks**, seleccionar **Prueba** y configurar:

```text
https://DOMINIO-ACTUAL-DE-NGROK/api/payments/webhook
```

Ejemplo de formato (usar el dominio que ngrok muestra en tu terminal, no este ejemplo):

```text
https://ejemplo.ngrok-free.app/api/payments/webhook
```

Marcar **Order (Mercado Pago)**, guardar y copiar la firma secreta que corresponde a esa configuración de Webhooks. Guardarla localmente como se explicó en el paso 2. La aplicación valida la firma recibida en `x-signature`; no se debe reemplazar por `X-Webhook-Secret` ni por el Access Token.

Si se restablece la firma secreta en Mercado Pago, actualizar `Security:WebhookSecret` en User Secrets. Si se reinicia ngrok y cambia el dominio, actualizar la URL de prueba en Mercado Pago. La URL, el backend y ngrok deben seguir activos mientras se realiza la compra.

## 6. Hacer una compra de prueba y confirmar el resultado

1. Asegurarse de que el backend, frontend y ngrok sigan ejecutándose y que el panel de Webhooks tenga la URL HTTPS vigente.
2. En el sitio, iniciar un pedido y seleccionar Mercado Pago Online.
3. Completar el checkout con la tarjeta de prueba que aparece en la aplicación de Developers. Para evitar conflictos con una sesión personal, usar una ventana incógnita y no iniciar sesión con la cuenta personal de Mercado Pago.
4. Al volver al sitio, esperar la notificación. La redirección del navegador por sí sola no confirma el pago.
5. En el seguimiento del pedido, un pago de prueba aprobado debe figurar como **Aprobado y registrado** y el pedido debe avanzar a **Confirmado**. Revisar también la terminal del backend, la terminal/ngrok y la pestaña **Webhooks** de la aplicación para diagnosticar fallas.

Para verificar el escenario rechazado, usar el nombre del titular de prueba indicado por Mercado Pago para rechazo (por ejemplo, `OTHE` en la tarjeta de prueba correspondiente). El pedido rechazado no debe aparecer como pagado/confirmado.

El simulador de notificaciones sirve para comprobar que la URL recibe una llamada, pero un ID arbitrario puede no ser una order consultable por la API. La verificación completa se realiza con una compra de prueba creada por la integración.

## Diagnóstico rápido

| Síntoma | Qué revisar |
|---|---|
| El backend no inicia y dice que falta `AccessToken` o `WebhookSecret` | Confirmar `Provider = MercadoPago` y volver a guardar ambos User Secrets desde `backend/SaborTuc.Api`. |
| Mercado Pago no llega al backend | Backend escuchando en puerto `5080`, ngrok abierto, URL HTTPS correcta y ruta `/api/payments/webhook`. |
| Ngrok devuelve `ERR_NGROK_8012` / `502` y muestra `addr:localhost:8080` (o un puerto distinto) | Es un fallo entre ngrok y el servicio local, no de Mercado Pago ni de sus credenciales. Confirmar que el backend muestre `Now listening on: http://localhost:5080`; detener ngrok y ejecutarlo con `ngrok http http://localhost:5080`. La línea `Forwarding` debe terminar en `-> http://localhost:5080`. Luego repetir la notificación fallida desde el inspector de ngrok o esperar el reintento de Mercado Pago. |
| `401` con “Firma del webhook ... inválida” | La firma secreta de User Secrets debe coincidir con la de **esa misma aplicación/ambiente de prueba**. Comprobar también que el panel apunta al ngrok activo y que se seleccionó `Order (Mercado Pago)`. |
| `502` al procesar un webhook | Mirar el mensaje del backend; puede ser un ID de prueba que no existe en la API, un Access Token que no corresponde, o un problema al consultar la order. |
| Pago aprobado en Mercado Pago, pero el pedido sigue pendiente | Revisar que el webhook haya llegado y no haya respondido `401`/`502`; verificar luego el estado del pedido en el sitio. |
| El dominio de ngrok cambió | Actualizar la URL de prueba del panel y volver a guardar; no cambiar la firma secreta salvo que se haya restablecido. |

## Limpieza y seguridad

- Las credenciales de prueba no procesan pagos de producción, pero siguen siendo privadas y no deben quedar en Git.
- El authtoken de ngrok debe permanecer en la configuración local de ngrok.
- No subir `secrets.json`, `appsettings.*.json` con valores privados, `.env`, bases de datos locales ni capturas que muestren tokens, contraseñas, códigos o firmas.
- No existe una opción de aprobación/rechazo local para pagos online; las pruebas de ese flujo se hacen contra el ambiente de prueba de Mercado Pago.
