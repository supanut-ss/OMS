using BS_Printing_Manager.Models.Request;
using System.Data;

namespace BS_Printing_Manager.Interfaces
{
    public interface IReportConfigProvider
    {
        Task<ConfigReportResponse> GetConfigReportAsync(string reportCode);
        Task<DataTable> GetConfigExeCmdAsync(string reportSqlCommand, Dictionary<string, object?>? parameter,string sqlType);
    }
}
