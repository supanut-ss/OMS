import React, { useEffect, useState } from "react";
import { Typography, Paper } from "@mui/material";
import BSDataGrid from "../../components/BSDataGrid";
import { useResource } from "../../hooks/useResource";

const MethodPage = (props) => {
  const { getResource, getResources } = useResource();
  const [resourceData, setResourceData] = useState([]);

  const getLang = async () => {
    try {
      // ให้ backend/resource แยกจอด้วย key "Method" (ตั้งชื่อ group ตามที่คุณใช้)
      const res = await getResources("Method");
      setResourceData(res);
    } catch (error) {
      console.error("getResources(Method) error:", error);
    }
  };

  useEffect(() => {
    getLang();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.lang]);

  return (
    <>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          {/* ถ้าไม่มี resource ให้ fallback เป็นข้อความเดิม */}
          {getResource(resourceData, "Master Method") || "Master Method"}
        </Typography>

        <BSDataGrid
          bsKeyId="method_id"
          bsStoredProcedure="usp_tbm_method"
          bsStoredProcedureSchema="ams"
          bsShowRowNumber={true}
          bsCols="method,create_by,create_date,update_by,update_date"
          bsLocale={props.lang || "en"}    // ใช้ภาษาจาก props
          bsAllowAdd={true}
          bsAllowEdit={true}
          bsAllowDelete={true}
          bsRowPerPage={20}
          bsPageSizeOptions={[20, 100, 200, 500, 1000]}
          bsFilterMode="client"
        // ถ้าต้องการ lock method_id: 
        // bsColumnDefs={[
        //   {
        //     field: "method_id",
        //     readOnly: true,
        //   },
        // ]}
        />
      </Paper>
    </>
  );
};

export default MethodPage;
