using System.Security.Cryptography;
using System.Text;
using System;
namespace Authentication.Prototype
{
    public static class Encryption // Changed to static class to fix CS1106  
    {
        private static string _key = "Local@dmin";

        public static string Key
        {
            set
            {
                _key = value;
            }
        }

        public static string Encrypt(this string strToEncrypt)
        {
            try
            {
                return Encrypt(strToEncrypt, _key); // Fixed extension method usage  
            }
            catch (Exception ex)
            {
                return "Wrong Input. " + ex.Message;
            }
        }

        public static string Decrypt(this string strEncrypted)
        {
            try
            {
                return Decrypt(strEncrypted, _key); // Fixed extension method usage  
            }
            catch (Exception ex)
            {
                return "Wrong Input. " + ex.Message;
            }
        }

        public static string Encrypt(string strToEncrypt, string strKey)
        {
            try
            {
                using (var objDESCrypto = TripleDES.Create()) // Updated to use TripleDES.Create()  
                using (var objHashMD5 = MD5.Create()) // Updated to use MD5.Create()  
                {
                    byte[] byteHash = objHashMD5.ComputeHash(Encoding.ASCII.GetBytes(strKey));
                    objDESCrypto.Key = byteHash;
                    objDESCrypto.Mode = CipherMode.ECB;

                    byte[] byteBuff = Encoding.UTF8.GetBytes(strToEncrypt);
                    return Convert.ToBase64String(objDESCrypto.CreateEncryptor().TransformFinalBlock(byteBuff, 0, byteBuff.Length));
                }
            }
            catch (Exception ex)
            {
                return "Wrong Input. " + ex.Message;
            }
        }

        public static string Decrypt(string strEncrypted, string strKey)
        {
            try
            {
                using var objDESCrypto = TripleDES.Create();
                using var objHashMD5 = MD5.Create();

                byte[] byteHash = objHashMD5.ComputeHash(Encoding.ASCII.GetBytes(strKey));
                objDESCrypto.Key = byteHash;
                objDESCrypto.Mode = CipherMode.ECB;

                byte[] byteBuff = Convert.FromBase64String(strEncrypted);
                string decrypted = Encoding.UTF8.GetString(
                    objDESCrypto.CreateDecryptor().TransformFinalBlock(byteBuff, 0, byteBuff.Length)
                ).Trim('\0', ' ');

                return decrypted;
            }
            catch (Exception ex)
            {
                return "Wrong Input. " + ex.Message;
            }
        }
    }
}
