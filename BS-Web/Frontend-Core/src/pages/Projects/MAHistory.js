import { useState, useRef, useEffect } from "react";
import { Paper } from "@mui/material";
import BSDataGrid from "../../components/BSDataGrid";
import { useResource } from "../../hooks/useResource";

const MAHistory = (props) => {
  const { getResource, getResources } = useResource();
  const [resourceData, setResourceData] = useState([]);
  const [locale_id, setLocale_id] = useState(props.lang || "en");

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
          showToolbar={false}
        />
      </Paper>
    </>
  );
};

export default MAHistory;
