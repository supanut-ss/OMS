import React, { useCallback, useEffect, useRef, useState } from "react";
import { Box, IconButton, Paper, Tooltip } from "@mui/material";
import BSDataGrid from "../../components/BSDataGrid";
import BSAlertSwal2 from "../../components/BSAlertSwal2";
import AxiosMaster from "../../utils/AxiosMaster";
import ReportPreviewDialog from "../../components/ReportViewer/ReportPreviewDialog";
import { useOutletContext } from "react-router-dom";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import TuneOutlinedIcon from "@mui/icons-material/TuneOutlined";
import StraightenOutlinedIcon from "@mui/icons-material/StraightenOutlined";
import CompareArrowsOutlinedIcon from "@mui/icons-material/CompareArrowsOutlined";
import ExtensionOutlinedIcon from "@mui/icons-material/ExtensionOutlined";
import PrintOutlinedIcon from "@mui/icons-material/PrintOutlined";

const INVENTORY_TYPES = ["Inventory", "Asset", "Consumable"];
const CONTROL_VALUES = ["None", "Full"];

const userDefColumns = Array.from({ length: 10 }, (_, index) => {
  const num = index + 1;
  return `user_def${num}`;
});

const formOnlyFields = [...userDefColumns, "is_active"];

const Item = (props) => {
  const { permission } = useOutletContext();
  const [locale_id, setLocale_id] = useState(props.lang || "en");
  const [reportPreview, setReportPreview] = useState({
    open: false,
    title: "",
    reportCode: "",
    parameters: {},
  });
  // Holds the latest UOM rows loaded by the child grid
  const uomRowsRef = useRef([]);
  const [hasPrimaryUom, setHasPrimaryUom] = useState(false);

  useEffect(() => {
    setLocale_id(props.lang || "en");
  }, [props.lang]);

  const handlePrintSticker = useCallback(async (row) => {
    const itemNumber = row?.item_number;
    if (!itemNumber) {
      await BSAlertSwal2.show("warning", "Item Number is required.");
      return;
    }

    setReportPreview({
      open: true,
      title: `Print Sticker - ${itemNumber}`,
      reportCode: "StickerItemNumber",
      parameters: { item_number: itemNumber },
    });
  }, []);

  const handleReportPreviewClose = useCallback(() => {
    setReportPreview((prev) => ({ ...prev, open: false }));
  }, []);

  const trimStringFields = useCallback((data) => {
    if (!data || typeof data !== "object") return;

    Object.keys(data).forEach((key) => {
      if (typeof data[key] === "string") {
        data[key] = data[key].trim();
      }
    });
  }, []);

  // Called by UOM child grid before saving; returns false to cancel save
  const handleUomBeforeSave = useCallback(
    async ({ formData, mode, selectedRow }) => {
      trimStringFields(formData);

      if (mode === "add" && hasPrimaryUom && formData?.primary_uom == null) {
        formData.primary_uom = 0;
      }

      const newPrimary = formData?.primary_uom;
      // Only check when primary_uom is being set to true/1/"1"
      if (
        !newPrimary ||
        newPrimary === "0" ||
        newPrimary === 0 ||
        newPrimary === false
      ) {
        return true;
      }

      if (formData?.primary_uom) {
        formData.conversion_factor = 1;
      }

      // Resolve the item_master_id from formData or the current rows in ref
      // to scope the primary-UOM check to this item only.
      const itemMasterId =
        formData?.item_master_id ||
        selectedRow?.item_master_id ||
        uomRowsRef.current[0]?.item_master_id ||
        null;

      // Query the DB directly so we always get fresh data (avoids stale ref).
      let existingPrimaryFromDb = null;
      try {
        const currentKeyId = mode === "edit" ? selectedRow?.item_uom_id : null;

        // Build customWhere: primary_uom = 1, scoped to this item, excluding current row in edit mode
        let customWhere = `primary_uom = 1`;
        if (itemMasterId) {
          customWhere += ` AND item_master_id = '${itemMasterId}'`;
        }
        if (currentKeyId) {
          customWhere += ` AND item_uom_id <> '${currentKeyId}'`;
        }

        const resp = await AxiosMaster.post("/dynamic/bs-datagrid", {
          tableName: "t_inv_item_uom",
          schemaName: "inv",
          preObj: "inv",
          start: 0,
          end: 1,
          customWhere,
        });

        const rows = resp?.data?.rows || [];
        if (rows.length > 0) {
          // The API returns rows wrapped in { data: {...}, metadata: {...} }
          existingPrimaryFromDb = rows[0]?.data || rows[0];
        }
      } catch (_) {
        // If DB query fails, fall back to the in-memory ref
        const currentKeyId = mode === "edit" ? selectedRow?.item_uom_id : null;
        existingPrimaryFromDb = uomRowsRef.current.find(
          (row) =>
            row.item_uom_id !== currentKeyId &&
            (row.primary_uom === true ||
              row.primary_uom === 1 ||
              row.primary_uom === "1"),
        );
      }

      if (!existingPrimaryFromDb) {
        // No existing primary UOM for this item – allow save without confirmation
        return true;
      }

      const targetItemUomId = existingPrimaryFromDb.item_uom_id;
      //const uomLabel = existingPrimaryFromDb.uom || targetItemUomId || "Unknown";

      const confirmed = await BSAlertSwal2.fire({
        icon: "question",
        title: "เปลี่ยน Primary UOM?",
        html: `มีรายการ Primary UOM อยู่แล้ว!<br/>ต้องการตั้ง <b>${formData.uom}</b> เป็น Primary UOM ใหม่หรือไม่?`,
        showCancelButton: true,
        confirmButtonText: "ใช่, เปลี่ยน Primary UOM",
        cancelButtonText: "ยกเลิก",
        confirmButtonColor: "#1976d2",
        reverseButtons: true,
      });

      if (!confirmed.isConfirmed) return false;

      // Clear primary_uom on the existing primary record before saving the new one
      if (targetItemUomId) {
        try {
          await AxiosMaster.post("/dynamic/update", {
            tableName: "t_inv_item_uom",
            schemaName: "inv",
            data: { primary_uom: 0 },
            whereConditions: {
              item_uom_id: targetItemUomId,
            },
          });

          // Also sync the in-memory ref so the grid UI is consistent
          uomRowsRef.current = uomRowsRef.current.map((row) =>
            row.item_uom_id === targetItemUomId
              ? { ...row, primary_uom: 0 }
              : row,
          );
        } catch (err) {
          BSAlertSwal2.show("error", "ไม่สามารถล้าง Primary UOM เดิมได้");
          return false;
        }
      }

      return true;
    },
    [hasPrimaryUom, trimStringFields],
  );

  // ถ้าไม่มีการแก้ไข Control Settings แล้วก็ไม่ต้องเช็ค inventory ก็ได้ครับ จะได้ไม่ต้อง query database ทุกครั้งที่แก้ไข item

  // const handleInventoryBeforeSave = useCallback(
  //   async ({ formData, mode, selectedRow }) => {
  //     // หา item_master_id จาก formData หรือ selectedRow
  //     const itemMasterId =
  //       formData?.item_master_id || selectedRow?.item_master_id || null;

  //     if (!itemMasterId) {
  //       return true;
  //     }

  //     // ตรวจสอบว่ามีข้อมูล inventory ที่ผูกกับ item_master_id นี้หรือไม่
  //     let hasInventory = false;
  //     try {
  //       const customWhere = `item_master_id = '${itemMasterId}'`;
  //       const resp = await AxiosMaster.post("/dynamic/bs-datagrid", {
  //         tableName: "t_inv_inventory",
  //         schemaName: "inv",
  //         preObj: "inv",
  //         start: 0,
  //         end: 1,
  //         customWhere,
  //       });
  //       const rows = resp?.data?.rows || [];
  //       hasInventory = rows.length > 0;
  //     } catch (err) {
  //       // ถ้า query error ให้อนุญาต save (หรือจะ return false ก็ได้)
  //       return true;
  //     }

  //     if (hasInventory) {
  //       await BSAlertSwal2.fire({
  //         icon: "warning",
  //         title: "ไม่สามารถแก้ไข Control Settings",
  //         html: "มีข้อมูล Inventory ที่ผูกกับสินค้านี้อยู่<br/>ไม่อนุญาตให้แก้ไข Control Settings",
  //         confirmButtonText: "ตกลง",
  //         confirmButtonColor: "#d32f2f",
  //       });

  //       // รีเซ็ตค่า Control Settings กลับเป็นค่าก่อนหน้า (เฉพาะในโหมดแก้ไข)
  //       if (mode === "edit" && selectedRow) {
  //         formData.lot_control = selectedRow.lot_control;
  //         formData.expiry_date_control = selectedRow.expiry_date_control;
  //         formData.sn_control = selectedRow.sn_control;
  //         formData.min_qty = selectedRow.min_qty;
  //         formData.max_qty = selectedRow.max_qty;
  //       }

  //       return false;
  //     }

  //     return true;
  //   },handleInventoryBeforeSave
  //   [],
  // );

  const handleInventoryBeforeSave = useCallback(
    async ({ formData, mode, selectedRow }) => {
      trimStringFields(formData);

      const normalizeIsActive = (value) => {
        if (
          value === true ||
          value === 1 ||
          value === "1" ||
          value === "true"
        ) {
          return 1;
        }
        if (
          value === false ||
          value === 0 ||
          value === "0" ||
          value === "false"
        ) {
          return 0;
        }
        return null;
      };

      // Ensure required bit field is always sent to API for both add/edit modes.
      const currentIsActive =
        formData?.is_active ?? selectedRow?.is_active ?? 1;
      const normalizedIsActive = normalizeIsActive(currentIsActive);
      formData.is_active = normalizedIsActive ?? 1;

      const itemMasterId =
        formData?.item_master_id || selectedRow?.item_master_id || null;

      if (!itemMasterId) {
        return true;
      }

      // ✅ เช็คว่ามีการแก้ Control Settings จริงไหม
      const isControlChanged =
        formData.lot_control !== selectedRow?.lot_control ||
        formData.expiry_date_control !== selectedRow?.expiry_date_control ||
        formData.sn_control !== selectedRow?.sn_control ||
        formData.min_qty !== selectedRow?.min_qty ||
        formData.max_qty !== selectedRow?.max_qty;

      // 🔥 ถ้าไม่ได้แก้ → ไม่ต้อง query
      if (!isControlChanged) {
        return true;
      }

      // =========================
      // 🔽 ค่อย query เฉพาะตอนมีการแก้จริง
      // =========================
      let hasInventory = false;

      try {
        const customWhere = `item_master_id = '${itemMasterId}'`;
        const resp = await AxiosMaster.post("/dynamic/bs-datagrid", {
          tableName: "t_inv_inventory",
          schemaName: "inv",
          preObj: "inv",
          start: 0,
          end: 1,
          customWhere,
        });

        const rows = resp?.data?.rows || [];
        hasInventory = rows.length > 0;
      } catch (err) {
        return true;
      }

      if (hasInventory) {
        await BSAlertSwal2.fire({
          icon: "warning",
          title: "ไม่สามารถแก้ไข Control Settings",
          html: "มีข้อมูล Inventory ที่ผูกกับสินค้านี้อยู่<br/>ไม่อนุญาตให้แก้ไข Control Settings",
          confirmButtonText: "ตกลง",
          confirmButtonColor: "#d32f2f",
        });

        if (mode === "edit" && selectedRow) {
          formData.lot_control = selectedRow.lot_control;
          formData.expiry_date_control = selectedRow.expiry_date_control;
          formData.sn_control = selectedRow.sn_control;
          formData.min_qty = selectedRow.min_qty;
          formData.max_qty = selectedRow.max_qty;
        }

        return false;
      }

      return true;
    },
    [trimStringFields],
  );

  const handleInventoryItemCrossRef = useCallback(
    async ({ formData, mode, selectedRow }) => {
      trimStringFields(formData);

      // หา item_number ของรายการหลัก และ cross reference ที่กำลังบันทึก
      const itemNumber =
        formData?.item_number || selectedRow?.item_number || null;
      const crossRefItemNumber =
        formData?.alternate_item_number ||
        selectedRow?.alternate_item_number ||
        null;

      if (!itemNumber || !crossRefItemNumber) {
        return true;
      }

      // ไม่อนุญาตให้อ้างอิงตัวเอง
      if (String(itemNumber).trim() === String(crossRefItemNumber).trim()) {
        await BSAlertSwal2.fire({
          icon: "warning",
          title: "ไม่สามารถเพิ่ม Item Cross Reference ได้",
          html: "Item Number และ Alternate Item Number ต้องไม่เป็นค่าเดียวกัน",
          confirmButtonText: "ตกลง",
          confirmButtonColor: "#d32f2f",
        });
        return false;
      }

      const escapeSqlValue = (value) => String(value).replace(/'/g, "''");
      const crossRef = escapeSqlValue(crossRefItemNumber);

      // ตรวจ duplicate ตาม unique index ของ alternate_item_number
      // และกันกรณีคู่สลับ (A->B / B->A)
      let hasDuplicate = false;
      try {
        const customWhere = `item_number = '${crossRef}'   OR cross_ref_item_number = '${crossRef}'`;

        const resp = await AxiosMaster.post("/dynamic/bs-datagrid", {
          tableName: "v_inv_master_item_cross_ref",
          schemaName: "inv",
          preObj: "inv",
          start: 0,
          end: 1,
          customWhere,
        });
        const rows = resp?.data?.rows || [];
        hasDuplicate = rows.length > 0;
      } catch (err) {
        // ถ้า query error ให้อนุญาต save ไปก่อน
        return true;
      }

      if (hasDuplicate) {
        await BSAlertSwal2.fire({
          icon: "warning",
          title: "ไม่สามารถเพิ่ม Item Cross Reference ได้",
          html: "มีข้อมูล Alternate Item Number นี้อยู่แล้ว<br/>ไม่อนุญาตให้บันทึกข้อมูลซ้ำ",
          confirmButtonText: "ตกลง",
          confirmButtonColor: "#d32f2f",
        });
        return false;
      }

      return true;
    },
    [trimStringFields],
  );

  return (
    <Box>
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
          bsLocale={locale_id}
          bsPreObj="inv"
          bsObj="t_inv_item"
          // bsObjBy="create_date desc"
          bsObjBy="item_number asc"
          bsCols={[
            "item_master_id",
            "item_number",
            "description",
            "category_id",
            "item_category",
            "inventory_type",
            "lot_control",
            "expiry_date_control",
            "sn_control",
            "min_qty",
            "max_qty",
            ...userDefColumns,
            "is_active",
            // "create_by",
            // "create_date",
            // "update_by",
            // "update_date",
          ].join(",")}
          bsKeyId="item_master_id"
          bsPrimaryKeys={["item_number", "item_master_id"]}
          bsUniqueFields={[
            {
              field: "item_number",
              message: "Item Number already exists.",
            },
          ]}
          bsShowRowNumber={true}
          bsOnBeforeSave={handleInventoryBeforeSave}
          showAdd={permission?.is_add}
          bsVisibleEdit={permission?.is_edit}
          bsVisibleDelete={permission?.is_delete}
          bsAllowDelete={permission?.is_delete}
          bsVisibleView={permission?.is_view}
          // bsBulkMode={{
          //   enable: true,
          //   addInline: permission?.is_add,
          //   edit: false,
          //   delete: permission?.is_delete,
          //   add: permission?.is_add,
          // }}
          bsDialogSize="FullScreen"
          bsDialogColumns={4}
          bsParentRecordLabel="field:item_number|resource:Item Master"
          // bsColumnDefs={[
          //   { field: "create_date", width: 110, readOnly: true, hide: true },
          // ]}
          bsComboBox={[
            {
              Column: "category_id",
              Display: "item_category",
              Value: "category_id",
              Default: "--- Select Category ---",
              PreObj: "inv",
              Obj: "t_inv_category",
              ObjBy: "item_category asc",
              DropdownLazy: true, // Optional: use searchable BSAutoComplete instead of preloaded Select
            },
            {
              Column: "inventory_type",
              Display: "display_member",
              Value: "value_member",
              Default: "--- Select Inventory Type ---",
              PreObj: "sec",
              Obj: "t_com_combobox_item",
              ObjWh: "group_name = 'inventory_type'",
            },
            {
              Column: "lot_control",
              Display: "display_member",
              Value: "value_member",
              Default: "--- Select Lot Control ---",
              PreObj: "sec",
              Obj: "t_com_combobox_item",
              ObjWh: "group_name = 'item_control'",
            },
            {
              Column: "expiry_date_control",
              Display: "display_member",
              Value: "value_member",
              Default: "--- Select Expiry Date Control ---",
              PreObj: "sec",
              Obj: "t_com_combobox_item",
              ObjWh: "group_name = 'item_control'",
            },
            {
              Column: "sn_control",
              Display: "display_member",
              Value: "value_member",
              Default: "--- Select SN Control ---",
              PreObj: "sec",
              Obj: "t_com_combobox_item",
              ObjWh: "group_name = 'item_control'",
            },
          ]}
          bsDialogSection={[
            {
              Column: "item_number,category_id,inventory_type,description",
              name: "resource:Item Information",
              icon: <Inventory2OutlinedIcon sx={{ fontSize: 18 }} />,
            },
            {
              Column:
                "lot_control,expiry_date_control,sn_control,min_qty,max_qty",
              name: "resource:Control Settings",
              icon: <TuneOutlinedIcon sx={{ fontSize: 18 }} />,
            },
            {
              Column: userDefColumns.join(","),
              name: "resource:User Defined Fields",
              icon: <ExtensionOutlinedIcon sx={{ fontSize: 18 }} />,
            },
            {
              Column: "is_active",
              showHeader: false,
            },
          ]}
          bsChildGrids={[
            {
              name: "resource:Unit of Measure",
              bsPreObj: "inv",
              bsObj: "t_inv_item_uom",
              foreignKeys: ["item_number", "item_master_id"],
              bsObjBy: "sequence asc",
              bsCols: [
                "item_uom_id",
                "item_master_id",
                "item_number",
                "uom",
                "primary_uom",
                "conversion_factor",
                "sequence",
                "picking_class",
                "is_active",
                // "create_by",
                // "create_date",
                // "update_by",
                // "update_date",
              ].join(","),
              bsKeyId: "item_uom_id",
              bsUniqueFields: [
                {
                  fields: ["item_number", "uom"],
                  message: "UOM already exists for this item.",
                },
              ],
              bsShowRowNumber: true,
              showAdd: permission?.is_add,
              bsVisibleEdit: permission?.is_edit,
              bsVisibleDelete: permission?.is_delete,
              bsAllowDelete: permission?.is_delete,
              bsVisibleView: permission?.is_view,
              // bsBulkMode: {
              //   enable: true,
              //   addInline: permission?.is_add,
              //   edit: false,
              //   delete: permission?.is_delete,
              //   add: permission?.is_add,
              // },
              height: 420,
              bsDialogSize: "Large",
              bsDialogColumns: 4,
              onDataBind: (data) => {
                uomRowsRef.current = data || [];
                const rows = data || [];
                const foundPrimary = rows.some(
                  (row) =>
                    row.primary_uom === true ||
                    row.primary_uom === 1 ||
                    row.primary_uom === "1",
                );
                setHasPrimaryUom(foundPrimary);
              },
              bsOnBeforeSave: handleUomBeforeSave,
              bsComboBox: [
                {
                  Column: "picking_class",
                  Display: "display_member",
                  Value: "value_member",
                  Default: "--- Select Picking Class ---",
                  PreObj: "sec",
                  Obj: "t_com_combobox_item",
                  ObjWh: "group_name='picking_class' AND is_active=1",
                  ObjBy: "display_sequence asc",
                },
              ],
              bsDialogSection: [
                {
                  Column:
                    "uom,conversion_factor,sequence,picking_class,primary_uom,is_active",
                  name: "resource:Unit of Measure",
                  icon: <StraightenOutlinedIcon sx={{ fontSize: 18 }} />,
                },
              ],
              bsColumnDefs: [
                // { field: "item_uom_id", width: 110, readOnly: true },
                // { field: "item_master_id", hide: true, showInForm: false },
                // { field: "item_number", hide: true, showInForm: false },
                // { field: "uom", width: 100, required: true },
                // { field: "primary_uom", width: 110, showInAdd: true },
                // {
                //   field: "conversion_factor",
                //   width: 150,
                //   type: "number",
                //   defaultValue: 1,
                //   required: true,
                //   min: 1,
                //   showInAdd: true
                // },
                // { field: "sequence", width: 140, type: "number", min: 0 },
                // { field: "picking_class", width: 280 },
                // { field: "is_active", width: 90, defaultValue: 1 },
                { field: "item_uom_id", readOnly: true },
                { field: "item_master_id", hide: true, showInForm: false },
                { field: "item_number", hide: true, showInForm: false },
                { field: "uom", required: true },
                {
                  field: "primary_uom",
                  showInAdd: true,
                  defaultValue: hasPrimaryUom ? 0 : 1,
                },
                {
                  field: "conversion_factor",
                  type: "number",
                  defaultValue: 1,
                  required: true,
                  min: 1,
                  showInAdd: true,
                },
                { field: "sequence", type: "number", min: 0 },
                { field: "picking_class" },
                { field: "is_active", defaultValue: 1 },
              ],
            },
            {
              name: "resource:Item Cross Reference",
              bsPreObj: "inv",
              bsObj: "t_inv_item_cross_ref",
              foreignKeys: ["item_number", "item_master_id"],
              bsObjBy: "alternate_item_number asc",
              bsCols: [
                "item_cross_ref_id",
                "item_master_id",
                "item_number",
                "alternate_item_number",
                "is_active",
                // "create_by",
                // "create_date",
                // "update_by",
                // "update_date",
                // "rowversion",
              ].join(","),
              bsKeyId: "item_cross_ref_id",
              bsUniqueFields: [
                {
                  fields: ["item_number", "alternate_item_number"],
                  message:
                    "Alternate item number already exists for this item.",
                },
              ],
              bsShowRowNumber: true,
              showAdd: permission?.is_add,
              bsVisibleEdit: permission?.is_edit,
              bsVisibleDelete: permission?.is_delete,
              bsAllowDelete: permission?.is_delete,
              bsVisibleView: permission?.is_view,
              // bsBulkMode: {
              //   enable: true,
              //   addInline: permission?.is_add,
              //   edit: false,
              //   delete: permission?.is_delete,
              //   add: permission?.is_add,
              // },
              height: 420,
              bsDialogSize: "Large",
              bsDialogColumns: 4,
              onDataBind: (data) => {
                uomRowsRef.current = data || [];
              },
              bsOnBeforeSave: handleInventoryItemCrossRef,
              bsDialogSection: [
                {
                  Column: "alternate_item_number,is_active",
                  name: "resource:Item Cross Reference",
                  icon: <CompareArrowsOutlinedIcon sx={{ fontSize: 18 }} />,
                },
              ],
              bsColumnDefs: [
                // { field: "item_cross_ref_id", width: 120, readOnly: true },
                // { field: "item_master_id", hide: true, showInForm: false },
                // { field: "item_number", hide: true, showInForm: false },
                // {
                //   field: "alternate_item_number",
                //   width: 220,
                //   required: true,
                // },
                // { field: "is_active", width: 90 },
                // { field: "rowversion", hide: true, showInForm: false },
                // { field: "is_active", defaultValue: 1 },
                { field: "item_cross_ref_id", readOnly: true },
                { field: "item_master_id", hide: true, showInForm: false },
                { field: "item_number", hide: true, showInForm: false },
                {
                  field: "alternate_item_number",
                  required: true,
                },
                // { field: "is_active" },
                { field: "rowversion", hide: true, showInForm: false },
                { field: "is_active", defaultValue: 1 },
              ],
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
            {
              field: "item_master_id",
              // width: 110,
              readOnly: true,
              hideInForm: true,
            },
            { field: "item_category", hide: true, hideInForm: true },
            {
              field: "category_id",
              // width: 160,
              // headerName: "Item Category",
              required: true,
            },
            {
              field: "item_number",
              // width: 140,
              // headerName: "Item Number",
              required: true,
              showInAdd: true,
              readOnly: true,
            },
            {
              field: "description",
              width: 280,
              // headerName: "Description",
              required: true,
            },
            {
              field: "inventory_type",
              // width: 130,
              // headerName: "Inventory Type",
              type: "singleSelect",
              valueOptions: INVENTORY_TYPES,
              defaultValue: "Inventory",
            },
            {
              field: "lot_control",
              // width: 110,
              // headerName: "Lot Control",
              type: "singleSelect",
              valueOptions: CONTROL_VALUES,
              defaultValue: "None",
            },
            {
              field: "expiry_date_control",
              // width: 160,
              // headerName: "Expiry Date Control",
              type: "singleSelect",
              valueOptions: CONTROL_VALUES,
              defaultValue: "None",
            },
            {
              field: "sn_control",
              // width: 110,
              // headerName: "Serial Number Control",
              type: "singleSelect",
              valueOptions: CONTROL_VALUES,
              defaultValue: "None",
            },
            {
              field: "min_qty",
              // width: 90,
              type: "number",
              min: 0,
              defaultValue: 0,
            },
            {
              field: "max_qty",
              // width: 90,
              type: "number",
              min: 0,
              defaultValue: 0,
            },
            ...formOnlyFields.map((field) => {
              // const isUserDefinedField = field.startsWith("user_def");
              const userDefMatch = field.match(/^user_def(\d+)$/);
              const userDefNum = userDefMatch ? Number(userDefMatch[1]) : null;
              const isDecimal = userDefNum === 7 || userDefNum === 8;
              const isDate = userDefNum === 9 || userDefNum === 10;
              const isActiveField = field === "is_active";

              return {
                field,
                hide: true,
                showInForm: true,
                ...(isActiveField && { defaultValue: 1 }),
                ...(userDefNum && {
                  headerName: `User Def ${userDefNum}${isDecimal ? " (Decimal)" : isDate ? " (Date)" : ""}`,
                }),
                ...(isDecimal && { type: "decimal" }),
                ...(isDate && { type: "date" }),
              };
            }),
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

export default Item;
