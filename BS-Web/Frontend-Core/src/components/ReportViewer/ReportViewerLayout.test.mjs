import assert from "node:assert/strict";
import test from "node:test";
import {
  getReportPreviewSx,
  getReportViewerRootSx,
} from "./ReportViewerLayout.mjs";

test("routed reports expand the main scroll area", () => {
  assert.partialDeepStrictEqual(
    getReportViewerRootSx(false),
    {
      position: "relative",
      height: "auto",
      minHeight: "100%",
      overflow: "visible",
    },
  );
  assert.partialDeepStrictEqual(
    getReportPreviewSx(false),
    {
      flex: "0 0 auto",
      minHeight: 680,
    },
  );
});

test("embedded reports remain constrained to their dialog", () => {
  assert.partialDeepStrictEqual(
    getReportViewerRootSx(true),
    {
      height: "100%",
      minHeight: 0,
      overflow: "hidden",
    },
  );
  assert.partialDeepStrictEqual(
    getReportPreviewSx(true),
    {
      flex: 1,
      minHeight: 0,
    },
  );
});
