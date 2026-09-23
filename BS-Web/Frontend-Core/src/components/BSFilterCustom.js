import React, { useCallback, useEffect, useState } from "react";
import {
  alpha,
  Box,
  Button,
  ButtonBase,
  Chip,
  CircularProgress,
  Collapse,
  Divider,
  Grid,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import {
  ExpandLess,
  ExpandMore,
  FilterAltOutlined,
  RestartAlt,
  Search,
} from "@mui/icons-material";
import BSAutoComplete from "./BSAutoComplete";
import BSDatepicker from "./BSDatepicker";
import BSTextField from "./BSTextField";
import BSOperators from "./BSOperators";
import dayjs from "dayjs";
import { useResource } from "../hooks/useResource";
import secureStorage from "../utils/SecureStorage";
import { ButtonConfigs } from "../utils/ButtonConfigs";
const filterControlSx = {
  "& .MuiFormControl-root, & .MuiTextField-root, & .MuiAutocomplete-root": {
    height: 40,
  },
  "& .MuiInputBase-root:not(.MuiInputBase-multiline), & .MuiOutlinedInput-root:not(.MuiInputBase-multiline), & .MuiAutocomplete-inputRoot":
    {
      height: "40px !important",
      minHeight: "40px !important",
      alignItems: "center",
    },
  "& .MuiInputBase-input, & .MuiOutlinedInput-input, & .MuiInputBase-inputSizeSmall, & .MuiOutlinedInput-inputSizeSmall":
    {
      height: "20px",
      pt: "0 !important",
      pb: "0 !important",
      lineHeight: "20px",
    },
  "& .MuiAutocomplete-inputRoot": {
    py: "0 !important",
  },
  "& .MuiOutlinedInput-notchedOutline legend": {
    width: "0 !important",
  },
  "& .MuiInputLabel-root": {
    display: "none",
  },
  "& .MuiAutocomplete-inputRoot .MuiAutocomplete-input, & .MuiAutocomplete-inputRoot .MuiInputBase-input, & .MuiAutocomplete-inputRoot .MuiInputBase-inputSizeSmall":
    {
      height: "20px",
      pt: "0 !important",
      pb: "0 !important",
      lineHeight: "20px",
    },
};

const filterValueControlSx = {
  ...filterControlSx,
  minWidth: 0,
  width: "100%",
  "& .MuiFormControl-root > .MuiBox-root": {
    display: "none",
  },
};

export const filterInputRadius = "12px";

export const filterFieldLayoutSx = {
  display: "grid",
  gap: 0,
  gridTemplateColumns: "35% 1fr",
  alignItems: "center",
  "& > *": {
    minWidth: 0,
    width: "100%",
  },
};

export const filterValueLayoutSx = {
  display: "grid",
  gap: 1,
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 160px), 1fr))",
  width: "100%",
  minWidth: 0,
  "& > *": {
    minWidth: 0,
    width: "100%",
  },
};

const operatorInputSx = {
  ...filterControlSx,
  minWidth: 0,
  width: "100%",
  marginRight: "0 !important",
  "& .MuiInputBase-root, & .MuiOutlinedInput-root, & .MuiOutlinedInput-notchedOutline":
    {
      borderTopLeftRadius: "8px !important",
      borderBottomLeftRadius: "8px !important",
      borderTopRightRadius: "0px !important",
      borderBottomRightRadius: "0px !important",
    },
  "& .MuiOutlinedInput-notchedOutline": {
    borderColor: (theme) =>
      theme.palette.mode === "dark"
        ? "rgba(255, 255, 255, 0.15)"
        : "rgba(0, 0, 0, 0.15)",
  },
  "& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline": {
    borderColor: (theme) =>
      theme.palette.mode === "dark"
        ? "rgba(255, 255, 255, 0.3)"
        : "rgba(0, 0, 0, 0.25)",
  },
  "& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline": {
    borderColor: "primary.main",
  },
};

const valueInputSx = {
  ...filterValueControlSx,
  marginLeft: "-1px !important",
  "& .MuiInputBase-root, & .MuiOutlinedInput-root, & .MuiOutlinedInput-notchedOutline":
    {
      borderTopLeftRadius: "0px !important",
      borderBottomLeftRadius: "0px !important",
      borderTopRightRadius: "8px !important",
      borderBottomRightRadius: "8px !important",
    },
  "& .MuiOutlinedInput-notchedOutline": {
    borderColor: (theme) =>
      theme.palette.mode === "dark"
        ? "rgba(255, 255, 255, 0.15)"
        : "rgba(0, 0, 0, 0.15)",
  },
  "& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline": {
    borderColor: (theme) =>
      theme.palette.mode === "dark"
        ? "rgba(255, 255, 255, 0.3)"
        : "rgba(0, 0, 0, 0.25)",
  },
  "& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline": {
    borderColor: "primary.main",
  },
};

const valueLayoutSx = {
  display: "grid",
  gap: 1,
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 160px), 1fr))",
  width: "100%",
  minWidth: 0,
  marginLeft: "-1px !important",
  "& > *:first-of-type .MuiInputBase-root, & > *:first-of-type .MuiOutlinedInput-root, & > *:first-of-type .MuiOutlinedInput-notchedOutline":
    {
      borderTopLeftRadius: "0px !important",
      borderBottomLeftRadius: "0px !important",
    },
  "& > *:only-child .MuiInputBase-root, & > *:only-child .MuiOutlinedInput-root, & > *:only-child .MuiOutlinedInput-notchedOutline":
    {
      borderTopRightRadius: "8px !important",
      borderBottomRightRadius: "8px !important",
    },
  "& .MuiOutlinedInput-notchedOutline": {
    borderColor: (theme) =>
      theme.palette.mode === "dark"
        ? "rgba(255, 255, 255, 0.15)"
        : "rgba(0, 0, 0, 0.15)",
  },
  "& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline": {
    borderColor: (theme) =>
      theme.palette.mode === "dark"
        ? "rgba(255, 255, 255, 0.3)"
        : "rgba(0, 0, 0, 0.25)",
  },
  "& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline": {
    borderColor: "primary.main",
  },
  "& .MuiInputBase-root, & .MuiOutlinedInput-root, & .MuiPickersInputBase-root":
    {
      height: "40px !important",
      minHeight: "40px !important",
    },
  "& .MuiFormControl-root": {
    height: "40px !important",
  },
};

const BSFilterCustom = ({
  bsFilterField = [],
  bsFilterValue,
  bsFilterValueOnChanage,
  bsSearch,
  bsClear,
  spacing = 1,
  justifyButtons = "flex-end",
  bsGridSize = 12,
  bsLiveChange = false,
  bsLoading = false,
  bsLang,
}) => {
  const { getResourceByGroupAndName } = useResource();

  const getTranslation = useCallback(
    (name, fallbackTh, fallbackEn) => {
      const res = getResourceByGroupAndName("Filter", name, bsLang);
      if (res && res.resource_value && res.resource_value !== name) {
        return res.resource_value;
      }
      const currentLang = bsLang || secureStorage.get("lang") || "th";
      return currentLang === "en" ? fallbackEn : fallbackTh;
    },
    [bsLang, getResourceByGroupAndName],
  );
  const { ACTION_BUTTON_THEMES } = ButtonConfigs();
  const [value, setValue] = useState([]);
  const [defaultField, setDefaultField] = useState([]);
  const [expanded, setExpanded] = useState(true);

  const hasFilterValue = useCallback((filterItem) => {
    return !(
      filterItem?.value === null ||
      filterItem?.value === undefined ||
      filterItem?.value === ""
    );
  }, []);

  const activeFilterCount = value.filter(hasFilterValue).length;

  const formatDateValue = useCallback((dateValue, isDateOnly = false) => {
    if (!dateValue) return null;

    const date = dayjs(dateValue);
    if (!date.isValid()) return null;

    return isDateOnly ? date.format("YYYY-MM-DD") : date.toISOString();
  }, []);

  const normalizeFilterValues = useCallback(
    (items) =>
      items
        .filter((f) => hasFilterValue(f))
        .map((m) => ({
          ...m,
          operator: m.operator?.code || m.operator,
          value: m.value?.code || m.value,
          value2: m.value2?.code || m.value2,
        })),
    [hasFilterValue],
  );

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
        if (operator === "isBetween" || operator === "between") {
          newValues[index] = { ...newValues[index], value: "", value2: "" };
        } else {
          // ถ้าไม่ใช่ between → ลบ value2 ออก
          const { value2, ...rest } = newValues[index];
          newValues[index] = rest;
        }
      } else if (key === "value" || key === "value2") {
        newValues[index] = { ...newValues[index], [key]: newValue };
      }

      return newValues;
    });
  }, []);

  // ✅ ปุ่มค้นหา
  const OnClickSearch = (e) => {
    e.preventDefault();

    bsFilterValueOnChanage(normalizeFilterValues(value));
  };

  useEffect(() => {
    if (!bsLiveChange || typeof bsFilterValueOnChanage !== "function") return;
    bsFilterValueOnChanage(normalizeFilterValues(value));
  }, [bsFilterValueOnChanage, bsLiveChange, normalizeFilterValues, value]);

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
            bsTitle=""
            placeholder={field.placeholder || field.bsTitle}
            bsPreObj={field.bsPreObj}
            bsObj={field.bsObj}
            bsColumes={field.bsColumes}
            bsObjBy={field.bsObjBy}
            bsObjWh={field.bsObjWh}
            bsData={field.bsData}
            bsValue={currentValue?.code ?? currentValue}
            bsOnChange={(val) => updateFieldValue(index, "value", val)}
            bsLoadOnOpen={field.bsLoadOnOpen}
            borderLeftRadius={null}
            size="small"
            sx={valueInputSx}
          />
        );

      case "BSDatepicker":
        return (
          <Box sx={valueLayoutSx}>
            <BSDatepicker
              label=""
              placeholder={field.placeholder || field.bsTitle}
              value={currentValue ? dayjs(currentValue) : null}
              onChange={(val) =>
                updateFieldValue(
                  index,
                  "value",
                  formatDateValue(val, field.isDateOnly),
                )
              }
              isDateOnly={field.isDateOnly}
              minDate={field.minDate}
              maxDate={field.maxDate}
              format={field.format || "DD/MM/YYYY"}
              size="small"
              {...commonProps}
            />
            {(operator === "isBetween" || operator === "between") && (
              <BSDatepicker
                label={getTranslation("ToLabel", "ถึง", "to")}
                value={currentValue2 ? dayjs(currentValue2) : null}
                onChange={(val) =>
                  updateFieldValue(
                    index,
                    "value2",
                    formatDateValue(val, field.isDateOnly),
                  )
                }
                isDateOnly={field.isDateOnly}
                minDate={field.minDate}
                maxDate={field.maxDate}
                format={field.format || "DD/MM/YYYY"}
                size="small"
                {...commonProps}
              />
            )}
          </Box>
        );

      case "BSTextField":
        return (
          <Box sx={valueLayoutSx}>
            <BSTextField
              label=""
              placeholder={field.placeholder || field.bsTitle}
              value={currentValue}
              onChange={(val) => updateFieldValue(index, "value", val)}
              size="small"
              sx={filterValueControlSx}
              {...commonProps}
            />
            {(operator === "isBetween" || operator === "between") && (
              <BSTextField
                label={getTranslation("ToLabel", "ถึง", "to")}
                value={currentValue2}
                onChange={(val) => updateFieldValue(index, "value2", val)}
                size="small"
                sx={filterValueControlSx}
                {...commonProps}
              />
            )}
          </Box>
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

    if (typeof bsFilterValueOnChanage === "function") {
      bsFilterValueOnChanage([]);
    }
  };

  const getFieldTitle = useCallback((field) => {
    return field.bsTitle || field.label || field.field;
  }, []);

  const getDynamicGridSize = (count) => {
    if (count <= 1) return { xs: 12 };
    if (count === 2) return { xs: 12, sm: 6 };
    if (count === 3) return { xs: 12, sm: 6, md: 4 };
    if (count === 4) return { xs: 12, sm: 6, md: 4, lg: 3 };
    return { xs: 12, sm: 6, md: 4, lg: 2.4 };
  };

  const getNthRule = () => {
    const firstField = defaultField[0] || {};
    const lgCols = firstField.lg ? Math.round(12 / Number(firstField.lg)) : 5;
    const mdCols = firstField.md ? Math.round(12 / Number(firstField.md)) : 3;
    const smCols = firstField.sm ? Math.round(12 / Number(firstField.sm)) : 2;

    return (theme) => ({
      position: "relative",
      paddingLeft: theme.spacing(1),
      paddingRight: theme.spacing(1),
      "&::after": {
        content: '""',
        position: "absolute",
        right: -4,
        top: "8px",
        bottom: "4px",
        width: "1px",
        backgroundColor: "divider",
        display: "block",
      },
      [theme.breakpoints.up("lg")]: {
        [`&:nth-of-type(${lgCols}n)::after`]: {
          display: "none",
        },
      },
      [theme.breakpoints.between("md", "lg")]: {
        [`&:nth-of-type(${mdCols}n)::after`]: {
          display: "none",
        },
      },
      [theme.breakpoints.between("sm", "md")]: {
        [`&:nth-of-type(${smCols}n)::after`]: {
          display: "none",
        },
      },
      [theme.breakpoints.down("sm")]: {
        "&::after": {
          display: "none",
        },
        paddingLeft: 0,
        paddingRight: 0,
      },
      "&:last-child::after": {
        display: "none",
      },
    });
  };

  return (
    <Paper
      elevation={0}
      sx={{
        width: "100%",
        px: { xs: 1.5, md: 2 },
        py: { xs: 0.75, md: 1 },
        borderRadius: "16px",
        border: "1px solid",
        borderColor: "divider",
        backgroundColor: "background.paper",
        boxShadow:
          "0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.05)",
      }}
    >
      <Stack spacing={1}>
        <Stack
          component={ButtonBase}
          onClick={() => setExpanded((current) => !current)}
          aria-expanded={expanded}
          aria-controls="bs-filter-custom-content"
          aria-label={expanded ? "Collapse filters" : "Expand filters"}
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{
            width: "100%",
            borderRadius: 2,
            py: 0.25,
            px: 0.5,
            textAlign: "left",
            "&:hover": {
              backgroundColor: "action.hover",
            },
          }}
        >
          <Stack
            direction="row"
            spacing={1.5}
            alignItems="center"
            sx={{ minWidth: 0 }}
          >
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: "8px",
                display: "grid",
                placeItems: "center",
                color: "primary.main",
                backgroundColor: (theme) =>
                  alpha(theme.palette.primary.main, 0.08),
              }}
            >
              <FilterAltOutlined fontSize="small" />
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Stack direction="row" alignItems="center">
                <Typography
                  variant="subtitle1"
                  sx={{
                    fontWeight: 700,
                    color: "text.primary",
                    lineHeight: 1.2,
                  }}
                >
                  {getTranslation("FilterBuilder", "ตัวกรอง", "Filters")}
                </Typography>
                <Box
                  sx={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    height: 20,
                    px: 1.2,
                    borderRadius: "10px",
                    backgroundColor: (theme) =>
                      activeFilterCount > 0
                        ? theme.palette.primary.main
                        : alpha(theme.palette.primary.main, 0.08),
                    color: (theme) =>
                      activeFilterCount > 0
                        ? "#FFFFFF"
                        : theme.palette.primary.main,
                    fontSize: "11px",
                    fontWeight: 700,
                    ml: 1,
                  }}
                >
                  {activeFilterCount}
                </Box>
              </Stack>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: "block", mt: 0.25 }}
              >
                {getTranslation(
                  "PleaseSelectConditions",
                  "ระบุเงื่อนไขในการค้นหา",
                  "Refine your search results",
                )}
              </Typography>
            </Box>
          </Stack>

          <Box
            sx={{
              color: "text.secondary",
              mr: 1,
              display: "grid",
              placeItems: "center",
            }}
          >
            {expanded ? <ExpandLess /> : <ExpandMore />}
          </Box>
        </Stack>

        <Collapse in={expanded} unmountOnExit id="bs-filter-custom-content">
          <Stack spacing={1}>
            <Divider sx={{ borderColor: "rgba(0, 0, 0, 0.06)" }} />

            <Grid container spacing={spacing || 2}>
              {defaultField.map((field, index) => {
                const resolvedSize =
                  field.xs || field.sm || field.md || field.lg
                    ? {
                        xs: field.xs || 12,
                        sm: field.sm,
                        md: field.md,
                        lg: field.lg,
                      }
                    : getDynamicGridSize(defaultField.length);

                return (
                  <Grid size={resolvedSize} key={index} sx={getNthRule()}>
                    <Box
                      sx={{
                        height: "100%",
                        py: 0.3,
                      }}
                    >
                      <Stack spacing={0.5}>
                        <Stack
                          direction="row"
                          justifyContent="space-between"
                          alignItems="center"
                        >
                          <Typography
                            variant="subtitle2"
                            sx={{
                              fontWeight: 600,
                              color: (theme) =>
                                theme.palette.mode === "dark"
                                  ? "text.secondary"
                                  : "#334155",
                              fontSize: "0.85rem",
                            }}
                          >
                            {getFieldTitle(field)}
                          </Typography>
                        </Stack>

                        <Box
                          sx={filterFieldLayoutSx}
                          className="filter-input-layout"
                        >
                          <BSOperators
                            field={field.field}
                            label={getTranslation(
                              "OperatorLabel",
                              "เงื่อนไข",
                              "Operator",
                            )}
                            type={field.type || "string"}
                            value={
                              value.find((v) => v.field === field.field)
                                ?.operator || ""
                            }
                            onValueChange={(newVal) =>
                              updateFieldValue(
                                index,
                                "operator",
                                newVal.operator,
                              )
                            }
                            size="small"
                            sx={operatorInputSx}
                            hideLabel
                            bsLang={bsLang}
                          />
                          {renderFilterComponent(field, index)}
                        </Box>
                      </Stack>
                    </Box>
                  </Grid>
                );
              })}
            </Grid>

            <Stack spacing={1}>
              <Divider sx={{ borderColor: "rgba(0, 0, 0, 0.06)" }} />
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={1}
                justifyContent="space-between"
                alignItems={{ xs: "stretch", sm: "center" }}
              >
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ fontWeight: 500 }}
                >
                  {activeFilterCount > 0
                    ? getTranslation(
                        "ActiveFiltersReady",
                        `มี ${activeFilterCount} เงื่อนไขที่พร้อมใช้งาน`,
                        `${activeFilterCount} active filter(s) ready`,
                      )
                    : getTranslation(
                        "NoFiltersSelected",
                        "ยังไม่ได้เลือกเงื่อนไขสำหรับการค้นหา",
                        "No search conditions selected",
                      )}
                </Typography>

                <Stack
                  direction="row"
                  spacing={1.5}
                  justifyContent={justifyButtons}
                  useFlexGap
                  sx={{ flexWrap: "wrap" }}
                >
                  {bsClear && (
                    <Button
                      variant="outlined"
                      onClick={onClear}
                      startIcon={<RestartAlt />}
                      sx={{
                        ...ACTION_BUTTON_THEMES.clear,
                        borderColor: (theme) =>
                          theme.palette.mode === "dark"
                            ? "rgba(255, 255, 255, 0.15)"
                            : "rgba(0, 0, 0, 0.15)",
                        color: "text.primary",
                        textTransform: "none",
                        "&:hover": {
                          backgroundColor: "action.hover",
                          borderColor: (theme) =>
                            theme.palette.mode === "dark"
                              ? "rgba(255, 255, 255, 0.3)"
                              : "rgba(0, 0, 0, 0.25)",
                        },
                      }}
                    >
                      {getTranslation("ClearButton", "ล้างค่า", "Clear all")}
                    </Button>
                  )}
                  {bsSearch && (
                    <Button
                      variant="contained"
                      onClick={OnClickSearch}
                      disabled={bsLoading}
                      startIcon={
                        bsLoading ? (
                          <CircularProgress size={18} color="inherit" />
                        ) : (
                          <Search />
                        )
                      }
                      sx={ACTION_BUTTON_THEMES.primary}
                    >
                      {getTranslation("SearchButton", "ค้นหา", "Search")}
                    </Button>
                  )}
                </Stack>
              </Stack>
            </Stack>
          </Stack>
        </Collapse>
      </Stack>
    </Paper>
  );
};

export default BSFilterCustom;
