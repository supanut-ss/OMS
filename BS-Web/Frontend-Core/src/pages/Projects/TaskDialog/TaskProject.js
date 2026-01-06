import { Grid } from "@mui/material";

const TaskProject = (props) => {
    const { formData, errors, updateField, getResource, resourceData, resourceDataProject, projectHeader, renderInput } = props;
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
            {renderInput({
                item: {
                    field: "priority",
                    headerName: getResource(resourceData, "task_priority"),
                    component: "BSAutoComplete",
                    bsMode: "single",
                    bsTitle: "task_priority",
                    bsPreObj: "sec.t_com_",
                    bsObj: "combobox_item",
                    bsColumes: [
                        { field: "value_member", display: false, filter: false, key: true },
                        { field: "display_member", display: true, filter: true, key: false },
                    ],
                    bsObjBy: "display_sequence asc",
                    bsObjWh: "is_active='YES' and group_name ='task_priority'",
                    variant: "standard",
                    bsFlagColor: true,
                },
                formData,
                errors,
                updateField
            })}
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
                    bsObjWh: "is_active='YES' and group_name ='task_type'",
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
export default TaskProject;