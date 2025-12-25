import { Box, Paper, Typography } from "@mui/material";
import BSDataGrid from "../../components/BSDataGrid";
import { useEffect, useState, useRef } from "react";
import { useResource } from "../../hooks/useResource";

const ImportMaster = (props) => {
  const { getResource, getResources } = useResource();
  const [resourceData, setResourceData] = useState([]);
  const dataGridRef = useRef(); // เพิ่ม ref สำหรับ DataGrid

  const getLang = async () => {
    setResourceData(await getResources("ImportMaster"));
  };

  useEffect(() => {
    getLang();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.lang]);

  return (
    <Box>
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          {getResource(resourceData, "Import Master")}
        </Typography>

        <BSDataGrid
          ref={dataGridRef}
          bsLocale={props.lang}
          bsPreObj="imp"
          bsObj="t_mas_import_master"
          bsObjBy="create_date desc"
          bsPageSizeOptions={[20, 100, 200, 500, 1000]}
          bsBulkMode={{
            enable: true, // Enable all bulk operations
            addInline: true, // Add new rows inline instead of dialog
            // edit: true,      // Enabled by default when enable=true
            // delete: true,    // Enabled by default when enable=true
            // add: true,       // Enabled by default when enable=true
            // showCheckbox: false,
            // showSplitButton: false,
          }}
          bsColumnDefs={[
            // {
            //   field: "app_id",
            //   headerName: "Application",
            // },
            {
              field: "is_active",
              defaultValue: "YES",
            },
            ,
            {
              field: "create_date",
              type: "date",
              dateFormat: "dd/MM/yyyy",
            },
          ]}
        />
      </Paper>
    </Box>
  );
};

export default ImportMaster;
