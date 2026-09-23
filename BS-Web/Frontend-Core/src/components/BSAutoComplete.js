import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  useDeferredValue,
} from "react";
import {
  TextField,
  CircularProgress,
  FormControl,
  FormHelperText,
  Box,
  Typography,
} from "@mui/material";
import Autocomplete from "@mui/material/Autocomplete";
import AxiosMaster from "../utils/AxiosMaster";
import FlagIcon from "@mui/icons-material/Flag";

const REQUEST_DEDUP_TTL_MS = 1500;
const sharedRequestMap = new Map();
const EMPTY_ARRAY = [];

const hasSameOptions = (prevOptions, nextOptions) => {
  if (prevOptions === nextOptions) return true;
  if (!Array.isArray(prevOptions) || !Array.isArray(nextOptions)) return false;
  if (prevOptions.length !== nextOptions.length) return false;

  for (let i = 0; i < prevOptions.length; i += 1) {
    const prev = prevOptions[i];
    const next = nextOptions[i];
    if (
      String(prev?.code ?? "") !== String(next?.code ?? "") ||
      String(prev?.value ?? prev?.label ?? "") !==
        String(next?.value ?? next?.label ?? "")
    ) {
      return false;
    }
  }

  return true;
};

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

const compactAutoCompleteSx = {
  "& .MuiInputBase-root:not(.MuiInputBase-multiline), & .MuiOutlinedInput-root:not(.MuiInputBase-multiline)":
    {
      minHeight: 44,
      alignItems: "center",
    },
  "& .MuiAutocomplete-inputRoot, & .MuiAutocomplete-inputRoot.MuiOutlinedInput-root":
    {
      py: "0 !important",
    },
  "& .MuiAutocomplete-inputRoot .MuiAutocomplete-input, & .MuiAutocomplete-inputRoot .MuiInputBase-input, & .MuiAutocomplete-inputRoot .MuiInputBase-inputSizeSmall":
    {
      height: "20px",
      pt: "0 !important",
      pb: "0 !important",
      lineHeight: "20px",
    },
  "& .MuiInputLabel-root": {
    transform: "translate(14px, 10px) scale(1)",
  },
  "& .MuiInputLabel-shrink": {
    transform: "translate(14px, -9px) scale(0.75)",
  },
};

const BSAutoComplete = ({
  bsMode = "single", // single | multi | select
  bsPreObj,
  bsTitle,
  bsObj,
  bsColumes = EMPTY_ARRAY,
  bsObjBy = "",
  bsObjWh = "",
  bsData = EMPTY_ARRAY,
  bsValue = null, // controlled value (code | [code])
  bsOnChange,
  bsLoadOnOpen = false,
  bsRefreshKey = null,
  bsRefreshOnRequestChange = true,
  bsCacheKey,
  borderLeftRadius = null,
  variant = "outlined",
  error = false,
  helperText = "",
  required = false,
  disabled = false,
  bsFlagColor = false,
  autoSelectSingleOption = false,
  size = "small",
  sx,
  placeholder,
  ...props
}) => {
  const multiple = bsMode === "multi";
  const isSelect = bsMode === "select";
  const isReadOnly = Boolean(props.readOnly);
  const normalizedStaticOptions = useMemo(
    () =>
      (Array.isArray(bsData) ? bsData : []).map((item) => ({
        code: item?.code ?? item?.value ?? item?.name ?? item,
        value: item?.value ?? item?.name ?? item?.label ?? item?.code ?? "",
        ...item,
      })),
    [bsData],
  );
  const hasStaticOptions = normalizedStaticOptions.length > 0;
  const useStaticOptionsOnly = hasStaticOptions && !isSelect;

  const [options, setOptions] = useState(normalizedStaticOptions);
  const [loading, setLoading] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [open, setOpen] = useState(false);
  const deferredInputValue = useDeferredValue(inputValue);
  const hasInitializedSearch = useRef(false);
  const hasFetchedInitially = useRef(false);
  const suppressNextSearch = useRef(false);
  const autoSelectedOptionRef = useRef(null);
  const columnsSignature = useMemo(
    () => JSON.stringify(Array.isArray(bsColumes) ? bsColumes : []),
    [bsColumes],
  );
  const normalizedColumns = useMemo(() => {
    try {
      return JSON.parse(columnsSignature);
    } catch {
      return [];
    }
  }, [columnsSignature]);
  const requestBody = useMemo(
    () => ({
      table: bsObj,
      schema: bsPreObj,
      columns: normalizedColumns,
      where: bsObjWh,
      order_by: bsObjBy,
      include_blank: isSelect,
    }),
    [bsObj, bsPreObj, normalizedColumns, bsObjWh, bsObjBy, isSelect],
  );
  const requestSignature = useMemo(
    () => JSON.stringify(requestBody),
    [requestBody],
  );
  const requestRefreshDependency = bsRefreshOnRequestChange
    ? requestSignature
    : "manual-refresh";
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
    async (keyword = "", force = false) => {
      // No table source (e.g. static valueOptions in select mode) → nothing to fetch
      if (!bsObj) return;
      if (disabled || (useStaticOptionsOnly && !force)) return;

      const normalizedKeyword = typeof keyword === "string" ? keyword : "";
      const payload = {
        ...requestBody,
        keyword: normalizedKeyword,
        limit: 30,
      };
      const requestKey = JSON.stringify(payload);
      const now = Date.now();

      const existing = sharedRequestMap.get(requestKey);
      if (existing?.promise) {
        setLoading(true);
        try {
          const list = await existing.promise;
          setOptions((prev) => (hasSameOptions(prev, list) ? prev : list));
        } catch (err) {
          console.error("Autocomplete fetch error", err);
        } finally {
          setLoading(false);
        }
        return;
      }

      if (existing?.data && now - existing.timestamp < REQUEST_DEDUP_TTL_MS) {
        setOptions((prev) =>
          hasSameOptions(prev, existing.data) ? prev : existing.data,
        );
        return;
      }

      setLoading(true);
      const requestPromise = AxiosMaster.post("/autocomplete", payload).then(
        (res) =>
          res.data?.data?.map((item) => ({
            code: item.code,
            value: item.value,
            ...item,
          })) || [],
      );

      sharedRequestMap.set(requestKey, {
        promise: requestPromise,
        data: existing?.data || null,
        timestamp: now,
      });

      try {
        const list = await requestPromise;

        setOptions((prev) => (hasSameOptions(prev, list) ? prev : list));
        sharedRequestMap.set(requestKey, {
          promise: null,
          data: list,
          timestamp: Date.now(),
        });
      } catch (err) {
        sharedRequestMap.delete(requestKey);
        console.error("Autocomplete fetch error", err);
      } finally {
        setLoading(false);
      }
    },
    [requestBody, disabled, useStaticOptionsOnly],
  );

  useEffect(() => {
    hasFetchedInitially.current = false;
    setOptions((prev) =>
      hasSameOptions(prev, normalizedStaticOptions) ? prev : normalizedStaticOptions,
    );

    if (disabled) return;
    if (useStaticOptionsOnly) return;
    fetchData("");
  }, [
    disabled,
    fetchData,
    useStaticOptionsOnly,
    normalizedStaticOptions,
    bsRefreshKey,
    bsRefreshOnRequestChange,
    requestRefreshDependency,
  ]);

  useEffect(() => {
    if (!hasInitializedSearch.current) {
      hasInitializedSearch.current = true;
      return;
    }

    if (suppressNextSearch.current) {
      suppressNextSearch.current = false;
      return;
    }

    if (useStaticOptionsOnly) {
      return;
    }

    const delay = setTimeout(() => {
      fetchData(deferredInputValue, isSelect && open);
    }, 300);

    return () => clearTimeout(delay);
  }, [deferredInputValue, fetchData, useStaticOptionsOnly, isSelect, open]);

  useEffect(() => {
    if (
      !autoSelectSingleOption ||
      disabled ||
      isReadOnly ||
      multiple ||
      !bsOnChange
    )
      return;

    const hasValue =
      !(bsValue == null || bsValue === "") &&
      !(Array.isArray(bsValue) && bsValue.length === 0);

    if (hasValue) {
      autoSelectedOptionRef.current = null;
      return;
    }

    const selectableOptions = options.filter(
      (option) => String(option?.code ?? "") !== "",
    );
    if (selectableOptions.length !== 1) return;

    const singleOption = selectableOptions[0];
    const singleCode = String(singleOption?.code ?? "");
    if (!singleCode) return;
    if (autoSelectedOptionRef.current === singleCode) return;

    autoSelectedOptionRef.current = singleCode;
    // Keep the auto-selected payload consistent with manual selection.
    // single/select both receive the option object, so existing callers can
    // keep handling `val?.value ?? val` without special casing.
    bsOnChange(singleOption);
  }, [
    autoSelectSingleOption,
    bsOnChange,
    bsValue,
    disabled,
    isSelect,
    multiple,
    options,
  ]);
  // ✅ derive value from options + bsValue (NO internal value state)
  const selectedValue = useMemo(() => {
    if (bsValue == null) {
      return multiple ? [] : null;
    }

    if (multiple && Array.isArray(bsValue)) {
      const selectedCodes = bsValue.map((v) => v?.code ?? v);
      return options.filter((o) =>
        selectedCodes.some((code) => String(o.code ?? o) === String(code)),
      );
    }

    const selectedCode = bsValue?.code ?? bsValue;
    const selectedLabel =
      typeof bsValue === "string"
        ? bsValue
        : bsValue?.value ?? bsValue?.label ?? "";
    const matchedOption = options.find(
      (o) =>
        String(o.code ?? o) === String(selectedCode) ||
        String(o.value ?? o.label ?? "") === String(selectedLabel),
    );

    return matchedOption || (typeof bsValue === "object" ? bsValue : null);
  }, [options, bsValue, multiple]);

  const displayInputValue =
    isSelect && !open ? selectedValue?.value || "" : inputValue;

  const handleChange = (event, newValue) => {
    if (!bsOnChange || disabled) return;

    if (multiple) {
      bsOnChange(newValue.map((v) => v.code ?? v));
    } else if (isSelect) {
      bsOnChange(newValue ?? null);
    } else {
      bsOnChange(newValue ?? null);
    }
  };

  const commonProps = {
    options,
    loading,
    disabled,
    onChange: handleChange,
    isOptionEqualToValue: (option, val) =>
      String(option?.code ?? "") === String(val?.code ?? ""),
    sx: {
      ...compactAutoCompleteSx,
      // Single/select: pin input row to a hard 44 (border-box) so MUI's small
      // Autocomplete padding can't make it taller than BSTextField. Multi wraps
      // chips and must grow, so leave it on minHeight only.
      ...(!multiple && {
        "& .MuiInputBase-root:not(.MuiInputBase-multiline), & .MuiOutlinedInput-root:not(.MuiInputBase-multiline)":
          {
            minHeight: 44,
            height: 44,
            alignItems: "center",
          },
      }),
      ...(borderLeftRadius && {
        "& .MuiInputBase-root": {
          borderTopLeftRadius: borderLeftRadius,
          borderBottomLeftRadius: borderLeftRadius,
        },
      }),
      position: "relative",
      zIndex: 1,
      "&:focus-within": {
        zIndex: 2,
      },
      ...sx,
    },
  };
  const fetchById = useCallback(
    async (id) => {
      if (!id || disabled || useStaticOptionsOnly) return;

      try {
        const res = await AxiosMaster.post("/autocomplete", {
          ...requestBody,
          where: `${normalizedColumns.find((c) => c.key)?.field} = '${id}'`,
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
          const exists = prev.some(
            (o) => String(o.code) === String(option.code),
          );
          return exists ? prev : [option, ...prev];
        });
      } catch (err) {}
    },
    [requestBody, normalizedColumns, disabled, isReadOnly, useStaticOptionsOnly],
  );
  useEffect(() => {
    const selectedCode = bsValue?.code ?? bsValue;
    if (selectedCode == null || selectedCode === "") return;

    const exists = options.some((o) => String(o.code) === String(selectedCode));

    if (!exists) {
      fetchById(selectedCode);
    }
  }, [bsValue, options, fetchById]);
  useEffect(() => {
    if (multiple) return;
    if (isSelect && open) return;
    suppressNextSearch.current = true;
    setInputValue(selectedValue?.value || "");
  }, [selectedValue, multiple, isSelect, open]);

  return (
    <FormControl fullWidth error={error}>
      <Autocomplete
        {...commonProps}
        size={size}
        multiple={multiple}
        disableClearable={isSelect}
        openOnFocus={isSelect && !isReadOnly}
        value={selectedValue}
        disabled={disabled || isReadOnly}
        open={open}
        onOpen={() => {
          if (isReadOnly) return;
          setOpen(true);
          suppressNextSearch.current = true;

          if (isSelect) {
            setInputValue("");
            fetchData("", true);
            return;
          }

          if (bsLoadOnOpen && !hasStaticOptions) {
            fetchData("");
          }
        }}
        onClose={() => {
          setOpen(false);
          suppressNextSearch.current = true;
          setInputValue(selectedValue?.value || "");
        }}
        getOptionLabel={(option) =>
          option?.value || option?.name || option?.label || ""
        }
        renderOption={(props, option) => (
          <li {...props}>
            {bsFlagColor ? (
              <Box display="flex" alignItems="center" gap={1}>
                <FlagIcon sx={{ color: getPriorityColor(option.code) }} />
                <Typography variant="body2">
                  {option.value || option.name || option.label}
                </Typography>
              </Box>
            ) : (
              <Typography variant="body2">
                {option.value || option.name || option.label}
              </Typography>
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
            size={size}
            disabled={disabled || isReadOnly}
            inputProps={{
              ...params.inputProps,
              readOnly: isSelect || isReadOnly,
            }}
            placeholder={placeholder}
            InputProps={{
              ...params.InputProps,
              readOnly: isSelect || isReadOnly,
              ...(bsFlagColor &&
                !multiple &&
                selectedValue?.code && {
                  startAdornment: (
                    <FlagIcon
                      sx={{
                        color: getPriorityColor(selectedValue.code),
                        mr: 1,
                      }}
                    />
                  ),
                }),
              endAdornment: (
                <>
                  {loading && <CircularProgress size={20} />}
                  {params.InputProps.endAdornment}
                </>
              ),
            }}
          />
        )}
        inputValue={displayInputValue}
        onInputChange={(e, val, reason) => {
          if (reason === "input") {
            suppressNextSearch.current = false;
            setInputValue(val);
          }

          if (reason === "clear") {
            suppressNextSearch.current = false;
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
