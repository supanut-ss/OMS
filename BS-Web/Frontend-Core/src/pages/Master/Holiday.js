import { Box, Paper, Typography } from "@mui/material";
import BSDataGrid from "../../components/BSDataGrid";
import { useEffect, useState, useRef } from "react";
import { useResource } from "../../hooks/useResource";

const HolidayPage = (props) => {
   const { permission } = props;
  const { getResource, getResources } = useResource();
  const [resourceData, setResourceData] = useState([]);
  const dataGridRef = useRef(null); // ref

  // โหลด resource ตามภาษาที่เปลี่ยน
  const getLang = async () => {
    const res = await getResources("MasterHoliday");
    setResourceData(res);
  };

  useEffect(() => {
    getLang();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.lang]);

  return (
    <Box>
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          {getResource(resourceData, "Master Holiday")}
        </Typography>

        <BSDataGrid
          ref={dataGridRef}
          bsLocale={props.lang}
          bsPreObj="tmt"
          bsObj="t_tmt_holiday"
          bsObjBy="create_date desc"
          bsDialogSize="Large"
          bsDialogColumns={3}
          bsCols="holiday_date,holiday_name,description,is_active,create_by,create_date,update_by,update_date"
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
            {
              field: "holiday_date",
              type: "date",
              dateFormat: "dd/MM/yyyy",
            },
          ]}
          bsUniqueFields={["holiday_date"]}
        />
      </Paper>
    </Box>
  );
};

export default HolidayPage;
