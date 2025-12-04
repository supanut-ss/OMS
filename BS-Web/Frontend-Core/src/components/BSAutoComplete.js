import React, { useState, useEffect, useCallback, useMemo } from "react";
import { TextField, CircularProgress, FormControl, FormHelperText } from "@mui/material";
import Autocomplete from "@mui/material/Autocomplete";
import SecureStorage from "../utils/SecureStorage";
import AxiosMaster from "../utils/AxiosMaster";

const BSAutoComplete = ({
  bsMode = "single", // single, multi, select
  bsPreObj, // schema key
  bsTitle, // title
  bsObj, // table
  bsColumes = [], // array [{field, display, order_by,filter,key}]
  bsObjBy = "", // string Columns1, Columns2 desc
  bsObjWh = "", // string Columns1='xxx'
  bsData = [], // optional: initial data array [{...}]
  bsValue = null, // pre-selected value(s)
  bsOnChange, // function callback on change
  bsLoadOnOpen = false, // true = fetch only on open
  bsCacheKey, // string, localStorage key for cache
  borderLeftRadius = null,
  variant = "outlined",
  error = false,
  helperText = "",
  required = false,
  ...props
}) => {
  const multiple = bsMode === "multi";
  const isSelect = bsMode === "select";
  const [options, setOptions] = useState(bsData);
  const [loading, setLoading] = useState(false);
  const [value, setValue] = useState(multiple ? [] : null);
  const [loaded, setLoaded] = useState(bsData.length > 0); // track if options loaded

  // ✅ ใช้ useMemo แทน object literal
  const requestBody = useMemo(
    () => ({
      table: bsObj,
      schema: bsPreObj,
      columns: bsColumes,
      where: bsObjWh,
      order_by: bsObjBy,
      include_blank: bsMode === "select",
    }),
    [bsObj, bsPreObj, bsColumes, bsObjBy, bsObjWh, bsMode]
  );

  const fetchData = useCallback(async () => {
    if (loaded) return;
    setLoading(true);
    let list = [];

    try {
      // check localStorage cache first
      if (bsCacheKey) {
        const cached = SecureStorage.get(bsCacheKey);
        if (cached) {
          list = JSON.parse(cached);
          setOptions(list);
          setLoaded(true);
          return;
        }
      }

      await AxiosMaster.post("/autocomplete", requestBody)
        .then((res) => {
          if (res.data?.data) {
            list = res.data.data?.map((item) => ({
              code: item.code,
              label: item.value,
              ...item,
            }));
            setOptions(list);
            setLoaded(true);

            if (bsCacheKey) SecureStorage.set(bsCacheKey, JSON.stringify(list));
          }
        });



    } catch (error) {
      console.error("Autocomplete fetch error:", error);
    } finally {
      setLoading(false);
    }
  }, [loaded, bsCacheKey, requestBody, bsValue, multiple, isSelect]);
  // useEffect(() => {
  //   setValue(bsValue || (multiple ? [] : ""));
  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, [bsValue])
  const handleChange = (event, newValue) => {
    setValue(newValue);
    if (bsOnChange) {
      if (isSelect) {
        bsOnChange(newValue); // code string
      } else if (multiple) {
        bsOnChange(newValue);
      } else {
        bsOnChange(newValue || null);
      }
    }
  };

  const handleOpen = async () => {
    if (bsLoadOnOpen) await fetchData();
  };
  useEffect(() => {
    // preload value if provided
    if (options.length > 0) {
      if (multiple) {
        const preSelected = options.filter((l) => bsValue.includes(l.code));
        setValue(preSelected);
      } else if (isSelect) {
        const preSelected =
          options.find((l) => String(l.code) === String(bsValue)) || null;
        setValue(preSelected);
      } else {
        const preSelected = options.find((l) => String(l.code) === String(bsValue)) || null;
        setValue(preSelected);
      }
    }
  }, [options]);
  // ✅ useEffect async แก้ไข
  useEffect(() => {
    if (!bsLoadOnOpen && options.length === 0) {
      (async () => {
        await fetchData();
      })();
    }
  }, [fetchData, bsLoadOnOpen]);

  if (isSelect) {
    // แบบ MUI Select
    return (
      <FormControl fullWidth error={error} >
        <Autocomplete
          disableClearable
          options={options}
          getOptionLabel={(option) => option.value || ""}
          value={options.find((opt) => opt.code === value?.code) || null}
          onChange={(event, newValue) => {
            handleChange(event, newValue ? newValue : "");
          }}
          loading={loading}
          onOpen={bsLoadOnOpen ? fetchData : undefined}
          isOptionEqualToValue={(option, val) => option.code === val.code}
          sx={{
            ...(borderLeftRadius && {
              "& .MuiInputBase-root": {
                borderTopLeftRadius: borderLeftRadius,
                borderBottomLeftRadius: borderLeftRadius,
              },
            }),
          }}
          renderInput={(params) => (
            <TextField
              {...params}
              error={error}
              required={required}
              label={bsTitle}
              variant={variant}
              inputProps={{
                ...params.inputProps,
                readOnly: true, // 👈 ห้ามกรอกเอง
              }}

              InputProps={{
                ...params.InputProps,
                endAdornment: (
                  <>
                    {loading ? <CircularProgress size={20} /> : null}
                    {params.InputProps.endAdornment}
                  </>
                ),
              }}

            />
          )}
        />
        {error && <FormHelperText>{helperText}</FormHelperText>}
      </FormControl>
    );
  }

  // แบบ Autocomplete (single / multi)
  return (
    <FormControl fullWidth error={error} >
      <Autocomplete
        multiple={multiple}
        options={options}
        getOptionLabel={(option) => option.value || ""}
        value={value}
        onChange={handleChange}
        loading={loading}
        onOpen={handleOpen}
        isOptionEqualToValue={(option, val) => option.code === val.code}
        sx={{
          ...(borderLeftRadius && {
            "& .MuiInputBase-root": {
              borderTopLeftRadius: borderLeftRadius,
              borderBottomLeftRadius: borderLeftRadius,
            },
          }),
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            required={required}
            error={error}
            label={bsTitle}
            variant={variant}
            InputProps={{
              ...params.InputProps,
              endAdornment: (
                <>
                  {loading ? (
                    <CircularProgress color="inherit" size={20} />
                  ) : null}
                  {params.InputProps.endAdornment}
                </>
              ),
            }}
          />
        )}
      />
      {error && <FormHelperText>{helperText}</FormHelperText>}
    </FormControl>
  );
};

export default BSAutoComplete;
