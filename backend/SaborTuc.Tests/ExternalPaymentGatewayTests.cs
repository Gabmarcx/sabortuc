using System.Net;
using System.Text;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using SaborTuc.Api.Models;
using SaborTuc.Api.Services;
using Xunit;

namespace SaborTuc.Tests;

/// <summary>Prueba el cliente HTTP de la pasarela externa con respuestas simuladas (sin red).</summary>
public class ExternalPaymentGatewayTests
{
    private class StubHandler : HttpMessageHandler
    {
        public HttpRequestMessage? LastRequest { get; private set; }
        public string? LastBody { get; private set; }
        private readonly HttpStatusCode _status;
        private readonly string _json;
        public StubHandler(HttpStatusCode status, string json) { _status = status; _json = json; }

        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct)
        {
            LastRequest = request;
            LastBody = request.Content is null ? null : await request.Content.ReadAsStringAsync(ct);
            return new HttpResponseMessage(_status) { Content = new StringContent(_json, Encoding.UTF8, "application/json") };
        }
    }

    private static (ExternalPaymentGateway Gateway, StubHandler Handler) Make(HttpStatusCode status, string json)
    {
        var handler = new StubHandler(status, json);
        var http = new HttpClient(handler) { BaseAddress = new Uri("https://pagos.test/api/") };
        var opts = Options.Create(new PaymentGatewayOptions { Provider = "External", ApiKey = "clave-123", BaseUrl = "https://pagos.test/api" });
        return (new ExternalPaymentGateway(http, opts, NullLogger<ExternalPaymentGateway>.Instance), handler);
    }

    private static Order SampleOrder() => new() { Id = "SMT-2026-1234", Total = 3950m, RestaurantName = "Resto", CustomerName = "Ana", CustomerEmail = "a@a.com", CustomerPhone = "1", PaymentMethod = "mercadopago" };

    [Fact]
    public async Task CreatePayment_EnviaElPedidoYLeeLaRespuesta()
    {
        var (gw, handler) = Make(HttpStatusCode.OK, "{\"paymentId\":\"PAY-9\",\"checkoutUrl\":\"https://pagos.test/pay/9\",\"status\":\"pending\"}");

        var init = await gw.CreatePaymentAsync(SampleOrder());

        Assert.Equal("PAY-9", init.Reference);
        Assert.Equal("https://pagos.test/pay/9", init.PaymentUrl);
        Assert.Equal(PaymentStatuses.Pendiente, init.Status);
        Assert.Equal(HttpMethod.Post, handler.LastRequest!.Method);
        Assert.Equal("https://pagos.test/api/payments", handler.LastRequest.RequestUri!.ToString());
        Assert.Contains("SMT-2026-1234", handler.LastBody);
        Assert.Contains("3950", handler.LastBody);
        Assert.True(handler.LastRequest.Headers.Contains("X-Api-Key"));
    }

    [Fact]
    public async Task CreatePayment_ErrorHttp_LanzaPaymentGatewayException()
    {
        var (gw, _) = Make(HttpStatusCode.InternalServerError, "{}");
        await Assert.ThrowsAsync<PaymentGatewayException>(() => gw.CreatePaymentAsync(SampleOrder()));
    }

    [Fact]
    public async Task CreatePayment_RespuestaSinId_LanzaPaymentGatewayException()
    {
        var (gw, _) = Make(HttpStatusCode.OK, "{\"status\":\"pending\"}");
        await Assert.ThrowsAsync<PaymentGatewayException>(() => gw.CreatePaymentAsync(SampleOrder()));
    }

    [Fact]
    public async Task GetPayment_MapeaElEstado()
    {
        var (gw, handler) = Make(HttpStatusCode.OK, "{\"orderId\":\"SMT-2026-1234\",\"status\":\"approved\"}");

        var info = await gw.GetPaymentAsync("PAY-9");

        Assert.Equal("SMT-2026-1234", info!.OrderId);
        Assert.Equal(PaymentStatuses.Aprobado, info.Status);
        Assert.Equal("https://pagos.test/api/payments/PAY-9", handler.LastRequest!.RequestUri!.ToString());
    }

    [Fact]
    public async Task GetPayment_404_DevuelveNull()
    {
        var (gw, _) = Make(HttpStatusCode.NotFound, "{}");
        Assert.Null(await gw.GetPaymentAsync("NO-EXISTE"));
    }
}
