using System.Security.Cryptography;
using System.Text;

namespace SaborTuc.Api.Security;

public static class SecretComparer
{
    /// <summary>Compara claves en tiempo constante. Una clave esperada vacía nunca coincide.</summary>
    public static bool Matches(string? expected, string? given)
    {
        if (string.IsNullOrEmpty(expected) || given is null) return false;
        var a = Encoding.UTF8.GetBytes(expected);
        var b = Encoding.UTF8.GetBytes(given);
        return a.Length == b.Length && CryptographicOperations.FixedTimeEquals(a, b);
    }
}
