import { Box, Paper, useTheme } from "@mui/material";
import BSDataGrid from "../../components/BSDataGrid";
import { useEffect, useMemo, useRef, useState } from "react";
import { useResource } from "../../hooks/useResource";
import { useOutletContext } from "react-router-dom";

const ColumnMapping = (props) => {
  const theme = useTheme();
  const { permission } = useOutletContext();
  const [locale_id, setLocale_id] = useState(props.lang || "en");
  const dataGridRef = useRef(); // เพิ่ม ref สำหรับ DataGrid
  const isThai = String(locale_id || props.lang || "en")
    .toLowerCase()
    .startsWith("th");

  useEffect(() => {
    setLocale_id(props.lang || "en");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.lang]);

  // Stable references so BSDataGrid's internal effects (keyed on these props)
  // don't refire on every ColumnMapping re-render.
  const comboBoxConfig = useMemo(
    () => [
      {
        Column: "import_id",
        Display: "import_name",
        Value: "import_id",
        Default: "--- Select Import ---",
        PreObj: "imp",
        Obj: "t_mas_import_master",
        ObjWh: "is_active=1",
        ObjBy: "import_name asc",
      },
      {
        Column: "data_type",
        Display: "display_member",
        Value: "value_member",
        Default: "--- Select Data Type ---",
        PreObj: "sec",
        Obj: "t_com_combobox_item",
        ObjWh: "group_name='import_data_type' AND is_active=1",
        ObjBy: "display_sequence asc",
      },
    ],
    [],
  );

  const columnDefs = useMemo(
    () => [
      {
        field: "create_date",
        type: "date",
        dateFormat: "dd/MM/yyyy",
      },
    ],
    [],
  );

  return (
    <Box sx={{ height: "100%" }}>
      <Paper
        sx={{
          p: 2,
        //  mb: 3,
          width: "100%",
          maxWidth: "100%",
       height: "100%",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <BSDataGrid
          ref={dataGridRef}
          bsLocale={props.lang}
          bsPreObj="imp"
          bsObj="t_mas_import_column_mapping"
          bsObjBy="import_id asc, column_order asc"
          bsCols={[
            "mapping_id",
            "import_id",
            "excel_column_name",
            "db_column_name",
            "data_type",
            "datatype_parameter",
            "allowed_values",
            "format_pattern",
            "is_required",
            "column_order",
            "default_value",
          ].join(",")}
          bsKeyId="mapping_id"
          bsShowRowNumber={true}
          bsPageSizeOptions={[20, 100, 200, 500, 1000]}
          showAdd={permission?.is_add}
          bsVisibleEdit={permission?.is_edit}
          bsVisibleDelete={permission?.is_delete}
          bsAllowDelete={permission?.is_delete}
          bsVisibleView={permission?.is_view}
          bsBulkMode={{
            enable: false,
            addInline: permission.is_add,
            edit: permission.is_edit,
            delete: permission.is_delete,
            add: permission.is_add,
          }}
          bsComboBox={comboBoxConfig}
          bsColumnDefs={columnDefs}
        />
      </Paper>
    </Box>
  );
};

export default ColumnMapping;
