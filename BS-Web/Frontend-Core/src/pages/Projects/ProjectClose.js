import { useState, useRef, useEffect } from "react";
import { Paper, IconButton, Tooltip } from "@mui/material";
import { AttachFile as AttachFileIcon } from "@mui/icons-material";
import BSDataGrid from "../../components/BSDataGrid";
import BSFileUploadDialog from "../../components/BSDataGrid/BSFileUploadDialog";
import { useResource } from "../../hooks/useResource";

const ProjectClose = (props) => {
  const { getResource, getResources } = useResource();
  const [resourceData, setResourceData] = useState([]);
  const [locale_id, setLocale_id] = useState(props.lang || "en");

  // AttachFile Dialog states
  const [attachDialogOpen, setAttachDialogOpen] = useState(false);
  const [attachRowData, setAttachRowData] = useState(null);

  // If a projectID is provided from props, use it to filter the grid by project_header_id
  const bsObjWh = props.projectID
    ? `project_header_id='${props.projectID}'`
    : undefined;

  // Default values for new records - set project_header_id from props
  const defaultFormValues = props.projectID
    ? { project_header_id: props.projectID }
    : {};

  const gridRef = useRef();
  // โหลด resource ของ group "User"
  const getLang = async () => {
    try {
      const res = await getResources("t_tmt_project_close_document"); // ตั้งชื่อ group ตามที่ backend กำหนด
      setResourceData(res);
    } catch (error) {
      console.error("getResources(ProjectClose) error:", error);
    }
  };

  useEffect(() => {
    setLocale_id(props.lang || "en");
    getLang();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.lang]);

  // Handle attach file click
  const handleAttachFileClick = (rowData) => {
    setAttachRowData(rowData);
    setAttachDialogOpen(true);
  };

  // Column definitions with conditional attach file icon
  const columnDefs = [
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
      <Paper sx={{ p: 2, mb: 3 }}>
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
          bsObjBy="document_name asc"
          bsObjWh={bsObjWh}
          bsShowDescColumn={false}
          bsDefaultFormValues={defaultFormValues}
          bsHiddenColumns={["project_header_id"]}
          bsKeyId="project_close_doc_id"
          bsColumnDefs={columnDefs}
          showToolbar={false}
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
