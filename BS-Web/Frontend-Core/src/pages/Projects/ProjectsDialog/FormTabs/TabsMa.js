import { Box, Tab, Tabs } from "@mui/material";
import InvoiceHistory from "../../InvoiceHistory";
import MAHistory from "../../MAHistory";
import ProjectsTeams from "../../Teams";
import ProjectTask from "../../Task";

const TabsMa = (props) => {
    const { formData, resourceData, getResource, tap, setTap, taskRefresh, setTaskRefresh, onChangeProjectHeaderID } = props;
    return (<Box>
        <Tabs
            value={tap}
            onChange={(e, newValue) => setTap(newValue)}
            sx={{ mt: 3 }}
        >
            <Tab label={getResource(resourceData, "tap_ticket")} />
            <Tab label={getResource(resourceData, "project_teams")} />
            <Tab label={getResource(resourceData, "ma_history")} />
            <Tab label={getResource(resourceData, "invoice_history")} />
            <Tab label={getResource(resourceData, "attach_files")} />
        </Tabs>
        {props.formData?.project_header_id &&
            <Box sx={{ mt: 2, borderTop: 1, borderColor: "divider", pt: 2 }}>
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
                    <MAHistory
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
                    <Box>Attach Files Component Goes Here</Box>
                )}
            </Box>}
    </Box>);

}
export default TabsMa;