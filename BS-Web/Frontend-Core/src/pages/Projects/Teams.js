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
                    bsPreObj="tmt"
                    bsObj="usp_project_teams"   // ✔ ชื่อ stored ถูกต้อง
                    bsObjBy="create_date desc"
                    bsPageSizeOptions={[20, 100, 200, 500, 1000]}
                />
            </Paper>
        </Box>
    );
};

export default ProjectsTeams;
