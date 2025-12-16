import { useState, useRef, useEffect } from "react";
import { Paper } from "@mui/material";
import BSDataGrid from "../../components/BSDataGrid";
import { useResource } from "../../hooks/useResource";

const InvoiceHistory = (props) => {
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
      const res = await getResources("t_tmt_project_invoice"); // ตั้งชื่อ group ตามที่ backend กำหนด
      setResourceData(res);
    } catch (error) {
      console.error("getResources(Invoice) error:", error);
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
          bsObj="t_tmt_project_invoice"
          bsCols="project_invoice_id,
          document_type,
          document_no,
          document_date,
          due_date,
          amount,
          description,
          is_incentive_requested,
          is_cancel"
          bsObjBy="document_no asc"
          bsObjWh={bsObjWh}
          bsComboBox={[
            {
              Column: "document_type",
              Display: "display_member",
              Value: "value_member",
              Default:
                getResource(resourceData, "Select Document Type") ||
                "--- Select Document Type ---",
              PreObj: "sec",
              Obj: "t_com_combobox_item",
              ObjWh: "is_active='YES' and group_name ='document_type'",
              ObjBy: "display_sequence asc",
            },
          ]}
          bsShowDescColumn={false}
          bsDefaultFormValues={defaultFormValues}
          bsHiddenColumns={["project_header_id"]}
          //   onEdit={handleOpenEdit}
          //   onAdd={handleOpenAdd}
          //   onDelete={handleOpenDelete}
          bsKeyId="project_invoice_id"
        />
      </Paper>
    </>
  );
};

export default InvoiceHistory;
