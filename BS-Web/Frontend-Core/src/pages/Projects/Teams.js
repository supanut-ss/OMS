import { Box, Paper, Typography } from "@mui/material";
import BSDataGrid from "../../components/BSDataGrid";
import { useEffect, useState, useRef } from "react";
import { useResource } from "../../hooks/useResource";

const ProjectsTeams = (props) => {
    const { getResource, getResources } = useResource();
    const [resourceData, setResourceData] = useState([]);
    const dataGridRef = useRef(null);

    const getLang = async () => {
        const res = await getResources("Projects Teams");
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
                    {getResource(resourceData, "Projects Teams")}
                </Typography>

                <BSDataGrid
                    ref={dataGridRef}
                    bsLocale={props.lang}
                    bsCols="Assignee,role,description"
                    bsStoredProcedureSchema="tmt"
                    bsStoredProcedure="usp_project_teams"   // ✔ ชื่อ stored ถูกต้อง
                    bsPageSizeOptions={[20, 100, 200, 500, 1000]}
                    showAdd={true}
                    bsShowRowNumber={true}
                    bsRowPerPage={20}
                    bsAllowAdd={true}
                    bsAllowEdit={true}
                    bsAllowDelete={true}
                    bsFilterMode="client"
                    bsQueryParams={{ project_id: props.projectID }}
                />
            </Paper>
        </Box>
    );
};

export default ProjectsTeams;
