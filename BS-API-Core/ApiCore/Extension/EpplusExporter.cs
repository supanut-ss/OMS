using OfficeOpenXml;
using OfficeOpenXml.Style;
using System.Data;
using System.Drawing;

namespace ApiCore.Extension
{
    public static class EpplusExporter
    {
        public static byte[] ExportDataTableToXlsx(DataTable dt, string? sheetName = null)
        {
            if (dt == null || dt.Columns.Count == 0)
                throw new ArgumentException("DataTable is null or has no columns.");


            //ExcelPackage.LicenseContext = LicenseContext.NonCommercial;
            if (!dt.Columns.Contains("No"))
            {
                var noCol = dt.Columns.Add("No", typeof(int));
                noCol.SetOrdinal(0);
                int index = 1;
                foreach (DataRow row in dt.Rows)
                    row["No"] = index++;
            }
            using var package = new ExcelPackage();
            var ws = package.Workbook.Worksheets.Add(SanitizeSheetName(string.IsNullOrWhiteSpace(sheetName) ? (string.IsNullOrWhiteSpace(dt.TableName) ? "Export" : dt.TableName) : sheetName));


            // --- เลือกตำแหน่งวาง ---
            int headerRow = 2;     // แถวหัวตาราง
            int groupRow = 1;  // แถวหัวกลุ่ม (merge)
            int dataStartRow = 3;  // แถวเริ่มข้อมูล
            int startCol = 1;


            // ===== เตรียม header สำหรับแสดง (ไม่แก้ DataTable) และจัดกลุ่มตาม prefix ก่อน '|' =====
            string[] displayHeaders = new string[dt.Columns.Count];
            // groupsByPrefix: prefix -> list of excel column indexes
            var groupsByPrefix = new Dictionary<string, List<int>>(StringComparer.OrdinalIgnoreCase);
           

            for (int i = 0; i < dt.Columns.Count; i++)
            {
                string raw = (dt.Columns[i].ColumnName ?? "").Trim();
                int bar = raw.IndexOf('|');

                if (bar > 0) // มี prefix ก่อน '|'
                {
                    string prefix = raw[..bar].Trim();         // e.g., P, C, WH...
                    string rest = raw[(bar + 1)..].Trim();   // ชื่อที่จะแสดง (ยอมซ้ำได้)
                    displayHeaders[i] = string.IsNullOrEmpty(rest) ? raw : rest;

                    // map prefix -> group name (สามกลุ่มตามที่ต้องการ)
                    string groupName = prefix.Equals("P", StringComparison.OrdinalIgnoreCase)
                        ? "STOCK ON HAND"
                        : prefix.Equals("C", StringComparison.OrdinalIgnoreCase)
                            ? "ACTUAL COUNT"
                            : "COMPARE STOCK AND ACTUAL COUNT";

                    groupsByPrefix.TryAdd(groupName, new List<int>());
                    groupsByPrefix[groupName].Add(i + 1); // Excel col index เริ่ม 1
                }
                else
                {
                    // ไม่มี '|': ใช้ชื่อเดิม
                    displayHeaders[i] = raw;
                }
            }

            // --- โหลดเฉพาะ "ข้อมูล" ไม่รวมหัว (เพื่อให้หัวซ้ำได้) ---
            ws.Cells[dataStartRow, startCol].LoadFromDataTable(dt, false);



            int cols = dt.Columns.Count;
            int rows = dt.Rows.Count;
            int lastDataRow = dataStartRow + rows - 1;
            int lastCol = startCol + cols - 1;

            // --- เขียนหัวตารางเอง (ยอมซ้ำชื่อได้) ---
            for (int c = 0; c < cols; c++)
                ws.Cells[headerRow, startCol + c].Value = displayHeaders[c];

            // สไตล์หัวตาราง
            using (var head = ws.Cells[headerRow, startCol, headerRow, lastCol])
            {
                head.Style.Font.Bold = true;
                head.Style.HorizontalAlignment = ExcelHorizontalAlignment.Center;
                head.Style.VerticalAlignment = ExcelVerticalAlignment.Center;
                head.Style.Fill.PatternType = ExcelFillStyle.Solid;
                head.Style.Fill.BackgroundColor.SetColor(Color.FromArgb(230, 230, 230));
                head.Style.Border.Bottom.Style = ExcelBorderStyle.Thin;
            }

            string title = "Summary Inventory";
            ws.Cells[1, 1].Value = title;
            ws.Cells[1, 1, 1, 5].Merge = true;        
            var titleCell = ws.Cells[1, 1];
            titleCell.Style.Font.Bold = true;
            titleCell.Style.Font.Size = 18;
            titleCell.Style.HorizontalAlignment = ExcelHorizontalAlignment.Left;
            titleCell.Style.VerticalAlignment = ExcelVerticalAlignment.Center;
            titleCell.Style.Fill.PatternType = ExcelFillStyle.Solid;
            titleCell.Style.Fill.BackgroundColor.SetColor(Color.FromArgb(245, 245, 245));
            ws.Row(2).Height = 24;

            // ===== วาดหัวกลุ่ม (แถว groupRow) + merge ครอบคอลัมน์ในกลุ่ม =====
            // สีแต่ละกลุ่ม
            var colorStockOnHand = Color.FromArgb(198, 239, 206); // เขียวอ่อน
            var colorActualCount = Color.FromArgb(221, 235, 247); // ฟ้าอ่อน
            var colorCompare = Color.FromArgb(255, 242, 204); // ครีม

            foreach (var kv in groupsByPrefix)
            {
                string groupName = kv.Key;
                var columns = kv.Value.OrderBy(i => i).ToList();
                if (columns.Count == 0) continue;

                int gStart = columns.First();
                int gEnd = columns.Last();

                // merge group title
                ws.Cells[groupRow, gStart, groupRow, gEnd].Merge = true;
                ws.Cells[groupRow, gStart].Value = groupName;
                var gRange = ws.Cells[groupRow, gStart, groupRow, gEnd];
                gRange.Style.HorizontalAlignment = ExcelHorizontalAlignment.Center;
                gRange.Style.VerticalAlignment = ExcelVerticalAlignment.Center;
                gRange.Style.Font.Bold = true;
                gRange.Style.Fill.PatternType = ExcelFillStyle.Solid;

                if (groupName.Equals("STOCK ON HAND", StringComparison.OrdinalIgnoreCase))
                    gRange.Style.Fill.BackgroundColor.SetColor(colorStockOnHand);
                else if (groupName.Equals("ACTUAL COUNT", StringComparison.OrdinalIgnoreCase))
                    gRange.Style.Fill.BackgroundColor.SetColor(colorActualCount);
                else
                    gRange.Style.Fill.BackgroundColor.SetColor(colorCompare);

                // เส้นขอบรอบหัวกลุ่ม
                gRange.Style.Border.Top.Style = ExcelBorderStyle.Thin;
                gRange.Style.Border.Left.Style = ExcelBorderStyle.Thin;
                gRange.Style.Border.Right.Style = ExcelBorderStyle.Thin;
                gRange.Style.Border.Bottom.Style = ExcelBorderStyle.Thin;

                // ทาสีพื้นหลังให้ “ทั้งคอลัมน์ในกลุ่ม” ด้วยสีอ่อนเดียวกัน (optional)
                using var colFill = ws.Cells[headerRow, gStart, headerRow, gEnd];
                colFill.Style.Fill.PatternType = ExcelFillStyle.Solid;
                // ใส่สีอ่อนลงกว่าหัวกลุ่มเล็กน้อย
                var light = groupName.Equals("STOCK ON HAND", StringComparison.OrdinalIgnoreCase) ? Color.FromArgb(226, 239, 218)
                          : groupName.Equals("ACTUAL COUNT", StringComparison.OrdinalIgnoreCase) ? Color.FromArgb(221, 235, 247)
                          : Color.FromArgb(255, 249, 196);
                colFill.Style.Fill.BackgroundColor.SetColor(light);
            }

            // === Freeze ที่ก่อนข้อมูลจริง (แถว 4) ===
            ws.View.FreezePanes(dataStartRow, 1);


            // ===== เพิ่ม TOTAL ROW ต่อท้ายทุกกลุ่ม =====
            int totalRow = lastDataRow + 1;

            // หา "คอลัมน์แรกของกลุ่มแรก" แล้วเอา -1 เป็นที่วางคำว่า Total
            // (ถ้าไม่มีคอลัมน์ก่อนหน้า ก็วางที่ startCol)
            int firstGroupStart = groupsByPrefix.Values
                .SelectMany(v => v)               // รวม index ของคอลัมน์ทุกกลุ่ม (เป็น 1-based)
                .DefaultIfEmpty(lastCol + 1)
                .Min();

            int totalLabelCol = Math.Max(startCol, firstGroupStart - 1);

            // ใส่คำว่า "Total" ตรงตำแหน่งที่หามา
            var totalLabelCell = ws.Cells[totalRow, totalLabelCol];
            totalLabelCell.Value = "Total";
            totalLabelCell.Style.Font.Bold = true;
            totalLabelCell.Style.HorizontalAlignment = ExcelHorizontalAlignment.Right;

            // ใส่สูตร SUM ให้คอลัมน์ในแต่ละกลุ่ม
            foreach (var kv in groupsByPrefix)
            {
                foreach (var colIdx in kv.Value.OrderBy(i => i))
                {
                    string colL = ColLetter(colIdx);
                    var totalCell = ws.Cells[totalRow, colIdx];
                    totalCell.Formula = $"SUM({colL}{dataStartRow}:{colL}{lastDataRow})";
                    totalCell.Style.Font.Bold = true;

                    // คงรูปแบบตัวเลข/แนวจัดวางตามคอลัมน์นั้น
                    var sample = ws.Cells[dataStartRow, colIdx];
                    totalCell.Style.Numberformat.Format = sample.Style.Numberformat.Format;
                    totalCell.Style.HorizontalAlignment = sample.Style.HorizontalAlignment;

                    // เส้นขอบบนให้เด่น (ตามรูป)
                    totalCell.Style.Border.Top.Style = ExcelBorderStyle.Thin;
                }
            }

            // เส้นขอบทั้งแถว Total (optional สวยงาม)
            using (var rngTotal = ws.Cells[totalRow, startCol, totalRow, lastCol])
            {
                rngTotal.Style.Border.Top.Style = ExcelBorderStyle.Thin;
                rngTotal.Style.Border.Left.Style = ExcelBorderStyle.Thin;
                rngTotal.Style.Border.Right.Style = ExcelBorderStyle.Thin;
                rngTotal.Style.Border.Bottom.Style = ExcelBorderStyle.Thin;
            }




            // === NumberFormat ตามชนิดคอลัมน์ (ช่วงข้อมูลเท่านั้น) ===
            for (int c = 0; c < cols; c++)
            {
                var type = Nullable.GetUnderlyingType(dt.Columns[c].DataType) ?? dt.Columns[c].DataType;
                var rng = ws.Cells[dataStartRow, startCol + c, lastDataRow, startCol + c];

                if (type == typeof(DateTime))
                    rng.Style.Numberformat.Format = "yyyy-mm-dd hh:mm";
                else if (type == typeof(decimal) || type == typeof(double) || type == typeof(float))
                    rng.Style.Numberformat.Format = "#,##0.00";
                else if (type == typeof(int) || type == typeof(long) || type == typeof(short))
                    rng.Style.Numberformat.Format = "0";
            }

            // Border ทั้งตาราง + AutoFit
            if (ws.Dimension != null)
            {
                using var all = ws.Cells[ws.Dimension.Address];
                all.Style.Border.Top.Style = ExcelBorderStyle.Thin;
                all.Style.Border.Left.Style = ExcelBorderStyle.Thin;
                all.Style.Border.Right.Style = ExcelBorderStyle.Thin;
                all.Style.Border.Bottom.Style = ExcelBorderStyle.Thin;

                all.AutoFitColumns();
            }

            return package.GetAsByteArray();
        }

        // EPPlus: ชื่อชีตยาวสุด 31 และห้าม \ / * [ ] : ?
        private static string SanitizeSheetName(string name)
        {
            var invalid = new[] { '\\', '/', '*', '[', ']', ':', '?' };
            var cleaned = new string(name.Where(ch => !invalid.Contains(ch)).ToArray());
            if (string.IsNullOrWhiteSpace(cleaned)) cleaned = "Sheet1";
            return cleaned.Length > 31 ? cleaned.Substring(0, 31) : cleaned;
        }

        // helper แปลงเลขคอลัมน์ -> A,B,C,...
        static string ColLetter(int col)
        {
            string s = "";
            while (col > 0) { int m = (col - 1) % 26; s = (char)('A' + m) + s; col = (col - m) / 26 - 1; }
            return s;
        }

    }
}
