import { Paper, useTheme } from "@mui/material";
import BSDataGrid from "../../../components/BSDataGrid";
import { useEffect, useMemo, useRef, useState } from "react";
import { useResource } from "../../../hooks/useResource";
import { Description } from "@mui/icons-material";

const AssignTeam = (props) => {
  const { lang, project_header_id, project_task_id } = props;
  const theme = useTheme();
  const dataRef = useRef();
  const { getResources } = useResource();
  const [resourceData, setResourceData] = useState();

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const getLang = async () => {
    setResourceData(await getResources("t_tmt_project_task_member", lang));
  };

  useEffect(() => {
    getLang();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  // Memoize stored procedure params to prevent infinite re-renders
  const storedProcedureParams = useMemo(
    () => ({
      in_intProjectTaskId: project_task_id,
      in_intProjectHeaderId: project_header_id,
    }),
    [project_task_id, project_header_id],
  );

  // Memoize column definitions
  const columnDefs = useMemo(
    () => ({
      project_task_member_id: { hide: true },
      project_task_id: { hide: true },
      project_header_id: { hide: true },
      task_member_user_id: {
        headerName: "Assignee",
        required: true,
      },
      fullname: {
        headerName: "Full Name (Display)",
        hide: true,
      },
      manday: {
        headerName: "Manday (Hours)",
        type: "decimal",
        allowNegative: false,
        min: 0,
      },
      description: {
        hide: true,
      },
      actual_work: {
        headerName: "Actual Work (Hours)",
        type: "decimal",
        editable: false,
        readOnly: true,
        disabled: true,
      },
      create_by: { hide: true },
      create_date: { hide: true },
      update_by: { hide: true },
      update_date: { hide: true },
    }),
    [],
  );

  // Memoize comboBox configuration
  const comboBoxConfig = useMemo(
    () => [
      {
        Column: "task_member_user_id",
        Display: "first_name,last_name", // รองรับ multiple fields แล้ว
        Value: "user_id",
        Default: "--- Select Member ---",
        PreObj: "tmt",
        Obj: "v_tmt_project_member",
        ObjWh: `project_header_id = '${project_header_id}'`,
        ObjBy: "first_name asc",
      },
    ],
    [project_header_id],
  );

  // Memoize bulk mode configuration
  const bulkModeConfig = useMemo(
    () => ({
      enable: true,
      addInline: true, // Add new rows inline
      edit: true,
      //   showCheckbox: true,
      //   showSplitButton: true,
    }),
    [],
  );

  return (
    <Paper
      elevation={3}
      sx={{
        p: 2, width: "100%",
        backgroundColor:
          theme.palette.custom?.paperBackground ||
          theme.palette.background.paper,
      }}

    >
      <BSDataGrid
        ref={dataRef}
        bsLocale={lang}
        bsStoredProcedure="usp_tmt_project_task_member"
        bsStoredProcedureSchema="tmt"
        bsStoredProcedureCrud={true}
        bsKeyId="project_task_member_id"
        bsCols="task_member_user_id,manday,actual_work"
        bsStoredProcedureParams={storedProcedureParams}
        bsFilterMode="client"
        bsColumnDefs={columnDefs}
        bsComboBox={comboBoxConfig}
        bsShowRowNumber={true}
        bsBulkMode={bulkModeConfig}
        showAdd={true}
      />
    </Paper>
  );
};

export default AssignTeam;
