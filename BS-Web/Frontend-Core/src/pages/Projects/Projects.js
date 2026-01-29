import { Box, Paper } from "@mui/material";
import BSDataGrid from "../../components/BSDataGrid";
import ProjectsDialog from "./ProjectsDialog/ProjectDialog";
import { useEffect, useRef, useState } from "react";
import secureStorage from "../../utils/SecureStorage";
import Config from "../../utils/Config";
import BSLinearWithValueLabel from "../../components/LinearProgress/BSLinearProgressWithLabel";
import { useOutletContext } from "react-router-dom";

const storedProcedure = {
  project: {
    bsStoredProcedure: "usp_tmt_project_header",
    bsStoredProcedureSchema: "tmt",
    bsCols:
      "progress_percent,project_header_id,project_no,application_type,project_name,project_status,customer_name, plan_project_start, plan_project_end, sale_name,create_by, create_date,update_by, update_date",
  },
  ma: {
    bsStoredProcedure: "usp_tmt_project_header_ma",
    bsStoredProcedureSchema: "tmt",
    bsCols:
      "progress_percent,project_header_id,project_no,application_type,project_name,project_status,customer_name, plan_project_start, plan_project_end, sale_name,create_by, create_date,update_by, update_date",
  },
};
const Projects = (props) => {
  const { permission } = useOutletContext();
  const { lang } = props;
  const [openDialog, setOpenDialog] = useState(false);
  const [projectHeaderID, setProjectHeaderID] = useState("");
  const dataGridRef = useRef();
  const handleCloseOpenDialog = (val) => {
    dataGridRef.current?.refreshData();
    setProjectHeaderID("");
    setOpenDialog(val);
  };
  const onChangeProjectHeaderID = ({
    id,
    newtab = false,
    path = "projects",
  }) => {
    if (newtab) {
      secureStorage.set("project_header_id", id);
      window.open(
        `${Config.BASE_URL ?? ""}/${path}`,
        "_blank",
        "noopener,noreferrer"
      );
      return;
    } else {
      setProjectHeaderID(id);
      setOpenDialog(true);
    }
  };
  useEffect(() => {
    const storedProjectHeaderID = secureStorage.get("project_header_id");
    if (storedProjectHeaderID) {
      setProjectHeaderID(storedProjectHeaderID);
      setOpenDialog(true);
      secureStorage.remove("project_header_id");
    }
  }, []);
  useEffect(() => {
    dataGridRef.current?.refreshData();
  }, [props.ma]);
 return (
    <Paper  sx={{ p: 2, mb: 3, width: "100%" }}>
      <BSDataGrid
        bsLocale={lang}
        ref={dataGridRef}
        bsStoredProcedure={
          storedProcedure[props?.ma ? "ma" : "project"].bsStoredProcedure
        }
        bsStoredProcedureSchema={
          storedProcedure[props?.ma ? "ma" : "project"].bsStoredProcedureSchema
        }
        bsCols={storedProcedure[props?.ma ? "ma" : "project"].bsCols}
        bsShowRowNumber={true}
        showAdd={permission.is_add}
        bsVisibleEdit={permission.is_edit}
        bsVisibleDelete={permission.is_delete}
        bsAllowDelete={permission.is_delete}
        bsVisibleView={permission.is_view}
        bsRowPerPage={25}
        onAdd={(r) => {
          setProjectHeaderID("");
          setOpenDialog(true);
        }}
        onEdit={(e) => {
          setProjectHeaderID(e.project_header_id || "");
          setOpenDialog(true);
        }}
        bsColumnDefs={[
          {
            field: "progress_percent",
            type: "progress",
            width: 150,
            renderCell: (params) => (
              <Box
                sx={{
                  width: "100%",
                  height: "100%",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <BSLinearWithValueLabel value={params.value || 0} />
              </Box>
            ),
          },
          { field: "project_status", type: "status" },
          {
            field: "plan_project_start",
            type: "date",
          },
          {
            field: "plan_project_end",
            type: "date",
          },
        ]}
        bsFilterMode="client"
        bsShowCheckbox={false}
        bsRowConfig={(row) => ({
          showDelete: row.project_status === "Open",
        })}
      />
      <ProjectsDialog
        open={openDialog}
        onClose={handleCloseOpenDialog}
        title="Project"
        projectID={projectHeaderID}
        lang={props.lang}
        onChangeProjectHeaderID={onChangeProjectHeaderID}
        ma={props.ma}
      />
    </Paper>
  );
};
export default Projects;
