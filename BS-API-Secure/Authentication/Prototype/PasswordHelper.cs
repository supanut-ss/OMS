using System;
using System.Linq;
using System.Security.Cryptography;

public static class PasswordHelper
{
    private static readonly char[] Upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".ToCharArray();
    private static readonly char[] Lower = "abcdefghijklmnopqrstuvwxyz".ToCharArray();
    private static readonly char[] Digits = "0123456789".ToCharArray();
    private static readonly char[] Symbols = "!@#$%^&*()-_=+[]{};:,.<>?".ToCharArray();

    public static string GenerateTemporaryPassword(int length = 12)
    {
        if (length < 8) throw new ArgumentException("length must be >= 8");

        var rng = RandomNumberGenerator.Create();
        var passwordChars = new char[length];
        int pos = 0;

        passwordChars[pos++] = PickRandom(rng, Upper);
        passwordChars[pos++] = PickRandom(rng, Lower);
        passwordChars[pos++] = PickRandom(rng, Digits);
        passwordChars[pos++] = PickRandom(rng, Symbols);

        var all = Upper.Concat(Lower).Concat(Digits).Concat(Symbols).ToArray();
        for (; pos < length; pos++)
            passwordChars[pos] = PickRandom(rng, all);

        Shuffle(rng, passwordChars);
        return new string(passwordChars);
    }

    private static char PickRandom(RandomNumberGenerator rng, char[] pool)
    {
        int idx = RandomNumberGenerator.GetInt32(pool.Length);
        return pool[idx];
    }

    private static void Shuffle(RandomNumberGenerator rng, char[] array)
    {
        for (int i = array.Length - 1; i > 0; i--)
        {
            int j = RandomNumberGenerator.GetInt32(i + 1);
            (array[i], array[j]) = (array[j], array[i]);
        }
    }
}
