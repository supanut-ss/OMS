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

            // เพิ่มคอลัมน์ No. เป็นคอลัมน์แรก
            if (!dt.Columns.Contains("No"))
            {
                var noCol = dt.Columns.Add("No", typeof(int));
                noCol.SetOrdinal(0);
                int idx = 1;
                foreach (DataRow r in dt.Rows) r["No"] = idx++;
            }

            // แปลงค่าว่าง/null ให้เป็น 0
            foreach (DataRow r in dt.Rows)
                for (int i = 0; i < dt.Columns.Count; i++)
                    if (r[i] == null || r[i] == DBNull.Value || (r[i] is string s && string.IsNullOrWhiteSpace(s)))
                        r[i] = 0;

            using var package = new ExcelPackage();
            var ws = package.Workbook.Worksheets.Add(
                SanitizeSheetName(string.IsNullOrWhiteSpace(sheetName)
                    ? (string.IsNullOrWhiteSpace(dt.TableName) ? "Export" : dt.TableName)
                    : sheetName));

            // layout rows/cols
            int titleRow = 1;
            int groupRow = 2;
            int headerRow = 3;
            int dataStartRow = 4;
            int startCol = 1;

            // เตรียม header แสดงผล + group ตาม prefix ก่อน '|'
            string[] displayHeaders = new string[dt.Columns.Count];
            var groupsByPrefix = new Dictionary<string, List<int>>(StringComparer.OrdinalIgnoreCase);

            for (int i = 0; i < dt.Columns.Count; i++)
            {
                string raw = (dt.Columns[i].ColumnName ?? "").Trim();
                int bar = raw.IndexOf('|');

                if (bar > 0) // มี prefix
                {
                    string prefix = raw[..bar].Trim();
                    string rest = raw[(bar + 1)..].Trim();
                    displayHeaders[i] = string.IsNullOrEmpty(rest) ? raw : rest;

                    string groupName =
                        prefix.Equals("P", StringComparison.OrdinalIgnoreCase) ? "STOCK ON HAND" :
                        prefix.Equals("C", StringComparison.OrdinalIgnoreCase) ? "ACTUAL COUNT" :
                        "COMPARE STOCK AND ACTUAL COUNT";

                    int excelCol = startCol + i;
                    groupsByPrefix.TryAdd(groupName, new List<int>());
                    groupsByPrefix[groupName].Add(excelCol);
                }
                else
                {
                    displayHeaders[i] = raw; // ไม่มี '|'
                }
            }

            // โหลดเฉพาะ "ข้อมูล" ไม่รวมหัว (ให้หัวซ้ำได้)
            ws.Cells[dataStartRow, startCol].LoadFromDataTable(dt, false);

            int cols = dt.Columns.Count;
            int rows = dt.Rows.Count;
            int lastDataRow = dataStartRow + rows - 1;
            int lastCol = startCol + cols - 1;

            // เขียนหัวตาราง (แถว headerRow)
            for (int c = 0; c < cols; c++)
                ws.Cells[headerRow, startCol + c].Value = displayHeaders[c];

            using (var head = ws.Cells[headerRow, startCol, headerRow, lastCol])
            {
                head.Style.Font.Bold = true;
                head.Style.HorizontalAlignment = ExcelHorizontalAlignment.Center;
                head.Style.VerticalAlignment = ExcelVerticalAlignment.Center;
                head.Style.Fill.PatternType = ExcelFillStyle.Solid;
                head.Style.Fill.BackgroundColor.SetColor(Color.FromArgb(230, 230, 230));
                head.Style.Border.Bottom.Style = ExcelBorderStyle.Thin;
            }

            // Title แถว 1
            ws.Cells[titleRow, startCol].Value = "Summary Inventory";
            ws.Cells[titleRow, startCol, titleRow, lastCol].Merge = true;
            var titleCell = ws.Cells[titleRow, startCol];
            titleCell.Style.Font.Bold = true;
            titleCell.Style.Font.Size = 18;
            titleCell.Style.HorizontalAlignment = ExcelHorizontalAlignment.Left;
            titleCell.Style.VerticalAlignment = ExcelVerticalAlignment.Center;
            titleCell.Style.Fill.PatternType = ExcelFillStyle.Solid;
            titleCell.Style.Fill.BackgroundColor.SetColor(Color.FromArgb(245, 245, 245));
            ws.Row(titleRow).Height = 24;

            // วาดหัวกลุ่ม (แถว groupRow) + สีพื้นหลังคอลัมน์ทั้งกลุ่ม
            var colorStockOnHand = Color.FromArgb(198, 239, 206);
            var colorActualCount = Color.FromArgb(221, 235, 247);
            var colorCompare = Color.FromArgb(255, 242, 204);

            foreach (var kv in groupsByPrefix)
            {
                var colsInGroup = kv.Value.OrderBy(i => i).ToList();
                if (colsInGroup.Count == 0) continue;

                int gStart = colsInGroup.First();
                int gEnd = colsInGroup.Last();

                // group title (merge)
                ws.Cells[groupRow, gStart, groupRow, gEnd].Merge = true;
                ws.Cells[groupRow, gStart].Value = kv.Key;

                var gRange = ws.Cells[groupRow, gStart, groupRow, gEnd];
                gRange.Style.HorizontalAlignment = ExcelHorizontalAlignment.Center;
                gRange.Style.VerticalAlignment = ExcelVerticalAlignment.Center;
                gRange.Style.Font.Bold = true;
                gRange.Style.Fill.PatternType = ExcelFillStyle.Solid;

                var headColor =
                    kv.Key.Equals("STOCK ON HAND", StringComparison.OrdinalIgnoreCase) ? colorStockOnHand :
                    kv.Key.Equals("ACTUAL COUNT", StringComparison.OrdinalIgnoreCase) ? colorActualCount :
                    colorCompare;

                gRange.Style.Fill.BackgroundColor.SetColor(headColor);
                gRange.Style.Border.Top.Style = ExcelBorderStyle.Thin;
                gRange.Style.Border.Left.Style = ExcelBorderStyle.Thin;
                gRange.Style.Border.Right.Style = ExcelBorderStyle.Thin;
                gRange.Style.Border.Bottom.Style = ExcelBorderStyle.Thin;

                // สีพื้นหลังอ่อนให้ทั้งคอลัมน์ของกลุ่ม (หัวคอลัมน์)
                using var colFill = ws.Cells[headerRow, gStart, headerRow, gEnd];
                var light =
                    kv.Key.Equals("STOCK ON HAND", StringComparison.OrdinalIgnoreCase) ? Color.FromArgb(226, 239, 218) :
                    kv.Key.Equals("ACTUAL COUNT", StringComparison.OrdinalIgnoreCase) ? Color.FromArgb(221, 235, 247) :
                    Color.FromArgb(255, 249, 196);
                colFill.Style.Fill.PatternType = ExcelFillStyle.Solid;
                colFill.Style.Fill.BackgroundColor.SetColor(light);
            }

            // Freeze ก่อนข้อมูลจริง
            ws.View.FreezePanes(dataStartRow, 1);

            // ===== ฟอร์แมตตัวเลข: ติดลบเป็น (x) สีแดง (รวม data + total) =====
            int totalRow = lastDataRow + 1;
            int lastRowForFormat = totalRow;

            for (int c = 0; c < cols; c++)
            {
                var type = System.Nullable.GetUnderlyingType(dt.Columns[c].DataType) ?? dt.Columns[c].DataType;
                var rng = ws.Cells[dataStartRow, startCol + c, lastRowForFormat, startCol + c];

                if (type == typeof(DateTime))
                {
                    rng.Style.Numberformat.Format = "yyyy-MM-dd HH:mm";
                }
                else if (type == typeof(decimal) || type == typeof(double) || type == typeof(float))
                {
                    rng.Style.Numberformat.Format = "#,##0.00;[Red](#,##0.00);0.00;@";
                    rng.Style.HorizontalAlignment = ExcelHorizontalAlignment.Right;
                }
                else if (type == typeof(int) || type == typeof(long) || type == typeof(short))
                {
                    rng.Style.Numberformat.Format = "#,##0;[Red](#,##0);0;@";
                    rng.Style.HorizontalAlignment = ExcelHorizontalAlignment.Right;
                }
            }

            // ===== TOTAL ROW ต่อท้าย (วาง "Total" หน้า group แรก) =====
            int firstGroupStart = groupsByPrefix.Values.SelectMany(v => v).DefaultIfEmpty(lastCol + 1).Min();
            int totalLabelCol = Math.Max(startCol, firstGroupStart - 1);

            ws.Cells[totalRow, totalLabelCol].Value = "Total";
            ws.Cells[totalRow, totalLabelCol].Style.Font.Bold = true;
            ws.Cells[totalRow, totalLabelCol].Style.HorizontalAlignment = ExcelHorizontalAlignment.Right;

            foreach (var colIdx in groupsByPrefix.Values.SelectMany(v => v).OrderBy(i => i))
            {
                string colL = ColLetter(colIdx);
                var totalCell = ws.Cells[totalRow, colIdx];
                totalCell.Formula = $"SUM({colL}{dataStartRow}:{colL}{lastDataRow})";
                totalCell.Style.Font.Bold = true;
                totalCell.Style.Border.Top.Style = ExcelBorderStyle.Thin;
            }

            // เส้นขอบ + AutoFit
            if (ws.Dimension != null)
            {
                using var all = ws.Cells[1, startCol, Math.Max(totalRow, headerRow), lastCol];
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
        //static string ColLetter(int col)
        //{
        //    string s = "";
        //    while (col > 0) { int m = (col - 1) % 26; s = (char)('A' + m) + s; col = (col - m) / 26 - 1; }
        //    return s;
        //}
        static string ColLetter(int col)
        {
            if (col <= 0)
                throw new ArgumentOutOfRangeException(nameof(col), "Column index must be >= 1");

            string s = string.Empty;
            while (col > 0)
            {
                col--; // สำคัญมาก! เพราะ Excel ใช้ 1-based แต่เราต้องชิฟต์ก่อน mod
                s = (char)('A' + (col % 26)) + s;
                col /= 26;
            }
            return s;
        }
    }
}
