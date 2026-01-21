import BSTextField from "../components/BSTextField";
import BSAutoComplete from "../components/BSAutoComplete";
import BSDatepicker from "../components/BSDatepicker";
import dayjs from "dayjs";

export const renderInput = ({
  item,
  formData,
  errors,
  updateField,
  locale = "th",
}) => {
  if (!item) return null;

  switch (item.component) {
    case "BSTextField":
      return (
        <BSTextField
          label={item.headerName}
          value={formData[item.field] ? formData[item.field] : item.value ?? ""}
          type={item.type}
          fullWidth
          required={item.required}
          readOnly={item.readOnly || false}
          onChange={(e) => updateField(item.field, e)}
          variant={item.variant || "outlined"}
          multiline={item.multiline}
          minRows={item.minRows || 1}
          maxRows={item.maxRows}
          error={!!errors[item.field]}
          helperText={errors[item.field] || ""}
          disabled={item.readOnly || item.disabled}
          showCharacterCount={item.showCharacterCount || false}
          maxLength={item.maxLength}
          locale={locale}
        />
      );

    case "BSAutoComplete":
      return (
        <BSAutoComplete
          label={item.headerName}
          bsValue={
            formData[item.field] ? formData[item.field] : item.value ?? ""
          }
          fullWidth
          bsOnChange={(e) => updateField(item.field, e?.code || "")}
          bsMode={item.bsMode}
          bsTitle={item.headerName || item.bsTitle}
          bsPreObj={item.bsPreObj}
          bsObj={item.bsObj}
          bsColumes={item.bsColumes}
          bsObjBy={item.bsObjBy}
          bsObjWh={item.bsObjWh}
          variant={item.variant || "outlined"}
          error={!!errors[item.field]}
          helperText={errors[item.field] || ""}
          required={item.required}
          disabled={item.readOnly || item.disabled}
          bsFlagColor={item.bsFlagColor || false}
        />
      );

    case "BSDatePicker":
      // Check if isRange mode (default: true for backward compatibility)
      const isRangeMode = item.isRange !== false;

      if (isRangeMode) {
        return (
          <BSDatepicker
            label={item.headerName}
            value={[
              formData[item.start] ? dayjs(formData[item.start]) : null,
              formData[item.end] ? dayjs(formData[item.end]) : null,
            ]}
            fullWidth
            isRange
            isDateOnly={item.isDateOnly !== false}
            format={item.format || "DD/MM/YYYY"}
            onChange={(val) => {
              updateField(
                item.start,
                val[0] ? val[0].format("YYYY-MM-DD") : null
              );
              updateField(
                item.end,
                val[1] ? val[1].format("YYYY-MM-DD") : null
              );
            }}
            readOnly={item.readOnly || false}
            error={!!errors[item.start] || !!errors[item.end]}
            helperText={errors[item.start] || errors[item.end] || ""}
            minDate={item.minDate ? dayjs(item.minDate) : undefined}
            maxDate={item.maxDate ? dayjs(item.maxDate) : undefined}
          />
        );
      } else {
        // Single date picker mode
        return (
          <BSDatepicker
            label={item.headerName}
            value={formData[item.field] ? dayjs(formData[item.field]) : null}
            fullWidth
            isDateOnly={item.isDateOnly !== false}
            format={item.format || "DD/MM/YYYY"}
            onChange={(val) => {
              updateField(item.field, val ? val : null);
            }}
            error={!!errors[item.field]}
            helperText={errors[item.field] || ""}
            minDate={item.minDate ? dayjs(item.minDate) : undefined}
            maxDate={item.maxDate ? dayjs(item.maxDate) : undefined}
            required={item.required}
            disabled={item.disabled}
          />
        );
      }

    default:
      return null;
  }
};
