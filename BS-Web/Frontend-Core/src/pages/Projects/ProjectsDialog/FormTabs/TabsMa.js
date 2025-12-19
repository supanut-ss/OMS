import { Box, Tab, Tabs } from "@mui/material";
import InvoiceHistory from "../../InvoiceHistory";
import MAHistory from "../../MAHistory";
import ProjectsTeams from "../../Teams";
import ProjectTask from "../../Task";
import BSFileUpload from "../../../../components/BSFileUpload";

const TabsMa = (props) => {
    const { formData, resourceData, getResource, tap, setTap, taskRefresh, setTaskRefresh, onChangeProjectHeaderID } = props;
    return (<Box>
        <Tabs
            value={tap}
            onChange={(e, newValue) => setTap(newValue)}
            sx={{ mt: 3 }}
        >
            <Tab label={(() => { const r = getResource(resourceData, "tap_ticket"); return r === "tap_ticket" ? "Task" : r; })()} />
            <Tab label={(() => { const r = getResource(resourceData, "project_teams"); return r === "project_teams" ? "Project Team" : r; })()} />
            <Tab label={(() => { const r = getResource(resourceData, "ma_history"); return r === "ma_history" ? "MA History" : r; })()} />
            <Tab label={(() => { const r = getResource(resourceData, "invoice_history"); return r === "invoice_history" ? "Invoice History" : r; })()} />
            <Tab label={(() => { const r = getResource(resourceData, "attach_file"); return r === "attach_file" ? "Attach File" : r; })()} />
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
                    <BSFileUpload
                        attachConfig={{
                            preObj: "tmt",
                            attachTable: "t_tmt_project_attach_file",
                            foreignKey: "project_header_id",
                            foreignKeyValue: formData?.project_header_id,
                            fileNameColumn: "file_name",
                            pathColumn: "path_file",
                            primaryKey: "project_file_id",
                            maxFiles: 10,
                            maxFileSize: 1024 * 1024 * 10,
                            additionalData: {
                                project_header_id: formData?.project_header_id,
                            },
                        }}
                        locale={props.lang}
                    />
                )}
            </Box>}
    </Box>);

}
export default TabsMa;