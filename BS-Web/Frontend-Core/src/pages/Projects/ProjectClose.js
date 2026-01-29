import { useState, useRef, useEffect } from "react";
import { Paper, IconButton, Tooltip, Box } from "@mui/material";
import { AttachFile as AttachFileIcon } from "@mui/icons-material";
import BSDataGrid from "../../components/BSDataGrid";
import BSFileUploadDialog from "../../components/BSFileUploadDialog";
import { useDynamicCrud } from "../../hooks/useDynamicCrud";
import { IOSSwitch } from "../../components/BSSwitch";

const ProjectClose = (props) => {
  const [locale_id, setLocale_id] = useState(props.lang || "en");

  // useDynamicCrud for updating records
  const { updateRecord } = useDynamicCrud("t_tmt_project_close_document");

  // AttachFile Dialog states
  const [attachDialogOpen, setAttachDialogOpen] = useState(false);
  const [attachRowData, setAttachRowData] = useState(null);

  // Local state for optimistic toggle updates
  const [checklistOverrides, setChecklistOverrides] = useState({});

  // If a projectID is provided from props, use it to filter the grid by project_header_id
  const bsObjWh = props.projectID
    ? `project_header_id='${props.projectID}'`
    : undefined;

  // Default values for new records - set project_header_id from props
  const defaultFormValues = props.projectID
    ? { project_header_id: props.projectID }
    : {};

  const gridRef = useRef();
  

  useEffect(() => {
    setLocale_id(props.lang || "en");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.lang]);

  // Handle attach file click
  const handleAttachFileClick = (rowData) => {
    setAttachRowData(rowData);
    setAttachDialogOpen(true);
  };

  // Handle is_checklist toggle
  const handleChecklistToggle = async (rowData, newValue) => {
    const rowId = rowData.project_close_doc_id;

    // Optimistic update - update UI immediately
    setChecklistOverrides((prev) => ({
      ...prev,
      [rowId]: newValue,
    }));

    try {
      const updateData = {
        is_checklist: newValue ? "YES" : "NO",
      };

      await updateRecord(
        rowData.project_close_doc_id,
        updateData,
        "tmt", // preObj
        { project_close_doc_id: rowData.project_close_doc_id } // whereConditions
      );

      // Refresh grid to show updated data
      if (gridRef.current?.refreshData) {
        gridRef.current.refreshData();
      }

      // Clear override after refresh
      setChecklistOverrides((prev) => {
        const newOverrides = { ...prev };
        delete newOverrides[rowId];
        return newOverrides;
      });
    } catch (error) {
      console.error("Failed to update is_checklist:", error);
      // Revert on error
      setChecklistOverrides((prev) => {
        const newOverrides = { ...prev };
        delete newOverrides[rowId];
        return newOverrides;
      });
    }
  };

  // Column definitions with conditional attach file icon
  const columnDefs = [
    {
      field: "is_checklist",
      headerName: locale_id === "th" ? "เช็คลิสต์" : "Checklist",
      width: 100,
      sortable: false,
      filterable: false,
      renderCell: (params) => {
        const rowId = params.row.project_close_doc_id;
        const hasPrimaryKey = rowId !== undefined;

        // Use override value if exists, otherwise use params.value
        const isChecked =
          checklistOverrides[rowId] !== undefined
            ? checklistOverrides[rowId]
            : params.value === "YES";

        return (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              width: "100%",
              height: "100%",
            }}
          >
            <IOSSwitch
              checked={isChecked}
              onChange={(e) => {
                e.stopPropagation();
                if (hasPrimaryKey) {
                  handleChecklistToggle(params.row, e.target.checked);
                }
              }}
              disabled={!hasPrimaryKey}
              inputProps={{ "aria-label": "Checklist" }}
            />
          </Box>
        );
      },
    },
    {
      field: "is_require_attach_file",
      headerName: "Attach File",
      width: 100,
      sortable: false,
      filterable: false,
      renderCell: (params) => {
        // Only show icon when is_require_attach_file === "YES"
        if (params.row.is_require_attach_file !== "YES") {
          return null;
        }

        // Check if record is saved (has primary key)
        const hasPrimaryKey =
          params.row.project_close_doc_id !== undefined &&
          params.row.project_close_doc_id !== null;

        return (
          <Tooltip
            title={
              hasPrimaryKey
                ? locale_id === "th"
                  ? "แนบไฟล์"
                  : "Attach Files"
                : locale_id === "th"
                ? "บันทึกข้อมูลก่อนแนบไฟล์"
                : "Save record first to attach files"
            }
            arrow
          >
            <span>
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  if (hasPrimaryKey) {
                    handleAttachFileClick(params.row);
                  }
                }}
                disabled={!hasPrimaryKey}
                sx={{
                  color: hasPrimaryKey ? "primary.main" : "action.disabled",
                  "&:hover": {
                    backgroundColor: "primary.light",
                    color: "primary.contrastText",
                  },
                }}
              >
                <AttachFileIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        );
      },
    },
  ];

  return (
    <>
      <Paper sx={{ p: 2, mb: 3 ,width: "100%"}}>
        <BSDataGrid
          ref={gridRef}
          bsLocale={locale_id}
          bsPreObj="tmt"
          bsObj="t_tmt_project_close_document"
          bsCols="project_close_doc_id,
          document_name,
          document_control,
          sequence,
          is_checklist,
          is_require_attach_file,
          create_by,
          create_date,
          update_by,
          update_date"
          bsObjBy="sequence asc"
          bsObjWh={bsObjWh}
          bsShowDescColumn={false}
          bsDefaultFormValues={defaultFormValues}
          bsHiddenColumns={["project_header_id"]}
          bsKeyId="project_close_doc_id"
          bsColumnDefs={columnDefs}
          showAdd={false}
          bsVisibleEdit={false}
          bsVisibleDelete={false}
        />
      </Paper>

      {/* Attach File Dialog */}
      <BSFileUploadDialog
        open={attachDialogOpen}
        onClose={() => setAttachDialogOpen(false)}
        rowData={attachRowData}
        attachConfig={{
          preObj: "tmt",
          attachTable: "t_tmt_project_close_document_attach_file",
          foreignKey: "project_close_doc_id",
          foreignKeyValue: attachRowData?.project_close_doc_id,
          fileNameColumn: "file_name",
          pathColumn: "path_file",
          primaryKey: "project_close_attach_file_id",
          additionalData: {
            project_header_id:
              props.projectID || attachRowData?.project_header_id,
          },
          maxFileSize: 50 * 1024 * 1024, // 50MB
          allowedTypes: [
            ".pdf",
            ".doc",
            ".docx",
            ".xls",
            ".xlsx",
            ".jpg",
            ".jpeg",
            ".png",
          ],
          maxFiles: 10,
        }}
        locale={locale_id}
      />
    </>
  );
};

export default ProjectClose;
