import { Box, Paper, Typography } from "@mui/material";
import BSDataGrid from "../../components/BSDataGrid";
import { useEffect, useState, useRef } from "react";
import { useResource } from "../../hooks/useResource";

const CustomerPage = (props) => {
  const { getResource, getResources } = useResource();
  const [resourceData, setResourceData] = useState([]);
  const dataGridRef = useRef(null); // ref

  // โหลด resource ตามภาษาที่เปลี่ยน
  const getLang = async () => {
    const res = await getResources("Customer");
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
          {getResource(resourceData, "Master Customer")}
        </Typography>

        <BSDataGrid
          ref={dataGridRef}
          bsLocale={props.lang}
          bsPreObj="tmt"
          bsObj="t_tmt_customer"
          // bsObjBy="create_date desc"
          bsUniqueFields={["customer_code"]}
          bsCols="customer_code,customer_name,description,addr_line_1,is_active,create_by,create_date,update_by,update_date"
          // bsPageSizeOptions={[20, 100, 200, 500, 1000]}
          // bsBulkAction={true}
          // bsEnableBulkMode={true} // Enable all bulk operations
          bsDialogSize="Large"
          bsDialogColumns={3}
          bsDialogTab={[
            {
              Column:
                "customer_code,customer_name,description,addr_line_1,addr_line_2,addr_line_3,province,postal_code,country_name,phone,email,is_active",
              name: "Profile",
            },
            {
              Column:
                "user_def1,user_def2,user_def3,user_def4,user_def5,user_def6,user_def7,user_def8,user_def9,user_def10",
              name: "User Define Data",
            },
          ]}
          bsColumnDefs={[
            {
              field: "customer_code",
              editable: true,
              readOnly: true,
            },
          ]}
        />
      </Paper>
    </Box>
  );
};

export default CustomerPage;
