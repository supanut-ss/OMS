using BS_Printing_Manager.Interfaces;
using BS_Printing_Manager.Models.Request;
using DinkToPdf;
using DinkToPdf.Contracts;

namespace BS_Printing_Manager.Services
{
    public class DinkToPdfGenerator : IPdfGenerator
    {
        private readonly IConverter _converter;

        public DinkToPdfGenerator(IConverter converter)
        {
            _converter = converter;
        } 

        public byte[] GeneratePDF(PdfGenerateRequest request)
        {
            var html = request.html;

            if (!string.IsNullOrWhiteSpace(request.css))
            {
                html = $@"
                <html>
                    <head>
                        <style>{request.css}</style>
                    </head>
                    <body>
                        {request.html}
                    </body>
                </html>";
            }

            var doc = new HtmlToPdfDocument
            {
                GlobalSettings = new GlobalSettings
                {
                    PaperSize = request.page_size == "A4"
                        ? PaperKind.A4
                        : PaperKind.A4,
                    Orientation = request.orientation == "Landscape"
                        ? Orientation.Landscape
                        : Orientation.Portrait
                },
                Objects =
                {
                    new ObjectSettings
                    {
                        HtmlContent = html,
                        WebSettings = new WebSettings
                        {
                            DefaultEncoding = "utf-8"
                        }
                    }
                }
            };

            return _converter.Convert(doc);
        }
    }
}
