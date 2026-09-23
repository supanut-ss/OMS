import { Box, IconButton, Paper, Tooltip } from "@mui/material";
import BSDataGrid from "../../components/BSDataGrid";
import BSAlertSwal2 from "../../components/BSAlertSwal2";
import ReportPreviewDialog from "../../components/ReportViewer/ReportPreviewDialog";
import { useCallback, useEffect, useRef, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useResource } from "../../hooks/useResource";
import AxiosMaster from "../../utils/AxiosMaster";
import PlaceOutlinedIcon from "@mui/icons-material/PlaceOutlined";
import PrintOutlinedIcon from "@mui/icons-material/PrintOutlined";

const Location = (props) => {
    const { permission } = useOutletContext();
    const [locale_id, setLocale_id] = useState(props.lang || "en");
    const [resourceData, setResourceData] = useState([]);
    const [reportPreview, setReportPreview] = useState({
        open: false,
        title: "",
        reportCode: "",
        parameters: {},
    });
    const { getResources } = useResource();
    const bulkSaveDuplicateGuardRef = useRef({
        seen: new Set(),
        lastCallAt: 0,
        lastMode: null,
    });

    useEffect(() => {
        setLocale_id(props.lang || "en");
        const loadRes = async () => {
            try {
                const res = await getResources("t_inv_location", props.lang || "en");
                setResourceData(res || []);
            } catch (e) {
                console.error("getResources(t_inv_location) error:", e);
            }
        };
        loadRes();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [props.lang]);

    const r = (name, fallback) =>
        resourceData?.find((res) => res.resource_name === name)?.resource_value ??
        fallback;

    const handlePrintSticker = useCallback(async (row) => {
        const location = row?.location;
        if (!location) {
            await BSAlertSwal2.show("warning", "Location is required.");
            return;
        }

        setReportPreview({
            open: true,
            title: `Print Sticker - ${location}`,
            reportCode: "StickerLocation",
            parameters: { location },
        });
    }, []);

    const handleReportPreviewClose = useCallback(() => {
        setReportPreview((prev) => ({ ...prev, open: false }));
    }, []);

    const handleBeforeSave = useCallback(async ({ formData, mode, selectedRow }) => {
        if (formData && typeof formData === "object") {
            Object.keys(formData).forEach((key) => {
                if (typeof formData[key] === "string") {
                    formData[key] = formData[key].trim();
                }
            });
        }

        // Block edit if location is already mapped in t_inv_zone_location
        if (mode === "edit" && selectedRow?.location_id != null) {
            try {
                const res = await AxiosMaster.post("/autocomplete", {
                    table: "t_inv_zone_location",
                    schema: "inv",
                    columns: [{ field: "zone_location_id", key: true }],
                    where: `location_id = ${selectedRow.location_id}`,
                    limit: 1,
                });
                const mapped = res.data?.data || [];
                if (mapped.length > 0) {
                    await BSAlertSwal2.show(
                        "warning",
                        "Cannot edit this location because it is already mapped to a zone.",
                    );
                    return false;
                }
            } catch (err) {
                console.error("Check t_inv_zone_location error:", err);
            }
        }

        const normalize = (value) =>
            value == null ? "" : String(value).trim().toLowerCase();

        const nextLocation = normalize(formData?.location);
        if (!nextLocation) {
            return true;
        }

        const guard = bulkSaveDuplicateGuardRef.current;
        const now = Date.now();

        // Reset batch tracking when save calls are far apart or mode changes.
        if (now - guard.lastCallAt > 1500 || guard.lastMode !== mode) {
            guard.seen = new Set();
        }

        const originalLocation = normalize(selectedRow?.location);

        // Skip unchanged edit values from local duplicate batch detection.
        if (!(mode === "edit" && originalLocation === nextLocation)) {
            if (guard.seen.has(nextLocation)) {
                await BSAlertSwal2.show("error", "Location already exists.");
                guard.lastCallAt = now;
                guard.lastMode = mode;
                return false;
            }
            guard.seen.add(nextLocation);
        }

        guard.lastCallAt = now;
        guard.lastMode = mode;
        return true;
    }, []);

    return (
        <Box>
            <Paper sx={{ p: 2, width: "100%", height: "100%", display: "flex", flexDirection: "column" }}>

                <BSDataGrid
                    bsLocale={locale_id}
                    bsPreObj="inv"
                    bsObj="t_inv_location"
                    bsObjBy="location asc"
                    bsCols={[
                        "location_id",
                        "location",
                        "loc_type",
                        "description",
                        "putaway_sequence",
                        "pick_sequence",
                        "is_active",
                        // "create_by",
                        // "create_date",
                        // "update_by",
                        // "update_date",
                    ].join(",")}
                    bsKeyId="location_id"
                    bsUniqueFields={[
                        {
                            field: "location",
                            message: "Location already exists.",
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
                    bsOnBeforeSave={handleBeforeSave}
                    bsDialogSize="Default"
                    bsDialogColumns={2}
                    bsDialogSection={[
                        {
                            Column: "location,loc_type,description,putaway_sequence,pick_sequence",
                            // name: r("section_location_info", "Location Information"),
                            name: r("LocationInformation", r("section_location_info", "Location Information")),
                            icon: <PlaceOutlinedIcon sx={{ fontSize: 18 }} />,
                        },
                        {
                            Column: "is_active",
                            showHeader: false,
                        },
                    ]}
                    bsComboBox={[
                        {
                            Column: "loc_type",
                            Display: "display_member",
                            Value: "value_member",
                            Default: "--- Select Location Type ---",
                            PreObj: "sec",
                            Obj: "t_com_combobox_item",
                            ObjWh: "group_name='location_type' AND is_active=1",
                            ObjBy: "display_sequence asc",
                        },
                    ]}
                    bsColumnDefs={[
                        {
                            field: "print_sticker",
                            headerName: "",
                            customColumn: true,
                            renderHeader: () => null,
                            width: 52,
                            minWidth: 52,
                            maxWidth: 52,
                            sortable: false,
                            filterable: false,
                            hideable: false,
                            disableColumnMenu: true,
                            hideInForm: true,
                            renderCell: (params) => (
                                <Tooltip title="Print Sticker" arrow>
                                    <span>
                                        <IconButton
                                            size="small"
                                            onClick={(event) => {
                                                event.stopPropagation();
                                                handlePrintSticker(params.row);
                                            }}
                                            sx={{
                                                color: "primary.main",
                                                "&:hover": {
                                                    backgroundColor: "primary.light",
                                                    color: "primary.contrastText",
                                                },
                                            }}
                                        >
                                            <PrintOutlinedIcon fontSize="small" />
                                        </IconButton>
                                    </span>
                                </Tooltip>
                            ),
                        },
                        // { field: "location_id", width: 110, readOnly: true },
                        // { field: "location", width: 160, required: true, readOnly: true },
                        // { field: "loc_type", width: 130, required: true },
                        // { field: "description", width: 280 },
                        // { field: "putaway_sequence", width: 140, type: "int" },
                        // { field: "pick_sequence", width: 120, type: "int" },
                        // { field: "is_active", defaultValue: 1 },
                        { field: "location_id", readOnly: true },
                        { field: "location", required: true, readOnly: true },
                        { field: "loc_type", required: true },
                        { field: "description", width: 280 },
                        { field: "putaway_sequence", type: "int" },
                        { field: "pick_sequence", type: "int" },
                        { field: "is_active", defaultValue: 1 },
                    ]}
                />
            </Paper>
            <ReportPreviewDialog
                open={reportPreview.open}
                onClose={handleReportPreviewClose}
                title={reportPreview.title}
                reportCode={reportPreview.reportCode}
                parameters={reportPreview.parameters}
                lang={locale_id}
            />
        </Box>
    );
};

export default Location;
