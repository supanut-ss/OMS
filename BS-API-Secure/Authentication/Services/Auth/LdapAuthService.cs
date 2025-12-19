
using Microsoft.AspNetCore.Authentication;
using Novell.Directory.Ldap;
using System.DirectoryServices.AccountManagement;

namespace Authentication.Services.Auth
{
    public class LdapAuthService
    {
        private LdapConnection? _connection;
        public LdapAuthService() { }

        public async Task<bool> AuthenAD(string domain, int port, string username, string password)
        {

            using (PrincipalContext context = new PrincipalContext(ContextType.Domain, domain))
            {
                if (context.ValidateCredentials(username.Trim(), password.Trim())) 
                {
                    return true;
                }
                else {
                    return false;
                }
            }

                    // DOCKER LINUX
                    //try
                    //{
                    //    using var conn = new Novell.Directory.Ldap.LdapConnection
                    //    {
                    //        SecureSocketLayer = port == 636
                    //    };

                    //    conn.Constraints.TimeLimit = 5;
                    //    conn.Constraints.ReferralFollowing = false;

                    //    await conn.ConnectAsync(domain, port);
                    //    await conn.BindAsync($"{domain.Split(".")[0] ?? "oga"}\\{username}", password);

                    //    return conn.Bound;
                    //}
                    //catch (Exception ex)
                    //{
                    //    return false;
                    //}
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
