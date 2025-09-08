import React, { useState, useEffect } from "react";
import { TextField, CircularProgress, MenuItem, Select, FormControl, InputLabel } from "@mui/material";
import Autocomplete from "@mui/material/Autocomplete";
import axios from "axios";
import SecureStorage from "../utils/SecureStorage";
import AxiosMaster from "../utils/AxiosMaster";

const BsAutoComplete = ({
    bsModel = "single",       // single, multi, select
    bsPreObj,                 // primary key
    bsTitle,                  // title
    bsObj,                    // table
    bsFilters = [],           // array [{field, op, value}] or empty
    bsColumes = [],           // array [{field, display, order_by}]
    bsData = [],              // optional: initial data array [{code,label}]
    bsValue = null,           // pre-selected value(s)
    bsOnChange,               // function callback on change
    loadOnOpen = false,       // true = fetch only on open
    cacheKey,                 // string, localStorage key for cache
}) => {
    const multiple = bsModel === "multi";
    const isSelect = bsModel === "select";
    const [options, setOptions] = useState(bsData);
    const [loading, setLoading] = useState(false);
    const [value, setValue] = useState(bsValue || (multiple ? [] : ""));
    const [loaded, setLoaded] = useState(bsData.length > 0); // track if options loaded

    // build request body for API
    const requestBody = {
        table: bsObj,
        primary: bsPreObj,
        columns: bsColumes,
        filters: bsFilters,
        include_blank: bsModel === "select",
    };

    const fetchData = async () => {
        if (loaded) return;
        setLoading(true);
        let list = []; // ประกาศที่นี่
        try {
            // check localStorage cache first
            if (cacheKey) {
                const cached = SecureStorage.get(cacheKey);
                if (cached) {
                    list = JSON.parse(cached);
                    setOptions(list);
                    setLoaded(true);
                    return;
                }
            }

            await AxiosMaster.post("/autocomplate", requestBody).then((res) => {
                if (res.data?.data) {
                    list = res.data.data?.map(item => ({
                        code: item.code,
                        label: item.value
                    }));
                    setOptions(list);
                    setLoaded(true);

                    if (cacheKey) SecureStorage.set(cacheKey, JSON.stringify(list));
                }
            }).finally();

            // preload value if provided
            if (bsValue && list.length > 0) {
                if (multiple) {
                    const preSelected = list.filter(l => bsValue.includes(l.code));
                    setValue(preSelected);
                } else if (isSelect) {
                    setValue(bsValue);
                } else {
                    const preSelected = list.find(l => l.code === bsValue) || null;
                    setValue(preSelected);
                }
            }
        } catch (error) {
            console.error("Autocomplete fetch error:", error);
        } finally {
            setLoading(false);
        }
    };


    const handleChange = (event, newValue) => {
        setValue(newValue);
        if (bsOnChange) {
            if (isSelect) {
                bsOnChange(newValue); // code string
            } else if (multiple) {
                bsOnChange(newValue.map(v => v.code));
            } else {
                bsOnChange(newValue?.code || null);
            }
        }
    };

    // trigger fetch on open (for Autocomplete)
    const handleOpen = () => {
        if (loadOnOpen) fetchData();
    };

    useEffect(() => {
        if (!loadOnOpen) fetchData(); // normal fetch on mount
    }, [JSON.stringify(bsFilters), JSON.stringify(bsColumes), bsObj, bsPreObj]);

    if (isSelect) {
        // แบบ MUI Select
        return (
            <Autocomplete
                disableClearable
                options={options}
                getOptionLabel={(option) => option.label || ""}
                value={options.find(opt => opt.code === value) || null}
                onChange={(event, newValue) => {
                    handleChange(event, newValue ? newValue.code : "");
                }}
                loading={loading}
                onOpen={loadOnOpen ? fetchData : undefined}
                isOptionEqualToValue={(option, val) => option.code === val.code}
                renderInput={(params) => (
                    <TextField
                        {...params}
                        label={bsTitle}
                        variant="outlined"
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
        );
    }

    // แบบ Autocomplete (single / multi)
    return (
        <Autocomplete
            multiple={multiple}
            options={options}
            getOptionLabel={(option) => option.label || ""}
            value={value}
            onChange={handleChange}
            loading={loading}
            onOpen={handleOpen}
            isOptionEqualToValue={(option, val) => option.code === val.code}
            renderInput={(params) => (
                <TextField
                    {...params}
                    label={bsTitle}
                    variant="outlined"
                    InputProps={{
                        ...params.InputProps,
                        endAdornment: (
                            <>
                                {loading ? <CircularProgress color="inherit" size={20} /> : null}
                                {params.InputProps.endAdornment}
                            </>
                        ),
                    }}
                />
            )}
        />
    );
};

export default BsAutoComplete;
