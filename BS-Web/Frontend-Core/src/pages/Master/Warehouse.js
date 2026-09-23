import { Box, Paper } from "@mui/material";
import BSDataGrid from "../../components/BSDataGrid";
import { useCallback, useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useResource } from "../../hooks/useResource";
import WarehouseOutlinedIcon from "@mui/icons-material/WarehouseOutlined";
import LocationOnOutlinedIcon from "@mui/icons-material/LocationOnOutlined";
import ExtensionOutlinedIcon from "@mui/icons-material/ExtensionOutlined";

const userDefColumns = Array.from({ length: 10 }, (_, index) => {
  const num = index + 1;
  return `user_def${num}`;
});

const Warehouse = (props) => {
  const { permission } = useOutletContext();
  const [locale_id, setLocale_id] = useState(props.lang || "en");
  const [resourceData, setResourceData] = useState([]);
  const { getResources } = useResource();

  useEffect(() => {
    setLocale_id(props.lang || "en");
    const loadRes = async () => {
      try {
        const res = await getResources("t_inv_warehouse", props.lang || "en");
        setResourceData(res || []);
      } catch (e) {
        console.error("getResources(t_inv_warehouse) error:", e);
      }
    };
    loadRes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.lang]);

  // Resolve a resource value by name, falling back to the provided English default
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
          bsObj="t_inv_warehouse"
          bsObjBy="warehouse asc"
          bsOnBeforeSave={handleBeforeSave}
          bsCols={[
            "warehouse_id",
            "warehouse",
            "warehouse_name",
            "description",
            "address_line1",
            "address_line2",
            "address_line3",
            ...userDefColumns,
            "is_active",
            // "create_by",
            // "create_date",
            // "update_by",
            // "update_date",
          ].join(",")}
          bsKeyId="warehouse_id"
          bsUniqueFields={[
            {
              field: "warehouse",
              message: "Warehouse Code already exists.",
            },
          ]}
          bsShowRowNumber={true}
          showAdd={permission?.is_add}
          bsVisibleEdit={permission?.is_edit}
          bsVisibleDelete={permission?.is_delete}
          bsAllowDelete={permission?.is_delete}
          bsVisibleView={permission?.is_view}
          // bsBulkMode={{ enable: true }}
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
              Column: "warehouse,warehouse_name,description",
              // name: r("section_warehouse_info", "Warehouse Information"),
              name: r("WarehouseInformation", r("section_warehouse_info", "Warehouse Information")),
              icon: <WarehouseOutlinedIcon sx={{ fontSize: 18 }} />,
            },
            {
              Column: "address_line1,address_line2,address_line3",
              // name: r("section_address", "Address"),
              name: r("AddressInformation", r("section_address", "Address")),
              icon: <LocationOnOutlinedIcon sx={{ fontSize: 18 }} />,
            },
            {
              Column: userDefColumns.join(","),
              // name: r("section_user_def", "User Defined Fields (optional)"),
              name: r("UserDefinedFields", r("section_user_def", "User Defined Fields")),
              icon: <ExtensionOutlinedIcon sx={{ fontSize: 18 }} />,
            },
            {
              Column: "is_active",
              showHeader: false,
            },
          ]}
          bsColumnDefs={[
            { field: "warehouse_id", width: 120, readOnly: true },
            {
              field: "warehouse",
              // width: 140,
              required: true,
              readOnly: true,
            },
            {
              field: "warehouse_name",
              // width: 200,
              required: true,
            },
            { field: "description", width: 280 },
            {
              field: "address_line1"
              // , width: 220 
            },
            {
              field: "address_line2",
              // width: 220,
              hide: true,
              showInForm: true,
            },
            {
              field: "address_line3",
              // width: 220,
              hide: true,
              showInForm: true,
            },
            ...userDefColumns.map((field) => {
              const userDefMatch = field.match(/^user_def(\d+)$/);
              const userDefNum = userDefMatch ? Number(userDefMatch[1]) : null;
              const isDecimal = userDefNum === 7 || userDefNum === 8;
              const isDate = userDefNum === 9 || userDefNum === 10;
              const fallbackHeader = `User Def ${userDefNum}${isDecimal ? " (Decimal)" : isDate ? " (Date)" : ""}`;

              return {
                field,
                hide: true,
                showInForm: true,
                headerName: r(`user_def${userDefNum}`, fallbackHeader),
                ...(isDecimal && { type: "decimal" }),
                ...(isDate && { type: "date" }),
              };
            }),
            { field: "is_active", defaultValue: 1 },
          ]}
        />
      </Paper>
    </Box>
  );
};

export default Warehouse;
