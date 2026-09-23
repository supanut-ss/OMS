import React, { memo, useCallback } from "react";
import BSTextField from "../components/BSTextField";
import BSAutoComplete from "../components/BSAutoComplete";
import BSDatepicker from "../components/BSDatepicker";
import dayjs from "dayjs";

const RenderInputField = ({
  item,
  value,
  startValue,
  endValue,
  error,
  startError,
  endError,
  updateField,
  locale,
}) => {
  const itemField = item?.field;
  const itemStart = item?.start;
  const itemEnd = item?.end;
  const itemComponent = item?.component;

  const textOnChange = useCallback(
    (nextValue) => updateField(itemField, nextValue),
    [itemField, updateField]
  );

  const autoCompleteOnChange = useCallback(
    (val) => updateField(itemField, val ?? ""),
    [itemField, updateField]
  );

  const dateRangeOnChange = useCallback(
    (val) => {
      updateField(itemStart, val[0] ? val[0].format("YYYY-MM-DD") : null);
      updateField(itemEnd, val[1] ? val[1].format("YYYY-MM-DD") : null);
    },
    [itemEnd, itemStart, updateField]
  );

  const dateSingleOnChange = useCallback(
    (val) => {
      updateField(itemField, val ? val : null);
    },
    [itemField, updateField]
  );

  if (!item) return null;

  switch (itemComponent) {
    case "BSTextField":
      return (
        <BSTextField
          label={item.headerName}
          value={value}
          type={item.type}
          fullWidth
          required={item.required}
          readOnly={item.readOnly || false}
          onChange={textOnChange}
          variant={item.variant || "outlined"}
          multiline={item.multiline}
          minRows={item.minRows || 1}
          maxRows={item.maxRows}
          error={!!error}
          helperText={error || ""}
          disabled={item.readOnly || item.disabled}
          showCharacterCount={item.showCharacterCount || false}
          maxLength={item.maxLength}
          locale={locale}
          placeholder={item.placeholder}
        />
      );

    case "BSAutoComplete":
      return (
        <BSAutoComplete
          label={item.headerName}
          bsValue={value}
          fullWidth
          bsOnChange={autoCompleteOnChange}
          bsMode={item.bsMode}
          bsTitle={item.headerName || item.bsTitle}
          bsPreObj={item.bsPreObj}
          bsObj={item.bsObj}
          bsColumes={item.bsColumes}
          bsObjBy={item.bsObjBy}
          bsObjWh={item.bsObjWh}
          bsLoadOnOpen={item.bsLoadOnOpen || false}
          bsRefreshKey={item.bsRefreshKey}
          bsRefreshOnRequestChange={item.bsRefreshOnRequestChange ?? true}
          variant={item.variant || "outlined"}
          error={!!error}
          helperText={error || ""}
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
              startValue ? dayjs(startValue) : null,
              endValue ? dayjs(endValue) : null,
            ]}
            fullWidth
            isRange
            isDateOnly={item.isDateOnly !== false}
            format={item.format || "DD/MM/YYYY"}
            onChange={dateRangeOnChange}
            readOnly={item.readOnly || false}
            error={!!startError || !!endError}
            helperText={startError || endError || ""}
            minDate={item.minDate ? dayjs(item.minDate) : undefined}
            maxDate={item.maxDate ? dayjs(item.maxDate) : undefined}
          />
        );
      } else {
        // Single date picker mode
        return (
          <BSDatepicker
            label={item.headerName}
            value={value ? dayjs(value) : null}
            fullWidth
            isDateOnly={item.isDateOnly !== false}
            format={item.format || "DD/MM/YYYY"}
            onChange={dateSingleOnChange}
            error={!!error}
            helperText={error || ""}
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

const MemoRenderInputField = memo(RenderInputField, (prev, next) => {
  return (
    prev.locale === next.locale &&
    prev.updateField === next.updateField &&
    prev.value === next.value &&
    prev.startValue === next.startValue &&
    prev.endValue === next.endValue &&
    prev.error === next.error &&
    prev.startError === next.startError &&
    prev.endError === next.endError &&
    prev.item?.component === next.item?.component &&
    prev.item?.field === next.item?.field &&
    prev.item?.start === next.item?.start &&
    prev.item?.end === next.item?.end &&
    prev.item?.disabled === next.item?.disabled &&
    prev.item?.readOnly === next.item?.readOnly &&
    prev.item?.required === next.item?.required &&
    prev.item?.variant === next.item?.variant &&
    prev.item?.bsObjWh === next.item?.bsObjWh &&
    prev.item?.bsRefreshKey === next.item?.bsRefreshKey
  );
});

export const renderInput = ({
  item,
  formData,
  errors,
  updateField,
  locale = "th",
}) => {
  const value = formData?.[item?.field] ?? item?.value ?? "";
  const startValue = formData?.[item?.start] ?? null;
  const endValue = formData?.[item?.end] ?? null;
  const error = errors?.[item?.field] || "";
  const startError = errors?.[item?.start] || "";
  const endError = errors?.[item?.end] || "";

  return (
    <MemoRenderInputField
      item={item}
      value={value}
      startValue={startValue}
      endValue={endValue}
      error={error}
      startError={startError}
      endError={endError}
      updateField={updateField}
      locale={locale}
    />
  );
};
