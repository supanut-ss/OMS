using System;
using System.IO;
using System.Security.Cryptography;
using System.Text;

namespace Authentication.Prototype
{
    public static class Encryption
    {
        // ❗ แนะนำให้ย้ายไป appsettings / environment variable
        private static string _key = "Local@dmin";

        public static string Key
        {
            set => _key = value;
        }

        private const int SaltSize = 16;
        private const int KeySize = 32; // 256 bit
        private const int Iterations = 100_000;

        public static string Encrypt(this string plainText)
        {
            if (string.IsNullOrEmpty(plainText))
                return plainText;

            using var aes = Aes.Create();
            aes.KeySize = 256;
            aes.Mode = CipherMode.CBC;
            aes.Padding = PaddingMode.PKCS7;

            byte[] salt = RandomNumberGenerator.GetBytes(SaltSize);

            using var keyDerivation = new Rfc2898DeriveBytes(_key, salt, Iterations, HashAlgorithmName.SHA256);
            aes.Key = keyDerivation.GetBytes(KeySize);
            aes.GenerateIV();

            using var encryptor = aes.CreateEncryptor();
            using var ms = new MemoryStream();

            // format: salt + iv + ciphertext
            ms.Write(salt);
            ms.Write(aes.IV);

            using (var cs = new CryptoStream(ms, encryptor, CryptoStreamMode.Write))
            using (var sw = new StreamWriter(cs, Encoding.UTF8))
            {
                sw.Write(plainText);
            }

            return Convert.ToBase64String(ms.ToArray());
        }

        public static string Decrypt(this string cipherText)
        {
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

            using var keyDerivation =
                new Rfc2898DeriveBytes(_key, salt, Iterations, HashAlgorithmName.SHA256);

            aes.Key = keyDerivation.GetBytes(KeySize);
            aes.IV = iv;

            using var decryptor = aes.CreateDecryptor();
            using var ms = new MemoryStream(cipher);
            using var cs = new CryptoStream(ms, decryptor, CryptoStreamMode.Read);
            using var sr = new StreamReader(cs, Encoding.UTF8);

            return sr.ReadToEnd();
        }

    }
}
