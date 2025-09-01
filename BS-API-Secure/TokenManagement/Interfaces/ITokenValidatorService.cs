
namespace TokenManagement.Interfaces
{
    public interface ITokenValidatorService
    {
        Task<bool> IsAccessTokenValidAsync(string token);
        Task<string> GenerateRefreshToken(string userId, string accessToken);

    }
}
