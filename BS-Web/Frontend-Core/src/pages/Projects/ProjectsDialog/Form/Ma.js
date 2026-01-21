import { Grid } from "@mui/material";
import { renderInput } from "../../../../components/FormRenderer";
import BSSwitchField from "../../../../components/BSSwitch";
import BSAutoComplete from "../../../../components/BSAutoComplete";

const FormProjectMa = (props) => {
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
            <BSAutoComplete
                label={getResource(resourceData, "parent_project_id")}
                bsValue={formData.master_project_id ? formData.master_project_id : ""}
                fullWidth
                bsOnChange={(e) => {
                    updateField("master_project_id", e?.code || "");
                    updateField("project_name", e?.project_name || "");
                    updateField("application_type", e?.application_type || "");
                    updateField("customer_id", e?.customer_id || "");
                    updateField("sale_id", e?.sale_id || "");
                    updateField("iso_type_id", 29);
                }}
                bsMode="single"
                bsTitle={getResource(resourceData, "parent_project_id")}
                bsPreObj="tmt.t_tmt_"
                bsObj="project_header"
                bsColumes={[
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
                    { field: "application_type", display: false, filter: false, key: false },
                    { field: "customer_id", display: false, filter: false, key: false },
                    { field: "sale_id", display: false, filter: false, key: false },        
                    { field: "iso_type_id", display: false, filter: false, key: false }
                ]}
                bsObjBy="project_no asc"
                bsObjWh={"is_active='YES' AND project_type='PROJECT' AND isnull(master_project_id,'') = '' AND project_header_id <> " + (formData.project_header_id || 0)}
                variant="standard"
                error={!!errors["master_project_id"]}
                helperText={errors["master_project_id"] || ""}
                required={true}
            />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            {renderInput({
                item: {
                    field: "project_name",
                    headerName: getResource(resourceData, "project_name"),
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
                    variant: "filled",
                    required: true,
                    readOnly: true,
                    disabled: true,
                },
                formData,
                errors,
                updateField,
            })}
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            {renderInput({
                item: {
                    field: "year",
                    type: "decimal",
                    headerName: getResource(resourceData, "year"),
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
                    field: "actual_project_date",
                    headerName: getResource(resourceData, "actual_project_date"),
                    component: "BSDatePicker",
                    isRange: true,
                    isDateOnly: true,
                    format: "DD/MM/YYYY",
                    start: "actual_project_start",
                    end: "actual_project_end",
                    required: true,
                },
                formData,
                errors,
                updateField,
            })}
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <BSSwitchField
                label={getResource(resourceData, "is_active")}
                field="is_active"
                value={formData.is_active}
                onChange={(v) => updateField("is_active", v)}
            />
        </Grid>
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
export default FormProjectMa;