import { Alert, Box, Button, Paper, Snackbar } from "@mui/material";
import { useCallback, useState } from "react";
import BSDataGrid from "../../components/BSDataGrid";
import { useOutletContext } from "react-router-dom";
import AxiosMaster from "../../utils/AxiosMaster";

const SyncLog = ({ lang = "th" }) => {
  const { permission } = useOutletContext();
  const thai = lang === "th";
  const [busyOrderIds, setBusyOrderIds] = useState(() => new Set());
  const [notice, setNotice] = useState(null);
  const [gridVersion, setGridVersion] = useState(0);

  const handleResync = useCallback(
    async (row) => {
      const status = String(row?.run_status ?? "")
        .trim()
        .toUpperCase();
      if (status !== "ERROR") return;

      const platform = String(row.platform ?? "")
        .trim()
        .toLowerCase();
      const orderId = String(row.platform_order_id ?? "").trim();
      if (!platform || !orderId) {
        setNotice({
          severity: "error",
          message: thai
            ? "ข้อมูลแพลตฟอร์มหรือเลขออเดอร์ไม่ครบ"
            : "Platform or order number is missing.",
        });
        return;
      }

      const requestKey = `${platform}:${orderId}`;
      setBusyOrderIds((current) => new Set(current).add(requestKey));
      try {
        const response = await AxiosMaster.get(
          `/oms-orders/${encodeURIComponent(platform)}/${encodeURIComponent(orderId)}/resync`,
          { params: row.shop_id ? { shopId: row.shop_id } : undefined },
        );
        if (
          response.data?.success === false ||
          response.data?.Success === false
        ) {
          throw new Error(
            response.data?.message ||
              response.data?.Message ||
              "Resync failed.",
          );
        }
        setNotice({
          severity: "success",
          message: thai
            ? "ดึงข้อมูลออเดอร์ใหม่สำเร็จ"
            : "Order fetched again successfully.",
        });
        setGridVersion((version) => version + 1);
      } catch (error) {
        setNotice({
          severity: "error",
          message:
            error?.response?.data?.message ||
            error?.response?.data?.Message ||
            error?.message ||
            (thai
              ? "ดึงข้อมูลออเดอร์ใหม่ไม่สำเร็จ"
              : "Could not fetch the order again."),
        });
      } finally {
        setBusyOrderIds((current) => {
          const next = new Set(current);
          next.delete(requestKey);
          return next;
        });
      }
    },
    [thai],
  );

  return (
    <Box sx={{ height: "100%", minHeight: 0 }}>
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
          key={gridVersion}
          bsLocale={lang}
          bsPreObj="oms"
          bsObj="vw_oms_order_sync_history"
          bsObjBy="detail_create_date desc"
          // bsObjWh="run_status IS NULL OR UPPER(run_status) NOT IN ('SUCCESS', 'SUCCEEDED', 'SYNCED', 'COMPLETED')"
          bsCols={[
            "sync_log_detail_id",
            "sync_log_id",
            "platform",
            "shop_id",
            "platform_order_id",
            "action",
            "run_status",
            "display_message",
            "detail_message",
            "run_error_message",
            "detail_create_date",
          ].join(",")}
          bsKeyId="sync_log_detail_id"
          bsShowRowNumber
          showAdd={false}
          bsVisibleEdit={false}
          bsVisibleDelete={false}
          bsAllowDelete={false}
          bsVisibleView={permission?.is_view}
          bsColumnDefs={[
            { field: "sync_log_detail_id", hide: true },
            { field: "sync_log_id", hide: true },
            {
              field: "detail_create_date",
              headerName: thai ? "เวลา" : "Time",
              width: 120,
              type: "dateTime",
              timeFormat: "HH:mm",
              readOnly: true,
            },
            {
              field: "platform",
              headerName: "Platform",
              width: 140,
              sortable: true,
              align: "center",
              headerAlign: "center",
              renderCell: ({ value }) => {
                const platform = String(value ?? "")
                  .trim()
                  .toLowerCase();
                const logoByPlatform = {
                  shopee: { file: "shopee.svg", label: "Shopee", width: 30 },
                  lazada: { file: "lazada.svg", label: "Lazada", width: 38 },
                  tiktok: { file: "tiktok.svg", label: "TikTok", width: 30 },
                };
                const logo = logoByPlatform[platform];

                return logo ? (
                  <Box
                    component="img"
                    src={`${process.env.PUBLIC_URL}/platform-logos/${logo.file}`}
                    alt={logo.label}
                    title={logo.label}
                    sx={{
                      width: logo.width,
                      height: 24,
                      objectFit: "contain",
                      mx: "auto",
                    }}
                  />
                ) : (
                  value || "—"
                );
              },
              readOnly: true,
            },
            {
              field: "platform_order_id",
              headerName: thai ? "เลขที่คำสั่งซื้อ" : "Order Number",
              width: 180,
              readOnly: true,
            },
            {
              field: "action",
              headerName: "Stage",
              width: 130,
              readOnly: true,
            },
            {
              field: "run_status",
              headerName: thai ? "สถานะ" : "Status",
              width: 120,
              readOnly: true,
            },
            {
              field: "display_message",
              headerName: thai ? "รายละเอียด Error" : "Error Details",
              minWidth: 320,
              flex: 1,
              renderCell: ({ row }) =>
                row.display_message ||
                row.detail_message ||
                row.run_error_message ||
                "—",
              readOnly: true,
            },
            // {
            //   field: "retry_count",
            //   customColumn: true,
            //   headerName: "Retry",
            //   width: 80,
            //   sortable: false,
            //   filterable: false,
            //   align: "center",
            //   headerAlign: "center",
            //   renderCell: () => "—",
            //   readOnly: true,
            //   visible: false,
            // },
            {
              field: "resync_action",
              customColumn: true,
              headerName: "",
              width: 100,
              sortable: false,
              filterable: false,
              renderCell: ({ row }) => {
                const isError =
                  String(row.run_status ?? "")
                    .trim()
                    .toUpperCase() === "ERROR";
                const requestKey = `${String(row.platform ?? "")
                  .trim()
                  .toLowerCase()}:${String(row.platform_order_id ?? "").trim()}`;
                const isBusy = busyOrderIds.has(requestKey);
                return (
                  <Button
                    size="small"
                    variant="contained"
                    disabled={!isError || isBusy}
                    onClick={() => handleResync(row)}
                    sx={{
                      minWidth: 0,
                      px: 1.25,
                      py: 0.35,
                      textTransform: "none",
                    }}
                  >
                    {isBusy ? (thai ? "กำลังดึง..." : "Loading…") : "Resync"}
                  </Button>
                );
              },
              readOnly: true,
            },
          ]}
        />
      </Paper>
      <Snackbar
        open={Boolean(notice)}
        autoHideDuration={5000}
        onClose={() => setNotice(null)}
      >
        <Alert
          onClose={() => setNotice(null)}
          severity={notice?.severity || "info"}
          variant="filled"
        >
          {notice?.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default SyncLog;
