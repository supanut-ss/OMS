/**
 * English Localization for BSDataGrid (MUI X DataGrid)
 * Based on MUI X DataGrid v8.17.0 locale text constants
 */
export const englishLocaleText = {
  // Root
  noRowsLabel: "No rows",
  noResultsOverlayLabel: "No results found.",
  noColumnsOverlayLabel: "No columns",
  noColumnsOverlayManageColumns: "Manage columns",
  emptyPivotOverlayLabel:
    "Add fields to rows, columns, and values to create a pivot table",
  errorOverlayDefaultLabel: "An error occurred.",

  // Density selector toolbar button text
  toolbarDensity: "Density",
  toolbarDensityLabel: "Density",
  toolbarDensityCompact: "Compact",
  toolbarDensityStandard: "Standard",
  toolbarDensityComfortable: "Comfortable",

  // Columns selector toolbar button text
  toolbarColumns: "Columns",
  toolbarColumnsLabel: "Select columns",

  // Filters toolbar button text
  toolbarFilters: "Filters",
  toolbarFiltersLabel: "Show filters",
  toolbarFiltersTooltipHide: "Hide filters",
  toolbarFiltersTooltipShow: "Show filters",
  toolbarFiltersTooltipActive: (count) =>
    count !== 1 ? `${count} active filters` : `${count} active filter`,

  // Quick filter toolbar field
  toolbarQuickFilterPlaceholder: "Search…",
  toolbarQuickFilterLabel: "Search",
  toolbarQuickFilterDeleteIconLabel: "Clear",

  // Export selector toolbar button text
  toolbarExport: "Export",
  toolbarExportLabel: "Export",
  toolbarExportCSV: "Download as CSV",
  toolbarExportPrint: "Print",
  toolbarExportExcel: "Download as Excel",

  // Columns management text
  columnsManagementSearchTitle: "Search",
  columnsManagementNoColumns: "No columns",
  columnsManagementShowHideAllText: "Show/Hide All",
  columnsManagementReset: "Reset",

  // Filter panel text
  filterPanelAddFilter: "Add filter",
  filterPanelRemoveAll: "Remove all",
  filterPanelDeleteIconLabel: "Delete",
  filterPanelLogicOperator: "Logic operator",
  filterPanelOperator: "Operator",
  filterPanelOperatorAnd: "And",
  filterPanelOperatorOr: "Or",
  filterPanelColumns: "Columns",
  filterPanelInputLabel: "Value",
  filterPanelInputPlaceholder: "Filter value",

  // Filter operators text
  filterOperatorContains: "contains",
  filterOperatorDoesNotContain: "does not contain",
  filterOperatorEquals: "equals",
  filterOperatorDoesNotEqual: "does not equal",
  filterOperatorStartsWith: "starts with",
  filterOperatorEndsWith: "ends with",
  filterOperatorIs: "is",
  filterOperatorNot: "is not",
  filterOperatorAfter: "is after",
  filterOperatorOnOrAfter: "is on or after",
  filterOperatorBefore: "is before",
  filterOperatorOnOrBefore: "is on or before",
  filterOperatorIsEmpty: "is empty",
  filterOperatorIsNotEmpty: "is not empty",
  filterOperatorIsAnyOf: "is any of",
  "filterOperator=": "=",
  "filterOperator!=": "!=",
  "filterOperator>": ">",
  "filterOperator>=": ">=",
  "filterOperator<": "<",
  "filterOperator<=": "<=",

  // Header filter operators text
  headerFilterOperatorContains: "Contains",
  headerFilterOperatorDoesNotContain: "Does not contain",
  headerFilterOperatorEquals: "Equals",
  headerFilterOperatorDoesNotEqual: "Does not equal",
  headerFilterOperatorStartsWith: "Starts with",
  headerFilterOperatorEndsWith: "Ends with",
  headerFilterOperatorIs: "Is",
  headerFilterOperatorNot: "Is not",
  headerFilterOperatorAfter: "Is after",
  headerFilterOperatorOnOrAfter: "Is on or after",
  headerFilterOperatorBefore: "Is before",
  headerFilterOperatorOnOrBefore: "Is on or before",
  headerFilterOperatorIsEmpty: "Is empty",
  headerFilterOperatorIsNotEmpty: "Is not empty",
  headerFilterOperatorIsAnyOf: "Is any of",
  "headerFilterOperator=": "Equals",
  "headerFilterOperator!=": "Not equals",
  "headerFilterOperator>": "Greater than",
  "headerFilterOperator>=": "Greater than or equal to",
  "headerFilterOperator<": "Less than",
  "headerFilterOperator<=": "Less than or equal to",

  // Filter values text
  filterValueAny: "any",
  filterValueTrue: "true",
  filterValueFalse: "false",

  // Column menu text
  columnMenuLabel: "Menu",
  columnMenuShowColumns: "Show columns",
  columnMenuManageColumns: "Manage columns",
  columnMenuFilter: "Filter",
  columnMenuHideColumn: "Hide column",
  columnMenuUnsort: "Unsort",
  columnMenuSortAsc: "Sort by ASC",
  columnMenuSortDesc: "Sort by DESC",

  // Column header text
  columnHeaderFiltersTooltipActive: (count) =>
    count !== 1 ? `${count} active filters` : `${count} active filter`,
  columnHeaderFiltersLabel: "Show filters",
  columnHeaderSortIconLabel: "Sort",

  // Rows selected footer text
  footerRowSelected: (count) =>
    count !== 1
      ? `${count.toLocaleString()} rows selected`
      : `${count.toLocaleString()} row selected`,

  // Total row amount footer text
  footerTotalRows: "Total Rows:",

  // Total visible row amount footer text
  footerTotalVisibleRows: (visibleCount, totalCount) =>
    `${visibleCount.toLocaleString()} of ${totalCount.toLocaleString()}`,

  // Checkbox selection text
  checkboxSelectionHeaderName: "Checkbox selection",
  checkboxSelectionSelectAllRows: "Select all rows",
  checkboxSelectionUnselectAllRows: "Unselect all rows",
  checkboxSelectionSelectRow: "Select row",
  checkboxSelectionUnselectRow: "Unselect row",

  // Boolean cell text
  booleanCellTrueLabel: "yes",
  booleanCellFalseLabel: "no",

  // Actions cell more text
  actionsCellMore: "more",

  // Column pinning text
  pinToLeft: "Pin to left",
  pinToRight: "Pin to right",
  unpin: "Unpin",

  // Tree Data
  treeDataGroupingHeaderName: "Group",
  treeDataExpand: "see children",
  treeDataCollapse: "hide children",

  // Grouping columns
  groupingColumnHeaderName: "Group",
  groupColumn: (name) => `Group by ${name}`,
  unGroupColumn: (name) => `Stop grouping by ${name}`,

  // Master/detail
  detailPanelToggle: "Detail panel toggle",
  expandDetailPanel: "Expand",
  collapseDetailPanel: "Collapse",

  // Row reordering text
  rowReorderingHeaderName: "Row reordering",

  // Aggregation
  aggregationMenuItemHeader: "Aggregation",
  aggregationFunctionLabelNone: "none",
  aggregationFunctionLabelSum: "sum",
  aggregationFunctionLabelAvg: "avg",
  aggregationFunctionLabelMin: "min",
  aggregationFunctionLabelMax: "max",
  aggregationFunctionLabelSize: "size",

  // Used core components translation keys
  MuiTablePagination: {
    labelRowsPerPage: "Rows per page:",
    labelDisplayedRows: ({ from, to, count }) => {
      const estimatedLabel = `more than ${to}`;
      return `${from}–${to} of ${count !== -1 ? count : estimatedLabel}`;
    },
  },

  // Pagination items text
  paginationItemAriaLabel: (type) => {
    if (type === "first") return "Go to first page";
    if (type === "last") return "Go to last page";
    if (type === "next") return "Go to next page";
    return "Go to previous page";
  },

  // Pivot
  pivotModeLabel: "Pivot mode",
  pivotModeEnabled: "Pivot mode enabled",
  pivotModeDisabled: "Pivot mode disabled",
  pivotGroupByColumn: (column) => `Group by ${column}`,
  pivotUngroupByColumn: (column) => `Stop grouping by ${column}`,
  pivotAggregateColumn: (column, aggregation) => `${column} (${aggregation})`,

  // Charts menu
  chartsMenuAddToDimensions: (dimensionLabel) => `Add to ${dimensionLabel}`,
  chartsMenuAddToValues: (valuesLabel) => `Add to ${valuesLabel}`,
  chartsMenuMoveUp: "Move up",
  chartsMenuMoveDown: "Move down",
  chartsMenuMoveToTop: "Move to top",
  chartsMenuMoveToBottom: "Move to bottom",
  chartsMenuOptions: "Field options",
  chartsMenuRemove: "Remove",
  chartsDragToDimensions: (dimensionLabel) =>
    `Drag here to use column as ${dimensionLabel}`,
  chartsDragToValues: (valuesLabel) =>
    `Drag here to use column as ${valuesLabel}`,

  // BSDataGrid Custom UI Elements
  bsAddRecord: "Add Record",
  bsBulkAdd: "Bulk Add",
  bsBulkEdit: "Bulk Edit",
  bsBulkDelete: "Bulk Delete",
  bsEdit: "Edit",
  bsDelete: "Delete",
  bsView: "View",
  bsSave: "Save",
  bsSaving: "Saving...",
  bsCancel: "Cancel",
  bsClose: "Close",
  bsDiscardAllChanges: "Discard All Changes",
  bsHideFilters: "Hide Filters",
  bsShowFilters: "Show Filters",
  bsHeaderFiltersEnabled: "Header Filters Enabled",
  bsOfflineToolbar: "🔧 Offline Toolbar",
  bsBulkEditMode: "🔄 Bulk Edit Mode",
  bsBulkEditMessage:
    "Edit cells directly in the grid. Changes are tracked but not saved until you click Save.",
  bsUnsavedChanges: "unsaved changes",
  bsRowNumber: "#",
  bsActions: "Actions",
};
