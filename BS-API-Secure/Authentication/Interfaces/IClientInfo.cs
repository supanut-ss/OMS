namespace Authentication.Interfaces
{
    public interface IClientInfo
    {
        string GetClientIpAddress();
        string GetClientDeviceInfo();
    }
}
