import BSTextField from "../components/BSTextField";
import BSAutoComplete from "../components/BSAutoComplete";
import BSDatepicker from "../components/BSDatepicker";
import dayjs from "dayjs";

export const renderInput = ({ item, formData, errors, updateField }) => {
    if (!item) return null;

    switch (item.component) {
        case "BSTextField":
            return (
                <BSTextField
                    label={item.headerName}
                    value={formData[item.field] ? formData[item.field] : (item.value ?? "")}
                    type={item.type}
                    fullWidth
                    required={item.required}
                    readOnly={item.readOnly || false}
                    onChange={(e) => updateField(item.field, e)}
                    variant={item.variant}
                    multiline={item.multiline}
                    minRows={item.minRows || 1}
                    error={!!errors[item.field]}
                    helperText={errors[item.field] || ""}
                    disabled={item.disabled}
                />
            );

        case "BSAutoComplete":
            return (
                <BSAutoComplete
                    label={item.headerName}
                    bsValue={formData[item.field] ? formData[item.field] : (item.value ?? "")}
                    fullWidth
                    bsOnChange={(e) => updateField(item.field, e?.code || "")}
                    bsMode={item.bsMode}
                    bsTitle={item.bsTitle}
                    bsPreObj={item.bsPreObj}
                    bsObj={item.bsObj}
                    bsColumes={item.bsColumes}
                    bsObjBy={item.bsObjBy}
                    bsObjWh={item.bsObjWh}
                    variant={item.variant}
                    error={!!errors[item.field]}
                    helperText={errors[item.field] || ""}
                    required={item.required}
                    disabled={item.disabled}
                />
            );

        case "BSDatePicker":
            return (
                <BSDatepicker
                    label={item.headerName}
                    value={[
                        formData[item.start] ? dayjs(formData[item.start]) : null,
                        formData[item.end] ? dayjs(formData[item.end]) : null
                    ]}
                    fullWidth
                    isRange
                    isDateOnly
                    format="DD/MM/YYYY"
                    onChange={(val) => {
                        updateField(item.start, val[0] ? val[0].format("YYYY-MM-DD") : null);
                        updateField(item.end, val[1] ? val[1].format("YYYY-MM-DD") : null);
                    }}
                    error={!!errors[item.start] || !!errors[item.end]}
                    helperText={errors[item.start] || errors[item.end] || ""}
                />
            );

        default:
            return null;
    }
};
