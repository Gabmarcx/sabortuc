using System.Security.Cryptography;
using System.Text;

namespace SaborTuc.Api.Security;

public static class MercadoPagoSignatureVerifier
{
    public static bool IsValid(string? signatureHeader, string? requestId, string? dataId, string secret)
    {
        if (string.IsNullOrWhiteSpace(signatureHeader) || string.IsNullOrWhiteSpace(dataId) || string.IsNullOrWhiteSpace(secret))
            return false;

        string? timestamp = null;
        string? receivedHash = null;
        foreach (var part in signatureHeader.Split(',', StringSplitOptions.RemoveEmptyEntries))
        {
            var pair = part.Split('=', 2, StringSplitOptions.TrimEntries);
            if (pair.Length != 2) continue;
            if (pair[0] == "ts") timestamp = pair[1];
            if (pair[0] == "v1") receivedHash = pair[1];
        }
        if (string.IsNullOrWhiteSpace(timestamp) || string.IsNullOrWhiteSpace(receivedHash)) return false;

        var manifest = $"id:{dataId.ToLowerInvariant()};";
        if (!string.IsNullOrWhiteSpace(requestId)) manifest += $"request-id:{requestId};";
        manifest += $"ts:{timestamp};";

        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secret));
        var expectedHash = Convert.ToHexString(hmac.ComputeHash(Encoding.UTF8.GetBytes(manifest))).ToLowerInvariant();
        try
        {
            return CryptographicOperations.FixedTimeEquals(
                Encoding.ASCII.GetBytes(expectedHash), Encoding.ASCII.GetBytes(receivedHash.ToLowerInvariant()));
        }
        catch (ArgumentException)
        {
            return false;
        }
    }
}
