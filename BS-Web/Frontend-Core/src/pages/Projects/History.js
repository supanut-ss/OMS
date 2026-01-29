import { Box, Paper, Typography } from "@mui/material";
import BSDataGrid from "../../components/BSDataGrid";
import { useEffect, useState, useRef } from "react";
import { useResource } from "../../hooks/useResource";
const ProjectsHistory = (props) => {
  const dataGridRef = useRef(null);
  const handleViewTask = (data) => {
    props.onChangeProjectHeaderID({ id: data.project_header_id, newtab: true, path: "projects" });
  };

  return (
    <Box>
      <Paper sx={{ p: 2, mb: 3 ,width: "100%"}}>
        <BSDataGrid
          ref={dataGridRef}
          bsLocale={props.lang}
          bsStoredProcedureSchema="tmt"
          bsStoredProcedure="usp_project_history" // ✔ ชื่อ stored ถูกต้อง
          bsCols="project_no, project_name,project_type,iso_type_name,actual_project_start,actual_project_end,create_date"
          bsStoredProcedureParams={{
            in_intProjectHeaderId: props.projectID || null,
          }}
          showAdd={false}
          bsVisibleView={true}
          bsVisibleEdit={false}
          bsVisibleDelete={false}
          bsKeyId="project_header_id"
          bsFilterMode="client"
          onView={handleViewTask}
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
          ]}
        />
      </Paper>
    </Box>
  );
};

export default ProjectsHistory;
