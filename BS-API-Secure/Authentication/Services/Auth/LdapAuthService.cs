
using Novell.Directory.Ldap;

namespace Authentication.Services.Auth
{
    public class LdapAuthService
    {
        private LdapConnection? _connection;
        public LdapAuthService() { }

        public async Task<bool> AuthenAD(string domain, int port, string username, string password)
        {
            try
            {
                using var conn = new Novell.Directory.Ldap.LdapConnection
                {
                    SecureSocketLayer = port == 636
                };

                conn.Constraints.TimeLimit = 5;
                conn.Constraints.ReferralFollowing = false;

                await conn.ConnectAsync(domain, port);
                await conn.BindAsync($"{domain.Split(".")[0] ?? "oga"}\\{username}", password);

                return conn.Bound;
            }
            catch (Exception ex)
            {
                return false;
            }
        }
        public void Logout()
        {
            if (_connection != null && _connection.Connected)
            {
                _connection.Disconnect();
            }
        }
    }
}
