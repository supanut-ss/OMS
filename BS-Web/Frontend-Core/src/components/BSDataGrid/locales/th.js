/**
 * Thai Localization for BSDataGrid (MUI X DataGrid)
 * Based on MUI X DataGrid v8.17.0 locale text constants
 */
export const thaiLocaleText = {
  // Root
  noRowsLabel: "ไม่มีข้อมูล",
  noResultsOverlayLabel: "ไม่พบผลลัพธ์",
  noColumnsOverlayLabel: "ไม่มีคอลัมน์",
  noColumnsOverlayManageColumns: "จัดการคอลัมน์",
  emptyPivotOverlayLabel:
    "เพิ่มฟิลด์ลงในแถว คอลัมน์ และค่าเพื่อสร้างตาราง Pivot",
  errorOverlayDefaultLabel: "เกิดข้อผิดพลาด",

  // Density selector toolbar button text
  toolbarDensity: "ความหนาแน่น",
  toolbarDensityLabel: "ความหนาแน่น",
  toolbarDensityCompact: "กะทัดรัด",
  toolbarDensityStandard: "มาตรฐาน",
  toolbarDensityComfortable: "สบาย",

  // Columns selector toolbar button text
  toolbarColumns: "คอลัมน์",
  toolbarColumnsLabel: "เลือกคอลัมน์",

  // Filters toolbar button text
  toolbarFilters: "ตัวกรอง",
  toolbarFiltersLabel: "แสดงตัวกรอง",
  toolbarFiltersTooltipHide: "ซ่อนตัวกรอง",
  toolbarFiltersTooltipShow: "แสดงตัวกรอง",
  toolbarFiltersTooltipActive: (count) =>
    count !== 1 ? `${count} ตัวกรองที่ใช้งาน` : `${count} ตัวกรองที่ใช้งาน`,

  // Quick filter toolbar field
  toolbarQuickFilterPlaceholder: "ค้นหาข้อมูล...",
  toolbarQuickFilterLabel: "ค้นหา",
  toolbarQuickFilterDeleteIconLabel: "ล้าง",

  // Export selector toolbar button text
  toolbarExport: "ส่งออก",
  toolbarExportLabel: "ส่งออก",
  toolbarExportCSV: "ดาวน์โหลดเป็น CSV",
  toolbarExportPrint: "พิมพ์",
  toolbarExportExcel: "ดาวน์โหลดเป็น Excel",

  // Columns management text
  columnsManagementSearchTitle: "ค้นหา",
  columnsManagementNoColumns: "ไม่มีคอลัมน์",
  columnsManagementShowHideAllText: "แสดง/ซ่อนทั้งหมด",
  columnsManagementReset: "รีเซ็ต",

  // Filter panel text
  filterPanelAddFilter: "เพิ่มตัวกรอง",
  filterPanelRemoveAll: "ลบทั้งหมด",
  filterPanelDeleteIconLabel: "ลบ",
  filterPanelLogicOperator: "ตัวดำเนินการเชิงตรรกะ",
  filterPanelOperator: "ตัวดำเนินการ",
  filterPanelOperatorAnd: "และ",
  filterPanelOperatorOr: "หรือ",
  filterPanelColumns: "คอลัมน์",
  filterPanelInputLabel: "ค่า",
  filterPanelInputPlaceholder: "ค่าตัวกรอง",

  // Filter operators text
  filterOperatorContains: "ประกอบด้วย",
  filterOperatorDoesNotContain: "ไม่ประกอบด้วย",
  filterOperatorEquals: "เท่ากับ",
  filterOperatorDoesNotEqual: "ไม่เท่ากับ",
  filterOperatorStartsWith: "เริ่มต้นด้วย",
  filterOperatorEndsWith: "ลงท้ายด้วย",
  filterOperatorIs: "คือ",
  filterOperatorNot: "ไม่ใช่",
  filterOperatorAfter: "หลังจาก",
  filterOperatorOnOrAfter: "ในหรือหลังจาก",
  filterOperatorBefore: "ก่อน",
  filterOperatorOnOrBefore: "ในหรือก่อน",
  filterOperatorIsEmpty: "ว่างเปล่า",
  filterOperatorIsNotEmpty: "ไม่ว่างเปล่า",
  filterOperatorIsAnyOf: "เป็นหนึ่งใน",
  "filterOperator=": "=",
  "filterOperator!=": "!=",
  "filterOperator>": ">",
  "filterOperator>=": ">=",
  "filterOperator<": "<",
  "filterOperator<=": "<=",

  // Header filter operators text
  headerFilterOperatorContains: "ประกอบด้วย",
  headerFilterOperatorDoesNotContain: "ไม่ประกอบด้วย",
  headerFilterOperatorEquals: "เท่ากับ",
  headerFilterOperatorDoesNotEqual: "ไม่เท่ากับ",
  headerFilterOperatorStartsWith: "เริ่มต้นด้วย",
  headerFilterOperatorEndsWith: "ลงท้ายด้วย",
  headerFilterOperatorIs: "คือ",
  headerFilterOperatorNot: "ไม่ใช่",
  headerFilterOperatorAfter: "หลังจาก",
  headerFilterOperatorOnOrAfter: "ในหรือหลังจาก",
  headerFilterOperatorBefore: "ก่อน",
  headerFilterOperatorOnOrBefore: "ในหรือก่อน",
  headerFilterOperatorIsEmpty: "ว่างเปล่า",
  headerFilterOperatorIsNotEmpty: "ไม่ว่างเปล่า",
  headerFilterOperatorIsAnyOf: "เป็นหนึ่งใน",
  "headerFilterOperator=": "เท่ากับ",
  "headerFilterOperator!=": "ไม่เท่ากับ",
  "headerFilterOperator>": "มากกว่า",
  "headerFilterOperator>=": "มากกว่าหรือเท่ากับ",
  "headerFilterOperator<": "น้อยกว่า",
  "headerFilterOperator<=": "น้อยกว่าหรือเท่ากับ",

  // Filter values text
  filterValueAny: "ใดๆ",
  filterValueTrue: "จริง",
  filterValueFalse: "เท็จ",

  // Column menu text
  columnMenuLabel: "เมนู",
  columnMenuShowColumns: "แสดงคอลัมน์",
  columnMenuManageColumns: "จัดการคอลัมน์",
  columnMenuFilter: "ตัวกรอง",
  columnMenuHideColumn: "ซ่อน",
  columnMenuUnsort: "ยกเลิกการเรียง",
  columnMenuSortAsc: "เรียงจากน้อยไปมาก",
  columnMenuSortDesc: "เรียงจากมากไปน้อย",

  // Column header text
  columnHeaderFiltersTooltipActive: (count) =>
    count !== 1 ? `${count} ตัวกรองที่ใช้งาน` : `${count} ตัวกรองที่ใช้งาน`,
  columnHeaderFiltersLabel: "แสดงตัวกรอง",
  columnHeaderSortIconLabel: "เรียง",

  // Rows selected footer text
  footerRowSelected: (count) =>
    count !== 1
      ? `${count.toLocaleString()} แถวที่เลือก`
      : `${count.toLocaleString()} แถวที่เลือก`,

  // Total row amount footer text
  footerTotalRows: "จำนวนแถวทั้งหมด:",

  // Total visible row amount footer text
  footerTotalVisibleRows: (visibleCount, totalCount) =>
    `${visibleCount.toLocaleString()} จาก ${totalCount.toLocaleString()}`,

  // Checkbox selection text
  checkboxSelectionHeaderName: "เลือก",
  checkboxSelectionSelectAllRows: "เลือกทั้งหมด",
  checkboxSelectionUnselectAllRows: "ยกเลิกการเลือกทั้งหมด",
  checkboxSelectionSelectRow: "เลือกแถว",
  checkboxSelectionUnselectRow: "ยกเลิกการเลือกแถว",

  // Boolean cell text
  booleanCellTrueLabel: "ใช่",
  booleanCellFalseLabel: "ไม่ใช่",

  // Actions cell more text
  actionsCellMore: "เพิ่มเติม",

  // Column pinning text
  pinToLeft: "ปักหมุดไว้ทางซ้าย",
  pinToRight: "ปักหมุดไว้ทางขวา",
  unpin: "ยกเลิกการปักหมุด",

  // Tree Data
  treeDataGroupingHeaderName: "กลุ่ม",
  treeDataExpand: "แสดงรายการย่อย",
  treeDataCollapse: "ซ่อนรายการย่อย",

  // Grouping columns
  groupingColumnHeaderName: "กลุ่ม",
  groupColumn: (name) => `จัดกลุ่มตาม ${name}`,
  unGroupColumn: (name) => `ยกเลิกการจัดกลุ่มตาม ${name}`,

  // Master/detail
  detailPanelToggle: "สลับแผงรายละเอียด",
  expandDetailPanel: "ขยาย",
  collapseDetailPanel: "ยุบ",

  // Row reordering text
  rowReorderingHeaderName: "จัดเรียงแถว",

  // Aggregation
  aggregationMenuItemHeader: "การรวมผล",
  aggregationFunctionLabelNone: "ไม่มี",
  aggregationFunctionLabelSum: "ผลรวม",
  aggregationFunctionLabelAvg: "ค่าเฉลี่ย",
  aggregationFunctionLabelMin: "น้อยสุด",
  aggregationFunctionLabelMax: "มากสุด",
  aggregationFunctionLabelSize: "ขนาด",

  // Used core components translation keys
  MuiTablePagination: {
    labelRowsPerPage: "แถวต่อหน้า:",
    labelDisplayedRows: ({ from, to, count }) => {
      const estimatedLabel = `มากกว่า ${to}`;
      return `${from}–${to} จาก ${count !== -1 ? count : estimatedLabel}`;
    },
  },

  // Pagination items text
  paginationItemAriaLabel: (type) => {
    if (type === "first") return "ไปหน้าแรก";
    if (type === "last") return "ไปหน้าสุดท้าย";
    if (type === "next") return "ไปหน้าถัดไป";
    return "ไปหน้าก่อนหน้า";
  },

  // Pivot
  pivotModeLabel: "โหมด Pivot",
  pivotModeEnabled: "เปิดใช้งาน Pivot",
  pivotModeDisabled: "ปิดใช้งาน Pivot",
  pivotGroupByColumn: (column) => `จัดกลุ่มตาม ${column}`,
  pivotUngroupByColumn: (column) => `ยกเลิกการจัดกลุ่มตาม ${column}`,
  pivotAggregateColumn: (column, aggregation) => `${column} (${aggregation})`,

  // Charts menu
  chartsMenuAddToDimensions: (dimensionLabel) => `เพิ่มไปยัง ${dimensionLabel}`,
  chartsMenuAddToValues: (valuesLabel) => `เพิ่มไปยัง ${valuesLabel}`,
  chartsMenuMoveUp: "เลื่อนขึ้น",
  chartsMenuMoveDown: "เลื่อนลง",
  chartsMenuMoveToTop: "เลื่อนขึ้นสุด",
  chartsMenuMoveToBottom: "เลื่อนลงสุด",
  chartsMenuOptions: "ตัวเลือกฟิลด์",
  chartsMenuRemove: "ลบ",
  chartsDragToDimensions: (dimensionLabel) =>
    `ลากมาที่นี่เพื่อใช้คอลัมน์เป็น ${dimensionLabel}`,
  chartsDragToValues: (valuesLabel) =>
    `ลากมาที่นี่เพื่อใช้คอลัมน์เป็น ${valuesLabel}`,
};
