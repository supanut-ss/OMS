import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Paper } from "@mui/material";
import BSDataGrid from "../../components/BSDataGrid";
import { useResource } from "../../hooks/useResource";

const MAHistory = (props) => {
  const { getResource, getResources } = useResource();
  const [resourceData, setResourceData] = useState([]);
  const [locale_id, setLocale_id] = useState(props.lang || "en");
  // If a projectID is provided from props, use it to filter the grid by project_header_id
  const bsObjWh = props.projectID
    ? `master_project_id='${props.projectID}'`
    : undefined;

  // Default values for new records - set project_header_id from props
  const defaultFormValues = props.projectID
    ? { master_project_id: props.projectID }
    : {};

  const gridRef = useRef();
  const navigate = useNavigate();
  // โหลด resource ของ group "User"
  const getLang = async () => {
    try {
      const res = await getResources("t_tmt_project_header"); // ตั้งชื่อ group ตามที่ backend กำหนด
      setResourceData(res);
    } catch (error) {
      console.error("getResources(MAHistory) error:", error);
    }
  };

  const onViewChick = (rowData) => {
    const id =
      rowData?.related_project_header_id ||
      rowData?.master_project_id ||
      rowData?.project_header_id ||
      "";

    if (id && props.onChangeProjectHeaderID) {
      props.onChangeProjectHeaderID({
        id: id,
        newtab: true,
        path: "projects/ma",
      });
    }
  };
  useEffect(() => {
    setLocale_id(props.lang || "en");
    getLang();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.lang]);

  return (
    <>
      <Paper sx={{ p: 2, mb: 3 }}>
        <BSDataGrid
          ref={gridRef}
          bsLocale={locale_id}
          bsPreObj="tmt"
          bsObj="v_ma_history_all"
          bsCols="ma_no,
          project_no_master,
          project_name,
          year,
          actual_project_start,
          actual_project_end,
          ma_status,related_project_header_id"
          bsObjBy="ma_no asc"
          bsObjWh={bsObjWh}
          bsShowDescColumn={false}
          bsDefaultFormValues={defaultFormValues}
          bsHiddenColumns={["related_project_header_id"]}
          bsKeyId="related_project_header_id"
          bsVisibleView={true}
          showAdd={false}
          bsVisibleEdit={false}
          bsVisibleDelete={false}
          onView={onViewChick}
          bsColumnDefs={[
            {
              field: "actual_project_start",
              type: "date",
              dateFormat: "dd/MM/yyyy",
            },
            {
              field: "actual_project_end",
              type: "date",
              dateFormat: "dd/MM/yyyy",
            },
            {
              field: "year",
              renderCell: (params) => params.value,
            },
          ]}
        />
      </Paper>
    </>
  );
};

export default MAHistory;
