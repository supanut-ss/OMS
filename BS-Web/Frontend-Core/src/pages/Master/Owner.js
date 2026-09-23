import { Box, Paper } from "@mui/material";
import BSDataGrid from "../../components/BSDataGrid";
import { useCallback, useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useResource } from "../../hooks/useResource";
import PersonOutlineOutlinedIcon from "@mui/icons-material/PersonOutlineOutlined";
import LocationOnOutlinedIcon from "@mui/icons-material/LocationOnOutlined";

const Owner = (props) => {
    const { permission } = useOutletContext();
    const [locale_id, setLocale_id] = useState(props.lang || "en");
    const [resourceData, setResourceData] = useState([]);
    const { getResources } = useResource();

    useEffect(() => {
        setLocale_id(props.lang || "en");
        const loadRes = async () => {
            try {
                const res = await getResources("t_inv_owner", props.lang || "en");
                setResourceData(res || []);
            } catch (e) {
                console.error("getResources(t_inv_owner) error:", e);
            }
        };
        loadRes();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [props.lang]);

    const r = (name, fallback) =>
        resourceData?.find((res) => res.resource_name === name)?.resource_value ??
        fallback;

    const handleBeforeSave = useCallback(({ formData }) => {
        if (!formData || typeof formData !== "object") return true;
        Object.keys(formData).forEach((key) => {
            if (typeof formData[key] === "string") {
                formData[key] = formData[key].trim();
            }
        });
        return true;
    }, []);

    return (
        <Box>
            <Paper sx={{ p: 2, width: "100%", height: "100%", display: "flex", flexDirection: "column" }}>

                <BSDataGrid
                    bsLocale={locale_id}
                    bsPreObj="inv"
                    bsObj="t_inv_owner"
                    bsObjBy="owner_code asc"
                    bsOnBeforeSave={handleBeforeSave}
                    bsCols={[
                        "owner_id",
                        "owner_code",
                        "owner_name",
                        "description",
                        "address_line1",
                        "address_line2",
                        "address_line3",
                        "is_active",
                        // "create_by",
                        // "create_date",
                        // "update_by",
                        // "update_date",
                    ].join(",")}
                    bsKeyId="owner_id"
                    bsUniqueFields={[
                        {
                            field: "owner_code",
                            message: "Owner Code already exists.",
                        },
                    ]}
                    bsShowRowNumber={true}
                    showAdd={permission?.is_add}
                    bsVisibleEdit={permission?.is_edit}
                    bsVisibleDelete={permission?.is_delete}
                    bsAllowDelete={permission?.is_delete}
                    bsVisibleView={permission?.is_view}
                    bsBulkMode={{
                        // enable: false,
                        enable: true,
                        addInline: permission.is_add,
                        edit: false,
                        delete: permission.is_delete,
                        add: permission.is_add,
                    }}
                    bsDialogSize="Large"
                    bsDialogColumns={3}
                    bsDialogSection={[
                        {
                            Column: "owner_code,owner_name,description",
                            // name: r("section_owner_info", "Owner Information"),
                            name: r("OwnerInformation", r("section_owner_info", "Owner Information")),
                            icon: <PersonOutlineOutlinedIcon sx={{ fontSize: 18 }} />,
                        },
                        {
                            Column: "address_line1,address_line2,address_line3",
                            name: r("section_address", "Address"),
                            icon: <LocationOnOutlinedIcon sx={{ fontSize: 18 }} />,
                        },
                        {
                            Column: "is_active",
                            showHeader: false,
                        },
                    ]}
                    bsColumnDefs={[
                        // { field: "owner_id", width: 100, readOnly: true },
                        // { field: "owner_code", width: 140, required: true, readOnly: true },
                        // { field: "owner_name", width: 200, required: true },
                        // { field: "description", width: 240 },
                        // { field: "address_line1", width: 220 },
                        // { field: "address_line2", width: 220, hide: true, showInForm: true },
                        // { field: "address_line3", width: 220, hide: true, showInForm: true },
                        // { field: "is_active", defaultValue: 1 },
                        { field: "owner_id", readOnly: true },
                        { field: "owner_code", required: true, readOnly: true },
                        { field: "owner_name", required: true },
                        { field: "description", width: 280 },
                        { field: "address_line1" },
                        { field: "address_line2", hide: true, showInForm: true },
                        { field: "address_line3", hide: true, showInForm: true },
                        { field: "is_active", defaultValue: 1 },
                    ]}
                />
            </Paper>
        </Box>
    );
};

export default Owner;
