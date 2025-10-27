import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import QRCode from "qrcode";
import dayjs from "dayjs";
// ฟังก์ชันสร้าง PDF และเปิด preview + กลับหน้าก่อนหน้า
const GenerateTagPDF = async (data) => {
    try {
        if (!data || data.length === 0) {
            return { success: false, message: "No data provided for tag PDF generation." };
        }

        const pdf = new jsPDF({
            orientation: "portrait",
            unit: "mm",
            format: [93, 228],
        });

        for (let i = 0; i < data.length; i++) {
            const item = data[i];
            const qrDataUrl = await QRCode.toDataURL(item.tag_no || "NA", { width: 100 });

            const tempDiv = document.createElement("div");
            tempDiv.className = "report-root";
            tempDiv.style.width = "93mm";
            tempDiv.style.height = "228mm";
            tempDiv.style.padding = "10mm";
            tempDiv.style.background = "white";
            tempDiv.innerHTML = `
            <style>
            @page {
  size: 9.3cm 22.8cm;
  margin: 0;
}

.report-root {
  font-family: "TH Sarabun New", sans-serif;
  font-size: 12pt;
  color: #000;
  width: 9.3cm;
  height: 22.8cm;
  display: flex;
  justify-content: center;
  overflow: hidden;
  background: #fff;
  border: 1px solid #ccc;
  position: relative;
}
.td-report-tags{
  width: 2.5cm;
}
  </style>
      <div>
        <table style="margin-top: 0.5cm;">
          <tbody>
            <tr>
              <td class="td-report-tags" style="width:2.5cm; text-align:left;">${item.area_name || ""} ${item.area_code || ""}</td>
              <td class="td-report-tags" style="text-align:center;font-weight:bold">${item.audit || ""}</td>
              <td class="td-report-tags" style="text-align:center;">${item.tag_no || ""}</td>
            </tr>
            <tr>
              <td colspan="3" style="text-align:center;">Location: ${item.location || ""}</td>
            </tr>
          </tbody>
        </table>
        <table style="margin-top: 0.9cm;">
          <tbody>
            <tr>
              <td colspan="1" class="td-report-tags">&nbsp;</td>
              <td colspan="2">${item.part_no || ""}</td>
            </tr>
            <tr>
              <td colspan="1" class="td-report-tags">&nbsp;</td>
              <td colspan="2">${item.part_name || ""}</td>
            </tr>
          </tbody>
        </table>
        <div>
          <img src="${qrDataUrl}" alt="QR Code" width="60" height="60" />
        </div>
        <table style="margin-top:10cm;">
          <tbody>
            <tr>
              <td colspan="1" class="td-report-tags">&nbsp;</td>
              <td colspan="2">${item.supplier_name || ""}</td>
            </tr>
          </tbody>
        </table>
        <table style="margin-top:3cm;">
          <tbody>
            <tr>
              <td colspan="1" class="td-report-tags">&nbsp;</td>
              <td colspan="2">${dayjs(item.tag_date).format("DD/MM/YYYY")|| ""}</td>
            </tr>
          </tbody>
        </table>
      </div
    `;

            document.body.appendChild(tempDiv);

            const canvas = await html2canvas(tempDiv, { scale: 2, useCORS: true });
            const imgData = canvas.toDataURL("image/png");
            pdf.addImage(imgData, "PNG", 0, 0, 93, 228);
            if (i < data.length - 1) pdf.addPage();

            document.body.removeChild(tempDiv);
        }

        const blob = pdf.output("blob");
        const blobUrl = URL.createObjectURL(blob);

        window.open(blobUrl, "_blank"); // เปิด PDF ในแท็บใหม่
        return { success: true, message: "Tag PDF generated successfully." };
    } catch (error) {
        return {
            success: false, message: "Error generating tag PDF.", error: error
        }
    }
};
export default GenerateTagPDF;
