import { Box, Paper } from "@mui/material";
import BSDataGrid from "../../components/BSDataGrid";
import { useCallback, useEffect, useRef, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useResource } from "../../hooks/useResource";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import StraightenOutlinedIcon from "@mui/icons-material/StraightenOutlined";
import AllInboxOutlinedIcon from "@mui/icons-material/AllInboxOutlined";
import AspectRatioOutlinedIcon from "@mui/icons-material/AspectRatioOutlined";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import PartAttachmentManager, {
  PartAttachmentFormField,
} from "./PartAttachmentManager";
import AxiosMaster from "../../utils/AxiosMaster";
import BSAlertSwal2 from "../../components/BSAlertSwal2";

const PACKAGE_CATEGORY_OPTIONS = ["PALLET", "BOX"];

const Part = (props) => {
  const { permission } = useOutletContext();
  const [locale_id, setLocale_id] = useState(props.lang || "en");
  const [resourceData, setResourceData] = useState([]);
  const { getResources } = useResource();
  const dataGridRef = useRef(null);
  const pendingAttachmentRef = useRef(null);

  useEffect(() => {
    setLocale_id(props.lang || "en");
    const loadRes = async () => {
      try {
        const res = await getResources("t_inv_part", props.lang || "en");
        setResourceData(res || []);
      } catch (e) {
        console.error("getResources(t_inv_part) error:", e);
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

  const handlePendingAttachment = useCallback((pendingAction) => {
    pendingAttachmentRef.current = pendingAction;
  }, []);

  const renderAttachmentField = useCallback(
    ({ mode, selectedRow }) => (
      <PartAttachmentFormField
        key={`${mode}-${selectedRow?.part_id ?? "new"}`}
        partId={mode === "add" ? null : selectedRow?.part_id}
        readOnly={mode === "view"}
        onPendingChange={handlePendingAttachment}
      />
    ),
    [handlePendingAttachment],
  );

  const handleAfterSave = useCallback(
    async ({ mode, selectedRow, savedRecord }) => {
      const pending = pendingAttachmentRef.current;
      pendingAttachmentRef.current = null;
      if (!pending) return;

      const savedData =
        savedRecord?.data ?? savedRecord?.Data ?? savedRecord ?? {};
      const partId =
        mode === "edit"
          ? selectedRow?.part_id
          : (savedData.part_id ??
            savedData.PartId ??
            savedRecord?.insertedId ??
            savedRecord?.id);

      if (!partId) {
        await BSAlertSwal2.show(
          "warning",
          "Part was saved, but its ID was not returned. Open Edit to attach the file.",
        );
        return;
      }

      try {
        if (pending.action === "delete") {
          await AxiosMaster.post(`/PartAttachment/${partId}/delete`);
        } else if (pending.action === "upsert" && pending.file) {
          const formData = new FormData();
          formData.append("file", pending.file);
          await AxiosMaster.post(`/PartAttachment/${partId}`, formData, {
            headers: { "Content-Type": "multipart/form-data" },
          });
        }
        dataGridRef.current?.refreshData();
      } catch (error) {
        await BSAlertSwal2.show(
          "error",
          error?.response?.data?.message ||
            "Part was saved, but the attachment could not be updated. Please open Edit and retry.",
        );
      }
    },
    [],
  );

  const handleDeletePart = useCallback(async (partId) => {
    const confirmed = await BSAlertSwal2.confirm(
      "Delete this Part and its attachment?",
      {
        title: "Delete Part",
        confirmButtonText: "Delete",
        cancelButtonText: "Cancel",
      },
    );
    if (!confirmed) return;

    try {
      await AxiosMaster.post(`/PartAttachment/part/${partId}/delete`);
    } catch (error) {
      await BSAlertSwal2.show(
        "error",
        error?.response?.data?.message || "Unable to delete Part.",
      );
    }
  }, []);

  return (
    <Box sx={{ height: "100%" }}>
      <Paper
        sx={{
          p: 2,
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <BSDataGrid
          ref={dataGridRef}
          bsLocale={locale_id}
          bsPreObj="inv"
          bsObj="t_inv_part"
          bsObjBy="part_number asc"
          bsOnBeforeSave={handleBeforeSave}
          bsOnAfterSave={handleAfterSave}
          bsDialogExtraContent={renderAttachmentField}
          onDelete={handleDeletePart}
          bsHiddenColumns={["keypoint_picture_path"]}
          bsCols={[
            "part_id",
            "part_number",
            "description",
            "width_part",
            "length_part",
            "height_part",
            "weight_part",
            "snp_qty_per_package",
            "category",
            "package_type",
            "width_pkg",
            "length_pkg",
            "height_pkg",
            "weight_pkg",
            "gross_weight",
            "model",
            "pallet_type",
            "dock",
            "is_active",
            // "create_by",
            // "create_date",
            // "update_by",
            // "update_date",
          ].join(",")}
          bsKeyId="part_id"
          bsUniqueFields={[
            {
              field: "part_number",
              message: "Part No. already exists.",
            },
          ]}
          bsShowRowNumber={true}
          showAdd={permission?.is_add}
          bsVisibleEdit={permission?.is_edit}
          bsVisibleDelete={false}
          bsAllowDelete={false}
          bsVisibleView={permission?.is_view}
          bsBulkMode={{
            enable: false,
            addInline: permission.is_add,
            edit: false,
            delete: false,
            add: permission.is_add,
          }}
          bsDialogSize="Large"
          bsDialogColumns={3}
          bsDialogSection={[
            {
              Column: "part_number,description",
              name: r(
                "PartInformation",
                r("section_part_info", "Part Information"),
              ),
              icon: <Inventory2OutlinedIcon sx={{ fontSize: 18 }} />,
            },
            {
              Column: "width_part,length_part,height_part,weight_part",
              name: r(
                "DimensionPart",
                r("section_dimension_part", "Dimension Part"),
              ),
              icon: <StraightenOutlinedIcon sx={{ fontSize: 18 }} />,
            },
            {
              Column: "snp_qty_per_package,category,package_type",
              name: r("Packaging", r("section_packaging", "Packaging")),
              icon: <AllInboxOutlinedIcon sx={{ fontSize: 18 }} />,
            },
            {
              Column: "width_pkg,length_pkg,height_pkg,weight_pkg,gross_weight",
              name: r(
                "DimensionPackaging",
                r("section_dimension_packaging", "Dimension Packaging"),
              ),
              icon: <AspectRatioOutlinedIcon sx={{ fontSize: 18 }} />,
            },
            {
              Column: "model,pallet_type,dock",
              name: r(
                "AdditionalInfo",
                r("section_additional_info", "Additional Information"),
              ),
              icon: <InfoOutlinedIcon sx={{ fontSize: 18 }} />,
            },
            {
              Column: "is_active",
              showHeader: false,
            },
          ]}
          bsColumnDefs={[
            {
              field: "part_attachment",
              customColumn: true,
              headerName: "Attachment",
              width: 100,
              sortable: false,
              filterable: false,
              align: "center",
              headerAlign: "center",
              renderCell: (params) => (
                <PartAttachmentManager
                  row={params.row}
                  canEdit={permission?.is_edit}
                  canDelete={permission?.is_delete}
                  onSaved={() => dataGridRef.current?.refreshData()}
                />
              ),
            },
            { field: "part_id", readOnly: true },
            {
              field: "part_number",
              headerName: "Part No.",
              required: true,
              readOnly: true,
              width: 160,
              labelAbove: true,
            },
            {
              field: "description",
              headerName: "Part number",
              required: true,
              width: 260,
              labelAbove: true,
            },
            {
              field: "width_part",
              headerName: "Wide (W)",
              type: "number",
              min: 0,
              unit: "mm",
              labelAbove: true,
            },
            {
              field: "length_part",
              headerName: "Long (L)",
              type: "number",
              min: 0,
              unit: "mm",
              labelAbove: true,
            },
            {
              field: "height_part",
              headerName: "High (H)",
              type: "number",
              min: 0,
              unit: "mm",
              labelAbove: true,
            },
            {
              field: "weight_part",
              headerName: "Weight",
              type: "number",
              min: 0,
              unit: "kg",
              labelAbove: true,
            },
            {
              field: "snp_qty_per_package",
              headerName: "Qty / Packing (SNP)",
              type: "number",
              min: 0,
              required: true,
              labelAbove: true,
            },
            {
              field: "category",
              headerName: "Category",
              type: "singleSelect",
              valueOptions: PACKAGE_CATEGORY_OPTIONS,
              required: true,
              labelAbove: true,
            },
            {
              field: "package_type",
              headerName: "Type",
              width: 120,
              labelAbove: true,
            },
            {
              field: "width_pkg",
              headerName: "Wide (W)",
              type: "number",
              min: 0,
              unit: "mm",
              labelAbove: true,
            },
            {
              field: "length_pkg",
              headerName: "Long (L)",
              type: "number",
              min: 0,
              unit: "mm",
              labelAbove: true,
            },
            {
              field: "height_pkg",
              headerName: "High (H)",
              type: "number",
              min: 0,
              unit: "mm",
              labelAbove: true,
            },
            {
              field: "weight_pkg",
              headerName: "Weight",
              type: "number",
              min: 0,
              unit: "kg",
              labelAbove: true,
            },
            {
              field: "gross_weight",
              headerName: "Gross Weight",
              type: "number",
              min: 0,
              unit: "kg",
              labelAbove: true,
            },
            {
              field: "model",
              headerName: "Model",
              width: 120,
              labelAbove: true,
            },
            {
              field: "pallet_type",
              headerName: "Pallet Type",
              width: 120,
              labelAbove: true,
            },
            { field: "dock", headerName: "Dock", width: 120, labelAbove: true },
            { field: "is_active", defaultValue: 1 },
          ]}
        />
      </Paper>
    </Box>
  );
};

export default Part;
