import React , { useRef, useState } from "react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import "../../assets/css/report.css";

const ReportTags=()=> {
  const [formData, setFormData] = useState({
    name: "",
    amount: "",
    date: "",
  });

  const reportRef = useRef();
  const [pdfUrl, setPdfUrl] = useState(null);
  // ⬇️ เมื่อกดปุ่ม Export PDF
  const handleExportPDF = async () => {
    const input = reportRef.current;
    if (!input) return;

    // สร้างภาพจาก HTML
    const canvas = await html2canvas(input, { scale: 2 });
    const imgData = canvas.toDataURL("image/png");

    // ขนาด PDF (หน่วย mm)
    const pdf = new jsPDF({
      unit: "mm",
      format: [93,228], //  9.3 x22.8 
    });

    // ใส่รูปเต็มหน้า
    pdf.addImage(imgData, "PNG", 0, 0,93, 228);
    // ✅ สร้าง blob แทนการ save
    const blob = pdf.output("blob");
    const blobUrl = URL.createObjectURL(blob);

    // เก็บไว้ preview
    setPdfUrl(blobUrl);
  };

  // ⬇️ เมื่อกรอกข้อมูลในฟอร์ม
  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>สร้างรายงานแนวนอน (9.3 × 22.8 cm)</h2>

      <div style={{ marginBottom: 12 }}>
        <label>
          ชื่อผู้รับ:{" "}
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
          />
        </label>
        &nbsp;&nbsp;
        <label>
          จำนวนเงิน:{" "}
          <input
            type="number"
            name="amount"
            value={formData.amount}
            onChange={handleChange}
          />
        </label>
        &nbsp;&nbsp;
        <label>
          วันที่:{" "}
          <input
            type="date"
            name="date"
            value={formData.date}
            onChange={handleChange}
          />
        </label>
      </div>

      <button onClick={handleExportPDF}>สร้างรายงาน PDF</button>

      {/* ส่วนรายงาน (จะถูกแปลงเป็น PDF) */}
      <div
        ref={reportRef}
        className="report-root"
        style={{
          marginTop: 20,
          width: "9.3cm",
          height: "22.8cm",
          background: "white",
          padding: "10mm",
          border: "1px solid #ccc",
        }}
      >
        <h3 style={{ textAlign: "center", marginBottom: 10 }}>
          ใบรายงานตัวอย่าง
        </h3>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <tbody>
            <tr>
              <td style={{ width: "40%" }}>ชื่อผู้รับ:</td>
              <td>{formData.name || "-"}</td>
            </tr>
            <tr>
              <td>จำนวนเงิน:</td>
              <td>{formData.amount ? `${formData.amount} บาท` : "-"}</td>
            </tr>
            <tr>
              <td>วันที่:</td>
              <td>{formData.date || "-"}</td>
            </tr>
          </tbody>
        </table>

        <div style={{ position: "absolute", bottom: 20, right: 30 }}>
          <small>สร้างโดยระบบ React</small>
        </div>
      </div>
    </div>);
}
export default ReportTags;
