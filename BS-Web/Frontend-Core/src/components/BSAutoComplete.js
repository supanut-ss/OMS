import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  TextField,
  CircularProgress,
  FormControl,
  FormHelperText,
  Box,
  Typography,
} from "@mui/material";
import Autocomplete from "@mui/material/Autocomplete";
import SecureStorage from "../utils/SecureStorage";
import AxiosMaster from "../utils/AxiosMaster";
import FlagIcon from "@mui/icons-material/Flag";

const getPriorityColor = (priority) => {
  switch (priority?.toLowerCase()) {
    case "urgent":
      return "#d32f2f";
    case "high":
      return "#ed6c02";
    case "normal":
    case "medium":
      return "#0288d1";
    case "low":
    default:
      return "#9e9e9e";
  }
};

const BSAutoComplete = ({
  bsMode = "single", // single | multi | select
  bsPreObj,
  bsTitle,
  bsObj,
  bsColumes = [],
  bsObjBy = "",
  bsObjWh = "",
  bsData = [],
  bsValue = null, // controlled value (code | [code])
  bsOnChange,
  bsLoadOnOpen = false,
  bsCacheKey,
  borderLeftRadius = null,
  variant = "outlined",
  error = false,
  helperText = "",
  required = false,
  disabled = false,
  bsFlagColor = false,
  ...props
}) => {
  const multiple = bsMode === "multi";
  const isSelect = bsMode === "select";

  const [options, setOptions] = useState(bsData);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(bsData.length > 0);
  const [inputValue, setInputValue] = useState("");
  const requestBody = useMemo(
    () => ({
      table: bsObj,
      schema: bsPreObj,
      columns: bsColumes,
      where: bsObjWh,
      order_by: bsObjBy,
      include_blank: isSelect,
    }),
    [bsObj, bsPreObj, bsColumes, bsObjWh, bsObjBy, isSelect]
  );
  // const fetchData = useCallback(async () => {
  //   if (loaded) return;
  //   setLoading(true);

  //   try {
  //     if (bsCacheKey) {
  //       const cached = SecureStorage.get(bsCacheKey);
  //       if (cached) {
  //         setOptions(JSON.parse(cached));
  //         setLoaded(true);
  //         return;
  //       }
  //     }

  //     const res = await AxiosMaster.post("/autocomplete", requestBody);
  //     const list =
  //       res.data?.data?.map((item) => ({
  //         code: item.code,
  //         label: item.value,
  //         ...item,
  //       })) || [];

  //     setOptions(list);
  //     setLoaded(true);
  //     if (bsCacheKey) SecureStorage.set(bsCacheKey, JSON.stringify(list));
  //   } catch (err) {
  //     console.error("Autocomplete fetch error", err);
  //   } finally {
  //     setLoading(false);
  //   }
  // }, [loaded, bsCacheKey, requestBody]);
  const fetchData = useCallback(
    async (keyword = "") => {
      setLoading(true);
      try {
        const res = await AxiosMaster.post("/autocomplete", {
          ...requestBody,
          keyword,      // "" = default
          limit: 30,
        });

        const list =
          res.data?.data?.map((item) => ({
            code: item.code,
            value: item.value,
            ...item,
          })) || [];

        setOptions(list);
        setLoaded(true);
      } catch (err) {
        console.error("Autocomplete fetch error", err);
      } finally {
        setLoading(false);
      }
    },
    [requestBody]
  );

  useEffect(() => {
    if (!bsLoadOnOpen && !loaded) fetchData();
  }, [fetchData, bsLoadOnOpen, loaded]);

  useEffect(() => {
    console.log("Input Value Changed:", inputValue);
    const delay = setTimeout(() => {
      fetchData(inputValue);
    }, 300);

    return () => clearTimeout(delay);
  }, [inputValue]);
  // ✅ derive value from options + bsValue (NO internal value state)
  const selectedValue = useMemo(() => {
    if (!options.length || bsValue == null) {
      return multiple ? [] : null;
    }

    if (multiple && Array.isArray(bsValue)) {
      return options.filter((o) => bsValue.includes(o.code));
    }

    return options.find((o) => String(o.code) === String(bsValue)) || null;
  }, [options, bsValue, multiple]);

  const handleChange = (event, newValue) => {
    if (!bsOnChange) return;

    if (multiple) {
      bsOnChange(newValue.map((v) => v.code));
    } else if (isSelect) {
      bsOnChange(newValue?.code ?? "");
    } else {
      bsOnChange(newValue ?? null);
    }
  };

  const commonProps = {
    options,
    loading,
    disabled,
    onChange: handleChange,
    isOptionEqualToValue: (option, val) => option.code === val.code,
    onOpen: bsLoadOnOpen ? fetchData : undefined,
    sx: {
      ...(borderLeftRadius && {
        "& .MuiInputBase-root": {
          borderTopLeftRadius: borderLeftRadius,
          borderBottomLeftRadius: borderLeftRadius,
        },
      }),
    },
  };
  const fetchById = useCallback(async (id) => {
    if (!id) return;

    try {
      const res = await AxiosMaster.post("/autocomplete", {
        ...requestBody,
        where: `${bsColumes.find(c => c.key)?.field} = '${id}'`,
        limit: 1,
      });

      const item = res.data?.data?.[0];
      if (!item) return;

      const option = {
        code: item.code,
        value: item.value,
        ...item,
      };

      setOptions((prev) => {
        const exists = prev.some((o) => String(o.code) === String(option.code));
        return exists ? prev : [option, ...prev];
      });
    } catch (err) {
    }
  }, [requestBody, bsColumes]);
  useEffect(() => {
    if (!bsValue) return;

    const exists = options.some(
      (o) => String(o.code) === String(bsValue)
    );

    if (!exists) {
      fetchById(bsValue);
    }
  }, [bsValue, options, fetchById]);
  useEffect(() => {
    if (selectedValue && !multiple) {
      setInputValue(selectedValue.value || "");
    }
  }, [selectedValue, multiple]);

  return (
    <FormControl fullWidth error={error}>
      <Autocomplete
        {...commonProps}
        multiple={multiple}
        value={selectedValue}
        getOptionLabel={(option) => option?.value || ""}
        renderOption={(props, option) => (
          <li {...props}>
            {bsFlagColor ? (
              <Box display="flex" alignItems="center" gap={1}>
                <FlagIcon sx={{ color: getPriorityColor(option.code) }} />
                <Typography variant="body2">{option.value}</Typography>
              </Box>
            ) : (
              <Typography variant="body2">{option.value}</Typography>
            )}
          </li>
        )}
        renderInput={(params) => (
          <TextField
            {...params}
            label={bsTitle}
            required={required}
            error={error}
            variant={variant}
            InputProps={{
              ...params.InputProps,
              startAdornment:
                bsFlagColor &&
                !multiple &&
                selectedValue?.code && (
                  <FlagIcon
                    sx={{
                      color: getPriorityColor(selectedValue.code),
                      mr: 1,
                    }}
                  />
                ),
              endAdornment: (
                <>
                  {loading && <CircularProgress size={20} />}
                  {params.InputProps.endAdornment}
                </>
              ),
            }}
          />
        )}
        inputValue={inputValue}
        onInputChange={(e, val, reason) => {
          if (reason === "input") {
            setInputValue(val);
          }

          if (reason === "clear") {
            setInputValue("");
            bsOnChange?.(multiple ? [] : null);
          }
        }}
        filterOptions={(x) => x}
        loadingText="กำลังค้นหา..."
        noOptionsText="ไม่พบข้อมูล"
        {...props}
      />
      {error && <FormHelperText>{helperText}</FormHelperText>}
    </FormControl>
  );
};

export default BSAutoComplete;