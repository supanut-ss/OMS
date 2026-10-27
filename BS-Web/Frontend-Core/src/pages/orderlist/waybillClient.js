import AxiosMaster from "../../utils/AxiosMaster";
import { normalizeOrderPlatform } from "./OrderStatusProgress";

const buildOrderPath = (order) => {
  const platform = normalizeOrderPlatform(order?.platform);
  const orderId = String(order?.platform_order_id || "").trim();
  const shopId = String(order?.shop_id || "").trim();

  if (!platform || !orderId || !shopId) {
    throw new Error("Platform, Shop ID และเลข Order ต้องมีค่าครบก่อนดึง Waybill");
  }

  return {
    path: `/oms-orders/${encodeURIComponent(platform)}/${encodeURIComponent(orderId)}/waybills`,
    shopId,
  };
};

export const unwrapWaybillResponse = (response) => {
  const payload = response?.data;
  const documents = payload?.data ?? payload?.Data ?? [];
  return {
    documents: Array.isArray(documents) ? documents : [],
    message: payload?.message ?? payload?.Message ?? "",
  };
};

export const getWaybills = async (order) => {
  const { path, shopId } = buildOrderPath(order);
  return AxiosMaster.get(path, { params: { shopId } });
};

export const ensureWaybills = async (order) => {
  const { path, shopId } = buildOrderPath(order);
  return AxiosMaster.post(`${path}/ensure`, null, { params: { shopId } });
};

const readBlobError = async (error) => {
  const responseData = error?.response?.data;
  if (responseData instanceof Blob) {
    try {
      const parsed = JSON.parse(await responseData.text());
      return parsed?.message || parsed?.Message;
    } catch {
      return null;
    }
  }
  return responseData?.message || responseData?.Message || error?.message;
};

export const openWaybillForPrint = async (order, document) => {
  const previewWindow = window.open("", "_blank");
  if (!previewWindow) {
    throw new Error("เบราว์เซอร์บล็อกหน้าต่างพิมพ์ กรุณาอนุญาต Pop-up แล้วลองใหม่");
  }
  previewWindow.opener = null;
  previewWindow.document.title = "Preparing Waybill";
  previewWindow.document.body.textContent = "Preparing Waybill...";

  try {
    const { path, shopId } = buildOrderPath(order);
    const response = await AxiosMaster.get(`${path}/file`, {
      params: {
        shopId,
        packageId: document?.platformPackageId ?? document?.PlatformPackageId ?? undefined,
        markPrinted: true,
      },
      responseType: "blob",
    });
    const url = URL.createObjectURL(response.data);
    previewWindow.location.replace(url);
    window.setTimeout(() => URL.revokeObjectURL(url), 5 * 60 * 1000);
  } catch (error) {
    previewWindow.close();
    const message = await readBlobError(error);
    throw new Error(message || "เปิดไฟล์ Waybill ไม่สำเร็จ");
  }
};
