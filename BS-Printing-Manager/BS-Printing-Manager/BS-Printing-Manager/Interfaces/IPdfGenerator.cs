using BS_Printing_Manager.Models.Request;

namespace BS_Printing_Manager.Interfaces
{
    public interface IPdfGenerator
    { 
         byte[] GeneratePDF(PdfGenerateRequest request);
    }
}
