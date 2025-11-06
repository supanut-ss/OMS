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
  bsOnSearch,
  bsOnClear,
  spacing = 1,
  justifyButtons = "flex-end",
}) => {
  const [value, setValue] = useState([]);

  // 🔹 ตั้งค่า default ตอน mount
  const setDefaultFilter = useCallback(() => {
    const defaultData = bsFilterField.map((f) => ({
      field: f.field,
      operator: "",
      value: "",
    }));
    setValue(defaultData);
  }, [bsFilterField]);

  useEffect(() => {
    setDefaultFilter();
  }, [setDefaultFilter]);

  // ✅ อัปเดตค่า filter field
  const updateFieldValue = useCallback(
    (fieldName, key, newValue) => {
      if (typeof newValue === "undefined") return;

      setValue((prev) => {
        let newValues = [...prev];
        let index = newValues.findIndex((f) => f.field === fieldName);

        if (index === -1) {
          newValues.push({
            field: fieldName,
            operator: key === "operator" ? newValue : "",
            value: key === "value" ? newValue : "",
          });
               console.log("new ",newValues)
        } else {
          newValues[index] = {
            ...newValues[index],
            [key]: newValue,
          };
          console.log("update",newValues[index])
        }
        return newValues;
      });
    },
    []
  );

  const OnClickSearch = () => {
    console.log(value)
    bsOnSearch?.(true);
  };

  // ✅ render component ตาม type
  const renderFilterComponent = (field) => {
    const currentValue = value.find((f) => f.field === field.field)?.value || "";

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
            bsOnChange={(val) =>
              updateFieldValue(field.field, "value", val)
            }
            bsLoadOnOpen={field.bsLoadOnOpen}
          />
        );

      case "BSDatepicker":
        return (
          <BSDatepicker
            label={field.bsTitle}
            value={currentValue ? dayjs(currentValue) : null}
            onChange={(val) =>
              updateFieldValue(
                field.field,
                "value",
                val ? val.toISOString() : null
              )
            }
            required={field.required}
            minDate={field.minDate}
            maxDate={field.maxDate}
            format={field.format || "DD/MM/YYYY"}
          />
        );

      case "BSTextField":
        return (
          <BSTextField
            label={field.bsTitle}
            value={currentValue}
            onChange={(val) => updateFieldValue(field.field, "value", val)}
            required={field.required}
            type={field.type || "string"}
            decimals={field.decimals || 2}
          />
        );

      default:
        return null;
    }
  };

  return (
    <Paper sx={{ p: { xs: 1, md: 2 } }}>
      <Stack spacing={2}>
        <Grid container spacing={spacing}>
          {bsFilterField.map((field, index) => {

            return (
              <Grid
                item
                xs={field.xs || 6}
                sm={field.sm || 4}
                md={field.md || 4}
                lg={field.lg || 3}
                key={index}
              >
                <Box>
                  <Grid container spacing={1}>
                    <Grid item xs={4} sm={4} md={3} lg={2}>
                      <BSOperators
                        field={field.field}
                        type={field.type || "string"}
                        value={value.find(v => v.field === field.field)?.operator || ""}
                        onValueChange={(newVal) => {
                          console.log(newVal)
                          updateFieldValue(newVal.field, "operator", newVal.operator)
                        }
                        }
                      />
                    </Grid>
                    <Grid item xs={8} sm={8} md={9} lg={10}>
                      {renderFilterComponent(field)}
                    </Grid>
                  </Grid>
                </Box>
              </Grid>
            );
          })}
        </Grid>

        <Stack direction="row" spacing={2} justifyContent={justifyButtons}>
          <Button
            variant="contained"
            color="primary"
            onClick={OnClickSearch}
            sx={{ minWidth: 100 }}
          >
            ค้นหา
          </Button>
          <Button
            variant="outlined"
            color="secondary"
            onClick={() => {
              setDefaultFilter();
              bsOnClear?.();
            }}
            sx={{ minWidth: 100 }}
          >
            ล้างค่า
          </Button>
        </Stack>
      </Stack>
    </Paper>
  );
};

export default BSFilterCustom;
