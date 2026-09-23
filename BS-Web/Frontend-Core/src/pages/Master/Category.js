import { Box, Paper } from "@mui/material";
import BSDataGrid from "../../components/BSDataGrid";
import { useCallback, useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useResource } from "../../hooks/useResource";
import CategoryIcon from "@mui/icons-material/Category";

const Category = (props) => {
    const { permission } = useOutletContext();
    const [locale_id, setLocale_id] = useState(props.lang || "en");
    const [resourceData, setResourceData] = useState([]);
    const { getResources } = useResource();

    useEffect(() => {
        setLocale_id(props.lang || "en");
        const loadRes = async () => {
            try {
                const res = await getResources("t_inv_category", props.lang || "en");
                setResourceData(res || []);
            } catch (e) {
                console.error("getResources(t_inv_category) error:", e);
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
                    bsObj="t_inv_category"
                    bsObjBy="item_category asc"
                    bsOnBeforeSave={handleBeforeSave}
                    bsCols={[
                        "category_id",
                        "item_category",
                        "description",
                        "is_active",
                        // "create_by",
                        // "create_date",
                        // "update_by",
                        // "update_date",
                    ].join(",")}
                    bsKeyId="category_id"
                    bsUniqueFields={[
                        {
                            field: "item_category",
                            message: "Item Category already exists.",
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
                        addInline: permission?.is_add,
                        edit: false,
                        delete: permission?.is_delete,
                        add: permission?.is_add,
                    }}
                    bsDialogSize="Large"
                    bsDialogColumns={2}
                    bsDialogSection={[
                        {
                            Column: "item_category,description",
                            // name: r("section_category_info", "Category Information"),
                            name: r("CategoryInformation", r("section_category_info", "Category Information")),
                            icon: <CategoryIcon sx={{ fontSize: 18 }} />,
                        },
                        {
                            Column: "is_active",
                            showHeader: false,
                        },
                    ]}
                    bsColumnDefs={[
                        { field: "category_id", width: 110, readOnly: true },
                        {
                            field: "item_category",
                            // width: 200,
                            headerName: r("item_category", "Item Category"),
                            required: true,
                            readOnly: true,
                        },
                        {
                            field: "description",
                            // width: 700,
                            width: 280,
                            headerName: r("description", "Description"),
                        },
                        { field: "is_active", defaultValue: 1 },
                    ]}
                />
            </Paper>
        </Box>
    );
};

export default Category;
