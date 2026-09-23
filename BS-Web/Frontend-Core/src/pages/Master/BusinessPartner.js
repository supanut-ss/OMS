import { Box, Paper, useTheme } from "@mui/material";
import BSDataGrid from "../../components/BSDataGrid";
import { useCallback, useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useResource } from "../../hooks/useResource";
import { useDynamicCrud } from "../../hooks/useDynamicCrud";
import BusinessOutlinedIcon from "@mui/icons-material/BusinessOutlined";
import LocationOnOutlinedIcon from "@mui/icons-material/LocationOnOutlined";
import ContactMailOutlinedIcon from "@mui/icons-material/ContactMailOutlined";
import ExtensionOutlinedIcon from "@mui/icons-material/ExtensionOutlined";
import AxiosMaster from "../../utils/AxiosMaster";

const userDefColumns = Array.from({ length: 10 }, (_, i) => `user_def${i + 1}`);


const BusinessPartner = (props) => {
    const { permission } = useOutletContext();
    const [locale_id, setLocale_id] = useState(props.lang || "en");
    const [resourceData, setResourceData] = useState([]);
    const { getResources } = useResource();
    useDynamicCrud("t_inv_business_partner");
    const [ownerCode, setOwnerCode] = useState("");
    const [ownerCodeId, setOwnerCodeId] = useState("");
    const theme = useTheme();

    // --- เพิ่ม state สำหรับ owner options ---
    useEffect(() => {
        setLocale_id(props.lang || "en");
        const loadRes = async () => {
            try {
                const res = await getResources("t_inv_business_partner", props.lang || "en");
                setResourceData(res || []);
            } catch (e) {
                console.error("getResources(t_inv_business_partner) error:", e);
            }
        };
        loadRes();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [props.lang]);

    useEffect(() => {
        const loadOwner = async () => {
            try {
                const resp = await AxiosMaster.post(
                    "/dynamic/bs-datagrid",
                    {
                        tableName: "t_inv_owner",
                        schemaName: "inv",
                        preObj: "inv",
                        start: 0,
                        end: 1,
                    }
                );
                console.log("owner:", resp);
                const code =
                    resp?.data?.rows?.[0]?.data?.owner_code || "";
                const codeId =
                    resp?.data?.rows?.[0]?.data?.owner_id || "";
                setOwnerCode(code);
                setOwnerCodeId(codeId);
                console.log("Owner Code:", code);
                console.log("Owner Code ID:", codeId);
            } catch (err) {
                console.error(err);
            }
        };

        loadOwner();
    }, []);

    const trimStringFields = useCallback((data) => {
        if (!data || typeof data !== "object") return;
        Object.keys(data).forEach((key) => {
            if (typeof data[key] === "string") {
                data[key] = data[key].trim();
            }
        });
    }, []);

    const handleBeforeSave = useCallback(({ formData }) => {
        trimStringFields(formData);
        formData.owner_id = ownerCodeId;
        formData.owner_code = ownerCode;
        console.log("Owner formData:", formData);
    }, [ownerCode, ownerCodeId, trimStringFields]);

    // --- ฟังก์ชัน map owner_id → owner_code ก่อน save ---
    const applyOwnerFields = useCallback((data) => {
        console.log("Owner data:", data);
        return {
            ...data,
            owner_id: ownerCodeId,
            owner_code: ownerCode,
        };
    }, [ownerCode, ownerCodeId]);

    const r = (name, fallback) =>
        resourceData?.find((res) => res.resource_name === name)?.resource_value ??
        fallback;

    return (
        <Box>
            <Paper sx={{ p: 2, width: "100%", height: "100%", display: "flex", flexDirection: "column" }}>

                <BSDataGrid
                    bsLocale={locale_id}
                    bsPreObj="inv"
                    bsObj="t_inv_business_partner"
                    bsObjBy="business_code asc"
                    bsOnBeforeSave={handleBeforeSave}
                    bsDataTransform={(data) => applyOwnerFields(data)}
                    bsCols={[
                        "business_partner_id",
                        "business_code",
                        "business_name",
                        "business_type",
                        // "owner_id",
                        // "owner_code",
                        "description",
                        "address_line1",
                        "address_line2",
                        "address_line3",
                        "contact",
                        "email",
                        ...userDefColumns,
                        "is_active",
                        // "create_by",
                        // "create_date",
                        // "update_by",
                        // "update_date",
                    ].join(",")}
                    bsKeyId="business_partner_id"
                    bsUniqueFields={[
                        {
                            field: "business_code",
                            message: "Business Code already exists.",
                        },
                    ]}
                    bsShowRowNumber={true}
                    showAdd={permission?.is_add}
                    bsVisibleEdit={permission?.is_edit}
                    bsVisibleDelete={permission?.is_delete}
                    bsAllowDelete={permission?.is_delete}
                    bsVisibleView={permission?.is_view}
                    // bsBulkMode={{
                    //     // enable: false,
                    //     enable: true,
                    //     addInline: permission.is_add,
                    //     edit: false,
                    //     delete: permission.is_delete,
                    //     add: permission.is_add,
                    // }}
                    bsDialogSize="Large"
                    bsDialogColumns={3}
                    bsDialogSection={[
                        {
                            Column: "owner_code,business_code,business_name,business_type,description",
                            // name: r("section_business_info", "Business Information"),
                            name: r("BusinessInformation", r("section_business_info", "Business Information")),
                            icon: <BusinessOutlinedIcon sx={{ fontSize: 18 }} />,
                        },
                        {
                            Column: "address_line1,address_line2,address_line3",
                            // name: r("section_address", "Address"),
                            name: r("AddressInformation", r("section_address", "Address")),
                            icon: <LocationOnOutlinedIcon sx={{ fontSize: 18 }} />,
                        },
                        {
                            Column: "contact,email",
                            // name: r("section_contact", "Contact"),
                            name: r("ContactInformation", r("section_contact", "Contact")),
                            icon: <ContactMailOutlinedIcon sx={{ fontSize: 18 }} />,
                        },
                        {
                            Column: userDefColumns.join(","),
                            // name: r("section_user_def", "User Defined Fields (optional)"),
                            name: r("UserDefinedFieldsInformation", r("section_user_def", "User Defined Fields (optional)")),
                            icon: <ExtensionOutlinedIcon sx={{ fontSize: 18 }} />,
                        },
                        {
                            Column: "is_active",
                            showHeader: false,
                        },
                    ]}
                    bsComboBox={[
                        // {
                        //     Column: "owner_id",
                        //     Display: "owner_name",
                        //     Value: "owner_id",
                        //     PreObj: "inv",
                        //     Obj: "t_inv_owner",
                        //     ObjBy: "owner_name asc",
                        // },
                        {
                            Column: "business_type",
                            Display: "display_member",
                            Value: "value_member",
                            Default: "--- Select Business Type ---",
                            PreObj: "sec",
                            Obj: "t_com_combobox_item",
                            ObjWh: "group_name='business_type' AND is_active=1",
                            ObjBy: "display_sequence asc",
                        },
                    ]}
                    bsColumnDefs={[
                        // { field: "business_partner_id", width: 140, readOnly: true },
                        // { field: "business_code", width: 140, required: true, readOnly: true },
                        // { field: "business_name", width: 280, required: true },
                        // { field: "business_type", width: 120 },
                        // { field: "owner_id", width: 130, required: true, hide: true },
                        // // { field: "owner_code", width: 130, required: true },
                        // { field: "owner_code", hide: true },
                        // { field: "description", width: 240, hide: true, showInForm: true },
                        // { field: "address_line1", width: 220, hide: true, showInForm: true },
                        // { field: "address_line2", width: 220, hide: true, showInForm: true },
                        // { field: "address_line3", width: 220, hide: true, showInForm: true },
                        // { field: "contact", width: 140 },
                        // { field: "email", width: 180 },
                        { field: "business_partner_id", readOnly: true },
                        { field: "business_code", required: true, readOnly: true },
                        { field: "business_name", required: true },
                        { field: "business_type" },
                        { field: "owner_id", required: true, hide: true },
                        // { field: "owner_code", width: 130, required: true },
                        { field: "owner_code", hide: true },
                        { field: "description", width: 280, hide: true, showInForm: true },
                        { field: "address_line1", hide: true, showInForm: true },
                        { field: "address_line2", hide: true, showInForm: true },
                        { field: "address_line3", hide: true, showInForm: true },
                        { field: "contact" },
                        { field: "email" },
                        ...userDefColumns.map((field) => {
                            const num = Number(field.replace("user_def", ""));
                            const isDecimal = num === 7 || num === 8;
                            const isDate = num === 9 || num === 10;
                            const fallbackHeader = `User Def ${num}${isDecimal ? " (Decimal)" : isDate ? " (Date)" : ""}`;
                            return {
                                field,
                                hide: true,
                                showInForm: true,
                                headerName: r(`user_def${num}`, fallbackHeader),
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

export default BusinessPartner;
