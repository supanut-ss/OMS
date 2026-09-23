import assert from "node:assert/strict";
import test from "node:test";
import {
  getReportFilterResourceKeys,
  resolveReportFilterText,
  resolveReportViewerLocale,
} from "./ReportViewerResource.mjs";

test("uses report code and parameter name as the default resource key", () => {
  assert.deepEqual(
    getReportFilterResourceKeys({
      reportCode: "InboundReceipt",
      parameterName: "inbound_order",
    }),
    {
      group: "InboundReceipt",
      name: "inbound_order",
    },
  );
});

test("uses ReportViewer resources with locale text as fallback", () => {
  const getResource = (_group, name, lang) => ({
    resource_value:
      name === "rendering" && lang === "th"
        ? "กำลังจัดทำรายงาน..."
        : name === "noReportDataFound" && lang === "th"
          ? "ไม่พบข้อมูลตามเงื่อนไขที่เลือก"
          : name,
  });

  assert.deepEqual(
    resolveReportViewerLocale(
      {
        rendering: "Generating report...",
        noReportDataFound: "No data found for the selected filters.",
        required: "Required",
      },
      "th",
      getResource,
    ),
    {
      rendering: "กำลังจัดทำรายงาน...",
      noReportDataFound: "ไม่พบข้อมูลตามเงื่อนไขที่เลือก",
      required: "Required",
    },
  );
});

test("localizes report filter label and placeholder with literal fallback", () => {
  const filter = {
    reportCode: "InboundReceipt",
    parameterName: "inbound_order",
    label: "Inbound Order",
    placeholder: "Inbound order no.",
  };
  const getResource = (group, name, lang) => ({
    resource_value:
      group === "InboundReceipt" &&
      name === "inbound_order" &&
      lang === "th"
        ? "เอกสารรับเข้า"
        : name,
    resource_description:
      group === "InboundReceipt" &&
      name === "inbound_order" &&
      lang === "th"
        ? "เลือกเลขที่เอกสารรับเข้า"
        : name,
  });

  assert.deepEqual(resolveReportFilterText(filter, "th", getResource), {
    label: "เอกสารรับเข้า",
    placeholder: "เลือกเลขที่เอกสารรับเข้า",
  });

  assert.deepEqual(resolveReportFilterText(filter, "en", getResource), {
    label: "Inbound Order",
    placeholder: "Inbound order no.",
  });
});
