import { Grid } from "@mui/material";
import { renderInput } from "../../../../components/FormRenderer";

const FormProject = (props) => {
    const { formData, errors, updateField, resourceData, getResource } = props;
    return (<Grid container spacing={2} sx={{ mt: 1 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            {renderInput({
                item: {
                    field: "project_no",
                    headerName: getResource(resourceData, "project_no"),
                    component: "BSTextField",
                    variant: "filled",
                    readOnly: true,
                },
                formData,
                errors,
                updateField,
            })}
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            {renderInput({
                item: {
                    field: "project_name",
                    headerName: getResource(resourceData, "project_name"),
                    component: "BSTextField",
                    variant: "standard",
                    required: true,
                },
                formData,
                errors,
                updateField,
            })}
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            {renderInput({
                item: {
                    field: "master_project_id",
                    headerName: getResource(resourceData, "parent_project_id"),
                    component: "BSAutoComplete",
                    bsMode: "single",
                    bsTitle: "parent_project_id",
                    bsPreObj: "tmt.t_tmt_",
                    bsObj: "project_header",
                    bsColumes: [
                        {
                            field: "project_header_id",
                            display: false,
                            filter: false,
                            key: true,
                        },
                        {
                            field: "project_no",
                            display: true,
                            filter: true,
                            key: false,
                        },
                        {
                            field: "project_name",
                            display: true,
                            filter: true,
                            key: false,
                        },
                    ],
                    bsObjBy: "project_no asc",
                    bsObjWh: "is_active='YES' AND project_type='PROJECT' AND isnull(master_project_id,'') = '' AND project_header_id <> " + (formData.project_header_id || 0),
                    variant: "standard"
                },
                formData,
                errors,
                updateField,
            })}
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            {renderInput({
                item: {
                    field: "project_status",
                    headerName: getResource(resourceData, "project_status"),
                    component: "BSAutoComplete",
                    bsMode: "single",
                    bsTitle: "project_status",
                    bsPreObj: "sec.t_com_",
                    bsObj: "combobox_item",
                    bsColumes: [
                        {
                            field: "value_member",
                            display: false,
                            filter: false,
                            key: true,
                        },
                        {
                            field: "display_member",
                            display: true,
                            filter: true,
                            key: false,
                        },
                    ],
                    bsObjBy: "display_sequence asc",
                    bsObjWh: "is_active='YES' AND group_name='project_status'",
                    variant: "standard",
                    required: true,
                },
                formData,
                errors,
                updateField,
            })}
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            {renderInput({
                item: {
                    field: "application_type",
                    headerName: getResource(resourceData, "application_type"),
                    component: "BSAutoComplete",
                    bsMode: "single",
                    bsTitle: "application_type",
                    bsPreObj: "sec.t_com_",
                    bsObj: "combobox_item",
                    bsColumes: [
                        {
                            field: "value_member",
                            display: false,
                            filter: false,
                            key: true,
                        },
                        {
                            field: "display_member",
                            display: true,
                            filter: true,
                            key: false,
                        },
                    ],
                    bsObjBy: "display_sequence asc",
                    bsObjWh:
                        "is_active='YES' AND group_name='application_type'",
                    variant: "standard",
                    required: true,
                },
                formData,
                errors,
                updateField,
            })}
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            {renderInput({
                item: {
                    field: "project_type",
                    headerName: getResource(resourceData, "project_type"),
                    component: "BSAutoComplete",
                    bsMode: "single",
                    bsTitle: "project_type",
                    bsPreObj: "sec.t_com_",
                    bsObj: "combobox_item",
                    bsColumes: [
                        {
                            field: "value_member",
                            display: false,
                            filter: false,
                            key: true,
                        },
                        {
                            field: "display_member",
                            display: true,
                            filter: true,
                            key: false,
                        },
                    ],
                    bsObjBy: "display_sequence asc",
                    bsObjWh: "is_active='YES' AND group_name='project_type'",
                    variant: "standard",
                    required: true,
                },
                formData,
                errors,
                updateField,
            })}
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            {renderInput({
                item: {
                    field: "iso_type_id",
                    headerName: getResource(resourceData, "iso_type_id"),
                    component: "BSAutoComplete",
                    bsMode: "single",
                    bsTitle: "iso_type_id",
                    bsPreObj: "tmt.t_tmt_",
                    bsObj: "iso_type",
                    bsColumes: [
                        {
                            field: "iso_type_id",
                            display: false,
                            filter: false,
                            key: true,
                        },
                        {
                            field: "iso_type_name",
                            display: true,
                            filter: true,
                            key: false,
                        },
                    ],
                    bsObjBy: "iso_type_name asc",
                    bsObjWh: "is_active='YES' AND iso_type_name <> 'MA'",
                    required: true,
                    variant: formData.project_header_id ? "filled" : "standard",
                    disabled: formData.project_header_id ? true : false,
                },
                formData,
                errors,
                updateField,
            })}
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            {renderInput({
                item: {
                    field: "po_number",
                    headerName: getResource(resourceData, "po_number"),
                    component: "BSTextField",
                    variant: "standard",
                    required: true,
                },
                formData,
                errors,
                updateField,
            })}
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            {renderInput({
                item: {
                    field: "sale_id",
                    headerName: getResource(resourceData, "sale_id"),
                    component: "BSAutoComplete",
                    bsMode: "single",
                    bsTitle: "sale_id",
                    bsPreObj: "tmt.t_tmt_",
                    bsObj: "sale",
                    bsColumes: [
                        {
                            field: "sale_id",
                            display: false,
                            filter: false,
                            key: true,
                        },
                        {
                            field: "sale_empolyee_code",
                            display: true,
                            filter: true,
                            key: false,
                        },
                        {
                            field: "sale_name",
                            display: true,
                            filter: true,
                            key: false,
                        },
                    ],
                    bsObjBy: "sale_empolyee_code asc",
                    bsObjWh: "is_active='YES'",
                    variant: "standard",
                    required: true,
                },
                formData,
                errors,
                updateField,
            })}
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            {renderInput({
                item: {
                    field: "customer_id",
                    headerName: getResource(resourceData, "customer_id"),
                    component: "BSAutoComplete",
                    bsMode: "single",
                    bsTitle: "customer_id",
                    bsPreObj: "tmt.t_tmt_",
                    bsObj: "customer",
                    bsColumes: [
                        {
                            field: "customer_id",
                            display: false,
                            filter: false,
                            key: true,
                        },
                        {
                            field: "customer_code",
                            display: true,
                            filter: true,
                            key: false,
                        },
                        {
                            field: "customer_name",
                            display: true,
                            filter: true,
                            key: false,
                        },
                    ],
                    bsObjBy: "customer_code asc",
                    bsObjWh: "is_active='YES'",
                    variant: "standard",
                    required: true,
                },
                formData,
                errors,
                updateField,
            })}
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            {renderInput({
                item: {
                    type: "decimal",
                    field: "manday",
                    headerName: getResource(resourceData, "manday"),
                    component: "BSTextField",
                    variant: "standard",
                    required: true,
                },
                formData,
                errors,
                updateField,
            })}
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            {renderInput({
                item: {
                    field: "management_cost",
                    headerName: getResource(resourceData, "management_cost"),
                    component: "BSTextField",
                    variant: "standard",
                },
                formData,
                errors,
                updateField,
            })}
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            {renderInput({
                item: {
                    field: "travel_cost",
                    headerName: getResource(resourceData, "travel_cost"),
                    component: "BSTextField",
                    variant: "standard",
                },
                formData,
                errors,
                updateField,
            })}
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            {renderInput({
                item: {
                    field: "plan_project_date",
                    headerName: getResource(resourceData, "plan_project_date"),
                    component: "BSDatePicker",
                    isRange: true,
                    isDateOnly: true,
                    format: "DD/MM/YYYY",
                    start: "plan_project_start",
                    end: "plan_project_end",
                    required: true,
                },
                formData,
                errors,
                updateField,
            })}
        </Grid>
        {formData.project_header_id && (
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                {renderInput({
                    item: {
                        field: "revise_project_date",
                        headerName: getResource(
                            resourceData,
                            "revise_project_date"
                        ),
                        component: "BSDatePicker",
                        isRange: true,
                        isDateOnly: true,
                        format: "DD/MM/YYYY",
                        start: "revise_project_start",
                        end: "revise_project_end",
                    },
                    formData,
                    errors,
                    updateField,
                })}
            </Grid>)}
        {formData.project_header_id && (
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                {renderInput({
                    item: {
                        field: "actual_project_date",
                        headerName: getResource(
                            resourceData,
                            "actual_project_date"
                        ),
                        component: "BSDatePicker",
                        isRange: true,
                        isDateOnly: true,
                        format: "DD/MM/YYYY",
                        start: "actual_project_start",
                        end: "actual_project_end",
                    },
                    formData,
                    errors,
                    updateField,
                })}
            </Grid>)}
        <Grid size={12}>
            {renderInput({
                item: {
                    field: "remark",
                    headerName: getResource(resourceData, "remark"),
                    component: "BSTextField",
                    variant: "outlined",
                    multiline: true,
                    minRows: 3,
                },
                formData,
                errors,
                updateField,
            })}
        </Grid>
    </Grid>);
}
export default FormProject;