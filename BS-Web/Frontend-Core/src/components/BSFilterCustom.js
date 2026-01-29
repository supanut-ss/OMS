import React, { useCallback, useEffect, useState } from "react";
import { Box, Button, Grid, Paper, Stack } from "@mui/material";
import BSAutoComplete from "./BSAutoComplete";
import BSDatepicker from "./BSDatepicker";
import BSTextField from "./BSTextField";
import BSOperators from "./BSOperators";
import dayjs from "dayjs";

const BSFilterCustom = ({
  bsFilterField = [],
  bsFilterValue,
  bsFilterValueOnChanage,
  bsSearch,
  bsClear,
  spacing = 1,
  justifyButtons = "flex-end",
}) => {
  const [value, setValue] = useState([]);
  const [defaultField, setDefaultField] = useState([]);

  // 🔹 ตั้งค่าเริ่มต้นตอน bsFilterField เปลี่ยน
  useEffect(() => {
    if (
      bsFilterField.length > 0 &&
      (defaultField.length === 0 ||
        JSON.stringify(defaultField) !== JSON.stringify(bsFilterField))
    ) {
      setDefaultField(bsFilterField);
      const def = bsFilterField.map((f) => ({
        field: f.field,
        operator: f.defaultOperator || "",
        value: "",
      }));
      setValue(def);
    }
  }, [bsFilterField, defaultField]);


  // ✅ อัปเดตค่าของ field (รวมถึง between)
  const updateFieldValue = useCallback((index, key, newValue) => {
    if (typeof newValue === "undefined") return;

    setValue((prev) => {
      let newValues = [...prev];

      // เมื่อเปลี่ยน operator
      if (key === "operator") {
        newValues[index] = { ...newValues[index], operator: newValue };
        let operator = newValue?.code ? newValue.code : newValue;
        // ถ้าเป็น between → เพิ่ม value2
        if (operator === "isBetween") {
          newValues[index] = { ...newValues[index], value: "", value2: "" };
        } else {
          // ถ้าไม่ใช่ between → ลบ value2 ออก
          const { value2, ...rest } = newValues[index];
          newValues[index] = rest;
        }
      }
      else if (key === "value" || key === "value2") {
        newValues[index] = { ...newValues[index], [key]: newValue };
      }

      return newValues;
    });
  }, []);

  // ✅ ปุ่มค้นหา
  const OnClickSearch = (e) => {
    e.preventDefault();

    let val = [...value
      .filter((f) => f.value !== null && f.value !== "")
      .map((m) => ({
        ...m,
        operator: m.operator?.code || m.operator,
        value: m.value?.code || m.value,
        value2: m.value2?.code || m.value2,
      }))];

    bsFilterValueOnChanage(val);
  };

  // ✅ render component ตาม type + ตรวจ operator between
  const renderFilterComponent = (field, index) => {
    const currentItem = value[index] || {};
    const currentValue = currentItem.value || "";
    const currentValue2 = currentItem.value2 || "";
    const operator = currentItem.operator?.code ?? currentItem.operator;
    const commonProps = {
      required: field.required,
      type: field.type || "string",
      decimals: field.decimals || 2,
    };

    switch (field.component) {
      case "BSAutoComplete":
        return (
          <BSAutoComplete
            bsMode={field.bsMode}
            bsTitle={field.bsTitle}
            bsPreObj={field.bsPreObj}
            bsObj={field.bsObj}
            bsColumes={field.bsColumes}
            bsObjBy={field.bsObjBy}
            bsObjWh={field.bsObjWh}
            bsValue={currentValue}
            bsOnChange={(val) => updateFieldValue(index, "value", val)}
            bsLoadOnOpen={field.bsLoadOnOpen}
            borderLeftRadius="unset"
          />
        );

      case "BSDatepicker":
        return (
          <Stack direction="row" spacing={1}>
            <BSDatepicker
              label={field.bsTitle}
              value={currentValue ? dayjs(currentValue) : null}
              onChange={(val) =>
                updateFieldValue(index, "value", val ? val.toISOString() : null)
              }
              minDate={field.minDate}
              maxDate={field.maxDate}
              format={field.format || "DD/MM/YYYY"}
              borderLeftRadius="unset"
              {...commonProps}
            />
            {operator === "isBetween" && (
              <BSDatepicker
                label="ถึง"
                value={currentValue2 ? dayjs(currentValue2) : null}
                onChange={(val) =>
                  updateFieldValue(index, "value2", val ? val.toISOString() : null)
                }
                minDate={field.minDate}
                maxDate={field.maxDate}
                format={field.format || "DD/MM/YYYY"}
                {...commonProps}
              />
            )}
          </Stack>
        );

      case "BSTextField":
        return (
          <Stack direction="row" spacing={1}>
            <BSTextField
              label={field.bsTitle}
              value={currentValue}
              onChange={(val) => updateFieldValue(index, "value", val)}
              borderLeftRadius="unset"
              {...commonProps}
            />
            {operator === "isBetween" && (
              <BSTextField
                label="ถึง"
                value={currentValue2}
                onChange={(val) => updateFieldValue(index, "value2", val)}
                {...commonProps}
              />
            )}
          </Stack>
        );

      default:
        return null;
    }
  };

  // ✅ ปุ่มล้างค่า
  const onClear = () => {
    const cleared = defaultField.map((f) => ({
      field: f.field,
      operator: f.defaultOperator || "",
      value: "",
      value2: undefined,
    }));
    setValue(cleared);
  };

  return (
    <Paper sx={{ p: { xs: 1, md: 2 }, width: "100%" }}>
      <Stack spacing={2}>
        <Grid container spacing={spacing}>
          {defaultField.map((field, index) => (
            <Grid
              size={{
                xs: field.xs || 12,
                sm: field.sm || 6,
                md: field.md || 4,
                lg: field.lg || 3
              }}
              key={index}
            >
              <Box>
                <Grid container width={"100%"}>
                  <Grid size={{
                    xs: 4,
                    sm: 4,
                    md: 4,
                    lg: 3,
                  }}>
                    <BSOperators
                      field={field.field}
                      type={field.type || "string"}
                      value={value.find(v => v.field === field.field)?.operator || ""}
                      onValueChange={(newVal) =>
                        updateFieldValue(index, "operator", newVal.operator)
                      }
                      borderRightRadius="unset"
                    />
                  </Grid>
                  <Grid size={{
                    xs: 8,
                    sm: 8,
                    md: 8,
                    lg: 9,
                  }}>
                    {renderFilterComponent(field, index)}
                  </Grid>
                </Grid>
              </Box>
            </Grid>
          ))}
        </Grid>

        <Stack direction="row" spacing={2} justifyContent={justifyButtons}>
          {bsSearch && (
            <Button
              variant="contained"
              color="primary"
              onClick={OnClickSearch}
              sx={{ minWidth: 100 }}
            >
              ค้นหา
            </Button>
          )}
          {bsClear && (
            <Button
              variant="outlined"
              color="secondary"
              onClick={onClear}
              sx={{ minWidth: 100 }}
            >
              ล้างค่า
            </Button>
          )}
        </Stack>
      </Stack>
    </Paper>
  );
};

export default BSFilterCustom;
