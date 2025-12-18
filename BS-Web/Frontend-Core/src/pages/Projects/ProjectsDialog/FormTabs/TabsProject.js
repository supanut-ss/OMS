import { Box, Tab, Tabs } from "@mui/material";
import ProjectTask from "../../Task";
import ProjectsTeams from "../../Teams";
import ProjectsHistory from "../../History";
import ProjectClose from "../../ProjectClose";
import MAHistory from "../../MAHistory";
import InvoiceHistory from "../../InvoiceHistory";

const TabsProject = (props) => {
    const { formData, resourceData, getResource, onChangeProjectHeaderID, tap, setTap, taskRefresh, setTaskRefresh } = props;
    return (<Box>
        <Tabs
            value={tap}
            onChange={(e, newValue) => setTap(newValue)}
            sx={{ mt: 3 }}
        >
            <Tab label={getResource(resourceData, "task")} />
            <Tab label={getResource(resourceData, "project_teams")} />
            <Tab label={getResource(resourceData, "project_history")} />
            <Tab label={getResource(resourceData, "invoice_history")} />
            <Tab label={getResource(resourceData, "project_close")} />
            <Tab label={getResource(resourceData, "ma_history")} />
        </Tabs>
        {props.formData?.project_header_id && <Box sx={{ mt: 2, borderTop: 1, borderColor: "divider", pt: 2 }}>
            {tap === 0 && (
                <ProjectTask
                    projectID={formData?.project_header_id || ""}
                    lang={props.lang}
                    refresh={taskRefresh}
                    setRefresh={setTaskRefresh}
                    projectHeader={formData}
                />
            )}
            {tap === 1 && (
                <ProjectsTeams
                    projectID={formData?.project_header_id || ""}
                    lang={props.lang}
                />
            )}
            {tap === 2 && (
                <ProjectsHistory
                    projectID={formData?.project_header_id || ""}
                    lang={props.lang}
                    onChangeProjectHeaderID={onChangeProjectHeaderID}
                />
            )}
            {tap === 3 && (
                <InvoiceHistory
                    projectID={formData?.project_header_id || ""}
                    lang={props.lang}
                />
            )}
            {tap === 4 && (
                <ProjectClose
                    projectID={formData?.project_header_id || ""}
                    lang={props.lang}
                />
            )}
            {tap === 5 && (
                <MAHistory
                    projectID={formData?.project_header_id || ""}
                    lang={props.lang}
                    onChangeProjectHeaderID={onChangeProjectHeaderID}
                />
            )}
        </Box>}
    </Box>);
}
export default TabsProject;