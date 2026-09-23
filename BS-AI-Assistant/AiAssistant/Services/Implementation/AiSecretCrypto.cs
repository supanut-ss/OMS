using System.Security.Cryptography;
using System.Text;

namespace AiAssistant.Services.Implementation;

/// <summary>
/// Reversible AES helper used for storing provider secrets in the database.
/// Format: Base64(salt[16] + iv[16] + ciphertext).
/// </summary>
public static class AiSecretCrypto
{
    private const int SaltSize = 16;
    private const int KeySize = 32;
    private const int Iterations = 100_000;
    private const string DefaultPassphrase = "Local@dmin";
    private const string EnvPassphraseName = "AI_PROVIDER_SECRET_KEY";

    public static string Encrypt(string plainText)
    {
        if (string.IsNullOrEmpty(plainText))
            return plainText;

        using var aes = Aes.Create();
        aes.KeySize = 256;
        aes.Mode = CipherMode.CBC;
        aes.Padding = PaddingMode.PKCS7;

        byte[] salt = RandomNumberGenerator.GetBytes(SaltSize);
        byte[] iv = RandomNumberGenerator.GetBytes(16);

        using var keyDerivation = new Rfc2898DeriveBytes(
            GetPassphrase(),
            salt,
            Iterations,
            HashAlgorithmName.SHA256);

        aes.Key = keyDerivation.GetBytes(KeySize);
        aes.IV = iv;

        using var encryptor = aes.CreateEncryptor();
        using var ms = new MemoryStream();
        ms.Write(salt);
        ms.Write(iv);

        using (var cs = new CryptoStream(ms, encryptor, CryptoStreamMode.Write))
        using (var sw = new StreamWriter(cs, Encoding.UTF8))
        {
            sw.Write(plainText);
        }

        return Convert.ToBase64String(ms.ToArray());
    }

    public static string Decrypt(string cipherText)
    {
        if (string.IsNullOrWhiteSpace(cipherText))
            return cipherText;

        byte[] buffer = Convert.FromBase64String(cipherText);

        using var aes = Aes.Create();
        aes.KeySize = 256;
        aes.Mode = CipherMode.CBC;
        aes.Padding = PaddingMode.PKCS7;

        byte[] salt = new byte[SaltSize];
        byte[] iv = new byte[16];
        byte[] cipher = new byte[buffer.Length - salt.Length - iv.Length];

        Buffer.BlockCopy(buffer, 0, salt, 0, salt.Length);
        Buffer.BlockCopy(buffer, salt.Length, iv, 0, iv.Length);
        Buffer.BlockCopy(buffer, salt.Length + iv.Length, cipher, 0, cipher.Length);

        using var keyDerivation = new Rfc2898DeriveBytes(
            GetPassphrase(),
            salt,
            Iterations,
            HashAlgorithmName.SHA256);

        aes.Key = keyDerivation.GetBytes(KeySize);
        aes.IV = iv;

        using var decryptor = aes.CreateDecryptor();
        using var ms = new MemoryStream(cipher);
        using var cs = new CryptoStream(ms, decryptor, CryptoStreamMode.Read);
        using var sr = new StreamReader(cs, Encoding.UTF8);

        return sr.ReadToEnd();
    }

    public static string? TryDecrypt(string? cipherText)
    {
        if (string.IsNullOrWhiteSpace(cipherText))
            return cipherText;

        try
        {
            return Decrypt(cipherText);
        }
        catch
        {
            return null;
        }
    }

    private static string GetPassphrase()
    {
        var envPassphrase = Environment.GetEnvironmentVariable(EnvPassphraseName);
        return string.IsNullOrWhiteSpace(envPassphrase) ? DefaultPassphrase : envPassphrase;
    }
}