import { Box, Paper, Typography } from "@mui/material";
import BSDataGrid from "../../components/BSDataGrid";
import { useEffect, useState, useRef } from "react";
import { useResource } from "../../hooks/useResource";
const ProjectsHistory = (props) => {
    const { getResource, getResources } = useResource();
    const [resourceData, setResourceData] = useState([]);
    const dataGridRef = useRef(null);

    const getLang = async () => {
        const res = await getResources("Projects History");
        setResourceData(res);
    };
    const handleViewTask = (data) => {
        props.onChangeProjectHeaderID(data.project_header_id);
    };
    useEffect(() => {
        getLang();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [props.lang]);

    return (
        <Box>
            <Paper sx={{ p: 2, mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                    {getResource(resourceData, "Projects History")}
                </Typography>

                <BSDataGrid
                    ref={dataGridRef}
                    bsLocale={props.lang}
                    bsStoredProcedureSchema="tmt"
                    bsStoredProcedure="usp_project_history"   // ✔ ชื่อ stored ถูกต้อง
                    bsCols="project_no, project_name,project_type,iso_type_name,actual_project_start,actual_project_end,create_date"
                    bsStoredProcedureParams={{
                        ProjectHeaderId: props.projectID || null,
                    }}
                    showAdd={false}
                    bsVisibleView={true}
                    bsVisibleEdit={false}
                    bsVisibleDelete={false}
                    bsKeyId="project_header_id"
                    bsFilterMode="client"
                    onView={handleViewTask}
                />
            </Paper>
        
        </Box>
    );
};

export default ProjectsHistory;