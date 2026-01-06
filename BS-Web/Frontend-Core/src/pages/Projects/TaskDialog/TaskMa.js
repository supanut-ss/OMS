import { Grid } from "@mui/material";
import BSAutoComplete from "../../../components/BSAutoComplete";
import BSSwitchField from "../../../components/BSSwitch";
import { read } from "xlsx";
import { DisabledByDefault } from "@mui/icons-material";

const TaskMa = (props) => {
    const { formData, projectHeader, resourceData, resourceDataProject, getResource, errors, updateField, renderInput } = props;
    return (<Grid container spacing={2} mt={2}>

        {/* Project No */}
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            {renderInput({
                item: {
                    field: "project_no",
                    headerName: getResource(resourceDataProject, "project_no"),
                    component: "BSTextField",
                    value: projectHeader.project_no,
                    variant: "filled",
                    readOnly: true
                },
                formData,
                errors,
                updateField
            })}
        </Grid>

        {/* Project Name */}
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            {renderInput({
                item: {
                    field: "project_name",
                    headerName: getResource(resourceDataProject, "project_name"),
                    component: "BSTextField",
                    value: projectHeader.project_name,
                    variant: "filled",
                    readOnly: true
                },
                formData,
                errors,
                updateField
            })}
        </Grid>

        {/* Project Type */}
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            {renderInput({
                item: {
                    field: "project_type",
                    headerName: getResource(resourceDataProject, "project_type"),
                    component: "BSTextField",
                    value: projectHeader.project_type,
                    variant: "filled",
                    readOnly: true
                },
                formData,
                errors,
                updateField
            })}
        </Grid>

        {/* Task Name */}
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            {renderInput({
                item: {
                    field: "task_name",
                    headerName: getResource(resourceData, "task_name"),
                    component: "BSTextField",
                    required: true
                },
                formData,
                errors,
                updateField
            })}
        </Grid>

        {/* Priority */}
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <BSAutoComplete
                label={getResource(resourceData, "priority")}
                bsValue={formData.priority ? formData.priority : ""}
                fullWidth
                bsOnChange={(e) => {
                    updateField("priority", e?.code || "");
                    updateField("response_time", e?.value_member1 || "");
                    updateField("resolve_duration", e?.value_member2 || "");
                }}
                bsMode="single"
                bsTitle={getResource(resourceData, "priority")}
                bsPreObj="sec.t_com_"
                bsObj="combobox_item"
                bsColumes={[
                    { field: "value_member", display: false, filter: false, key: true },
                    { field: "display_member", display: true, filter: true, key: false },
                    { field: "value_member1", display: false, filter: false, key: false },
                    { field: "value_member2", display: false, filter: false, key: false },
                ]}
                bsObjBy="display_sequence asc"
                bsObjWh="is_active='YES' and group_name ='task_priority'"
                variant="standard"
                error={!!errors["priority"]}
                helperText={errors["priority"] || ""}
                required={true}
                bsFlagColor={true}
            />
        </Grid>

        {/* Issue Type */}
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            {renderInput({
                item: {
                    field: "issue_type",
                    headerName: getResource(resourceData, "issue_type"),
                    component: "BSAutoComplete",
                    bsMode: "single",
                    bsTitle: "issue_type",
                    bsPreObj: "sec.t_com_",
                    bsObj: "combobox_item",
                    bsColumes: [
                        { field: "value_member", display: false, filter: false, key: true },
                        { field: "display_member", display: true, filter: true, key: false },
                    ],
                    bsObjBy: "display_sequence asc",
                    bsObjWh: "is_active='YES' and group_name ='issue_type'",
                    variant: "standard"
                },
                formData,
                errors,
                updateField
            })}
        </Grid>

        {/* Due Date */}
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            {renderInput({
                item: {
                    field: "due_date",
                    headerName: getResource(resourceData, "due_date"),
                    component: "BSDatePicker",
                    isRange: true,
                    isDateOnly: true,
                    format: "DD/MM/YYYY",
                    start: "start_date",
                    end: "end_date"
                },
                formData,
                errors,
                updateField
            })}
        </Grid>

        {/* Manday */}
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            {renderInput({
                item: {
                    field: "manday",
                    headerName: getResource(resourceData, "manday"),
                    component: "BSTextField",
                    type: "decimal",
                    required: true
                },
                formData,
                errors,
                updateField
            })}
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <BSSwitchField
                label={getResource(resourceData, "is_incident")}
                field="is_incident"
                value={formData.is_incident}
                onChange={(v) => updateField("is_incident", v)}
            />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            {renderInput({
                item: {
                    field: "incident_no",
                    headerName: getResource(resourceData, "incident_no"),
                    component: "BSTextField",
                    variant: "filled",
                    value: formData.incident_no || ""
                },
                formData,
                errors,
                updateField
            }
            )}
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            {renderInput({
                item: {
                    field: "response_time",
                    headerName: getResource(resourceData, "response_time"),
                    component: "BSTextField",
                    variant: "filled",
                    value: formData.response_time || ""
                },
                formData,
                errors,
                updateField
            }
            )}
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            {renderInput({
                item: {
                    field: "resolve_duration",
                    headerName: getResource(resourceData, "resolve_duration"),
                    component: "BSTextField",
                    variant: "filled",
                    value: formData.resolve_duration || ""
                },
                formData,
                errors,
                updateField
            }
            )}
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 4 }}></Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            {renderInput({
                item: {
                    field: "plan_response_date",
                    headerName: getResource(resourceData, "plan_response_date"),
                    component: "BSDatePicker",
                    isRange: false,
                    isDateOnly: false,
                    format: "DD/MM/YYYY HH:mm",
                    readOnly: true,
                    disabled: true,
                },
                formData,
                errors,
                updateField
            }
            )}
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            {renderInput({
                item: {
                    field: "plan_resolve_duration_date",
                    headerName: getResource(resourceData, "plan_resolve_duration_date"),
                    component: "BSDatePicker",
                    isRange: false,
                    isDateOnly: false,
                    format: "DD/MM/YYYY HH:mm",
                    readOnly: true,
                    disabled: true,
                },
                formData,
                errors,
                updateField
            }
            )}
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            {renderInput({
                item: {
                    field: "start_incident_date",
                    headerName: getResource(resourceData, "start_incident_date"),
                    component: "BSDatePicker",
                    isRange: false,
                    isDateOnly: false,
                    format: "DD/MM/YYYY HH:mm",
                },
                formData,
                errors,
                updateField
            }
            )}
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            {renderInput({
                item: {
                    field: "response_date",
                    headerName: getResource(resourceData, "response_date"),
                    component: "BSDatePicker",
                    isRange: false,
                    isDateOnly: false,
                    format: "DD/MM/YYYY HH:mm",
                },
                formData,
                errors,
                updateField
            }
            )}
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            {renderInput({
                item: {
                    field: "resolve_duration_date",
                    headerName: getResource(resourceData, "resolve_duration_date"),
                    component: "BSDatePicker",
                    isRange: false,
                    isDateOnly: false,
                    format: "DD/MM/YYYY HH:mm",
                },
                formData,
                errors,
                updateField
            }
            )}
        </Grid>
        {/* Description */}
        <Grid size={12}>
            {renderInput({
                item: {
                    field: "task_description",
                    headerName: getResource(resourceData, "task_description"),
                    component: "BSTextField",
                    required: true,
                    variant: "outlined",
                    multiline: true,
                    minRows: 3
                },
                formData,
                errors,
                updateField
            })}
        </Grid>

        {/* Remark */}
        <Grid size={12}>
            {renderInput({
                item: {
                    field: "remark",
                    headerName: getResource(resourceData, "remark"),
                    component: "BSTextField",
                    variant: "outlined",
                    multiline: true,
                    minRows: 3
                },
                formData,
                errors,
                updateField
            })}
        </Grid>
    </Grid>
    );
}
export default TaskMa;