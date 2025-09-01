
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
                _connection = new Novell.Directory.Ldap.LdapConnection();
               await _connection.ConnectAsync(domain, port);
                await _connection.BindAsync(username + "@" + domain, password);
                return _connection.Bound;
            }
            catch
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
