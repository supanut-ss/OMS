import { Box, Paper } from "@mui/material";
import BSDataGrid from "../../components/BSDataGrid";
import { useCallback, useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useResource } from "../../hooks/useResource";
import LayersOutlinedIcon from "@mui/icons-material/LayersOutlined";

const Zone = (props) => {
    const { permission } = useOutletContext();
    const [locale_id, setLocale_id] = useState(props.lang || "en");
    const [resourceData, setResourceData] = useState([]);
    const { getResources } = useResource();

    useEffect(() => {
        setLocale_id(props.lang || "en");
        const loadRes = async () => {
            try {
                const res = await getResources("t_inv_zone", props.lang || "en");
                setResourceData(res || []);
            } catch (e) {
                console.error("getResources(t_inv_zone) error:", e);
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
                    bsObj="t_inv_zone"
                    bsObjBy="zone asc"
                    bsOnBeforeSave={handleBeforeSave}
                    bsCols={[
                        "zone_id",
                        "zone",
                        "zone_type",
                        "is_active",
                        // "create_by",
                        // "create_date",
                        // "update_by",
                        // "update_date",
                    ].join(",")}
                    bsKeyId="zone_id"
                    bsUniqueFields={[
                        {
                            field: "zone",
                            message: "Zone already exists.",
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
                    bsDialogSize="Default"
                    bsDialogColumns={2}
                    bsDialogSection={[
                        {
                            Column: "zone,zone_type",
                            // name: r("section_zone_info", "Zone Information"),
                            name: r("ZoneInformation", r("section_zone_info", "Zone Information")),
                            icon: <LayersOutlinedIcon sx={{ fontSize: 18 }} />,
                        },
                        {
                            Column: "is_active",
                            showHeader: false,
                        },
                    ]}
                    bsComboBox={[
                        {
                            Column: "zone_type",
                            Display: "display_member",
                            Value: "value_member",
                            Default: "--- Select Zone Type ---",
                            PreObj: "sec",
                            Obj: "t_com_combobox_item",
                            ObjWh: "group_name='zone_type' AND is_active=1",
                            ObjBy: "display_sequence asc",
                        },
                    ]}
                    bsColumnDefs={[
                        // { field: "zone_id", width: 100, readOnly: true },
                        // { field: "zone", width: 160, required: true, readOnly: true },
                        // { field: "zone_type", width: 160, required: true },
                        // { field: "is_active", defaultValue: 1 },
                        { field: "zone_id", readOnly: true },
                        { field: "zone", required: true, readOnly: true },
                        { field: "zone_type", required: true },
                        { field: "is_active", defaultValue: 1 },
                    ]}
                />
            </Paper>
        </Box>
    );
};

export default Zone;
