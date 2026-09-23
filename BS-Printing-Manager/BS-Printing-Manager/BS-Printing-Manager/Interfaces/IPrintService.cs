using BS_Printing_Manager.Models.Request;

namespace BS_Printing_Manager.Interfaces
{
    public interface IPrintService
    {
        Task PrintReportAsync(PrintRequest request);
    }
}
