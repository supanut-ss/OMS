using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using TokenManagement.Models;
namespace TokenManagement.Handler
{
    public class JwtHelper
    {

        public JwtHelper(){}

        public string GenerateToken(string username, string role, string name, string firstName, string lastname, string emailaddress, string localeId)
        {
            var jwt = new JwtSettings
            {
                SecretKey = Environment.GetEnvironmentVariable("ISSUER_SIGIN_KEY") ?? "",
                Issuer = Environment.GetEnvironmentVariable("VALID_ISSUER") ?? "",
                ExpiresInMinutes = int.Parse(Environment.GetEnvironmentVariable("EXPIRES")?.ToString() ?? "30")
            };
            string validAudienceEnv = Environment.GetEnvironmentVariable("VALID_AUDIENCE") ?? "";
            jwt.ValidAudiences = validAudienceEnv
                .Split(',', StringSplitOptions.RemoveEmptyEntries)
                .Select(a => a.Trim())
                .ToList();
            if (jwt.ValidAudiences == null || !jwt.ValidAudiences.Any())
                throw new Exception("No ValidAudiences defined. Cannot generate token.");
            var keyBytes = Encoding.UTF8.GetBytes(jwt.SecretKey);

            // ตรวจสอบให้แน่ใจว่า key ยาวพอ
            if (keyBytes.Length < 32)
                throw new Exception("JWT SecretKey ต้องมีความยาวอย่างน้อย 32 bytes (256 bits)");

            var signingKey = new SymmetricSecurityKey(keyBytes); // ✅ ตรงนี้สำคัญ

            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(new[]
                {
                    new Claim("Role", role),
                    new Claim("UserId", username),
                    new Claim("Name", name),
                    new Claim("FirstName", firstName),
                    new Claim("LastName", lastname),
                    new Claim("Email", emailaddress),
                    new Claim("LocaleId", localeId),
                    new Claim("LoginDate", DateTime.Now.ToString("O")) // ISO8601 format
                }),
                Expires = DateTime.Now.AddMinutes(jwt.ExpiresInMinutes),
                Issuer = jwt.Issuer,
                Audience = jwt.ValidAudiences.First(),
                SigningCredentials = new SigningCredentials(signingKey, SecurityAlgorithms.HmacSha256Signature)
            };


            var tokenHandler = new JwtSecurityTokenHandler();
            var token = tokenHandler.CreateToken(tokenDescriptor);
            return tokenHandler.WriteToken(token);
        }
    }
}
