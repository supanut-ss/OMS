import React, { useState, useRef, useEffect, useLayoutEffect } from "react";
import {
  Box,
  Typography,
  TextField,
  IconButton,
  Button,
  Popover,
  Dialog,
  Paper,
  Divider,
  Tooltip,
  Snackbar,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import {
  Send as SendIcon,
  // SmartToy as SmartToyIcon,
  Person as PersonIcon,
  Download as DownloadIcon,
  Check as CheckIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  OpenInFull as OpenInFullIcon,
  CloseFullscreen as CloseFullscreenIcon,
  Close as CloseIcon,
  DragIndicator as DragIndicatorIcon,
  InfoOutlined as InfoOutlinedIcon,
  AttachFile as AttachFileIcon,
  Image as ImageIcon,
  Mic as MicIcon,
  Stop as StopIcon,
} from "@mui/icons-material";
import Config from "../utils/Config";
import SecureStorage from "../utils/SecureStorage";
import aiBotImg from "../assets/images/ai_bot.png";
import aiBotThinkingImg from "../assets/images/ai_bot_thinking.png";
import aiChatBotImg from "../assets/images/ai_chat_bot_head.png";
import aiChatBotThinkingImg from "../assets/images/ai_chat_bot_head_thinking.png";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { motion } from "framer-motion";
// Reset chat and suggestions when process (menu/page) changes

const getTimeStr = () =>
  new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

const renderInlineText = (line, keyPrefix) => {
  const segments = line.split(/(\*\*.+?\*\*|`[^`]+`)/g);

  return segments.map((segment, segmentIndex) => {
    const boldMatch = segment.match(/^\*\*(.+?)\*\*$/);
    if (boldMatch) {
      return (
        <Box
          key={`${keyPrefix}-seg-${segmentIndex}`}
          component="span"
          sx={{ fontWeight: 700 }}
        >
          {boldMatch[1]}
        </Box>
      );
    }

    const codeMatch = segment.match(/^`(.+?)`$/);
    if (codeMatch) {
      return (
        <Box
          key={`${keyPrefix}-seg-${segmentIndex}`}
          component="code"
          sx={{
            fontFamily: "'Fira Code', 'Roboto Mono', monospace",
            fontSize: "0.78rem",
            px: 0.6,
            py: 0.1,
            borderRadius: "6px",
            bgcolor: "action.hover",
          }}
        >
          {codeMatch[1]}
        </Box>
      );
    }

    return (
      <React.Fragment key={`${keyPrefix}-seg-${segmentIndex}`}>
        {segment}
      </React.Fragment>
    );
  });
};

const parseMarkdownTableRow = (line) => {
  const trimmed = line.trim();
  if (!trimmed.includes("|")) return null;

  const normalized = trimmed.replace(/^\|/, "").replace(/\|$/, "");
  const cells = normalized.split("|").map((cell) => cell.trim());

  if (cells.length < 2) return null;
  return cells;
};
const isMarkdownSeparatorRow = (cells) =>
  cells.every((cell) => /^:?-{3,}:?$/.test(cell));

const renderFormattedMessage = (text) => {
  const normalizedText = String(text ?? "").replace(/\\n|\/n/g, "\n");
  const lines = normalizedText.split("\n");
  const blocks = [];

  for (let i = 0; i < lines.length; i += 1) {
    const rawLine = lines[i];
    const line = rawLine.trim();

    if (!line) {
      blocks.push(<Box key={`empty-${i}`} sx={{ height: 6 }} />);
      continue;
    }

    const tableHeader = parseMarkdownTableRow(line);
    if (tableHeader) {
      const tableRows = [tableHeader];
      let cursor = i + 1;

      while (cursor < lines.length) {
        const candidate = lines[cursor].trim();

        if (!candidate) {
          cursor += 1;
          continue;
        }

        const parsed = parseMarkdownTableRow(candidate);
        if (!parsed) break;

        tableRows.push(parsed);
        cursor += 1;
      }

      if (tableRows.length >= 2 && isMarkdownSeparatorRow(tableRows[1])) {
        const headerCells = tableRows[0];
        const bodyRows = tableRows.slice(2);

        blocks.push(
          <TableContainer
            key={`table-${i}`}
            sx={{
              borderRadius: 1.5,
              border: "1px solid",
              borderColor: "divider",
              bgcolor: "background.paper",
              overflowX: "auto",
              my: 0.3,
            }}
          >
            <Table size="small" sx={{ minWidth: 320 }}>
              <TableHead>
                <TableRow>
                  {headerCells.map((cell, cellIndex) => (
                    <TableCell
                      key={`table-${i}-head-${cellIndex}`}
                      sx={{
                        fontWeight: 700,
                        fontSize: "0.78rem",
                        bgcolor: "action.hover",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {renderInlineText(cell, `table-${i}-head-${cellIndex}`)}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {bodyRows.map((row, rowIndex) => (
                  <TableRow key={`table-${i}-row-${rowIndex}`}>
                    {headerCells.map((_, colIndex) => (
                      <TableCell
                        key={`table-${i}-cell-${rowIndex}-${colIndex}`}
                        sx={{ fontSize: "0.78rem", verticalAlign: "top" }}
                      >
                        {renderInlineText(
                          row[colIndex] ?? "",
                          `table-${i}-cell-${rowIndex}-${colIndex}`,
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>,
        );

        i = cursor - 1;
        continue;
      }
    }

    const headingMatch = line.match(/^(#{1,3})\s+(.+)$/);
    if (headingMatch) {
      const headingLevel = headingMatch[1].length;
      const headingText = headingMatch[2];
      const headingSize =
        headingLevel === 1
          ? "1rem"
          : headingLevel === 2
            ? "0.93rem"
            : "0.88rem";

      blocks.push(
        <Typography
          key={`heading-${i}`}
          component="div"
          sx={{
            fontWeight: 700,
            fontSize: headingSize,
            mt: 0.4,
            mb: 0.4,
            lineHeight: 1.5,
          }}
        >
          {renderInlineText(headingText, `heading-${i}`)}
        </Typography>,
      );
      continue;
    }

    const unorderedMatch = line.match(/^[-*•]\s+(.+)$/);
    if (unorderedMatch) {
      const items = [];
      let cursor = i;

      while (cursor < lines.length) {
        const candidate = lines[cursor].trim();
        const match = candidate.match(/^[-*•]\s+(.+)$/);
        if (!match) break;
        items.push(match[1]);
        cursor += 1;
      }

      blocks.push(
        <Box
          key={`ul-${i}`}
          component="ul"
          sx={{ m: 0, pl: 2.3, lineHeight: 1.7 }}
        >
          {items.map((item, idx) => (
            <Box key={`ul-${i}-item-${idx}`} component="li">
              {renderInlineText(item, `ul-${i}-item-${idx}`)}
            </Box>
          ))}
        </Box>,
      );

      i = cursor - 1;
      continue;
    }

    const orderedMatch = line.match(/^\d+\.\s+(.+)$/);
    if (orderedMatch) {
      const items = [];
      let cursor = i;

      while (cursor < lines.length) {
        const candidate = lines[cursor].trim();
        const match = candidate.match(/^\d+\.\s+(.+)$/);
        if (!match) break;
        items.push(match[1]);
        cursor += 1;
      }

      blocks.push(
        <Box
          key={`ol-${i}`}
          component="ol"
          sx={{ m: 0, pl: 2.5, lineHeight: 1.7 }}
        >
          {items.map((item, idx) => (
            <Box key={`ol-${i}-item-${idx}`} component="li">
              {renderInlineText(item, `ol-${i}-item-${idx}`)}
            </Box>
          ))}
        </Box>,
      );

      i = cursor - 1;
      continue;
    }

    blocks.push(
      <Typography
        key={`p-${i}`}
        component="div"
        variant="body2"
        sx={{ lineHeight: 1.72, fontSize: "0.85rem" }}
      >
        {renderInlineText(rawLine, `p-${i}`)}
      </Typography>,
    );
  }

  return blocks;
};

const sanitizeExportText = (value) =>
  String(value ?? "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/`(.+?)`/g, "$1")
    .replace(/\[(.+?)\]\((.+?)\)/g, "$1")
    .replace(/<[^>]+>/g, "")
    .trim();

const extractResponseTableData = (text) => {
  const lines = String(text ?? "")
    .split("\n")
    .map((line) => line.trim());

  for (let i = 0; i < lines.length - 1; i += 1) {
    const headerCells = parseMarkdownTableRow(lines[i]);
    const separatorCells = parseMarkdownTableRow(lines[i + 1]);

    if (
      headerCells &&
      separatorCells &&
      headerCells.length === separatorCells.length &&
      isMarkdownSeparatorRow(separatorCells)
    ) {
      const rows = [];
      let cursor = i + 2;

      while (cursor < lines.length) {
        const rowCells = parseMarkdownTableRow(lines[cursor]);
        if (!rowCells || rowCells.length !== headerCells.length) break;
        rows.push(rowCells);
        cursor += 1;
      }

      // Require at least one body row to treat this as exportable table.
      if (!rows.length) return null;

      return {
        headerLabels: headerCells.map((cell) => sanitizeExportText(cell)),
        rows: rows.map((row) => row.map((cell) => sanitizeExportText(cell))),
      };
    }
  }

  return null;
};

const extractReportTitleFromResponse = (text) => {
  const lines = String(text ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];

    const headingMatch = line.match(/^#{1,3}\s+(.+)$/);
    if (headingMatch) return headingMatch[1].trim();

    // Skip markdown table rows and separators when searching title.
    if (parseMarkdownTableRow(line)) continue;

    const cleaned = line
      .replace(/^[-*•]\s+/, "")
      .replace(/^\d+\.\s+/, "")
      .replace(/^\*\*(.+)\*\*$/, "$1")
      .trim();

    if (cleaned) return cleaned;
  }

  return "";
};

const toCsvCell = (value) => {
  if (value === null || value === undefined) return "";
  const raw = typeof value === "object" ? JSON.stringify(value) : String(value);
  const escaped = raw.replace(/"/g, '""');
  return `"${escaped}"`;
};

const toCsvText = (headerLabels, rows) => {
  const header = headerLabels.map((label) => toCsvCell(label)).join(",");
  const body = rows.map((row) => row.map((cell) => toCsvCell(cell)).join(","));
  return [header, ...body].join("\n");
};

const getReportCellValue = (row, column) => {
  if (!row || typeof row !== "object" || Array.isArray(row)) {
    return undefined;
  }

  if (Object.prototype.hasOwnProperty.call(row, column)) {
    return row[column];
  }

  const matchedKey = Object.keys(row).find(
    (key) => key.toLowerCase() === String(column).toLowerCase(),
  );

  return matchedKey ? row[matchedKey] : undefined;
};

const toDisplayCellText = (value) => {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return sanitizeExportText(value);

  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }

  return String(value);
};

const parseArrayOrEmpty = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
};

const normalizeDataRows = (dataRows) => {
  const rawRows = parseArrayOrEmpty(dataRows);
  if (!rawRows.length) return null;

  const firstObjectRow = rawRows.find(
    (row) => row && typeof row === "object" && !Array.isArray(row),
  );
  const columns = firstObjectRow
    ? Object.keys(firstObjectRow).map((column) => ({
        key: column,
        label: sanitizeExportText(column),
      }))
    : [];

  if (!columns.length) {
    return null;
  }

  return {
    headerLabels: columns.map(
      (column, index) => column.label || `Column ${index + 1}`,
    ),
    rows: rawRows.map((row) => {
      if (row && typeof row === "object" && !Array.isArray(row)) {
        return columns.map((column) =>
          toDisplayCellText(getReportCellValue(row, column.key)),
        );
      }

      return columns.map((_, index) =>
        index === 0 ? toDisplayCellText(row) : "",
      );
    }),
  };
};

const normalizeReportData = (reportData) => {
  const payload = parseObjectOrEmpty(reportData);
  const rawColumns = Array.isArray(payload.columns)
    ? payload.columns
    : Array.isArray(payload.Columns)
      ? payload.Columns
      : [];
  const rawRows = Array.isArray(payload.rows)
    ? payload.rows
    : Array.isArray(payload.Rows)
      ? payload.Rows
      : [];
  const columns =
    rawColumns.length > 0
      ? rawColumns
      : rawRows.length > 0 &&
          rawRows[0] &&
          typeof rawRows[0] === "object" &&
          !Array.isArray(rawRows[0])
        ? Object.keys(rawRows[0])
        : [];

  if (!columns.length || !rawRows.length) {
    return null;
  }

  return {
    headerLabels: columns.map(
      (column, index) => sanitizeExportText(column) || `Column ${index + 1}`,
    ),
    rows: rawRows.map((row) => {
      if (Array.isArray(row)) {
        return columns.map((_, index) => toDisplayCellText(row[index]));
      }

      if (row && typeof row === "object") {
        return columns.map((column) =>
          toDisplayCellText(getReportCellValue(row, column)),
        );
      }

      return columns.map((_, index) =>
        index === 0 ? toDisplayCellText(row) : "",
      );
    }),
  };
};

const normalizePrimaryTableData = (dataRows, reportData) =>
  normalizeDataRows(dataRows) || normalizeReportData(reportData);

const renderStructuredResponseTable = (tableData, keyPrefix) => {
  if (!tableData) return null;

  const { headerLabels, rows } = tableData;

  return (
    <TableContainer
      key={keyPrefix}
      sx={{
        borderRadius: 1.5,
        border: "1px solid",
        borderColor: "divider",
        bgcolor: "background.paper",
        overflowX: "auto",
        my: 0.3,
      }}
    >
      <Table size="small" sx={{ minWidth: 320 }}>
        <TableHead>
          <TableRow>
            {headerLabels.map((label, cellIndex) => (
              <TableCell
                key={`${keyPrefix}-head-${cellIndex}`}
                sx={{
                  fontWeight: 700,
                  fontSize: "0.78rem",
                  bgcolor: "action.hover",
                  whiteSpace: "nowrap",
                }}
              >
                {renderInlineText(label, `${keyPrefix}-head-${cellIndex}`)}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row, rowIndex) => (
            <TableRow key={`${keyPrefix}-row-${rowIndex}`}>
              {headerLabels.map((_, colIndex) => (
                <TableCell
                  key={`${keyPrefix}-cell-${rowIndex}-${colIndex}`}
                  sx={{ fontSize: "0.78rem", verticalAlign: "top" }}
                >
                  {renderInlineText(
                    row[colIndex] ?? "",
                    `${keyPrefix}-cell-${rowIndex}-${colIndex}`,
                  )}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

const normalizeExportData = (responseText, dataRows, reportData) => {
  const structuredData = normalizePrimaryTableData(dataRows, reportData);
  if (structuredData) return structuredData;

  const tableData = extractResponseTableData(responseText);
  if (tableData) return tableData;

  return null;
};

const canShowExportButtons = (responseText, dataRows, reportData) =>
  normalizeExportData(responseText, dataRows, reportData) !== null;

const parseBool = (value) => value === true || value === 1 || value === "true";

const parseObjectOrEmpty = (value) => {
  if (!value) return {};
  if (typeof value === "object" && !Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed;
      }
    } catch {
      // ignore malformed JSON
    }
  }
  return {};
};

const normalizeBusinessText = (value) =>
  String(value ?? "")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const hasBusinessPlanContent = (plan) =>
  Boolean(
    normalizeBusinessText(plan?.target || plan?.Target) ||
    normalizeBusinessText(plan?.activity || plan?.Activity) ||
    normalizeBusinessText(
      plan?.data_summary || plan?.dataSummary || plan?.DataSummary,
    ) ||
    normalizeBusinessText(plan?.reference || plan?.Reference),
  );

const prettyBusinessActivity = (action, lang) => {
  const normalized = String(action || "")
    .trim()
    .toLowerCase();

  if (lang === "th") {
    if (normalized === "insert") return "เพิ่มรายการใหม่";
    if (normalized === "update") return "ปรับปรุงข้อมูลรายการ";
    if (normalized === "delete") return "ยกเลิกการใช้งานรายการ";
    return "ดำเนินการกับรายการนี้";
  }

  if (normalized === "insert") return "Create a new record";
  if (normalized === "update") return "Update the selected record";
  if (normalized === "delete") return "Deactivate the selected record";
  return "Process this record";
};

const isCrudProposalAction = (action) => {
  const normalized = String(action || "")
    .trim()
    .toLowerCase();

  return (
    normalized === "insert" ||
    normalized === "update" ||
    normalized === "delete"
  );
};

const buildProposalBusinessPlan = ({
  businessPlan,
  action,
  fields,
  where,
  responseText,
  lang,
}) => {
  const referenceCandidates = [
    ...Object.values(where || {}),
    ...Object.values(fields || {}),
  ]
    .map((value) => {
      if (value && typeof value === "object" && !Array.isArray(value)) {
        return "";
      }

      return normalizeBusinessText(
        Array.isArray(value) ? value.join(", ") : value,
      );
    })
    .filter((value) => Boolean(value))
    .slice(0, 3);

  const nextPlan = {
    target:
      normalizeBusinessText(businessPlan?.target || businessPlan?.Target) ||
      (lang === "th" ? "ข้อมูลรายการนี้" : "This business record"),
    activity:
      normalizeBusinessText(businessPlan?.activity || businessPlan?.Activity) ||
      prettyBusinessActivity(action, lang),
    dataSummary:
      normalizeBusinessText(
        businessPlan?.data_summary ||
          businessPlan?.dataSummary ||
          businessPlan?.DataSummary,
      ) ||
      normalizeBusinessText(responseText) ||
      (lang === "th"
        ? "ระบบเตรียมดำเนินการตามรายการนี้"
        : "The system is ready to perform this action."),
    reference:
      normalizeBusinessText(
        businessPlan?.reference || businessPlan?.Reference,
      ) ||
      (referenceCandidates.length > 0
        ? lang === "th"
          ? `อ้างอิงจาก ${referenceCandidates.join(", ")}`
          : `Based on ${referenceCandidates.join(", ")}`
        : lang === "th"
          ? "อ้างอิงจากรายการที่เลือก"
          : "Based on the selected record"),
  };

  return hasBusinessPlanContent(nextPlan) ? nextPlan : null;
};

const normalizeProposalStatus = (value) => {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();
  if (normalized === "confirmed") return "confirmed";
  if (normalized === "confirming") return "confirming";
  if (normalized === "rejecting") return "rejecting";
  if (normalized === "failed") return "failed";
  if (normalized === "rejected") return "rejected";
  return "pending";
};

const getProposalStatusMeta = (status, lang) => {
  const normalized = normalizeProposalStatus(status);
  if (normalized === "confirmed") {
    return {
      label: lang === "th" ? "ยืนยันแล้ว" : "Confirmed",
      paletteKey: "success",
    };
  }
  if (normalized === "confirming") {
    return {
      label: lang === "th" ? "กำลังบันทึก" : "Saving",
      paletteKey: "info",
    };
  }
  if (normalized === "rejecting") {
    return {
      label: lang === "th" ? "กำลังยกเลิก" : "Cancelling",
      paletteKey: "warning",
    };
  }
  if (normalized === "failed") {
    return {
      label: lang === "th" ? "ล้มเหลว" : "Failed",
      paletteKey: "error",
    };
  }
  if (normalized === "rejected") {
    return {
      label: lang === "th" ? "ถูกปฏิเสธ" : "Rejected",
      paletteKey: "warning",
    };
  }
  return {
    label: lang === "th" ? "รอยืนยัน" : "Pending",
    paletteKey: "warning",
  };
};

const DEFAULT_POPOVER_WIDTH = 400;
const MIN_POPOVER_WIDTH = 340;
const MIN_POPOVER_HEIGHT = 360;
const POPOVER_SCREEN_GAP = 12;

const getCompactPopoverTop = () =>
  typeof window !== "undefined" && window.innerWidth < 600 ? 56 : 64;

const getDefaultPopoverHeight = () =>
  typeof window === "undefined"
    ? 640
    : Math.max(
        MIN_POPOVER_HEIGHT,
        window.innerHeight - getCompactPopoverTop() - POPOVER_SCREEN_GAP,
      );

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const normalizePromptKey = (value) =>
  String(value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();

const iconHoverMotion = {
  whileHover: { scale: 1.08 },
  whileTap: { scale: 0.94 },
  transition: { type: "spring", stiffness: 330, damping: 24 },
};

const chipHoverMotion = {
  whileHover: { scale: 1.03 },
  whileTap: { scale: 0.97 },
  transition: { type: "spring", stiffness: 300, damping: 22 },
};

const exportButtonMotion = {
  whileHover: { scale: 1.03 },
  whileTap: { scale: 0.97 },
  transition: { type: "spring", stiffness: 300, damping: 22 },
};

export default function AiChatPopover({
  open,
  anchorEl,
  onClose,
  process,
  userId,
  userName,
  lang,
  embedded = false,
  systemPromptId = null,
  title,
  greetingText,
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: "ai",
      isGreeting: true,
      time: getTimeStr(),
      text:
        greetingText ||
        (lang === "th"
          ? "สวัสดีครับ! มีอะไรให้ผมช่วยเกี่ยวกับข้อมูลในหน้านี้ไหมครับ?"
          : "Hello! How can I help you with the data on this page?"),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // ── Attachment state ──
  const [attachmentFile, setAttachmentFile] = useState(null); // File object
  const [attachmentBase64, setAttachmentBase64] = useState(null); // base64 string (no prefix)
  const [attachmentMimeType, setAttachmentMimeType] = useState(null);
  const [attachmentPreviewUrl, setAttachmentPreviewUrl] = useState(null); // object URL for preview
  const fileInputRef = useRef(null);

  // ── Speech-to-text state ──
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);
  const speechSupported =
    typeof window !== "undefined" &&
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  // ── Provider attachment config (fetched from /api/ai/provider-config) ──
  const [allowFileAttachment, setAllowFileAttachment] = useState(false);
  const [allowedMimeTypes, setAllowedMimeTypes] = useState([
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
  ]);

  // ── Suggestions state ──
  const [suggestions, setSuggestions] = useState([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [suggestionsHidden, setSuggestionsHidden] = useState(false);
  const [proposalSaving, setProposalSaving] = useState({});
  const [toast, setToast] = useState({
    open: false,
    message: "",
    severity: "info",
  });
  const [favoriteHidden, setFavoriteHidden] = useState(false);
  const [favoritePrompts, setFavoritePrompts] = useState([]);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [favoriteToggling, setFavoriteToggling] = useState({});

  // Fetch provider config once when popover first opens
  useEffect(() => {
    if (!open) return;
    const token = SecureStorage.get("token");
    fetch(`${Config.API_URL}/ai/provider-config`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        setAllowFileAttachment(data.allow_file_attachment === true);
        if (
          Array.isArray(data.allowed_file_types) &&
          data.allowed_file_types.length > 0
        ) {
          setAllowedMimeTypes(data.allowed_file_types);
        }
      })
      .catch(() => {
        // Fail silently — keep defaults (attachment disabled)
        setAllowFileAttachment(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Fetch quick-pick suggestions (reusable)
  const fetchSuggestions = React.useCallback(() => {
    if (!open || !process) return;
    setSuggestions([]);
    setSuggestionsHidden(false);
    setFavoriteHidden(false);
    setSuggestionsLoading(true);
    const token = SecureStorage.get("token");
    fetch(`${Config.API_URL}/ai/suggestions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        process,
        lang,
        user_id: userId || "",
        user_name: userName || "",
        count: 4,
        ...(systemPromptId ? { system_prompt_id: systemPromptId } : {}),
      }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.success && Array.isArray(data.suggestions)) {
          setSuggestions(data.suggestions);
        }
      })
      .catch(() => {})
      .finally(() => setSuggestionsLoading(false));
  }, [open, process, userId, userName, lang, systemPromptId]);

  const fetchFavoritePrompts = React.useCallback(() => {
    if (!open || !process || !userId) {
      setFavoritePrompts([]);
      return;
    }

    setFavoriteLoading(true);
    const token = SecureStorage.get("token");
    const params = new URLSearchParams({
      process,
      user_id: userId,
    });

    fetch(`${Config.API_URL}/ai/favorite-prompts?${params.toString()}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.success && Array.isArray(data.favorites)) {
          const prompts = data.favorites
            .map((item) => item.user_message)
            .filter((text) => String(text || "").trim().length > 0);
          setFavoritePrompts(prompts);
        }
      })
      .catch(() => {})
      .finally(() => setFavoriteLoading(false));
  }, [open, process, userId]);

  // Fetch suggestions when popover opens
  useEffect(() => {
    if (open) {
      fetchSuggestions();
      fetchFavoritePrompts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Refresh suggestions when language changes while the popover is open
  useEffect(() => {
    if (!open) return;
    fetchSuggestions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  useEffect(() => {
    if (!open) return;
    fetchFavoritePrompts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // Reset chat and suggestions when process (menu/page) changes
  useEffect(() => {
    if (!open) return;
    setMessages([
      {
        id: 1,
        sender: "ai",
        isGreeting: true,
        time: getTimeStr(),
        text:
          greetingText ||
          (lang === "th"
            ? "สวัสดีครับ! มีอะไรให้ผมช่วยเกี่ยวกับข้อมูลในหน้านี้ไหมครับ?"
            : "Hello! How can I help you with the data on this page?"),
      },
    ]);
    setSuggestions([]);
    setSuggestionsHidden(false);
    setFavoriteHidden(false);
    fetchSuggestions();
    fetchFavoritePrompts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [process, greetingText]);

  const favoritePromptKeySet = React.useMemo(() => {
    return new Set(favoritePrompts.map((item) => normalizePromptKey(item)));
  }, [favoritePrompts]);

  const isFavoritePrompt = React.useCallback(
    (prompt) => favoritePromptKeySet.has(normalizePromptKey(prompt)),
    [favoritePromptKeySet],
  );

  const handleToggleFavoritePrompt = async (event, value) => {
    event?.stopPropagation?.();
    if (!process || !userId) return;

    const prompt = String(value || "").trim();
    if (!prompt) return;

    const key = normalizePromptKey(prompt);
    setFavoriteToggling((prev) => ({ ...prev, [key]: true }));

    try {
      const token = SecureStorage.get("token");
      const response = await fetch(
        `${Config.API_URL}/ai/favorite-prompts/toggle`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            process,
            user_id: userId,
            user_message: prompt,
          }),
        },
      );

      if (!response.ok) return;

      const data = await response.json();
      if (!data.success) return;

      setFavoritePrompts((prev) => {
        const exists = prev.some((item) => normalizePromptKey(item) === key);
        if (data.is_favorite) {
          if (exists) return prev;
          return [prompt, ...prev];
        }
        return prev.filter((item) => normalizePromptKey(item) !== key);
      });
    } catch (error) {
      console.error("Toggle favorite prompt error:", error);
    } finally {
      setFavoriteToggling((prev) => ({ ...prev, [key]: false }));
    }
  };

  // Fetch suggestions after every new AI response
  useEffect(() => {
    if (!open) return;
    if (messages.length === 0) return;
    const lastMsg = messages[messages.length - 1];
    if (lastMsg.sender === "ai" && !lastMsg.isError) {
      fetchSuggestions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length, open]);

  const MAX_FILE_SIZE_MB = 5;

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    // Reset input so same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (!file) return;

    if (!allowedMimeTypes.includes(file.type)) {
      alert(
        lang === "th"
          ? `ประเภทไฟล์ไม่รองรับ กรุณาเลือก JPEG, PNG, GIF หรือ WebP`
          : `Unsupported file type. Please choose JPEG, PNG, GIF, or WebP.`,
      );
      return;
    }
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      alert(
        lang === "th"
          ? `ไฟล์ใหญ่เกินไป (สูงสุด ${MAX_FILE_SIZE_MB} MB)`
          : `File is too large (max ${MAX_FILE_SIZE_MB} MB).`,
      );
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target.result; // "data:image/jpeg;base64,..."
      const base64 = dataUrl.split(",")[1]; // strip prefix
      setAttachmentFile(file);
      setAttachmentBase64(base64);
      setAttachmentMimeType(file.type);
      setAttachmentPreviewUrl(URL.createObjectURL(file));
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveAttachment = () => {
    if (attachmentPreviewUrl) URL.revokeObjectURL(attachmentPreviewUrl);
    setAttachmentFile(null);
    setAttachmentBase64(null);
    setAttachmentMimeType(null);
    setAttachmentPreviewUrl(null);
  };

  const MAX_CONTEXT_MESSAGES = 10;
  const rawContextCount = messages.filter(
    (m) =>
      (m.sender === "user" || m.sender === "ai") && !m.isError && !m.isGreeting,
  ).length;
  const contextCount = Math.min(rawContextCount, MAX_CONTEXT_MESSAGES);
  const [isExpanded, setIsExpanded] = useState(false);
  const messagesContainerRef = useRef(null);
  const messagesContentRef = useRef(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const shouldStickToBottomRef = useRef(true);
  const pendingAutoScrollRef = useRef(false);
  const rafScrollRef = useRef([]);
  const timeoutScrollRef = useRef([]);
  const resizeStartRef = useRef(null);
  const [popoverSize, setPopoverSize] = useState({
    width: DEFAULT_POPOVER_WIDTH,
    height: getDefaultPopoverHeight(),
  });
  // ── Drag state for popover ──
  const [popoverPos, setPopoverPos] = useState({
    top: 64, // default top (px)
    left: window.innerWidth - DEFAULT_POPOVER_WIDTH - 12, // default right align
  });
  const dragOffset = useRef({ x: 0, y: 0 });
  const isDragging = useRef(false);

  // Handle drag start on header
  const handleHeaderMouseDown = (e) => {
    if (e.button !== 0) return; // left click only
    isDragging.current = true;
    dragOffset.current = {
      x: e.clientX - popoverPos.left,
      y: e.clientY - popoverPos.top,
    };
    document.body.style.userSelect = "none";
    window.addEventListener("mousemove", handleHeaderMouseMove);
    window.addEventListener("mouseup", handleHeaderMouseUp);
  };
  const handleHeaderMouseMove = (e) => {
    if (!isDragging.current) return;
    let newLeft = e.clientX - dragOffset.current.x;
    let newTop = e.clientY - dragOffset.current.y;
    // Clamp to viewport
    newLeft = Math.max(
      0,
      Math.min(newLeft, window.innerWidth - popoverSize.width),
    );
    newTop = Math.max(0, Math.min(newTop, window.innerHeight - 56));
    setPopoverPos({ left: newLeft, top: newTop });
  };
  const handleHeaderMouseUp = () => {
    isDragging.current = false;
    document.body.style.userSelect = "";
    window.removeEventListener("mousemove", handleHeaderMouseMove);
    window.removeEventListener("mouseup", handleHeaderMouseUp);
  };

  // Reset position if popover size changes (e.g. on resize)
  useEffect(() => {
    setPopoverPos((prev) => ({
      left: Math.max(
        0,
        Math.min(prev.left, window.innerWidth - popoverSize.width),
      ),
      top: Math.max(0, Math.min(prev.top, window.innerHeight - 56)),
    }));
    // eslint-disable-next-line
  }, [popoverSize.width, popoverSize.height]);

  const scrollToBottom = (behavior = "auto") => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop =
        messagesContainerRef.current.scrollHeight;
    }
    messagesEndRef.current?.scrollIntoView({ block: "end", behavior });
  };

  const clearScheduledScrolls = () => {
    rafScrollRef.current.forEach((id) => cancelAnimationFrame(id));
    timeoutScrollRef.current.forEach((id) => clearTimeout(id));
    rafScrollRef.current = [];
    timeoutScrollRef.current = [];
  };

  const forceAutoScroll = (behavior = "auto") => {
    clearScheduledScrolls();
    shouldStickToBottomRef.current = true;
    pendingAutoScrollRef.current = true;
    scrollToBottom(behavior);
    rafScrollRef.current.push(
      requestAnimationFrame(() => {
        scrollToBottom(behavior);
        rafScrollRef.current.push(
          requestAnimationFrame(() => {
            scrollToBottom(behavior);
          }),
        );
      }),
    );
    timeoutScrollRef.current.push(
      setTimeout(() => {
        scrollToBottom(behavior);
        pendingAutoScrollRef.current = false;
      }, 180),
    );
  };

  const handleMessagesContainerRef = React.useCallback(
    (node) => {
      messagesContainerRef.current = node;
      if (node && open) {
        forceAutoScroll("auto");
      }
      // Keep this callback stable while typing so React does not re-run the ref
      // and force-scroll the embedded chat on every input change.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [open],
  );

  const handleMessagesContentRef = React.useCallback((node) => {
    messagesContentRef.current = node;
  }, []);

  const handleMessagesScroll = () => {
    if (pendingAutoScrollRef.current) return;
    const container = messagesContainerRef.current;
    if (!container) return;
    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;
    shouldStickToBottomRef.current = distanceFromBottom <= 48;
  };

  useLayoutEffect(() => {
    if (!open) return;
    if (!pendingAutoScrollRef.current && !shouldStickToBottomRef.current)
      return;
    scrollToBottom("auto");
    if (!isLoading) {
      pendingAutoScrollRef.current = false;
    }
  }, [messages.length, isLoading, open, isExpanded]);

  useEffect(() => {
    if (!open) return undefined;

    forceAutoScroll("auto");

    const rafId = requestAnimationFrame(() => {
      scrollToBottom("auto");
    });

    const contentNode = messagesContentRef.current;
    const resizeObserver =
      typeof ResizeObserver === "undefined" || !contentNode
        ? null
        : new ResizeObserver(() => {
            if (shouldStickToBottomRef.current) scrollToBottom("auto");
          });
    resizeObserver?.observe(contentNode);

    return () => {
      clearScheduledScrolls();
      cancelAnimationFrame(rafId);
      resizeObserver?.disconnect();
    };
  }, [open, isExpanded]);

  useEffect(() => {
    if (!open) {
      setIsExpanded(false);
      // Stop any ongoing speech recognition when popover closes
      stopAndSendRef.current = false;
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
      setIsListening(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;

    const handleWindowResize = () => {
      const maxWidth =
        typeof window === "undefined"
          ? DEFAULT_POPOVER_WIDTH
          : window.innerWidth - POPOVER_SCREEN_GAP * 2;
      const maxHeight = getDefaultPopoverHeight();

      setPopoverSize((prev) => ({
        width: clamp(prev.width, MIN_POPOVER_WIDTH, maxWidth),
        height: clamp(prev.height, MIN_POPOVER_HEIGHT, maxHeight),
      }));
    };

    handleWindowResize();
    window.addEventListener("resize", handleWindowResize);

    return () => window.removeEventListener("resize", handleWindowResize);
  }, [open]);

  // direction: "left" | "bottom" | "corner"
  const handleResizePointerDown = (direction) => (event) => {
    if (isExpanded) return;
    event.preventDefault();
    event.stopPropagation();

    resizeStartRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startWidth: popoverSize.width,
      startHeight: popoverSize.height,
      startLeft: popoverPos.left,
      direction,
    };

    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const handleResizePointerMove = (event) => {
    const start = resizeStartRef.current;
    if (!start || start.pointerId !== event.pointerId) return;

    const maxWidth =
      typeof window === "undefined"
        ? DEFAULT_POPOVER_WIDTH
        : window.innerWidth - POPOVER_SCREEN_GAP * 2;
    const maxHeight = getDefaultPopoverHeight();

    const deltaX = event.clientX - start.startX;
    const deltaY = event.clientY - start.startY;
    const newSize = { width: popoverSize.width, height: popoverSize.height };

    if (start.direction === "left" || start.direction === "corner") {
      const newWidth = clamp(
        start.startWidth - deltaX,
        MIN_POPOVER_WIDTH,
        maxWidth,
      );
      const actualDelta = start.startWidth - newWidth;
      newSize.width = newWidth;
      setPopoverPos((prev) => ({
        ...prev,
        left: start.startLeft + actualDelta,
      }));
    }

    if (start.direction === "bottom" || start.direction === "corner") {
      newSize.height = clamp(
        start.startHeight + deltaY,
        MIN_POPOVER_HEIGHT,
        maxHeight,
      );
    }

    setPopoverSize(newSize);
  };

  const handleResizePointerUp = (event) => {
    if (resizeStartRef.current?.pointerId !== event.pointerId) return;
    resizeStartRef.current = null;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    forceAutoScroll("auto");
  };

  const handleToggleExpanded = () => {
    forceAutoScroll("auto");
    setIsExpanded((prev) => !prev);
  };

  const updateMessageById = (messageId, updater) => {
    setMessages((prev) =>
      prev.map((msg) => (msg.id === messageId ? updater(msg) : msg)),
    );
  };

  const handleConfirmProposal = async (messageId) => {
    const target = messages.find((m) => m.id === messageId);
    if (!target?.proposal) return;

    const proposal = target.proposal;
    const saveKey = String(messageId);
    setProposalSaving((prev) => ({ ...prev, [saveKey]: true }));

    updateMessageById(messageId, (msg) => ({
      ...msg,
      proposal: {
        ...msg.proposal,
        status: "confirming",
      },
      proposalConfirmError: null,
    }));

    try {
      const token = SecureStorage.get("token");
      const response = await fetch(`${Config.API_URL}/ai/confirm`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ai_crud_audit_log_id: proposal.aiCrudAuditLogId || null,
          request_id: proposal.requestId || String(messageId),
          process,
          user_id: userId || "anonymous",
          user_name: userName || "",
          action: proposal.action,
          table: proposal.table,
          fields: proposal.fields,
          where: proposal.where,
        }),
      });

      const data = await response.json().catch(() => ({}));
      const success = parseBool(data.success ?? data.Success ?? response.ok);
      const message =
        data.message ||
        data.Message ||
        (success
          ? lang === "th"
            ? "บันทึกรายการเรียบร้อยแล้ว"
            : "Saved successfully"
          : lang === "th"
            ? "ไม่สามารถบันทึกรายการได้"
            : "Unable to save the record");

      updateMessageById(messageId, (msg) => ({
        ...msg,
        proposal: {
          ...msg.proposal,
          status: success ? "confirmed" : "failed",
        },
        proposalConfirmMessage: message,
        proposalConfirmError: success ? null : message,
      }));

      setToast({
        open: true,
        severity: success ? "success" : "error",
        message,
      });
    } catch (error) {
      const message =
        lang === "th"
          ? "เกิดข้อผิดพลาดระหว่างยืนยันคำสั่ง"
          : "An error occurred while confirming the command";

      updateMessageById(messageId, (msg) => ({
        ...msg,
        proposal: {
          ...msg.proposal,
          status: "failed",
        },
        proposalConfirmMessage: message,
        proposalConfirmError: error?.message || message,
      }));

      setToast({
        open: true,
        severity: "error",
        message,
      });
    } finally {
      setProposalSaving((prev) => {
        const next = { ...prev };
        delete next[saveKey];
        return next;
      });
    }
  };

  const handleRejectProposal = async (messageId) => {
    const target = messages.find((m) => m.id === messageId);
    if (!target?.proposal) return;

    const proposal = target.proposal;
    const saveKey = String(messageId);
    setProposalSaving((prev) => ({ ...prev, [saveKey]: true }));

    updateMessageById(messageId, (msg) => ({
      ...msg,
      proposal: {
        ...msg.proposal,
        status: "rejecting",
      },
      proposalConfirmError: null,
    }));

    try {
      const token = SecureStorage.get("token");
      const response = await fetch(`${Config.API_URL}/ai/reject`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ai_crud_audit_log_id: proposal.aiCrudAuditLogId || null,
          request_id: proposal.requestId || String(messageId),
          process,
          user_id: userId || "anonymous",
          user_name: userName || "",
          action: proposal.action,
          table: proposal.table,
          fields: proposal.fields,
          where: proposal.where,
        }),
      });

      const data = await response.json().catch(() => ({}));
      const success = parseBool(data.success ?? data.Success ?? response.ok);
      const message =
        data.message ||
        data.Message ||
        (success
          ? lang === "th"
            ? "ยกเลิกรายการเรียบร้อยแล้ว"
            : "Proposal cancelled successfully"
          : lang === "th"
            ? "ไม่สามารถยกเลิกรายการได้"
            : "Unable to cancel the proposal");

      updateMessageById(messageId, (msg) => ({
        ...msg,
        proposal: {
          ...msg.proposal,
          status: success ? "rejected" : "failed",
        },
        proposalConfirmMessage: message,
        proposalConfirmError: success ? null : message,
      }));

      setToast({
        open: true,
        severity: success ? "warning" : "error",
        message,
      });
    } catch (error) {
      const message =
        lang === "th"
          ? "เกิดข้อผิดพลาดระหว่างยกเลิกคำสั่ง"
          : "An error occurred while cancelling the command";

      updateMessageById(messageId, (msg) => ({
        ...msg,
        proposal: {
          ...msg.proposal,
          status: "failed",
        },
        proposalConfirmMessage: message,
        proposalConfirmError: error?.message || message,
      }));

      setToast({
        open: true,
        severity: "error",
        message,
      });
    } finally {
      setProposalSaving((prev) => {
        const next = { ...prev };
        delete next[saveKey];
        return next;
      });
    }
  };

  const handleGenerateFile = (responseText, dataRows, reportData) => {
    const normalized = normalizeExportData(responseText, dataRows, reportData);
    if (!normalized) return;
    const { rows, headerLabels } = normalized;

    const csvText = toCsvText(headerLabels, rows);
    const csvWithBom = `\uFEFF${csvText}`;
    const blob = new Blob([csvWithBom], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `custom-report-${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleGeneratePdf = async (responseText, dataRows, reportData) => {
    const normalized = normalizeExportData(responseText, dataRows, reportData);
    if (!normalized) return;
    const { rows, headerLabels } = normalized;

    const container = document.createElement("div");
    container.style.position = "fixed";
    container.style.left = "-100000px";
    container.style.top = "0";
    container.style.width = "1400px";
    container.style.background = "#ffffff";
    container.style.color = "#111827";
    container.style.padding = "24px";
    container.style.fontFamily =
      "'Prompt', 'Noto Sans Thai', 'Tahoma', sans-serif";
    container.style.boxSizing = "border-box";

    const reportTitle = sanitizeExportText(
      extractReportTitleFromResponse(responseText),
    );
    if (reportTitle) {
      const title = document.createElement("div");
      title.textContent = reportTitle;
      title.style.fontSize = "20px";
      title.style.fontWeight = "700";
      title.style.marginBottom = "12px";
      container.appendChild(title);
    }

    const table = document.createElement("table");
    table.style.borderCollapse = "collapse";
    table.style.width = "100%";
    table.style.tableLayout = "fixed";
    table.style.fontSize = "12px";

    const thead = document.createElement("thead");
    const headRow = document.createElement("tr");
    headerLabels.forEach((header) => {
      const th = document.createElement("th");
      th.textContent = header;
      th.style.border = "1px solid #d1d5db";
      th.style.padding = "8px";
      th.style.background = "#f3f4f6";
      th.style.textAlign = "left";
      th.style.wordBreak = "break-word";
      headRow.appendChild(th);
    });
    thead.appendChild(headRow);
    table.appendChild(thead);

    const tbody = document.createElement("tbody");
    rows.forEach((row) => {
      const tr = document.createElement("tr");
      row.forEach((value) => {
        const td = document.createElement("td");
        td.textContent =
          value === null || value === undefined ? "" : String(value);
        td.style.border = "1px solid #e5e7eb";
        td.style.padding = "7px";
        td.style.verticalAlign = "top";
        td.style.wordBreak = "break-word";
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    container.appendChild(table);

    document.body.appendChild(container);

    try {
      if (document.fonts?.ready) {
        await document.fonts.ready;
      }

      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
      });

      const imgData = canvas.toDataURL("image/png", 1.0);
      const doc = new jsPDF({
        orientation: "landscape",
        unit: "pt",
        format: "a4",
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 20;
      const imgWidth = pageWidth - margin * 2;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const contentHeightPerPage = pageHeight - margin * 2;
      const totalPages = Math.max(
        1,
        Math.ceil(imgHeight / contentHeightPerPage),
      );

      for (let page = 0; page < totalPages; page += 1) {
        if (page > 0) doc.addPage();
        const yOffset = -page * contentHeightPerPage;
        doc.addImage(
          imgData,
          "PNG",
          margin,
          margin + yOffset,
          imgWidth,
          imgHeight,
        );
      }

      doc.save(`custom-report-${Date.now()}.pdf`);
    } catch (error) {
      console.error("Generate PDF Error:", error);
    } finally {
      document.body.removeChild(container);
    }
  };

  const sendMessage = async (userMessage) => {
    if (!userMessage || isLoading) return;

    // Build conversation history from current messages (before adding new user message)
    const conversationHistory = messages
      .filter(
        (m) =>
          (m.sender === "user" || m.sender === "ai") && !m.isError && m.text,
      )
      .slice(-MAX_CONTEXT_MESSAGES)
      .map((m) => ({
        role: m.sender === "user" ? "user" : "assistant",
        content: m.text,
      }));

    // Snapshot attachment before clearing
    const sendBase64 = attachmentBase64;
    const sendMimeType = attachmentMimeType;
    const sendPreviewUrl = attachmentPreviewUrl; // Keep the object URL alive for the message bubble

    // Clear attachment state (do NOT revoke the object URL — it lives in the message bubble)
    setAttachmentFile(null);
    setAttachmentBase64(null);
    setAttachmentMimeType(null);
    setAttachmentPreviewUrl(null);

    setMessages((prev) => [
      ...prev,
      {
        id: Date.now(),
        sender: "user",
        time: getTimeStr(),
        text: userMessage,
        ...(sendBase64
          ? {
              attachmentPreviewUrl: sendPreviewUrl,
              attachmentMimeType: sendMimeType,
            }
          : {}),
      },
    ]);
    setIsLoading(true);
    forceAutoScroll("smooth");

    try {
      const token = SecureStorage.get("token");
      const response = await fetch(`${Config.API_URL}/ai/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          process: process,
          user_message: userMessage,
          user_id: userId || "anonymous",
          user_name: userName || "",
          conversation_history: conversationHistory,
          ...(systemPromptId ? { system_prompt_id: systemPromptId } : {}),
          ...(sendBase64
            ? {
                attachment_base64: sendBase64,
                attachment_mime_type: sendMimeType,
              }
            : {}),
        }),
      });

      if (!response.ok) throw new Error("API request failed");

      const data = await response.json();

      if (data.success || data.success === undefined) {
        const aiResponseText = data.ai_response || data.AiResponse || "";
        const aiDecision = String(data.ai_decision || data.AiDecision || "")
          .trim()
          .toUpperCase();
        const requiresConfirmation = parseBool(
          data.requires_confirmation ?? data.RequiresConfirmation,
        );
        const proposalAction = data.action || data.Action || "";
        const proposalTable = data.table || data.Table || "";
        const proposalFields = parseObjectOrEmpty(data.fields || data.Fields);
        const proposalWhere = parseObjectOrEmpty(data.where || data.Where);
        const proposalBusinessPlan = buildProposalBusinessPlan({
          businessPlan: parseObjectOrEmpty(
            data.business_plan || data.BusinessPlan,
          ),
          action: proposalAction,
          fields: proposalFields,
          where: proposalWhere,
          responseText: aiResponseText,
          lang,
        });
        const proposalStatus = normalizeProposalStatus(
          data.confirm_status || data.ConfirmStatus,
        );
        const aiCrudAuditLogId =
          data.ai_crud_audit_log_id || data.AiCrudAuditLogId || null;
        const requestId = data.request_id || data.RequestId || null;
        const shouldRenderProposalCard =
          aiDecision === "GENERATE_SQL" && isCrudProposalAction(proposalAction);
        const hasProposal =
          shouldRenderProposalCard &&
          (requiresConfirmation ||
            proposalTable ||
            Object.keys(proposalFields).length > 0 ||
            Object.keys(proposalWhere).length > 0 ||
            hasBusinessPlanContent(proposalBusinessPlan) ||
            aiCrudAuditLogId);

        setMessages((prev) => [
          ...prev,
          {
            id: Date.now() + 1,
            sender: "ai",
            time: getTimeStr(),
            text: aiResponseText,
            dataRows: data.data_rows || data.DataRows || [],
            reportData: data.report_data || data.ReportData,
            ...(hasProposal
              ? {
                  proposal: {
                    action: proposalAction,
                    table: proposalTable,
                    fields: proposalFields,
                    where: proposalWhere,
                    businessPlan: proposalBusinessPlan,
                    responseText: aiResponseText,
                    status:
                      proposalStatus === "pending" && requiresConfirmation
                        ? "pending"
                        : proposalStatus,
                    aiCrudAuditLogId,
                    requestId,
                  },
                }
              : {}),
          },
        ]);
      } else {
        throw new Error(
          data.error_message || data.ErrorMessage || "Unknown error",
        );
      }
    } catch (error) {
      console.error("AI Chat Error:", error);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: "ai",
          time: getTimeStr(),
          text:
            lang === "th"
              ? "ขออภัย เกิดข้อผิดพลาดในการเชื่อมต่อกับ AI กรุณาลองใหม่อีกครั้ง"
              : "Sorry, an error occurred while connecting to the AI. Please try again.",
          isError: true,
        },
      ]);
    } finally {
      setIsLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const handleSend = () => {
    if (!inputValue.trim() || isLoading) return;
    const msg = inputValue.trim();
    setInputValue("");
    sendMessage(msg);
  };

  const handleSuggestionClick = (suggestion) => {
    if (isLoading) return;
    setSuggestionsHidden(true);
    setSuggestions([]);
    sendMessage(suggestion);
  };

  const handleInputChange = (e) => {
    const nextValue = e.target.value;
    if (nextValue.length > 1000) return;

    if (!suggestionsHidden && nextValue.trim().length > 0) {
      setSuggestionsHidden(true);
    }

    setInputValue(nextValue);
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const stopAndSendRef = useRef(false);

  const handleToggleMic = () => {
    if (isListening) {
      // Flag that stop was user-initiated — auto-send after onend
      stopAndSendRef.current = true;
      recognitionRef.current?.stop();
      return;
    }
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    const recognition = new SpeechRecognition();
    recognition.lang = lang === "th" ? "th-TH" : "en-US";
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.continuous = false;
    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (e) => {
      const transcript = Array.from(e.results)
        .map((r) => r[0].transcript)
        .join("");
      setInputValue(transcript.slice(0, 1000));
      // Hide suggestions when user speaks
      if (!suggestionsHidden && transcript.trim().length > 0) {
        setSuggestionsHidden(true);
      }
    };
    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
      if (stopAndSendRef.current) {
        stopAndSendRef.current = false;
        // Use a tiny delay so setInputValue has flushed before we read it
        setTimeout(() => {
          setInputValue((current) => {
            const msg = current.trim();
            if (msg) {
              setInputValue("");
              sendMessage(msg);
            } else {
              inputRef.current?.focus();
            }
            return "";
          });
        }, 50);
      } else {
        setTimeout(() => inputRef.current?.focus(), 50);
      }
    };
    recognition.onerror = () => {
      stopAndSendRef.current = false;
      setIsListening(false);
      recognitionRef.current = null;
    };
    recognitionRef.current = recognition;
    recognition.start();
  };

  // ─── Shared inner content ────────────────────────────────────────────────
  const chatContent = (
    <>
      {/* Header */}
      <Box
        onMouseDown={!isExpanded ? handleHeaderMouseDown : undefined}
        sx={{
          px: 1.5,
          py: 1,
          cursor: !isExpanded ? "move" : "default",
          userSelect: "none",
          background: isDark
            ? `linear-gradient(135deg,
                ${alpha(theme.palette.primary.dark, 0.85)} 0%,
                ${alpha(theme.palette.secondary.dark, 0.85)} 100%)`
            : `linear-gradient(135deg,
                ${theme.palette.primary.dark} 0%,
                ${theme.palette.primary.main} 55%,
                ${theme.palette.secondary.main} 100%)`,
          backdropFilter: isDark ? "blur(16px)" : "none",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
          position: "relative",
          overflow: "hidden",
          "&::before": {
            content: '""',
            position: "absolute",
            inset: 0,
            backgroundImage: [
              "radial-gradient(ellipse at 15% 60%, rgba(255,255,255,0.07) 0%, transparent 55%)",
              "radial-gradient(ellipse at 85% 15%, rgba(255,255,255,0.05) 0%, transparent 50%)",
            ].join(", "),
            pointerEvents: "none",
          },
        }}
      >
        {/* Title group */}
        <Box
          sx={{ display: "flex", alignItems: "center", gap: 1.5, zIndex: 1 }}
        >
          {/* Animated icon box */}
          <Box
            component="img"
            src={isLoading ? aiBotThinkingImg : aiBotImg}
            alt="AI"
            sx={{
              width: 80,
              height: 80,
              objectFit: "contain",
              flexShrink: 0,
              filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.22))",
              "@keyframes aiGlow": {
                "0%, 100%": { transform: "translateY(0px)" },
                "50%": { transform: "translateY(-3px)" },
              },
              animation: "aiGlow 3s infinite ease-in-out",
            }}
          />

          <Box>
            <Typography
              variant="subtitle1"
              sx={{
                fontWeight: 700,
                lineHeight: 1.25,
                color: "#fff",
                letterSpacing: "0.01em",
              }}
            >
              {title || (lang === "th" ? "ผู้ช่วย AI" : "AI Assistant")}
            </Typography>
            <Box
              sx={{ display: "flex", alignItems: "center", gap: 0.6, mt: 0.1 }}
            >
              {/* Online pulse dot */}
              <Box
                sx={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  bgcolor: isLoading ? "#FFD93D" : "#4ade80",
                  flexShrink: 0,
                  "@keyframes onlinePulse": {
                    "0%, 100%": { opacity: 1, transform: "scale(1)" },
                    "50%": { opacity: 0.55, transform: "scale(0.75)" },
                  },
                  animation: "onlinePulse 2s infinite ease-in-out",
                }}
              />
              <Typography
                variant="caption"
                sx={{
                  opacity: 0.8,
                  lineHeight: 1,
                  color: "#fff",
                  fontSize: "0.72rem",
                }}
              >
                {isLoading
                  ? lang === "th"
                    ? "กำลังคิด..."
                    : "Thinking..."
                  : lang === "th"
                    ? "พร้อมใช้งาน"
                    : "Online"}
              </Typography>
              {/* Context window circular progress */}
              {false &&
                (() => {
                  const pct = Math.round(
                    ((rawContextCount % (MAX_CONTEXT_MESSAGES + 1)) /
                      MAX_CONTEXT_MESSAGES) *
                      100,
                  );
                  const arcColor =
                    pct >= 100
                      ? "#FFB347"
                      : pct >= 80
                        ? "#FFD93D"
                        : "rgba(255,255,255,0.9)";
                  // SVG circle params
                  const size = 28;
                  const strokeW = 3;
                  const r = (size - strokeW) / 2;
                  const circ = 2 * Math.PI * r;
                  const dash = (pct / 100) * circ;
                  return (
                    <>
                      <Typography
                        sx={{
                          opacity: 0.45,
                          color: "#fff",
                          fontSize: "0.65rem",
                          lineHeight: 1,
                        }}
                      >
                        ·
                      </Typography>
                      <Tooltip
                        title={`Context: ${contextCount}/${MAX_CONTEXT_MESSAGES} (${pct}%)`}
                        placement="bottom"
                      >
                        <Box
                          sx={{
                            position: "relative",
                            width: size,
                            height: size,
                            flexShrink: 0,
                            cursor: "default",
                          }}
                        >
                          <svg
                            width={size}
                            height={size}
                            style={{ transform: "rotate(-90deg)" }}
                          >
                            {/* Track */}
                            <circle
                              cx={size / 2}
                              cy={size / 2}
                              r={r}
                              fill="none"
                              stroke="rgba(255,255,255,0.18)"
                              strokeWidth={strokeW}
                            />
                            {/* Arc */}
                            <circle
                              cx={size / 2}
                              cy={size / 2}
                              r={r}
                              fill="none"
                              stroke={arcColor}
                              strokeWidth={strokeW}
                              strokeLinecap="round"
                              strokeDasharray={`${dash} ${circ}`}
                              style={{
                                transition:
                                  "stroke-dasharray 0.4s ease, stroke 0.3s ease",
                              }}
                            />
                          </svg>
                          {/* % label centered */}
                          <Typography
                            sx={{
                              position: "absolute",
                              inset: 0,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: "0.5rem",
                              fontWeight: 700,
                              lineHeight: 1,
                              color: arcColor,
                              fontVariantNumeric: "tabular-nums",
                              transition: "color 0.3s ease",
                              pointerEvents: "none",
                              userSelect: "none",
                            }}
                          >
                            {pct}
                          </Typography>
                        </Box>
                      </Tooltip>
                    </>
                  );
                })()}
            </Box>
          </Box>
        </Box>

        {/* Header action buttons */}
        {!embedded && (
          <Box
            sx={{ display: "flex", gap: 0.25, zIndex: 1, alignItems: "center" }}
          >
            {!isExpanded && (
              <Tooltip
                title={lang === "th" ? "รีเซ็ตตำแหน่ง" : "Reset position"}
              >
                <Box component={motion.div} {...iconHoverMotion}>
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPopoverPos({
                        top: 64,
                        left: window.innerWidth - DEFAULT_POPOVER_WIDTH - 12,
                      });
                      setPopoverSize({
                        width: DEFAULT_POPOVER_WIDTH,
                        height: getDefaultPopoverHeight(),
                      });
                    }}
                    sx={{
                      color: "rgba(255,255,255,0.55)",
                      transition: "all 0.18s ease",
                      "&:hover": {
                        color: "#fff",
                        bgcolor: "rgba(255,255,255,0.14)",
                      },
                    }}
                  >
                    <DragIndicatorIcon sx={{ fontSize: 17 }} />
                  </IconButton>
                </Box>
              </Tooltip>
            )}
            <Tooltip
              title={
                isExpanded
                  ? lang === "th"
                    ? "ย่อหน้าต่าง"
                    : "Collapse"
                  : lang === "th"
                    ? "ขยายเต็มหน้าจอ"
                    : "Expand"
              }
            >
              <Box component={motion.div} {...iconHoverMotion}>
                <IconButton
                  size="small"
                  onClick={handleToggleExpanded}
                  sx={{
                    color: "rgba(255,255,255,0.72)",
                    transition: "all 0.18s ease",
                    "&:hover": {
                      color: "#fff",
                      bgcolor: "rgba(255,255,255,0.14)",
                    },
                  }}
                >
                  {isExpanded ? (
                    <CloseFullscreenIcon sx={{ fontSize: 17 }} />
                  ) : (
                    <OpenInFullIcon sx={{ fontSize: 17 }} />
                  )}
                </IconButton>
              </Box>
            </Tooltip>
            <Tooltip title={lang === "th" ? "ปิด" : "Close"}>
              <Box component={motion.div} {...iconHoverMotion}>
                <IconButton
                  size="small"
                  onClick={onClose}
                  sx={{
                    color: "rgba(255,255,255,0.72)",
                    transition: "all 0.18s ease",
                    "&:hover": {
                      color: "#fff",
                      bgcolor: "rgba(255,107,107,0.3)",
                    },
                  }}
                >
                  <CloseIcon sx={{ fontSize: 17 }} />
                </IconButton>
              </Box>
            </Tooltip>
          </Box>
        )}
      </Box>

      {/* Chat history */}
      <Box
        ref={handleMessagesContainerRef}
        onScroll={handleMessagesScroll}
        sx={{
          flex: 1,
          px: 2,
          py: 2,
          overflowY: "auto",
          bgcolor: isDark
            ? alpha(theme.palette.background.default, 0.7)
            : "#F3F4F8",
          backgroundImage: isDark
            ? "radial-gradient(circle, rgba(255,255,255,0.022) 1px, transparent 1px)"
            : "radial-gradient(circle, rgba(0,0,0,0.045) 1px, transparent 1px)",
          backgroundSize: "22px 22px",
          "&::-webkit-scrollbar": { width: 4 },
          "&::-webkit-scrollbar-track": { bgcolor: "transparent" },
          "&::-webkit-scrollbar-thumb": {
            borderRadius: 4,
            bgcolor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
          },
        }}
      >
        <Box
          ref={handleMessagesContentRef}
          sx={{ display: "flex", flexDirection: "column", gap: 2 }}
        >
          {messages.map((msg) => (
            <Box
              key={msg.id}
              sx={{
                display: "flex",
                flexDirection: msg.sender === "user" ? "row-reverse" : "row",
                gap: 1,
                alignItems: "flex-end",
                "@keyframes msgIn": {
                  from: {
                    opacity: 0,
                    transform: "translateY(10px) scale(0.97)",
                  },
                  to: { opacity: 1, transform: "translateY(0) scale(1)" },
                },
                animation: "msgIn 0.22s cubic-bezier(0.34, 1.56, 0.64, 1)",
              }}
            >
              {/* Avatar */}
              {msg.sender === "user" ? (
                <Box
                  sx={{
                    width: 32,
                    height: 32,
                    borderRadius: "10px",
                    background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    mb: "2px",
                    boxShadow: `0 3px 10px ${alpha(theme.palette.primary.main, 0.38)}`,
                  }}
                >
                  <PersonIcon sx={{ color: "#fff", fontSize: 16 }} />
                </Box>
              ) : (
                <Box
                  component="img"
                  src={aiChatBotImg}
                  alt="AI"
                  sx={{
                    width: 42,
                    height: 42,
                    objectFit: "contain",
                    flexShrink: 0,
                    mb: "2px",
                    filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.18))",
                  }}
                />
              )}

              {/* Bubble + timestamp */}
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: msg.sender === "user" ? "flex-end" : "flex-start",
                  gap: 0.4,
                  maxWidth: isExpanded ? "62%" : "80%",
                  minWidth: 0,
                  overflow: "hidden",
                }}
              >
                <Paper
                  elevation={0}
                  sx={{
                    px: 2,
                    py: 1.25,
                    maxWidth: "100%",
                    overflow: "hidden",
                    borderRadius:
                      msg.sender === "user"
                        ? "18px 18px 4px 18px"
                        : "18px 18px 18px 4px",
                    background:
                      msg.sender === "user"
                        ? `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`
                        : msg.isError
                          ? alpha(theme.palette.error.main, 0.08)
                          : isDark
                            ? alpha(theme.palette.background.paper, 0.88)
                            : "#fff",
                    backdropFilter:
                      isDark && msg.sender === "ai" ? "blur(12px)" : "none",
                    border:
                      msg.sender === "ai"
                        ? `1px solid ${isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)"}`
                        : "none",
                    color: msg.sender === "user" ? "#fff" : "text.primary",
                    boxShadow:
                      msg.sender === "user"
                        ? `0 4px 14px ${alpha(theme.palette.primary.main, 0.28)}`
                        : `0 2px 8px rgba(0,0,0,0.07)`,
                  }}
                >
                  <Box
                    sx={{
                      wordBreak: "break-word",
                      display: "flex",
                      flexDirection: "column",
                      gap: 0.35,
                      minWidth: 0,
                      overflow: "hidden",
                    }}
                  >
                    {/* Attached image preview inside user bubble */}
                    {msg.sender === "user" && msg.attachmentPreviewUrl && (
                      <Box
                        component="img"
                        src={msg.attachmentPreviewUrl}
                        alt="attachment"
                        sx={{
                          maxWidth: "100%",
                          maxHeight: 200,
                          borderRadius: "10px",
                          objectFit: "contain",
                          mb: msg.text ? 0.75 : 0,
                          display: "block",
                        }}
                      />
                    )}
                    {renderFormattedMessage(msg.text)}

                    {msg.sender === "ai" &&
                      renderStructuredResponseTable(
                        normalizePrimaryTableData(msg.dataRows, msg.reportData),
                        `report-table-${msg.id}`,
                      )}

                    {msg.sender === "ai" &&
                      msg.proposal &&
                      isCrudProposalAction(msg.proposal.action) && (
                        <Box
                          sx={{
                            mt: 1,
                            p: 1,
                            borderRadius: 1.5,
                            border: "1px solid",
                            borderColor: "divider",
                            bgcolor: isDark
                              ? alpha(theme.palette.info.main, 0.08)
                              : alpha(theme.palette.info.light, 0.18),
                            display: "flex",
                            flexDirection: "column",
                            gap: 0.8,
                          }}
                        >
                          {(() => {
                            const statusMeta = getProposalStatusMeta(
                              msg.proposal.status,
                              lang,
                            );

                            return (
                              <>
                                <Box
                                  sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    gap: 1,
                                    flexWrap: "wrap",
                                  }}
                                >
                                  <Typography
                                    sx={{
                                      fontSize: "0.75rem",
                                      fontWeight: 700,
                                    }}
                                  >
                                    {lang === "th"
                                      ? "ร่างรายการ (AI Proposal)"
                                      : "AI Proposal Draft"}
                                  </Typography>
                                  <Box
                                    sx={{
                                      px: 0.8,
                                      py: 0.15,
                                      borderRadius: 99,
                                      fontSize: "0.67rem",
                                      fontWeight: 700,
                                      color: `${statusMeta.paletteKey}.main`,
                                      bgcolor: alpha(
                                        theme.palette[statusMeta.paletteKey]
                                          .main,
                                        0.18,
                                      ),
                                      border: "1px solid",
                                      borderColor: alpha(
                                        theme.palette[statusMeta.paletteKey]
                                          .main,
                                        0.35,
                                      ),
                                    }}
                                  >
                                    {statusMeta.label}
                                  </Box>
                                </Box>

                                <Typography sx={{ fontSize: "0.74rem" }}>
                                  <strong>
                                    {lang === "th" ? "กิจกรรม" : "Activity"}:
                                  </strong>{" "}
                                  {msg.proposal.businessPlan?.activity ||
                                    prettyBusinessActivity(
                                      msg.proposal.action,
                                      lang,
                                    )}
                                </Typography>
                                <Typography sx={{ fontSize: "0.74rem" }}>
                                  <strong>
                                    {lang === "th" ? "ชุดข้อมูล" : "Target"}:
                                  </strong>{" "}
                                  {msg.proposal.businessPlan?.target || "-"}
                                </Typography>

                                <>
                                  <Box>
                                    <Typography
                                      sx={{
                                        fontSize: "0.72rem",
                                        fontWeight: 700,
                                        mb: 0.25,
                                      }}
                                    >
                                      {lang === "th"
                                        ? "สรุปข้อมูล"
                                        : "Data Summary"}
                                    </Typography>
                                    <Box
                                      component="div"
                                      sx={{
                                        m: 0,
                                        fontSize: "0.7rem",
                                        whiteSpace: "pre-wrap",
                                        wordBreak: "break-word",
                                        bgcolor: isDark
                                          ? alpha(
                                              theme.palette.common.black,
                                              0.2,
                                            )
                                          : alpha(
                                              theme.palette.common.black,
                                              0.05,
                                            ),
                                        p: 0.8,
                                        borderRadius: 1,
                                      }}
                                    >
                                      {msg.proposal.businessPlan?.dataSummary ||
                                        "-"}
                                    </Box>
                                  </Box>
                                  <Box>
                                    <Typography
                                      sx={{
                                        fontSize: "0.72rem",
                                        fontWeight: 700,
                                        mb: 0.25,
                                      }}
                                    >
                                      {lang === "th"
                                        ? "รายการอ้างอิง"
                                        : "Reference"}
                                    </Typography>
                                    <Box
                                      component="div"
                                      sx={{
                                        m: 0,
                                        fontSize: "0.7rem",
                                        whiteSpace: "pre-wrap",
                                        wordBreak: "break-word",
                                        bgcolor: isDark
                                          ? alpha(
                                              theme.palette.common.black,
                                              0.2,
                                            )
                                          : alpha(
                                              theme.palette.common.black,
                                              0.05,
                                            ),
                                        p: 0.8,
                                        borderRadius: 1,
                                      }}
                                    >
                                      {msg.proposal.businessPlan?.reference ||
                                        "-"}
                                    </Box>
                                  </Box>
                                </>

                                <Box
                                  sx={{
                                    display: "flex",
                                    gap: 0.75,
                                    flexWrap: "wrap",
                                  }}
                                >
                                  <Button
                                    size="small"
                                    variant="outlined"
                                    color="warning"
                                    startIcon={
                                      <CloseIcon sx={{ fontSize: 14 }} />
                                    }
                                    onClick={() => handleRejectProposal(msg.id)}
                                    disabled={
                                      msg.proposal.status === "confirmed" ||
                                      msg.proposal.status === "confirming" ||
                                      msg.proposal.status === "rejected" ||
                                      msg.proposal.status === "rejecting" ||
                                      !!proposalSaving[String(msg.id)]
                                    }
                                  >
                                    {msg.proposal.status === "rejected"
                                      ? lang === "th"
                                        ? "ยกเลิกแล้ว"
                                        : "Cancelled"
                                      : msg.proposal.status === "rejecting"
                                        ? lang === "th"
                                          ? "กำลังยกเลิก..."
                                          : "Cancelling..."
                                        : lang === "th"
                                          ? "ยกเลิก"
                                          : "Cancel"}
                                  </Button>

                                  <Button
                                    size="small"
                                    variant="contained"
                                    color="success"
                                    startIcon={
                                      <CheckIcon sx={{ fontSize: 14 }} />
                                    }
                                    onClick={() =>
                                      handleConfirmProposal(msg.id)
                                    }
                                    disabled={
                                      msg.proposal.status === "confirmed" ||
                                      msg.proposal.status === "confirming" ||
                                      msg.proposal.status === "rejected" ||
                                      msg.proposal.status === "rejecting" ||
                                      !!proposalSaving[String(msg.id)]
                                    }
                                  >
                                    {msg.proposal.status === "confirmed"
                                      ? lang === "th"
                                        ? "ยืนยันแล้ว"
                                        : "Confirmed"
                                      : msg.proposal.status === "confirming"
                                        ? lang === "th"
                                          ? "กำลังบันทึก..."
                                          : "Saving..."
                                        : lang === "th"
                                          ? "ยืนยันและบันทึก"
                                          : "Confirm & Save"}
                                  </Button>
                                </Box>

                                {msg.proposalConfirmMessage && (
                                  <Typography
                                    sx={{
                                      fontSize: "0.72rem",
                                      color:
                                        msg.proposal.status === "confirmed"
                                          ? "success.main"
                                          : "error.main",
                                    }}
                                  >
                                    {msg.proposalConfirmMessage}
                                  </Typography>
                                )}
                              </>
                            );
                          })()}
                        </Box>
                      )}
                  </Box>

                  {canShowExportButtons(
                    msg.text,
                    msg.dataRows,
                    msg.reportData,
                  ) && (
                    <Box
                      sx={{
                        display: "flex",
                        gap: 0.8,
                        flexWrap: "wrap",
                        mt: 1.5,
                        pt: 1.25,
                        borderTop: `1px dashed ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)"}`,
                      }}
                    >
                      <Box component={motion.div} {...exportButtonMotion}>
                        <Button
                          size="small"
                          variant="contained"
                          startIcon={<DownloadIcon sx={{ fontSize: 14 }} />}
                          onClick={() =>
                            handleGenerateFile(
                              msg.text,
                              msg.dataRows,
                              msg.reportData,
                            )
                          }
                          sx={{
                            borderRadius: "10px",
                            textTransform: "none",
                            fontSize: "0.76rem",
                            fontWeight: 700,
                            px: 1.4,
                            py: 0.5,
                            // No background or boxShadow, only motion effect
                          }}
                        >
                          {lang === "th" ? "ส่งออก CSV" : "Gen CSV"}
                        </Button>
                      </Box>

                      <Box component={motion.div} {...exportButtonMotion}>
                        <Button
                          size="small"
                          variant="contained"
                          startIcon={<DownloadIcon sx={{ fontSize: 14 }} />}
                          onClick={() =>
                            handleGeneratePdf(
                              msg.text,
                              msg.dataRows,
                              msg.reportData,
                            )
                          }
                          sx={{
                            borderRadius: "10px",
                            textTransform: "none",
                            fontSize: "0.76rem",
                            fontWeight: 700,
                            px: 1.4,
                            py: 0.5,
                            // No background or boxShadow, only motion effect
                          }}
                        >
                          {lang === "th" ? "ส่งออก PDF" : "Gen PDF"}
                        </Button>
                      </Box>
                    </Box>
                  )}
                </Paper>

                {/* Timestamp + favorite action */}
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 0.3,
                    px: 0.2,
                  }}
                >
                  {msg.time && (
                    <Typography
                      variant="caption"
                      sx={{
                        fontSize: "0.67rem",
                        color: "text.disabled",
                        px: 0.3,
                      }}
                    >
                      {msg.time}
                    </Typography>
                  )}
                  {msg.sender === "user" && String(msg.text || "").trim() && (
                    <Tooltip
                      title={
                        isFavoritePrompt(msg.text)
                          ? lang === "th"
                            ? "ลบจากคำถามโปรด"
                            : "Remove from favorites"
                          : lang === "th"
                            ? "บันทึกเป็นคำถามโปรด"
                            : "Save as favorite"
                      }
                    >
                      <span>
                        <IconButton
                          size="small"
                          onClick={(event) =>
                            handleToggleFavoritePrompt(event, msg.text)
                          }
                          disabled={
                            !!favoriteToggling[normalizePromptKey(msg.text)]
                          }
                          sx={{
                            width: 18,
                            height: 18,
                            color: isFavoritePrompt(msg.text)
                              ? "warning.main"
                              : "text.disabled",
                            p: 0,
                            "&:hover": {
                              bgcolor: "transparent",
                              color: "warning.main",
                            },
                          }}
                        >
                          {isFavoritePrompt(msg.text) ? (
                            <StarIcon sx={{ fontSize: 13 }} />
                          ) : (
                            <StarBorderIcon sx={{ fontSize: 13 }} />
                          )}
                        </IconButton>
                      </span>
                    </Tooltip>
                  )}
                </Box>
              </Box>
            </Box>
          ))}

          {/* Typing indicator */}
          {isLoading && (
            <Box
              sx={{
                display: "flex",
                gap: 1,
                alignItems: "flex-end",
                "@keyframes msgIn": {
                  from: {
                    opacity: 0,
                    transform: "translateY(10px) scale(0.97)",
                  },
                  to: { opacity: 1, transform: "translateY(0) scale(1)" },
                },
                animation: "msgIn 0.22s cubic-bezier(0.34, 1.56, 0.64, 1)",
              }}
            >
              <Box
                component="img"
                src={isLoading ? aiChatBotThinkingImg : aiChatBotImg}
                alt="AI"
                sx={{
                  width: 42,
                  height: 42,
                  objectFit: "contain",
                  flexShrink: 0,
                  filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.18))",
                }}
              />
              <Paper
                elevation={0}
                sx={{
                  px: 2,
                  py: 1.5,
                  borderRadius: "18px 18px 18px 4px",
                  bgcolor: isDark
                    ? alpha(theme.palette.background.paper, 0.88)
                    : "#fff",
                  backdropFilter: isDark ? "blur(12px)" : "none",
                  border: `1px solid ${isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)"}`,
                  boxShadow: "0 2px 8px rgba(0,0,0,0.07)",
                }}
              >
                {/* Bouncing dots */}
                <Box sx={{ display: "flex", gap: "5px", alignItems: "center" }}>
                  {[0, 1, 2].map((i) => (
                    <Box
                      key={i}
                      sx={{
                        width: 7,
                        height: 7,
                        borderRadius: "50%",
                        bgcolor: isDark ? "primary.main" : "text.secondary",
                        "@keyframes typingBounce": {
                          "0%, 60%, 100%": {
                            transform: "translateY(0)",
                            opacity: 0.35,
                          },
                          "30%": { transform: "translateY(-6px)", opacity: 1 },
                        },
                        animation: "typingBounce 1.4s infinite ease-in-out",
                        animationDelay: `${i * 0.18}s`,
                      }}
                    />
                  ))}
                </Box>
              </Paper>
            </Box>
          )}

          <div ref={messagesEndRef} />
        </Box>
      </Box>

      <Divider sx={{ opacity: isDark ? 0.1 : 0.5 }} />

      {/* Input area */}
      <Box
        sx={{
          p: 1.5,
          flexShrink: 0,
          bgcolor: isDark ? alpha(theme.palette.background.paper, 0.6) : "#fff",
          backdropFilter: isDark ? "blur(12px)" : "none",
        }}
      >
        {/* Hidden file input — only mounted when attachment is allowed */}
        {allowFileAttachment && (
          <input
            ref={fileInputRef}
            type="file"
            accept={allowedMimeTypes.join(",")}
            style={{ display: "none" }}
            onChange={handleFileSelect}
          />
        )}

        {/* Attachment preview chip — only shown when attachment is allowed */}
        {allowFileAttachment && attachmentFile && (
          <Box
            sx={{
              mb: 0.75,
              display: "flex",
              alignItems: "center",
              gap: 0.75,
              bgcolor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
              borderRadius: "12px",
              px: 1,
              py: 0.5,
              border: "1px solid",
              borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
            }}
          >
            <Box
              component="img"
              src={attachmentPreviewUrl}
              alt="preview"
              sx={{
                width: 36,
                height: 36,
                borderRadius: "6px",
                objectFit: "cover",
                flexShrink: 0,
              }}
            />
            <Typography
              variant="caption"
              sx={{
                flex: 1,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                fontSize: "0.72rem",
                color: "text.secondary",
              }}
            >
              {attachmentFile.name}
            </Typography>
            <Tooltip title={lang === "th" ? "นำออก" : "Remove"}>
              <IconButton
                size="small"
                onClick={handleRemoveAttachment}
                sx={{ p: 0.25, flexShrink: 0 }}
              >
                <CloseIcon sx={{ fontSize: 14 }} />
              </IconButton>
            </Tooltip>
          </Box>
        )}

        {/* Favorite prompt chips */}
        {favoritePrompts.length > 0 && !favoriteLoading && !favoriteHidden && (
          <Box
            sx={{
              mb: 0.75,
              display: "flex",
              flexDirection: "column",
              gap: 0.6,
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 1,
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  color: "text.secondary",
                  fontSize: "0.68rem",
                  fontWeight: 700,
                }}
              >
                {lang === "th" ? "คำถามโปรด" : "Favorite prompts"}
              </Typography>
              <Tooltip
                title={lang === "th" ? "ซ่อนคำถามโปรด" : "Hide favorites"}
              >
                <IconButton
                  size="small"
                  onClick={() => setFavoriteHidden(true)}
                  sx={{
                    width: 22,
                    height: 22,
                    color: "text.disabled",
                    "&:hover": {
                      color: "text.secondary",
                      bgcolor: "action.hover",
                    },
                  }}
                >
                  <CloseIcon sx={{ fontSize: 14 }} />
                </IconButton>
              </Tooltip>
            </Box>

            <Box
              sx={{
                display: "flex",
                gap: 0.75,
                flexWrap: "wrap",
              }}
            >
              {favoritePrompts.map((favoritePrompt, idx) => (
                <Box
                  key={`fav-${idx}-${favoritePrompt}`}
                  component={motion.div}
                  onClick={() => handleSuggestionClick(favoritePrompt)}
                  {...(isLoading ? {} : chipHoverMotion)}
                  sx={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 0.5,
                    px: 1,
                    py: 0.45,
                    borderRadius: "16px",
                    border: "1px solid",
                    borderColor: isDark
                      ? alpha(theme.palette.warning.main, 0.5)
                      : alpha(theme.palette.warning.dark, 0.35),
                    bgcolor: isDark
                      ? alpha(theme.palette.warning.main, 0.14)
                      : alpha(theme.palette.warning.light, 0.18),
                    color: isDark
                      ? theme.palette.warning.light
                      : theme.palette.warning.dark,
                    fontSize: "0.73rem",
                    lineHeight: 1.4,
                    cursor: isLoading ? "default" : "pointer",
                    opacity: isLoading ? 0.5 : 1,
                    transition: "all 0.18s ease",
                    userSelect: "none",
                  }}
                >
                  <Tooltip
                    title={
                      lang === "th" ? "ลบจากคำถามโปรด" : "Remove from favorites"
                    }
                  >
                    <span>
                      <IconButton
                        size="small"
                        onClick={(event) =>
                          handleToggleFavoritePrompt(event, favoritePrompt)
                        }
                        disabled={
                          !!favoriteToggling[normalizePromptKey(favoritePrompt)]
                        }
                        sx={{
                          width: 16,
                          height: 16,
                          p: 0,
                          color: "warning.main",
                          "&:hover": {
                            bgcolor: "transparent",
                            color: "warning.dark",
                          },
                        }}
                      >
                        <StarIcon sx={{ fontSize: 13 }} />
                      </IconButton>
                    </span>
                  </Tooltip>
                  {favoritePrompt}
                </Box>
              ))}
            </Box>
          </Box>
        )}

        {/* Quick-pick suggestion chips */}
        {suggestions.length > 0 &&
          !suggestionsLoading &&
          !suggestionsHidden && (
            <Box
              sx={{
                mb: 0.75,
                display: "flex",
                flexDirection: "column",
                gap: 0.6,
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 1,
                }}
              >
                <Typography
                  variant="caption"
                  sx={{
                    color: "text.secondary",
                    fontSize: "0.68rem",
                    fontWeight: 700,
                  }}
                >
                  {lang === "th" ? "คำถามแนะนำ" : "Suggested questions"}
                </Typography>
                <Tooltip
                  title={lang === "th" ? "ซ่อนคำถามแนะนำ" : "Hide suggestions"}
                >
                  <IconButton
                    size="small"
                    onClick={() => setSuggestionsHidden(true)}
                    sx={{
                      width: 22,
                      height: 22,
                      color: "text.disabled",
                      "&:hover": {
                        color: "text.secondary",
                        bgcolor: "action.hover",
                      },
                    }}
                  >
                    <CloseIcon sx={{ fontSize: 14 }} />
                  </IconButton>
                </Tooltip>
              </Box>

              <Box
                sx={{
                  display: "flex",
                  gap: 0.75,
                  flexWrap: "wrap",
                }}
              >
                {suggestions.map((suggestion, idx) => (
                  <Box
                    key={idx}
                    component={motion.div}
                    onClick={() => handleSuggestionClick(suggestion)}
                    {...(isLoading ? {} : chipHoverMotion)}
                    sx={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 0.35,
                      px: 1.25,
                      py: 0.5,
                      borderRadius: "16px",
                      border: "1px solid",
                      borderColor: isDark
                        ? alpha(theme.palette.primary.main, 0.4)
                        : alpha(theme.palette.primary.main, 0.28),
                      bgcolor: isDark
                        ? alpha(theme.palette.primary.main, 0.1)
                        : alpha(theme.palette.primary.main, 0.05),
                      color: "primary.main",
                      fontSize: "0.73rem",
                      lineHeight: 1.4,
                      cursor: isLoading ? "default" : "pointer",
                      opacity: isLoading ? 0.5 : 1,
                      transition: "all 0.18s ease",
                      userSelect: "none",
                      "&:hover": isLoading
                        ? {}
                        : {
                            bgcolor: isDark
                              ? alpha(theme.palette.primary.main, 0.2)
                              : alpha(theme.palette.primary.main, 0.12),
                            borderColor: "primary.main",
                            boxShadow: `0 2px 8px ${alpha(theme.palette.primary.main, 0.22)}`,
                          },
                    }}
                  >
                    <IconButton
                      size="small"
                      onClick={(event) =>
                        handleToggleFavoritePrompt(event, suggestion)
                      }
                      disabled={
                        !!favoriteToggling[normalizePromptKey(suggestion)]
                      }
                      sx={{
                        width: 16,
                        height: 16,
                        color: isFavoritePrompt(suggestion)
                          ? "warning.main"
                          : "text.disabled",
                        p: 0,
                        mr: 0.2,
                        "&:hover": {
                          bgcolor: "transparent",
                          color: "warning.main",
                        },
                      }}
                    >
                      {isFavoritePrompt(suggestion) ? (
                        <StarIcon sx={{ fontSize: 13 }} />
                      ) : (
                        <StarBorderIcon sx={{ fontSize: 13 }} />
                      )}
                    </IconButton>
                    {suggestion}
                  </Box>
                ))}
              </Box>
            </Box>
          )}

        {(favoriteHidden || suggestionsHidden) && (
          <Box
            sx={{
              mb: 0.75,
              display: "flex",
              gap: 0.6,
              flexWrap: "wrap",
            }}
          >
            {favoriteHidden && favoritePrompts.length > 0 && (
              <Button
                size="small"
                variant="text"
                onClick={() => setFavoriteHidden(false)}
                sx={{
                  minHeight: 24,
                  px: 1,
                  borderRadius: "12px",
                  textTransform: "none",
                  fontSize: "0.72rem",
                  color: "warning.main",
                  bgcolor: isDark
                    ? alpha(theme.palette.warning.main, 0.12)
                    : alpha(theme.palette.warning.light, 0.22),
                  "&:hover": {
                    bgcolor: isDark
                      ? alpha(theme.palette.warning.main, 0.2)
                      : alpha(theme.palette.warning.light, 0.32),
                  },
                }}
              >
                {lang === "th" ? "แสดงคำถามโปรด" : "Show favorites"}
              </Button>
            )}

            {suggestionsHidden && suggestions.length > 0 && (
              <Button
                size="small"
                variant="text"
                onClick={() => setSuggestionsHidden(false)}
                sx={{
                  minHeight: 24,
                  px: 1,
                  borderRadius: "12px",
                  textTransform: "none",
                  fontSize: "0.72rem",
                  color: "primary.main",
                  bgcolor: isDark
                    ? alpha(theme.palette.primary.main, 0.12)
                    : alpha(theme.palette.primary.main, 0.12),
                  "&:hover": {
                    bgcolor: isDark
                      ? alpha(theme.palette.primary.main, 0.2)
                      : alpha(theme.palette.primary.main, 0.2),
                  },
                }}
              >
                {lang === "th" ? "แสดงคำถามแนะนำ" : "Show suggestions"}
              </Button>
            )}
          </Box>
        )}

        {/* Pill-shaped input container */}
        <Paper
          elevation={0}
          sx={{
            display: "flex",
            alignItems: "flex-end",
            gap: 0.5,
            borderRadius: "26px",
            border: "1.5px solid",
            borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
            pl: allowFileAttachment || speechSupported ? 1.5 : 2,
            pr: "6px",
            py: "6px",
            bgcolor: isDark ? "rgba(255,255,255,0.04)" : "#F6F7FA",
            transition: "all 0.2s ease",
            "&:focus-within": {
              borderColor: "primary.main",
              boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.14)}`,
              bgcolor: isDark ? "rgba(255,255,255,0.07)" : "#fff",
            },
          }}
        >
          {/* Mic button — speech-to-text using Web Speech API */}
          {speechSupported && (
            <Tooltip
              title={
                lang === "th"
                  ? isListening
                    ? "หยุดฟัง"
                    : "พูดคำถาม"
                  : isListening
                    ? "Stop listening"
                    : "Voice input"
              }
            >
              <span>
                <IconButton
                  size="small"
                  disabled={isLoading}
                  onClick={handleToggleMic}
                  sx={{
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    flexShrink: 0,
                    color: isListening ? "error.main" : "action.active",
                    bgcolor: isListening
                      ? alpha(theme.palette.error.main, 0.1)
                      : "transparent",
                    transition: "all 0.2s ease",
                    "&:hover": {
                      bgcolor: isListening
                        ? alpha(theme.palette.error.main, 0.2)
                        : "action.hover",
                    },
                    ...(isListening && {
                      "@keyframes micPulse": {
                        "0%,100%": {
                          boxShadow: `0 0 0 0 ${alpha(theme.palette.error.main, 0.4)}`,
                        },
                        "50%": { boxShadow: "0 0 0 6px transparent" },
                      },
                      animation: "micPulse 1.2s infinite",
                    }),
                  }}
                >
                  {isListening ? (
                    <StopIcon sx={{ fontSize: 17 }} />
                  ) : (
                    <MicIcon sx={{ fontSize: 17 }} />
                  )}
                </IconButton>
              </span>
            </Tooltip>
          )}

          {/* Paperclip button — hidden when provider has allow_file_attachment = false */}
          {allowFileAttachment && (
            <Tooltip title={lang === "th" ? "แนบรูปภาพ" : "Attach image"}>
              <Box
                component={motion.div}
                {...(isLoading ? {} : iconHoverMotion)}
              >
                <span>
                  <IconButton
                    size="small"
                    disabled={isLoading}
                    onClick={() => fileInputRef.current?.click()}
                    sx={{
                      width: 32,
                      height: 32,
                      borderRadius: "50%",
                      flexShrink: 0,
                      color: attachmentFile ? "primary.main" : "action.active",
                      transition: "all 0.2s ease",
                      "&:hover": { bgcolor: "action.hover" },
                    }}
                  >
                    <AttachFileIcon sx={{ fontSize: 17 }} />
                  </IconButton>
                </span>
              </Box>
            </Tooltip>
          )}

          <TextField
            inputRef={inputRef}
            fullWidth
            placeholder={
              lang === "th" ? "พิมพ์คำถามของคุณที่นี่..." : "Ask a question..."
            }
            value={inputValue}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            disabled={isLoading}
            multiline
            maxRows={4}
            variant="standard"
            sx={{
              "& .MuiInputBase-root": {
                fontSize: "0.875rem",
                lineHeight: 1.6,
                "&::before, &::after": { display: "none" },
              },
            }}
          />
          <Tooltip title={lang === "th" ? "ส่ง (Enter)" : "Send (Enter)"}>
            <Box
              component={motion.div}
              {...(!inputValue.trim() || isLoading ? {} : iconHoverMotion)}
            >
              <span>
                <IconButton
                  onClick={handleSend}
                  disabled={!inputValue.trim() || isLoading}
                  size="small"
                  sx={{
                    width: 38,
                    height: 38,
                    borderRadius: "18px",
                    flexShrink: 0,
                    bgcolor:
                      inputValue.trim() && !isLoading
                        ? "primary.main"
                        : "action.disabledBackground",
                    color:
                      inputValue.trim() && !isLoading
                        ? "#fff"
                        : "action.disabled",
                    transition: "all 0.2s ease",
                    "&:hover": {
                      bgcolor:
                        inputValue.trim() && !isLoading
                          ? "primary.dark"
                          : "action.disabledBackground",
                    },
                    boxShadow:
                      inputValue.trim() && !isLoading
                        ? `0 4px 12px ${alpha(theme.palette.primary.main, 0.38)}`
                        : "none",
                  }}
                >
                  <SendIcon sx={{ fontSize: 17 }} />
                </IconButton>
              </span>
            </Box>
          </Tooltip>
        </Paper>

        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            mt: 0.75,
            px: 0.5,
          }}
        >
          <Typography
            variant="caption"
            sx={{ color: "text.disabled", fontSize: "0.65rem" }}
          >
            {lang === "th"
              ? "Enter เพื่อส่ง · Shift+Enter เพื่อขึ้นบรรทัดใหม่"
              : "Enter to send · Shift+Enter for new line"}
          </Typography>
          <Typography
            variant="caption"
            sx={{
              fontSize: "0.65rem",
              color:
                inputValue.length >= 950
                  ? inputValue.length >= 1000
                    ? "error.main"
                    : "warning.main"
                  : "text.disabled",
              fontVariantNumeric: "tabular-nums",
              transition: "color 0.2s ease",
            }}
          >
            {inputValue.length}/1000
          </Typography>
        </Box>

        {/* AI Disclaimer */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 0.4,
            mt: 0.4,
          }}
        >
          <InfoOutlinedIcon
            sx={{
              fontSize: "0.65rem",
              color: "text.disabled",
              opacity: 0.7,
            }}
          />
          <Typography
            variant="caption"
            sx={{
              fontSize: "0.62rem",
              color: "text.disabled",
              opacity: 0.7,
              textAlign: "center",
              lineHeight: 1.3,
            }}
          >
            {lang === "th"
              ? "AI อาจให้ข้อมูลที่ผิดพลาดได้ ควรตรวจสอบข้อมูลที่สำคัญ"
              : "AI can make mistakes. Check important info."}
          </Typography>
        </Box>
      </Box>
    </>
  );
  // Render compact popover or fullscreen dialog

  const snackbarContent = (
    <Snackbar
      open={toast.open}
      autoHideDuration={2600}
      onClose={() => setToast((prev) => ({ ...prev, open: false }))}
      anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
    >
      <Alert
        onClose={() => setToast((prev) => ({ ...prev, open: false }))}
        severity={toast.severity}
        variant="filled"
        sx={{ width: "100%", fontSize: "0.8rem" }}
      >
        {toast.message}
      </Alert>
    </Snackbar>
  );

  if (embedded) {
    return (
      <>
        <Paper
          elevation={0}
          sx={{
            height: { xs: "calc(100dvh - 210px)", md: "calc(100dvh - 250px)" },
            minHeight: 620,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 2,
            bgcolor: isDark ? "background.default" : "#F3F4F8",
          }}
        >
          {chatContent}
        </Paper>
        {snackbarContent}
      </>
    );
  }

  return (
    <>
      {/* Compact Panel Mode */}
      <Popover
        open={open && !isExpanded}
        anchorEl={anchorEl}
        anchorReference="none"
        // onClose intentionally omitted to prevent closing on outside click
        keepMounted
        TransitionProps={{
          onEntered: () => forceAutoScroll("auto"),
        }}
        disableEnforceFocus
        disableAutoFocus
        disableRestoreFocus
        disableScrollLock
        sx={{ pointerEvents: "none" }}
        PaperProps={{
          sx: {
            pointerEvents: "auto",
            position: "fixed !important",
            width: { xs: "95vw", sm: popoverSize.width },
            height: { xs: "calc(100dvh - 56px)", sm: popoverSize.height },
            top: {
              xs: "56px !important",
              sm: `${popoverPos.top}px !important`,
            },
            left: {
              xs: "auto !important",
              sm: `${popoverPos.left}px !important`,
            },
            right: { xs: "0 !important", sm: "auto !important" },
            margin: "0 !important",
            borderRadius: { xs: "12px", sm: "14px" },
            boxShadow: isDark
              ? "0 8px 40px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.06)"
              : "0 8px 32px rgba(0,0,0,0.14), 0 0 0 1px rgba(0,0,0,0.04)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            zIndex: 1302,
          },
        }}
      >
        <Box
          sx={{
            position: "relative",
            flex: 1,
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
          }}
        >
          {chatContent}

          {/* ── Left-edge resize handle ── */}
          <Box
            onPointerDown={handleResizePointerDown("left")}
            onPointerMove={handleResizePointerMove}
            onPointerUp={handleResizePointerUp}
            sx={{
              position: "absolute",
              left: 0,
              top: 20,
              bottom: 20,
              width: 6,
              cursor: "ew-resize",
              zIndex: 1400,
              borderRadius: "0 3px 3px 0",
              transition: "background 0.15s",
              "&:hover": {
                bgcolor: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)",
              },
            }}
          />

          {/* ── Bottom-edge resize handle ── */}
          <Box
            onPointerDown={handleResizePointerDown("bottom")}
            onPointerMove={handleResizePointerMove}
            onPointerUp={handleResizePointerUp}
            sx={{
              position: "absolute",
              bottom: 0,
              left: 20,
              right: 20,
              height: 6,
              cursor: "ns-resize",
              zIndex: 1400,
              borderRadius: "3px 3px 0 0",
              transition: "background 0.15s",
              "&:hover": {
                bgcolor: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)",
              },
            }}
          />

          {/* ── Bottom-left corner resize handle ── */}
          <Box
            onPointerDown={handleResizePointerDown("corner")}
            onPointerMove={handleResizePointerMove}
            onPointerUp={handleResizePointerUp}
            sx={{
              position: "absolute",
              bottom: 0,
              left: 0,
              width: 20,
              height: 20,
              cursor: "sw-resize",
              zIndex: 1401,
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "flex-start",
              pb: "3px",
              pl: "3px",
              "& svg": { opacity: 0.28, transition: "opacity 0.15s" },
              "&:hover svg": { opacity: 0.65 },
            }}
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <circle cx="2" cy="8" r="1.2" fill="currentColor" />
              <circle cx="5" cy="8" r="1.2" fill="currentColor" />
              <circle cx="8" cy="8" r="1.2" fill="currentColor" />
              <circle cx="2" cy="5" r="1.2" fill="currentColor" />
              <circle cx="5" cy="5" r="1.2" fill="currentColor" />
              <circle cx="2" cy="2" r="1.2" fill="currentColor" />
            </svg>
          </Box>
        </Box>
      </Popover>

      {/* Expanded Fullscreen Mode */}
      <Dialog
        open={open && isExpanded}
        onClose={onClose}
        fullScreen
        keepMounted
        TransitionProps={{
          onEntered: () => forceAutoScroll("auto"),
        }}
        PaperProps={{
          sx: {
            display: "flex",
            flexDirection: "column",
            bgcolor: isDark ? "background.default" : "#F3F4F8",
          },
        }}
      >
        {chatContent}
      </Dialog>

      {snackbarContent}
    </>
  );
}
