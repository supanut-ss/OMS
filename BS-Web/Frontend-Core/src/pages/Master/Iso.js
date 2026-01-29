import { Box, Paper, Typography } from "@mui/material";
import BSDataGrid from "../../components/BSDataGrid";
import { useEffect, useState, useRef } from "react";
import { useResource } from "../../hooks/useResource";
import { useOutletContext } from "react-router-dom";

/**
 * IsoPage - Example of Hierarchical Data with BSDataGrid
 *
 * This page demonstrates the hierarchical data feature where:
 * - t_tmt_iso_type is the parent table (PK: iso_type_id)
 * - t_tmt_iso_type_doc is a child table (FK: iso_type_id)
 * - t_tmt_iso_type_phase is a child table (FK: iso_type_id)
 *
 * When editing a parent record, child grids appear in tabs within the dialog.
 * When adding a new parent record, child grids are hidden until the parent is saved.
 */
const IsoPage = (props) => {
  const { permission } = useOutletContext();
  const { getResourceByGroupAndName } = useResource();

  const [locale_id, setLocale_id] = useState(props.lang || "en");
  const dataGridRef = useRef(null);

  const getLang = async () => {
    setLocale_id(props.lang || "en");
  };

  useEffect(() => {
    getLang();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.lang]);

  // Child grid configurations for hierarchical data
  const childGridConfigs = [
    {
      // Tab 1: Phases
      name: "Phases",
      bsPreObj: "tmt",
      bsObj: "t_tmt_iso_type_phase",
      foreignKeys: ["iso_type_id"], // FK linking to parent
      bsObjBy: "sequence asc",
      bsCols:
        "iso_type_id,phase_name,description,sequence,is_active,create_by,create_date,update_by,update_date",
      bsVisibleEdit: true,
      bsVisibleDelete: true,
      bsShowRowNumber: true,
      // bsBulkMode: true, // Enable bulk edit mode
      // bsBulkAddInline: true, // Enable inline add new row
      bsBulkMode: {
        enable: true, // Enable all bulk operations
        addInline: true, // Add new rows inline instead of dialog
        edit: true,      // Enabled by default when enable=true
        // delete: true,    // Enabled by default when enable=true
        // add: true,       // Enabled by default when enable=true
        // showCheckbox: false,
        // showSplitButton: false,
      },
      // bsRowPerPage: 10,
      // bsPageSizeOptions: [10, 25, 50],
      // height: 350,
      bsDialogColumns: 2,
      bsUniqueFields: [
        {
          fields: ["iso_type_id", "phase_name"], // ใช้ fields (array)
          message: "ชื่อ Phase นี้มีอยู่แล้วใน ISO Type นี้", // optional custom message
        },
      ],
    },
    {
      // Tab 2: Documents
      name: "Documents",
      bsPreObj: "tmt",
      bsObj: "t_tmt_iso_type_doc",
      foreignKeys: ["iso_type_id"], // FK linking to parent
      bsObjBy: "sequence asc",
      bsCols:
        "iso_type_id,document_name,document_control,description,sequence,is_require_attach_file,is_active,create_by,create_date,update_by,update_date",
      bsVisibleEdit: true,
      bsVisibleDelete: true,
      bsShowRowNumber: true,
      bsBulkMode: {
        enable: true, // Enable all bulk operations
        addInline: true, // Add new rows inline instead of dialog
        edit: true,      // Enabled by default when enable=true
        // delete: true,    // Enabled by default when enable=true
        // add: true,       // Enabled by default when enable=true
        // showCheckbox: false,
        // showSplitButton: false,
      },
      bsDialogColumns: 2,
      bsUniqueFields: [
        {
          fields: ["iso_type_id", "document_name"], // ใช้ fields (array)
          message: "ชื่อ Document นี้มีอยู่แล้วใน ISO Type นี้", // optional custom message
        },
      ],
      // bsRowPerPage: 10,
      // bsPageSizeOptions: [10, 25, 50],
      // height: 350,
      // Optional: specify columns to show
      // bsCols: "doc_name,doc_type,doc_path,create_date",
      // Optional: ComboBox configurations for child grid
      // bsComboBox: [
      //     {
      //         Column: "doc_type_id",
      //         Display: "doc_type_name",
      //         Value: "doc_type_id",
      //         Default: "--- Select Type ---",
      //         PreObj: "tmt",
      //         Obj: "t_tmt_doc_type",
      //     }
      // ],

    },
  ];

  return (
    <Box>
      <Paper sx={{ p: 2, mb: 3 ,width: "100%"}}>
        <BSDataGrid
          ref={dataGridRef}
          bsLocale={props.lang}
          bsPreObj="tmt"
          bsObj="t_tmt_iso_type"
          bsObjBy="create_date desc"
          bsCols="iso_type_name,description,is_active,create_by,create_date,update_by,update_date"
          //   bsPageSizeOptions={[20, 100, 200, 500, 1000]}
          // Hierarchical Data Configuration
          bsPrimaryKeys={["iso_type_id"]} // Parent table primary key(s)
          bsChildGrids={childGridConfigs} // Child grid configurations
          // Optional: Dialog size for hierarchical mode (recommended: Large or FullScreen)
          bsDialogSize="Large"
          bsDialogColumns={3}
          // bsParentRecordLabel="resource:iso_type_label_name"
          bsParentRecordLabel="ISO Type"
          bsUniqueFields={["iso_type_name"]}
          showAdd={permission.is_add}
          bsVisibleEdit={permission.is_edit}
          bsVisibleDelete={permission.is_delete}
          bsAllowDelete={permission.is_delete}
          bsVisibleView={permission.is_view}
        />
      </Paper>
    </Box>
  );
};

export default IsoPage;
