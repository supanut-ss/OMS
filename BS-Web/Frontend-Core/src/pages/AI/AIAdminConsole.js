import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  Grid,
  IconButton,
  InputAdornment,
  LinearProgress,
  MenuItem,
  Paper,
  Skeleton,
  Stack,
  Switch,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import DataObjectIcon from "@mui/icons-material/DataObject";
import DescriptionIcon from "@mui/icons-material/Description";
import ForumIcon from "@mui/icons-material/Forum";
import HubIcon from "@mui/icons-material/Hub";
import ListAltIcon from "@mui/icons-material/ListAlt";
import ManageSearchIcon from "@mui/icons-material/ManageSearch";
import MemoryIcon from "@mui/icons-material/Memory";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import RefreshIcon from "@mui/icons-material/Refresh";
import RouteIcon from "@mui/icons-material/Route";
import SettingsSuggestIcon from "@mui/icons-material/SettingsSuggest";
import StorageIcon from "@mui/icons-material/Storage";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import TuneIcon from "@mui/icons-material/Tune";
import DownloadIcon from "@mui/icons-material/Download";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import VisibilityIcon from "@mui/icons-material/Visibility";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import AiChatPopover from "../../components/AiChatPopover";
import BSDataGrid from "../../components/BSDataGrid";
import { encryptAiSecret, maskAiSecret } from "../../utils/aiSecretCrypto";
import AxiosMaster from "../../utils/AxiosMaster";
import SecureStorage from "../../utils/SecureStorage";

const DEFAULT_PERMISSION = {
  is_view: true,
  is_add: true,
  is_edit: true,
  is_delete: true,
};

const ADMIN_CHAT_PROCESS = "/ai/admin-chat";
const ADMIN_CHAT_SYSTEM_PROMPT_ID = 1009;
const ADMIN_CHAT_PROMPT_NAME = "DBA Role System Prompt (CRUD)";

const SECTIONS = [
  {
    value: "overview",
    label: "Overview",
    icon: <AutoAwesomeIcon fontSize="small" />,
  },
  {
    value: "admin-chat",
    label: "Admin Chat",
    icon: <ForumIcon fontSize="small" />,
  },
  {
    value: "provider-config",
    label: "Provider",
    icon: <SettingsSuggestIcon fontSize="small" />,
  },
  {
    value: "page-config",
    label: "Prompt & Page",
    icon: <RouteIcon fontSize="small" />,
  },
  {
    value: "knowledge-documents",
    label: "Documents",
    icon: <DescriptionIcon fontSize="small" />,
  },
  {
    value: "schema-knowledge",
    label: "Schema",
    icon: <StorageIcon fontSize="small" />,
  },
  { value: "logs", label: "Logs", icon: <VisibilityIcon fontSize="small" /> },
];

const TABLES = {
  providers: {
    title: "Chat Provider Config",
    description: "Configure AI chat provider endpoints and connection settings",
    icon: <SettingsSuggestIcon fontSize="small" />,
    iconColor: "primary",
    dialogSize: "Large",
    dialogColumns: 2,
    table: "t_ai_provider_config",
    primaryKeys: ["provider_config_id"],
    hiddenColumns: ["provider_config_id"],
    cols: "provider_config_id,provider_name,base_url,chat_endpoint,api_key,timeout_seconds,allow_file_attachment,allowed_file_types,is_active,create_by,create_date,update_by,update_date",
    columnDefs: {
      chat_endpoint: {
        headerName: "Chat Endpoint",
        showInAdd: true,
        defaultValue: "/api/v1/chat/completions",
        description:
          "API path for chat completions (default: /api/v1/chat/completions)",
      },
      timeout_seconds: {
        headerName: "Timeout (seconds)",
        showInAdd: true,
        defaultValue: 60,
        description: "Request timeout in seconds (default: 60)",
      },
      api_key: {
        headerName: "API Key",
        type: "password",
        renderCell: (params) => {
          const val = params.value;
          if (!val || val === "") {
            return (
              <Chip
                label="Not Set"
                size="small"
                color="default"
                variant="outlined"
              />
            );
          }
          return (
            <Tooltip title={maskAiSecret(val)} arrow>
              <Chip
                label="✓ Set"
                size="small"
                color="success"
                variant="outlined"
              />
            </Tooltip>
          );
        },
        description: "Stored encrypted in the database and masked in the grid.",
      },
    },
    dataTransform: (data) => {
      if (!data || typeof data !== "object") return data;
      const apiKey = data.api_key;
      if (apiKey === undefined || apiKey === null || apiKey === "") {
        return data;
      }

      return {
        ...data,
        api_key: encryptAiSecret(apiKey),
      };
    },
    details: ["priorities"],
  },
  priorities: {
    title: "Model Priority",
    description: "Define model priority order for each provider",
    icon: <TrendingUpIcon fontSize="small" />,
    iconColor: "primary",
    dialogSize: "Default",
    dialogColumns: 2,
    table: "t_ai_model_priority",
    foreignKeys: ["provider_config_id"],
    cols: "provider_config_id,model_name,priority_order,is_active,create_by,create_date,update_by,update_date",
  },
  embeddingProviders: {
    title: "Embedding Provider Config",
    description: "Configure vector embedding providers for knowledge retrieval",
    icon: <MemoryIcon fontSize="small" />,
    iconColor: "secondary",
    dialogSize: "Large",
    dialogColumns: 2,
    table: "t_ai_embedding_provider_config",
    cols: "provider_name,base_url,embedding_endpoint,embedding_model,api_key_env_name,dimension,timeout_seconds,description,is_active,create_by,create_date,update_by,update_date",
  },
  prompts: {
    title: "System Prompt",
    description: "Manage system prompts that define AI assistant behavior",
    icon: <AutoAwesomeIcon fontSize="small" />,
    iconColor: "warning",
    dialogSize: "Large",
    dialogColumns: 2,
    table: "t_ai_system_prompt",
    primaryKeys: ["system_prompt_id"],
    hiddenColumns: ["system_prompt_id"],
    cols: "system_prompt_id,prompt_name,system_prompt,description,is_active,create_by,create_date,update_by,update_date",
    details: ["pages"],
  },
  pages: {
    title: "Page Config",
    description:
      "Configure page-level AI assistant settings and allowed tables",
    icon: <RouteIcon fontSize="small" />,
    iconColor: "info",
    dialogSize: "Large",
    dialogColumns: 2,
    table: "t_ai_page_config",
    foreignKeys: ["system_prompt_id"],
    cols: "process,page_name,sub_system_prompt,allowed_tables,allowed_columns,sample_queries,system_prompt_id,is_active,create_by,create_date,update_by,update_date",
  },
  documents: {
    title: "Knowledge Documents",
    description: "Source documents for the RAG knowledge base",
    icon: <DescriptionIcon fontSize="small" />,
    iconColor: "success",
    dialogSize: "Large",
    dialogColumns: 2,
    hideAdd: true,
    table: "t_ai_knowledge_document",
    primaryKeys: ["knowledge_document_id"],
    hiddenColumns: ["knowledge_document_id"],
    cols: "knowledge_document_id,doc_type,title,content,process,module_name,schema_name,table_name,source_path,source_version,source_hash,language_code,is_generated,is_active,create_by,create_date,update_by,update_date",
    details: ["chunks"],
  },
  chunks: {
    title: "Knowledge Chunks",
    description: "Chunked text segments derived from knowledge documents",
    icon: <DataObjectIcon fontSize="small" />,
    iconColor: "secondary",
    dialogSize: "Large",
    dialogColumns: 2,
    table: "t_ai_knowledge_chunk",
    foreignKeys: ["knowledge_document_id"],
    cols: "knowledge_document_id,chunk_index,chunk_title,chunk_content,embedding_text,embedding_provider,embedding_model,embedding_dimension,content_hash,token_count,is_embedded,is_active,create_date,update_date",
    details: ["chunkTokens"],
  },
  chunkTokens: {
    title: "Chunk Token Index",
    description: "Token index for BM25 full-text search on knowledge chunks",
    icon: <ListAltIcon fontSize="small" />,
    iconColor: "default",
    dialogSize: "Default",
    dialogColumns: 2,
    table: "t_ai_knowledge_chunk_token",
    foreignKeys: ["knowledge_chunk_id"],
    cols: "knowledge_chunk_id,token,token_weight,create_date",
    readonly: true,
  },
  schemaCatalog: {
    title: "Schema Catalog",
    description: "Database schema metadata used by AI for SQL generation",
    icon: <StorageIcon fontSize="small" />,
    iconColor: "info",
    dialogSize: "Large",
    dialogColumns: 3,
    table: "t_ai_schema_catalog",
    cols: "schema_name,table_name,table_description,column_name,column_description,data_type,max_length,precision_value,scale_value,is_nullable,is_primary_key,is_identity,object_id,column_id,metadata_hash,last_synced_date,is_active",
    orderBy: "schema_name asc, table_name asc, column_id asc",
  },
  schemaRelation: {
    title: "Schema Relations",
    description: "Foreign key relationships between database tables",
    icon: <HubIcon fontSize="small" />,
    iconColor: "info",
    dialogSize: "Large",
    dialogColumns: 2,
    table: "t_ai_schema_relation",
    cols: "foreign_key_name,parent_schema_name,parent_table_name,parent_column_name,referenced_schema_name,referenced_table_name,referenced_column_name,relation_description,object_id,constraint_column_id,last_synced_date,is_active",
    orderBy:
      "parent_schema_name asc, parent_table_name asc, foreign_key_name asc",
  },
  chatLog: {
    title: "Chat Log",
    description: "AI conversation history and token usage statistics",
    icon: <ForumIcon fontSize="small" />,
    iconColor: "default",
    dialogSize: "Large",
    dialogColumns: 2,
    table: "t_ai_chat_log",
    primaryKeys: ["ai_chat_log_id"],
    hiddenColumns: ["ai_chat_log_id"],
    cols: "ai_chat_log_id,process,user_id,user_message,ai_response,system_prompt_id,ai_config_id,ai_decision,generated_sql,prompt_tokens,completion_tokens,total_tokens,processing_time_ms,is_success,error_message,model_name,create_date",
    readonly: true,
    details: ["retrievalLog"],
  },
  retrievalLog: {
    title: "Retrieval Log",
    description: "Knowledge retrieval records for each AI query",
    icon: <ManageSearchIcon fontSize="small" />,
    iconColor: "default",
    dialogSize: "Large",
    dialogColumns: 2,
    table: "t_ai_knowledge_retrieval_log",
    foreignKeys: ["ai_chat_log_id"],
    cols: "ai_chat_log_id,knowledge_chunk_id,schema_catalog_id,schema_relation_id,retrieval_mode,similarity_score,rank_order,process,query_text,create_date",
    readonly: true,
  },
};

const tableGroups = {
  "provider-config": [TABLES.providers, TABLES.embeddingProviders],
  "page-config": [TABLES.prompts],
  "knowledge-documents": [TABLES.documents],
  "schema-knowledge": [TABLES.schemaCatalog, TABLES.schemaRelation],
  logs: [TABLES.chatLog],
};

const AIAdminConsole = ({ lang = "en", section = "overview" }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const outlet = useOutletContext() || {};
  const permission = outlet.permission || DEFAULT_PERMISSION;
  const [activeSection, setActiveSection] = useState(section);
  const [schemaSubTab, setSchemaSubTab] = useState("catalog");
  useEffect(() => {
    setActiveSection(section);
    setSchemaSubTab("catalog");
  }, [section]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);
  useEffect(() => {
    if (!message) return;
    const autoClose = !["error", "warning"].includes(message.severity);
    if (!autoClose) return;
    const t = setTimeout(() => setMessage(null), 10000);
    return () => clearTimeout(t);
  }, [message]);
  const [documentDialogOpen, setDocumentDialogOpen] = useState(false);
  const [preview, setPreview] = useState(null);
  const [documentForm, setDocumentForm] = useState(EMPTY_DOCUMENT_FORM);
  const [previewForm, setPreviewForm] = useState({
    process: "/master/item",
    query: "ช่วยอธิบายข้อมูล item",
  });

  const currentTables = useMemo(
    () => tableGroups[activeSection] || [],
    [activeSection],
  );

  const changeSection = (_, value) => {
    setActiveSection(value);
    navigate(`/ai/${value}`);
  };

  const runAction = async (label, fn) => {
    setBusy(true);
    setMessage(null);
    try {
      const result = await fn();
      setMessage({ severity: "success", text: `${label} completed.` });
      return result;
    } catch (error) {
      const text =
        error?.response?.data?.error_message ||
        error?.response?.data?.message ||
        error.message ||
        `${label} failed.`;
      setMessage({ severity: "error", text });
      return null;
    } finally {
      setBusy(false);
    }
  };

  const createDocument = () =>
    runAction("Create document", async () => {
      const { data } = await AxiosMaster.post(
        "/ai/knowledge/documents",
        documentForm,
      );
      if (!data?.success)
        throw new Error(data?.error_message || "Create document failed.");
      setDocumentDialogOpen(false);
      return data;
    });

  const rebuildChunks = () =>
    runAction("Rebuild chunks", async () => {
      const { data } = await AxiosMaster.post(
        "/ai/knowledge/rebuild-chunks",
        {},
      );
      if (!data?.success)
        throw new Error(data?.error_message || "Rebuild chunks failed.");
      return data;
    });

  const rebuildEmbeddings = () =>
    runAction("Rebuild embeddings", async () => {
      const { data } = await AxiosMaster.post(
        "/ai/knowledge/rebuild-embeddings",
        {},
      );
      if (!data?.success)
        throw new Error(data?.error_message || "Rebuild embeddings failed.");
      return data;
    });

  const syncSchema = () =>
    runAction("Sync schema", async () => {
      const { data } = await AxiosMaster.post("/ai/knowledge/sync-schema", {});
      if (!data?.success)
        throw new Error(data?.error_message || "Sync schema failed.");
      return data;
    });

  const previewRetrieval = () =>
    runAction("Retrieval preview", async () => {
      const { data } = await AxiosMaster.get(
        "/ai/knowledge/retrieval-preview",
        {
          params: previewForm,
        },
      );
      if (!data?.success)
        throw new Error(data?.error_message || "Retrieval preview failed.");
      setPreview(data);
      return data;
    });

  return (
    <Box sx={{ width: "100%", p: { xs: 1, md: 2 } }}>
      <Stack spacing={2}>
        <Paper
          elevation={0}
          sx={{
            p: 2,
            border: `1px solid ${theme.palette.divider}`,
            bgcolor: alpha(theme.palette.primary.main, 0.035),
          }}
        >
          <Stack
            direction={{ xs: "column", md: "row" }}
            alignItems={{ xs: "flex-start", md: "center" }}
            justifyContent="space-between"
            spacing={2}
          >
            <Box>
              <Stack direction="row" spacing={1} alignItems="center">
                <AutoAwesomeIcon color="primary" />
                <Typography variant="h5" fontWeight={700}>
                  AI Control Center
                </Typography>
              </Stack>
              <Typography variant="body2" color="text.secondary">
                Configure providers, prompts, RAG knowledge, schema context, and
                audit logs.
              </Typography>
            </Box>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {/* <Chip
                icon={<HubIcon />}
                label="External embeddings"
                color="primary"
                variant="outlined"
              />
              <Chip
                icon={<DataObjectIcon />}
                label="Vector + token index"
                color="success"
                variant="outlined"
              />
              <Chip
                icon={<HubIcon />}
                label="Master-detail admin"
                color="default"
                variant="outlined"
              /> */}
            </Stack>
          </Stack>
        </Paper>

        <Paper
          elevation={0}
          sx={{ border: `1px solid ${theme.palette.divider}` }}
        >
          <Tabs
            value={activeSection}
            onChange={changeSection}
            variant="scrollable"
            scrollButtons="auto"
            sx={{ px: 1, borderBottom: `1px solid ${theme.palette.divider}` }}
          >
            {SECTIONS.map((item) => (
              <Tab
                key={item.value}
                value={item.value}
                icon={item.icon}
                iconPosition="start"
                label={item.label}
                sx={{ minHeight: 52 }}
              />
            ))}
          </Tabs>
          {busy && <LinearProgress />}
          {message && (
            <Alert
              severity={message.severity}
              sx={{ m: 2 }}
              onClose={
                ["error", "warning"].includes(message.severity)
                  ? () => setMessage(null)
                  : undefined
              }
            >
              {message.text}
            </Alert>
          )}
        </Paper>

        {activeSection === "overview" && (
          <OverviewPanel
            onSyncSchema={syncSchema}
            onRebuildChunks={rebuildChunks}
            onRebuildEmbeddings={rebuildEmbeddings}
          />
        )}

        {activeSection === "admin-chat" && <AdminChatPanel lang={lang} />}

        {activeSection === "knowledge-documents" && (
          <KnowledgeTools
            onCreate={() => {
              setDocumentForm(EMPTY_DOCUMENT_FORM);
              setDocumentDialogOpen(true);
            }}
            onRebuildChunks={rebuildChunks}
            onRebuildEmbeddings={rebuildEmbeddings}
            permission={permission}
          />
        )}

        {activeSection === "schema-knowledge" && (
          <SchemaTools
            previewForm={previewForm}
            setPreviewForm={setPreviewForm}
            preview={preview}
            onSyncSchema={syncSchema}
            onPreview={previewRetrieval}
          />
        )}

        {activeSection === "schema-knowledge" ? (
          <Paper
            elevation={0}
            sx={{ border: `1px solid ${theme.palette.divider}` }}
          >
            <Tabs
              value={schemaSubTab}
              onChange={(_, v) => setSchemaSubTab(v)}
              sx={{ px: 1, borderBottom: `1px solid ${theme.palette.divider}` }}
            >
              <Tab
                value="catalog"
                icon={<StorageIcon fontSize="small" />}
                iconPosition="start"
                label="Schema Catalog"
                sx={{ minHeight: 44 }}
              />
              <Tab
                value="relations"
                icon={<DataObjectIcon fontSize="small" />}
                iconPosition="start"
                label="Relations"
                sx={{ minHeight: 44 }}
              />
            </Tabs>
            <Box sx={{ p: 0 }}>
              {schemaSubTab === "catalog" && (
                <DataGridPanel
                  key="schema-knowledge-catalog"
                  table={TABLES.schemaCatalog}
                  lang={lang}
                  permission={permission}
                />
              )}
              {schemaSubTab === "relations" && (
                <DataGridPanel
                  key="schema-knowledge-relations"
                  table={TABLES.schemaRelation}
                  lang={lang}
                  permission={permission}
                />
              )}
            </Box>
          </Paper>
        ) : (
          currentTables.map((table) => (
            <DataGridPanel
              key={`${activeSection}-${table.table}`}
              table={table}
              lang={lang}
              permission={permission}
              onAdd={
                table === TABLES.documents
                  ? () => {
                      setDocumentForm(EMPTY_DOCUMENT_FORM);
                      setDocumentDialogOpen(true);
                    }
                  : undefined
              }
              onAfterSave={
                table === TABLES.providers
                  ? () => AxiosMaster.post("/ai/config/refresh").catch(() => {})
                  : undefined
              }
            />
          ))
        )}
      </Stack>

      <DocumentDialog
        open={documentDialogOpen}
        form={documentForm}
        setForm={setDocumentForm}
        onClose={() => setDocumentDialogOpen(false)}
        onSubmit={createDocument}
        busy={busy}
      />
    </Box>
  );
};

const OverviewPanel = ({
  onSyncSchema,
  onRebuildChunks,
  onRebuildEmbeddings,
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const navigate = useNavigate();

  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState(null);

  const fetchStats = async () => {
    setStatsLoading(true);
    setStatsError(null);
    try {
      const { data } = await AxiosMaster.get("/ai/overview-stats");
      // API returns snake_case — normalize to camelCase for the component
      setStats({
        chatProviderName: data.chat_provider_name,
        chatModelName: data.chat_model_name,
        chatProviderActive: data.chat_provider_active,
        embeddingProviderName: data.embedding_provider_name,
        embeddingModel: data.embedding_model,
        embeddingProviderActive: data.embedding_provider_active,
        systemPromptCount: data.system_prompt_count,
        pageConfigCount: data.page_config_count,
        documentCount: data.document_count,
        chunkCount: data.chunk_count,
        embeddedChunkCount: data.embedded_chunk_count,
        schemaTableCount: data.schema_table_count,
        schemaColumnCount: data.schema_column_count,
        lastSchemaSyncDate: data.last_schema_sync_date,
        chatToday: data.chat_today,
        chatTotal: data.chat_total,
        chatSuccessRate: data.chat_success_rate,
        recentLogs: (data.recent_logs ?? []).map((log) => ({
          userMessage: log.user_message,
          modelName: log.model_name,
          isSuccess: log.is_success,
          processingTimeMs: log.processing_time_ms,
          createdDate: log.created_date,
          aiDecision: log.ai_decision,
        })),
      });
    } catch (err) {
      setStatsError(
        err?.response?.data?.errorMessage ||
          err?.response?.data?.message ||
          err.message ||
          "Failed to load stats",
      );
    } finally {
      setStatsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const goTo = (section) => navigate(`/ai/${section}`);

  const statCards = [
    {
      label: "Chat Provider",
      value: stats?.chatProviderName ?? "—",
      sub: stats?.chatModelName ?? "No active provider",
      badge: stats?.chatProviderActive ? "Active" : stats ? "Inactive" : null,
      badgeColor: stats?.chatProviderActive ? "success" : "default",
      icon: <HubIcon sx={{ fontSize: 26 }} />,
      color: theme.palette.primary.main,
      bg: alpha(theme.palette.primary.main, 0.08),
      section: "provider-config",
    },
    {
      label: "Embedding Provider",
      value: stats?.embeddingProviderName ?? "—",
      sub: stats?.embeddingModel ?? "No active provider",
      badge: stats?.embeddingProviderActive
        ? "Active"
        : stats
          ? "Inactive"
          : null,
      badgeColor: stats?.embeddingProviderActive ? "success" : "default",
      icon: <MemoryIcon sx={{ fontSize: 26 }} />,
      color: theme.palette.secondary.main,
      bg: alpha(theme.palette.secondary.main, 0.08),
      section: "provider-config",
    },
    {
      label: "Prompts & Pages",
      value: stats ? `${stats.systemPromptCount ?? 0} prompts` : "—",
      sub: `${stats?.pageConfigCount ?? 0} page configs`,
      badge: null,
      icon: <RouteIcon sx={{ fontSize: 26 }} />,
      color: theme.palette.info.main,
      bg: alpha(theme.palette.info.main, 0.08),
      section: "page-config",
    },
    {
      label: "Knowledge Base",
      value: stats ? `${stats.documentCount ?? 0} docs` : "—",
      sub: stats
        ? `${stats.chunkCount ?? 0} chunks · ${stats.embeddedChunkCount ?? 0} embedded`
        : "Loading...",
      badge:
        stats && stats.chunkCount > 0
          ? `${Math.round(((stats.embeddedChunkCount ?? 0) / stats.chunkCount) * 100)}% indexed`
          : null,
      badgeColor: "success",
      icon: <DescriptionIcon sx={{ fontSize: 26 }} />,
      color: theme.palette.success.main,
      bg: alpha(theme.palette.success.main, 0.08),
      section: "knowledge-documents",
    },
    {
      label: "Schema Context",
      value: stats ? `${stats.schemaTableCount ?? 0} tables` : "—",
      sub: stats
        ? `${stats.schemaColumnCount ?? 0} cols${stats.lastSchemaSyncDate ? ` · synced ${new Date(stats.lastSchemaSyncDate).toLocaleDateString()}` : ""}`
        : "Loading...",
      badge: null,
      icon: <StorageIcon sx={{ fontSize: 26 }} />,
      color: theme.palette.warning.main,
      bg: alpha(theme.palette.warning.main, 0.08),
      section: "schema-knowledge",
    },
    {
      label: "Chat Activity",
      value: stats ? `${stats.chatToday ?? 0} today` : "—",
      sub: stats
        ? `${stats.chatTotal ?? 0} total · ${stats.chatSuccessRate ?? 0}% success`
        : "Loading...",
      badge:
        stats?.chatSuccessRate >= 90
          ? "Healthy"
          : stats?.chatSuccessRate > 0
            ? "Attention"
            : null,
      badgeColor: stats?.chatSuccessRate >= 90 ? "success" : "warning",
      icon: <TrendingUpIcon sx={{ fontSize: 26 }} />,
      color: theme.palette.error.main,
      bg: alpha(theme.palette.error.main, 0.08),
      section: "logs",
    },
  ];

  const pipeline = [
    {
      step: "1",
      title: "Provider",
      body: "Set chat and embedding providers. Keep API keys in environment variables.",
      action: null,
      actionLabel: null,
      icon: <SettingsSuggestIcon />,
      color: theme.palette.primary.main,
      section: "provider-config",
    },
    {
      step: "2",
      title: "Knowledge",
      body: "Upload source documents, split into chunks, and build embeddings for RAG.",
      action: onRebuildChunks,
      actionLabel: "Rebuild Chunks",
      icon: <DescriptionIcon />,
      color: theme.palette.success.main,
      section: "knowledge-documents",
    },
    {
      step: "3",
      title: "Vector Index",
      body: "Refresh embeddings and token index for production-scale hybrid retrieval.",
      action: onRebuildEmbeddings,
      actionLabel: "Rebuild Embeddings",
      icon: <DataObjectIcon />,
      color: theme.palette.warning.main,
      section: "knowledge-documents",
    },
    {
      step: "4",
      title: "Schema Context",
      body: "Sync SQL Server table/column descriptions into the AI schema catalog.",
      action: onSyncSchema,
      actionLabel: "Sync Schema",
      icon: <StorageIcon />,
      color: theme.palette.secondary.main,
      section: "schema-knowledge",
    },
  ];

  return (
    <Stack spacing={2.5}>
      {/* ── System Status stat cards ── */}
      <Box>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{ mb: 1.5 }}
        >
          <Typography
            variant="subtitle2"
            color="text.secondary"
            sx={{
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: 1,
              fontSize: "0.7rem",
            }}
          >
            System Status
          </Typography>
          <Tooltip title="Refresh stats">
            <span>
              <IconButton
                size="small"
                onClick={fetchStats}
                disabled={statsLoading}
              >
                {statsLoading ? (
                  <CircularProgress size={14} />
                ) : (
                  <RefreshIcon sx={{ fontSize: 16 }} />
                )}
              </IconButton>
            </span>
          </Tooltip>
        </Stack>

        {statsError && (
          <Alert severity="warning" sx={{ mb: 1.5 }}>
            {statsError}
          </Alert>
        )}

        <Grid container spacing={2}>
          {statCards.map((card) => (
            <Grid size={{ xs: 12, sm: 6, md: 4, xl: 2 }} key={card.label}>
              <Paper
                elevation={0}
                onClick={() => goTo(card.section)}
                sx={{
                  p: 2,
                  height: "100%",
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 2,
                  position: "relative",
                  overflow: "hidden",
                  cursor: "pointer",
                  transition:
                    "box-shadow 0.2s ease, transform 0.2s ease, border-color 0.2s ease",
                  "&:hover": {
                    boxShadow: theme.shadows[4],
                    transform: "translateY(-2px)",
                    borderColor: card.color,
                  },
                  "&::before": {
                    content: '""',
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 3,
                    bgcolor: card.color,
                    borderRadius: "2px 2px 0 0",
                  },
                }}
              >
                <ArrowForwardIcon
                  sx={{
                    position: "absolute",
                    top: 10,
                    right: 10,
                    fontSize: 13,
                    color: "text.disabled",
                    opacity: 0.5,
                  }}
                />
                <Stack direction="row" spacing={1.5} alignItems="flex-start">
                  <Box
                    sx={{
                      p: 1,
                      borderRadius: 1.5,
                      bgcolor: card.bg,
                      color: card.color,
                      flexShrink: 0,
                      display: "flex",
                    }}
                  >
                    {card.icon}
                  </Box>
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    {statsLoading ? (
                      <>
                        <Skeleton variant="text" width="70%" height={28} />
                        <Skeleton variant="text" width="50%" height={18} />
                        <Skeleton variant="text" width="80%" height={16} />
                      </>
                    ) : (
                      <>
                        <Typography
                          variant="subtitle1"
                          fontWeight={700}
                          sx={{ lineHeight: 1.2, mb: 0.25 }}
                          noWrap
                        >
                          {card.value}
                        </Typography>
                        <Typography
                          variant="caption"
                          fontWeight={600}
                          sx={{ color: card.color, display: "block", mb: 0.3 }}
                        >
                          {card.label}
                        </Typography>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{
                            lineHeight: 1.3,
                            display: "block",
                          }}
                          noWrap
                        >
                          {card.sub}
                        </Typography>
                        {card.badge && (
                          <Chip
                            label={card.badge}
                            color={card.badgeColor}
                            size="small"
                            sx={{ mt: 0.75, fontSize: "0.65rem", height: 18 }}
                          />
                        )}
                      </>
                    )}
                  </Box>
                </Stack>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* ── Recent Chat Activity ── */}
      {(statsLoading || (stats?.recentLogs?.length ?? 0) > 0) && (
        <Box>
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            sx={{ mb: 1.5 }}
          >
            <Typography
              variant="subtitle2"
              color="text.secondary"
              sx={{
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: 1,
                fontSize: "0.7rem",
              }}
            >
              Recent Chat Activity
            </Typography>
            <Button
              size="small"
              endIcon={<ArrowForwardIcon sx={{ fontSize: 14 }} />}
              onClick={() => goTo("logs")}
              sx={{ textTransform: "none", fontSize: "0.75rem" }}
            >
              View all logs
            </Button>
          </Stack>
          <Paper
            elevation={0}
            sx={{
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 2,
              overflow: "hidden",
            }}
          >
            {statsLoading ? (
              <Stack divider={<Divider />}>
                {[1, 2, 3].map((i) => (
                  <Box key={i} sx={{ px: 2, py: 1.25 }}>
                    <Skeleton variant="text" width="60%" />
                    <Skeleton variant="text" width="30%" />
                  </Box>
                ))}
              </Stack>
            ) : (
              <Stack divider={<Divider />}>
                {stats.recentLogs.map((log, i) => (
                  <Box
                    key={i}
                    sx={{
                      px: 2,
                      py: 1.25,
                      display: "flex",
                      alignItems: "center",
                      gap: 1.5,
                      transition: "background-color 0.15s",
                      "&:hover": { bgcolor: "action.hover" },
                    }}
                  >
                    <Box
                      sx={{
                        width: 7,
                        height: 7,
                        borderRadius: "50%",
                        flexShrink: 0,
                        bgcolor: log.isSuccess
                          ? theme.palette.success.main
                          : theme.palette.error.main,
                      }}
                    />
                    <Typography
                      variant="body2"
                      sx={{
                        flex: 1,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {log.userMessage}
                    </Typography>
                    <Stack
                      direction="row"
                      spacing={1}
                      alignItems="center"
                      flexShrink={0}
                    >
                      {log.modelName && (
                        <Chip
                          label={log.modelName}
                          size="small"
                          variant="outlined"
                          sx={{ fontSize: "0.65rem", height: 18 }}
                        />
                      )}
                      {log.processingTimeMs != null && (
                        <Typography variant="caption" color="text.secondary">
                          {log.processingTimeMs}ms
                        </Typography>
                      )}
                      <Typography variant="caption" color="text.disabled">
                        {log.createdDate
                          ? new Date(log.createdDate).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : ""}
                      </Typography>
                    </Stack>
                  </Box>
                ))}
              </Stack>
            )}
          </Paper>
        </Box>
      )}

      {/* ── Pipeline steps ── */}
      <Box>
        <Typography
          variant="subtitle2"
          color="text.secondary"
          sx={{
            mb: 1.5,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: 1,
            fontSize: "0.7rem",
          }}
        >
          Setup Pipeline
        </Typography>
        <Grid container spacing={2}>
          {pipeline.map((item, idx) => (
            <Grid size={{ xs: 12, md: 6, xl: 3 }} key={item.title}>
              <Paper
                elevation={0}
                sx={{
                  p: 2.5,
                  height: "100%",
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 2,
                  position: "relative",
                  overflow: "hidden",
                  bgcolor: isDark
                    ? alpha(item.color, 0.04)
                    : alpha(item.color, 0.02),
                  transition: "box-shadow 0.2s ease",
                  "&:hover": { boxShadow: theme.shadows[3] },
                }}
              >
                {/* Step number background watermark */}
                <Typography
                  sx={{
                    position: "absolute",
                    top: -8,
                    right: 12,
                    fontSize: "4.5rem",
                    fontWeight: 900,
                    color: alpha(item.color, 0.08),
                    lineHeight: 1,
                    userSelect: "none",
                    pointerEvents: "none",
                  }}
                >
                  {item.step}
                </Typography>

                <Stack spacing={1.5}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Box
                      sx={{
                        p: 0.75,
                        borderRadius: 1,
                        bgcolor: alpha(item.color, 0.12),
                        color: item.color,
                        display: "flex",
                      }}
                    >
                      {item.icon}
                    </Box>
                    <Box>
                      <Typography
                        variant="caption"
                        sx={{
                          color: item.color,
                          fontWeight: 700,
                          display: "block",
                          lineHeight: 1,
                        }}
                      >
                        Step {item.step}
                      </Typography>
                      <Typography fontWeight={700} sx={{ lineHeight: 1.2 }}>
                        {item.title}
                      </Typography>
                    </Box>
                  </Stack>

                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ lineHeight: 1.6 }}
                  >
                    {item.body}
                  </Typography>

                  {item.action ? (
                    <Stack direction="row" spacing={1} flexWrap="wrap">
                      <Button
                        startIcon={<PlayArrowIcon />}
                        variant="contained"
                        size="small"
                        onClick={item.action}
                        sx={{
                          bgcolor: item.color,
                          "&:hover": { bgcolor: alpha(item.color, 0.85) },
                          textTransform: "none",
                          fontWeight: 600,
                        }}
                      >
                        {item.actionLabel}
                      </Button>
                      <Button
                        size="small"
                        endIcon={<ArrowForwardIcon sx={{ fontSize: 13 }} />}
                        onClick={() => goTo(item.section)}
                        sx={{
                          textTransform: "none",
                          color: item.color,
                          fontSize: "0.72rem",
                        }}
                      >
                        Go to section
                      </Button>
                    </Stack>
                  ) : (
                    <Stack direction="row" spacing={1} flexWrap="wrap">
                      <Chip
                        size="small"
                        label="Configure in Provider tab"
                        variant="outlined"
                        sx={{
                          borderColor: item.color,
                          color: item.color,
                          fontSize: "0.7rem",
                        }}
                      />
                      <Button
                        size="small"
                        endIcon={<ArrowForwardIcon sx={{ fontSize: 13 }} />}
                        onClick={() => goTo(item.section)}
                        sx={{
                          textTransform: "none",
                          color: item.color,
                          fontSize: "0.72rem",
                        }}
                      >
                        Go to section
                      </Button>
                    </Stack>
                  )}
                </Stack>

                {/* Connector arrow (not last item) */}
                {idx < pipeline.length - 1 && (
                  <Box
                    sx={{
                      display: { xs: "none", xl: "flex" },
                      position: "absolute",
                      right: -10,
                      top: "50%",
                      transform: "translateY(-50%)",
                      zIndex: 1,
                      width: 20,
                      height: 20,
                      bgcolor: "background.paper",
                      border: "1px solid",
                      borderColor: "divider",
                      borderRadius: "50%",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: "0.6rem",
                        lineHeight: 1,
                        color: "text.disabled",
                      }}
                    >
                      ▶
                    </Typography>
                  </Box>
                )}
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Box>
    </Stack>
  );
};

const getStoredUserInfo = () => {
  const stored = SecureStorage.get("userInfo");
  if (!stored) return {};
  if (typeof stored === "string") {
    try {
      return JSON.parse(stored);
    } catch {
      return {};
    }
  }
  return stored;
};

const AdminChatPanel = ({ lang }) => {
  const theme = useTheme();
  const userInfo = useMemo(() => getStoredUserInfo(), []);
  const userId =
    userInfo?.UserId || userInfo?.userId || userInfo?.user_id || "anonymous";
  const userName = [
    userInfo?.FirstName || userInfo?.firstName || userInfo?.first_name,
    userInfo?.LastName || userInfo?.lastName || userInfo?.last_name,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <Stack spacing={2}>
      <Paper
        elevation={0}
        sx={{
          p: 2,
          border: `1px solid ${theme.palette.divider}`,
          bgcolor: alpha(theme.palette.warning.main, 0.045),
        }}
      >
        <Stack
          direction={{ xs: "column", md: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", md: "center" }}
          spacing={1.5}
        >
          <Box>
            <Stack direction="row" spacing={1} alignItems="center">
              <ForumIcon color="warning" />
              <Typography variant="h6" fontWeight={700}>
                Admin Chat
              </Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary">
              AI Agent สำหรับจัดการข้อมูลทั้งระบบ: select, insert, update,
              delete พร้อมขั้นตอนยืนยันก่อนคำสั่งที่แก้ไขข้อมูล
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Chip
              size="small"
              color="warning"
              variant="outlined"
              label={`Prompt #${ADMIN_CHAT_SYSTEM_PROMPT_ID}`}
            />
            <Chip
              size="small"
              color="primary"
              variant="outlined"
              label={ADMIN_CHAT_PROMPT_NAME}
            />
            <Chip
              size="small"
              color="success"
              variant="outlined"
              label="Confirmation enabled"
            />
          </Stack>
        </Stack>
      </Paper>

      {/* <Alert severity="warning" variant="outlined">
        คำสั่ง insert/update/delete จะถูกเสนอเป็นแผนก่อน และต้องกดยืนยันจากผู้ใช้ก่อน execute จริง
      </Alert> */}

      <AiChatPopover
        open
        embedded
        process={ADMIN_CHAT_PROCESS}
        systemPromptId={ADMIN_CHAT_SYSTEM_PROMPT_ID}
        title="Admin Chat"
        greetingText="สวัสดีค่ะ ฉันเป็น Admin Chat Agent ใช้ prompt DBA Role System Prompt (CRUD) สำหรับช่วยจัดการข้อมูลในระบบ"
        userId={userId}
        userName={userName}
        lang={lang}
      />
    </Stack>
  );
};

const KnowledgeTools = ({
  onCreate,
  onRebuildChunks,
  onRebuildEmbeddings,
  permission,
}) => (
  <Paper
    elevation={0}
    sx={{ p: 2, border: "1px solid", borderColor: "divider" }}
  >
    <Stack
      direction={{ xs: "column", md: "row" }}
      spacing={1}
      alignItems={{ md: "center" }}
    >
      <Button
        startIcon={<DescriptionIcon />}
        variant="contained"
        onClick={onCreate}
        disabled={!permission.is_add}
      >
        Add Document
      </Button>
      <Tooltip title="Split active documents and refresh token index">
        <Button
          startIcon={<RefreshIcon />}
          variant="outlined"
          onClick={onRebuildChunks}
        >
          Rebuild Chunks
        </Button>
      </Tooltip>
      <Tooltip title="Recreate embeddings using the active embedding provider">
        <Button
          startIcon={<DataObjectIcon />}
          variant="outlined"
          onClick={onRebuildEmbeddings}
        >
          Rebuild Embeddings
        </Button>
      </Tooltip>
    </Stack>
  </Paper>
);

const SchemaTools = ({
  previewForm,
  setPreviewForm,
  preview,
  onSyncSchema,
  onPreview,
}) => (
  <Paper
    elevation={0}
    sx={{ p: 2, border: "1px solid", borderColor: "divider" }}
  >
    <Grid container spacing={2}>
      <Grid size={{ xs: 12, md: 3 }}>
        <TextField
          label="Process"
          fullWidth
          size="small"
          value={previewForm.process}
          onChange={(e) =>
            setPreviewForm((prev) => ({ ...prev, process: e.target.value }))
          }
        />
      </Grid>
      <Grid size={{ xs: 12, md: 6 }}>
        <TextField
          label="Question"
          fullWidth
          size="small"
          value={previewForm.query}
          onChange={(e) =>
            setPreviewForm((prev) => ({ ...prev, query: e.target.value }))
          }
        />
      </Grid>
      <Grid size={{ xs: 12, md: 3 }}>
        <Stack direction="row" spacing={1}>
          <Button
            startIcon={<StorageIcon />}
            variant="outlined"
            onClick={onSyncSchema}
          >
            Sync
          </Button>
          <Button
            startIcon={<VisibilityIcon />}
            variant="contained"
            onClick={onPreview}
          >
            Preview
          </Button>
        </Stack>
      </Grid>
      {preview && (
        <Grid size={{ xs: 12 }}>
          <Divider sx={{ mb: 2 }} />
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Retrieved Context
          </Typography>
          <Box
            component="pre"
            sx={{
              m: 0,
              p: 2,
              maxHeight: 360,
              overflow: "auto",
              bgcolor: "background.default",
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 1,
              whiteSpace: "pre-wrap",
              fontSize: 12,
            }}
          >
            {preview.formatted_context}
          </Box>
        </Grid>
      )}
    </Grid>
  </Paper>
);

const DataGridPanel = ({ table, lang, permission, onAdd, onAfterSave }) => {
  const theme = useTheme();
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedMasterRow, setSelectedMasterRow] = useState(null);
  const [activeDetailTab, setActiveDetailTab] = useState(0);
  const childGrids = (table.details || []).map((key) => {
    const detail = TABLES[key];
    const detailReadonly = table.readonly || detail.readonly;

    return {
      name: detail.title,
      bsPreObj: "ais",
      bsObj: detail.table,
      bsCols: detail.cols,
      bsColumnDefs: detail.columnDefs || [],
      bsDataTransform: detail.dataTransform,
      bsObjBy: detail.orderBy || "create_date desc",
      foreignKeys: detail.foreignKeys || [],
      bsShowDescColumn: false,
      bsAutoPermission: false,
      showAdd: !detailReadonly && permission.is_add,
      bsVisibleEdit: !detailReadonly && permission.is_edit,
      bsVisibleDelete: !detailReadonly && permission.is_delete,
      bsVisibleView: permission.is_view,
      bsDialogColumns: detail.dialogColumns || 2,
      bsRowPerPage: 10,
      height: 420,
    };
  });

  const openDetail = (row) => {
    setSelectedMasterRow(row);
    setActiveDetailTab(0);
    setDetailOpen(true);
  };

  // Determine icon color palette
  const iconColorMap = {
    primary: theme.palette.primary.main,
    secondary: theme.palette.secondary.main,
    success: theme.palette.success.main,
    warning: theme.palette.warning.main,
    info: theme.palette.info.main,
    default: theme.palette.text.secondary,
  };
  const accentColor = iconColorMap[table.iconColor || "primary"];

  return (
    <Paper
      elevation={0}
      sx={{
        border: "1px solid",
        borderColor: "divider",
        borderLeft: "4px solid",
        borderLeftColor: accentColor,
        overflow: "hidden",
      }}
    >
      {/* Panel Header */}
      <Box sx={{ px: 2, pt: 2, pb: 1.5 }}>
        <Stack
          direction="row"
          spacing={1.5}
          alignItems="flex-start"
          justifyContent="space-between"
        >
          <Stack direction="row" spacing={1.5} alignItems="center">
            {/* Icon box */}
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 36,
                height: 36,
                borderRadius: 1.5,
                bgcolor: alpha(accentColor, 0.12),
                color: accentColor,
                flexShrink: 0,
              }}
            >
              {table.icon}
            </Box>

            {/* Title + description */}
            <Box>
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography variant="subtitle1" fontWeight={700}>
                  {table.title}
                </Typography>
                {childGrids.length > 0 && (
                  <Chip
                    size="small"
                    label={`${childGrids.length} detail tab`}
                    color="primary"
                    variant="outlined"
                  />
                )}
              </Stack>
              {table.description && (
                <Typography variant="caption" color="text.secondary">
                  {table.description}
                </Typography>
              )}
            </Box>
          </Stack>

          {table.readonly && (
            <Chip
              size="small"
              label="read only"
              variant="outlined"
              sx={{ mt: 0.5 }}
            />
          )}
        </Stack>
      </Box>

      <Divider />

      {/* Grid */}
      <Box sx={{ p: 2, pt: 1.5 }}>
        <BSDataGrid
          bsLocale={lang}
          bsPreObj="ais"
          bsObj={table.table}
          bsCols={table.cols}
          bsColumnDefs={table.columnDefs || []}
          bsDataTransform={table.dataTransform}
          bsObjBy={table.orderBy || "create_date desc"}
          bsShowDescColumn={false}
          bsAutoPermission={false}
          bsPrimaryKeys={table.primaryKeys || []}
          bsHiddenColumns={table.hiddenColumns || []}
          bsChildGrids={childGrids}
          bsDialogSize={
            table.dialogSize || (childGrids.length > 0 ? "Large" : "Default")
          }
          bsDialogColumns={table.dialogColumns || 2}
          bsParentRecordLabel={table.title}
          showAdd={!table.readonly && !table.hideAdd && permission.is_add}
          bsAllowAdd={!table.readonly && permission.is_add}
          bsAllowEdit={!table.readonly && permission.is_edit}
          bsVisibleEdit={!table.readonly && permission.is_edit}
          bsAllowDelete={!table.readonly && permission.is_delete}
          bsVisibleDelete={!table.readonly && permission.is_delete}
          bsVisibleView={childGrids.length > 0 && permission.is_view}
          onAdd={onAdd}
          onView={childGrids.length > 0 ? openDetail : undefined}
          bsOnAfterSave={onAfterSave}
        />
      </Box>

      <DetailDialog
        open={detailOpen}
        masterTitle={table.title}
        masterRow={selectedMasterRow}
        childGrids={childGrids}
        activeTab={activeDetailTab}
        setActiveTab={setActiveDetailTab}
        lang={lang}
        onClose={() => setDetailOpen(false)}
      />
    </Paper>
  );
};

const formatWhereValue = (value) => {
  if (typeof value === "number") return value;
  if (typeof value === "boolean") return value ? 1 : 0;
  return `'${String(value ?? "").replace(/'/g, "''")}'`;
};

const buildDetailWhere = (childGrid, masterRow) => {
  if (!masterRow || !childGrid?.foreignKeys?.length) return "";

  return childGrid.foreignKeys
    .map((field) => {
      const value = masterRow[field];
      if (value === undefined || value === null || value === "") return null;
      return `${field}=${formatWhereValue(value)}`;
    })
    .filter(Boolean)
    .join(" AND ");
};

const buildDetailDefaults = (childGrid, masterRow) =>
  (childGrid.foreignKeys || []).reduce((defaults, field) => {
    if (masterRow?.[field] !== undefined) {
      defaults[field] = masterRow[field];
    }
    return defaults;
  }, {});

const DetailDialog = ({
  open,
  masterTitle,
  masterRow,
  childGrids,
  activeTab,
  setActiveTab,
  lang,
  onClose,
}) => (
  <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg">
    <DialogTitle>{masterTitle} Details</DialogTitle>
    <DialogContent dividers>
      {childGrids.length > 1 && (
        <Tabs
          value={activeTab}
          onChange={(_, value) => setActiveTab(value)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ mb: 2, borderBottom: "1px solid", borderColor: "divider" }}
        >
          {childGrids.map((child, index) => (
            <Tab key={child.bsObj} label={child.name} value={index} />
          ))}
        </Tabs>
      )}
      {childGrids.map((child, index) => {
        const detailWhere = buildDetailWhere(child, masterRow);
        const defaultValues = buildDetailDefaults(child, masterRow);

        return (
          <Box key={child.bsObj} hidden={activeTab !== index}>
            {activeTab === index && !detailWhere && (
              <Alert severity="warning">
                Cannot load detail rows because the master key is missing.
              </Alert>
            )}
            {activeTab === index && detailWhere && (
              <BSDataGrid
                bsLocale={lang}
                bsPreObj={child.bsPreObj}
                bsObj={child.bsObj}
                bsCols={child.bsCols}
                bsColumnDefs={child.bsColumnDefs || []}
                bsDataTransform={child.bsDataTransform}
                bsObjBy={child.bsObjBy}
                bsObjWh={detailWhere}
                bsDefaultFormValues={defaultValues}
                bsHiddenColumns={child.foreignKeys || []}
                bsShowDescColumn={false}
                bsAutoPermission={false}
                showAdd={child.showAdd}
                bsVisibleEdit={child.bsVisibleEdit}
                bsVisibleDelete={child.bsVisibleDelete}
                bsVisibleView={false}
                bsRowPerPage={child.bsRowPerPage}
                height={child.height}
              />
            )}
          </Box>
        );
      })}
    </DialogContent>
    <DialogActions>
      <Button onClick={onClose}>Close</Button>
    </DialogActions>
  </Dialog>
);

const DOC_TEMPLATES = {
  manual: {
    label: "Manual",
    filename: "template-manual.md",
    title: "[ชื่อระบบ/หัวข้อ] — คู่มือการใช้งาน",
    content: `# คู่มือการใช้งาน: [ชื่อระบบหรือฟีเจอร์]

## 1. บทนำ
ระบบ [ชื่อระบบ] ใช้สำหรับ [อธิบายวัตถุประสงค์หลัก]

## 2. ผู้ใช้งานที่เกี่ยวข้อง
- **ผู้ใช้งานทั่วไป**: [บทบาท A]
- **ผู้ดูแลระบบ**: [บทบาท B]

## 3. ขั้นตอนการใช้งาน

### 3.1 การเข้าสู่ระบบ
1. เปิดเบราว์เซอร์และไปที่ URL: https://...
2. กรอก Username และ Password
3. กดปุ่ม **เข้าสู่ระบบ**

### 3.2 การเพิ่มข้อมูล
1. คลิกเมนู [ชื่อเมนู] ทางด้านซ้าย
2. กดปุ่ม **เพิ่มข้อมูล** ที่มุมบนขวา
3. กรอกข้อมูลในฟอร์ม:
   - **ฟิลด์ A** (จำเป็น): [คำอธิบาย]
   - **ฟิลด์ B**: [คำอธิบาย]
4. กดปุ่ม **บันทึก**

### 3.3 การแก้ไขข้อมูล
1. เลือกแถวที่ต้องการแก้ไขในตาราง
2. กดไอคอน ✏️ Edit
3. แก้ไขข้อมูลที่ต้องการ
4. กดปุ่ม **บันทึก**

## 4. ปัญหาที่พบบ่อย (FAQ)

**Q: ลืมรหัสผ่านทำอย่างไร?**
A: ติดต่อผู้ดูแลระบบที่ [email/เบอร์โทร]

**Q: ข้อมูลไม่แสดงผล ทำอย่างไร?**
A: กดปุ่ม Refresh หรือออกจากระบบแล้วเข้าใหม่

## 5. การติดต่อสอบถาม
- Email: [support@example.com]
- เบอร์โทร: [xxx-xxx-xxxx]
- เวลาทำการ: จันทร์–ศุกร์ 08:00–17:00 น.
`,
  },
  policy: {
    label: "Policy",
    filename: "template-policy.md",
    title: "[หัวข้อ] — นโยบายและข้อกำหนด",
    content: `# นโยบาย: [ชื่อนโยบาย]

**เวอร์ชัน**: 1.0  
**วันที่มีผลบังคับ**: [วัน/เดือน/ปี]  
**อนุมัติโดย**: [ชื่อผู้อนุมัติ / ตำแหน่ง]

---

## 1. วัตถุประสงค์
นโยบายนี้กำหนดขึ้นเพื่อ [อธิบายวัตถุประสงค์] เพื่อให้การดำเนินงานเป็นไปตาม [มาตรฐาน/กฎหมาย/ข้อบังคับ]

## 2. ขอบเขตการบังคับใช้
นโยบายนี้ใช้บังคับกับ [ระบุกลุ่มเป้าหมาย เช่น พนักงานทุกคน / ทีม IT / ผู้รับเหมา]

## 3. นิยามและคำย่อ
| คำ | ความหมาย |
|----|-----------|
| [คำ A] | [คำจำกัดความ] |
| [คำ B] | [คำจำกัดความ] |

## 4. ข้อกำหนดและข้อห้าม

### 4.1 สิ่งที่ต้องปฏิบัติ (Must)
- [ข้อกำหนด 1]
- [ข้อกำหนด 2]

### 4.2 สิ่งที่ไม่อนุญาต (Must Not)
- [ข้อห้าม 1]
- [ข้อห้าม 2]

## 5. บทลงโทษ
ผู้ที่ฝ่าฝืนนโยบายนี้จะได้รับ [ระบุบทลงโทษ] ตามระเบียบของ [องค์กร]

## 6. การทบทวน
นโยบายนี้จะได้รับการทบทวนทุก [รอบระยะเวลา เช่น 1 ปี] หรือเมื่อมีการเปลี่ยนแปลงที่สำคัญ

## 7. เอกสารอ้างอิง
- [เอกสาร/กฎหมาย/มาตรฐานที่เกี่ยวข้อง]
`,
  },
  process: {
    label: "Process",
    filename: "template-process.md",
    title: "[ชื่อกระบวนการ] — ขั้นตอนการดำเนินงาน",
    content: `# กระบวนการ: [ชื่อกระบวนการ]

**รหัสกระบวนการ**: [PROC-001]  
**เจ้าของกระบวนการ**: [ชื่อทีม/ฝ่าย]  
**วันที่อัปเดต**: [วัน/เดือน/ปี]

---

## 1. วัตถุประสงค์
กระบวนการนี้อธิบายขั้นตอนการ [อธิบายสิ่งที่กระบวนการนี้ทำ]

## 2. Input และ Output

| ประเภท | รายละเอียด |
|--------|------------|
| **Input** | [เอกสาร/ข้อมูล/คำร้องที่รับเข้า] |
| **Output** | [ผลลัพธ์ที่ได้จากกระบวนการ] |
| **ระบบที่เกี่ยวข้อง** | [ชื่อระบบ A, ระบบ B] |

## 3. ผู้รับผิดชอบ
| บทบาท | ความรับผิดชอบ |
|--------|---------------|
| [Role A] | [หน้าที่] |
| [Role B] | [หน้าที่] |

## 4. ขั้นตอนการดำเนินงาน

### ขั้นตอนที่ 1: [ชื่อขั้นตอน]
- **ผู้รับผิดชอบ**: [Role A]
- **ระบบ**: [ระบบที่ใช้]
- **การดำเนินการ**:
  1. [การกระทำ 1]
  2. [การกระทำ 2]
- **เงื่อนไข**: ถ้า [เงื่อนไข] → ไปขั้นตอน [X] / ถ้าไม่ → ไปขั้นตอน [Y]

### ขั้นตอนที่ 2: [ชื่อขั้นตอน]
- **ผู้รับผิดชอบ**: [Role B]
- **การดำเนินการ**:
  1. [การกระทำ 1]
  2. [การกระทำ 2]

## 5. กรณีพิเศษและข้อยกเว้น
- **กรณี A**: [วิธีจัดการ]
- **กรณี B**: [วิธีจัดการ]

## 6. KPI และตัวชี้วัด
| ตัวชี้วัด | เป้าหมาย |
|-----------|----------|
| [KPI 1] | [เป้าหมาย] |
| [KPI 2] | [เป้าหมาย] |
`,
  },
  faq: {
    label: "FAQ",
    filename: "template-faq.md",
    title: "[ชื่อระบบ/หัวข้อ] — คำถามที่พบบ่อย",
    content: `# คำถามที่พบบ่อย (FAQ): [ชื่อระบบ/หัวข้อ]

**อัปเดตล่าสุด**: [วัน/เดือน/ปี]  
**หมวดหมู่**: [เช่น ระบบ Inventory / HR / การเงิน]

---

## หมวด: การใช้งานทั่วไป

**Q1: [คำถาม]?**  
A: [คำตอบที่ชัดเจนและกระชับ]

**Q2: [คำถาม]?**  
A: [คำตอบ] ขั้นตอนคือ:
1. [ขั้นตอน 1]
2. [ขั้นตอน 2]
3. [ขั้นตอน 3]

**Q3: [คำถาม]?**  
A: [คำตอบ] ดูรายละเอียดเพิ่มเติมได้ที่ [ลิงก์/เอกสาร]

---

## หมวด: ปัญหาและการแก้ไข

**Q4: ระบบแสดง error "[ข้อความ error]" ทำอย่างไร?**  
A: สาเหตุมักเกิดจาก [สาเหตุ] วิธีแก้ไข:
1. [วิธีแก้ 1]
2. [วิธีแก้ 2]
ถ้าปัญหายังคงอยู่ ติดต่อ [support@example.com]

**Q5: ลืมรหัสผ่านทำอย่างไร?**  
A: ไปที่หน้า Login แล้วกดลิงก์ "ลืมรหัสผ่าน" หรือติดต่อผู้ดูแลระบบที่ [email]

**Q6: ข้อมูลหายหรือแสดงไม่ถูกต้อง?**  
A: กรุณา:
1. กด Refresh (F5) หรือล้าง cache เบราว์เซอร์
2. ออกจากระบบแล้วเข้าใหม่
3. ถ้ายังผิดปกติ แจ้ง [ชื่อทีม support] พร้อม screenshot

---

## หมวด: สิทธิ์การเข้าถึง

**Q7: ไม่สามารถเข้าถึงเมนู [ชื่อเมนู] ได้?**  
A: เมนูนี้ต้องการสิทธิ์ [Role/Permission] ติดต่อผู้ดูแลระบบเพื่อขอสิทธิ์เพิ่มเติม

**Q8: ต้องการเพิ่มผู้ใช้งานใหม่ทำอย่างไร?**  
A: ผู้ดูแลระบบสามารถเพิ่มผู้ใช้ได้ที่เมนู [เมนูจัดการผู้ใช้] > กดปุ่ม เพิ่มผู้ใช้

---

## ติดต่อเพิ่มเติม
- 📧 Email: [support@example.com]
- 📞 โทร: [xxx-xxx-xxxx] (จ–ศ 08:00–17:00 น.)
- 💬 Line OA: [@example]
`,
  },
};

const EMPTY_DOCUMENT_FORM = {
  doc_type: "manual",
  title: "",
  process: "",
  module_name: "",
  schema_name: "",
  table_name: "",
  source_path: "",
  language_code: "th-TH",
  content: "",
  generate_chunks: true,
  chunk_size: 1600,
  chunk_overlap: 200,
  create_by: "web",
};

const DocumentDialog = ({ open, form, setForm, onClose, onSubmit, busy }) => {
  const theme = useTheme();
  const [chunkOpen, setChunkOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const update = (field, value) =>
    setForm((prev) => ({ ...prev, [field]: value }));
  const charCount = (form.content || "").length;

  const handleDownloadTemplate = () => {
    const tpl = DOC_TEMPLATES[form.doc_type];
    if (!tpl) return;
    const blob = new Blob([tpl.content], {
      type: "text/markdown;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = tpl.filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const reader = new FileReader();
    reader.onload = (ev) => {
      setForm((prev) => ({
        ...prev,
        source_path: file.name,
        content: ev.target.result,
        title: prev.title || file.name.replace(/\.[^.]+$/, ""),
      }));
      setUploading(false);
    };
    reader.onerror = () => setUploading(false);
    reader.readAsText(file, "UTF-8");
    // reset so same file can be re-uploaded
    e.target.value = "";
  };

  return (
    <Dialog
      open={open}
      onClose={!busy ? onClose : undefined}
      fullWidth
      maxWidth="md"
    >
      <DialogTitle sx={{ pb: 1.5 }}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: 1.5,
              bgcolor: alpha(theme.palette.primary.main, 0.12),
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <DescriptionIcon color="primary" fontSize="small" />
          </Box>
          <Box>
            <Typography variant="h6" fontWeight={700} lineHeight={1.3}>
              Add Knowledge Document
            </Typography>
            <Typography variant="caption" color="text.secondary">
              กรอกข้อมูลเอกสาร — ระบบจะแบ่ง chunk และ index อัตโนมัติ
            </Typography>
          </Box>
        </Stack>
      </DialogTitle>

      <DialogContent dividers sx={{ p: 0 }}>
        <Stack>
          {/* ── Section 1: Identity ── */}
          <Box sx={{ px: 2.5, pt: 2.5, pb: 2 }}>
            <Typography
              variant="overline"
              color="text.secondary"
              sx={{
                display: "block",
                mb: 1.5,
                letterSpacing: 1.2,
                fontSize: "0.7rem",
              }}
            >
              Document Identity
            </Typography>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 8 }}>
                <TextField
                  label="Title"
                  fullWidth
                  required
                  autoFocus
                  value={form.title}
                  onChange={(e) => update("title", e.target.value)}
                  helperText="ชื่อเอกสารที่แสดงในผลการค้นหา"
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  label="Document Type"
                  fullWidth
                  select
                  value={form.doc_type}
                  onChange={(e) => update("doc_type", e.target.value)}
                >
                  <MenuItem value="manual">Manual</MenuItem>
                  <MenuItem value="policy">Policy</MenuItem>
                  <MenuItem value="process">Process</MenuItem>
                  <MenuItem value="faq">FAQ</MenuItem>
                </TextField>
              </Grid>
            </Grid>

            {/* Template download banner */}
            <Box
              sx={{
                mt: 1.5,
                px: 1.5,
                py: 1,
                borderRadius: 1.5,
                border: "1px dashed",
                borderColor: "divider",
                bgcolor: alpha(theme.palette.info.main, 0.04),
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 1,
              }}
            >
              <Stack direction="row" spacing={1} alignItems="center">
                <DownloadIcon sx={{ fontSize: 16, color: "text.secondary" }} />
                <Typography variant="caption" color="text.secondary">
                  ดาวน์โหลด template สำหรับ{" "}
                  <strong>
                    {DOC_TEMPLATES[form.doc_type]?.label ?? form.doc_type}
                  </strong>{" "}
                  เพื่อใช้เป็นตัวอย่างโครงสร้างเอกสาร
                </Typography>
              </Stack>
              <Button
                size="small"
                variant="outlined"
                startIcon={<DownloadIcon />}
                onClick={handleDownloadTemplate}
                sx={{
                  textTransform: "none",
                  whiteSpace: "nowrap",
                  fontSize: "0.75rem",
                }}
              >
                Download Template
              </Button>
            </Box>
          </Box>

          <Divider />

          {/* ── Section 2: Classification ── */}
          <Box sx={{ px: 2.5, pt: 2, pb: 2 }}>
            <Typography
              variant="overline"
              color="text.secondary"
              sx={{
                display: "block",
                mb: 1.5,
                letterSpacing: 1.2,
                fontSize: "0.7rem",
              }}
            >
              Classification
            </Typography>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  label="Process"
                  fullWidth
                  value={form.process}
                  onChange={(e) => update("process", e.target.value)}
                  placeholder="/module/process"
                  helperText="เช่น /master/item"
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  label="Module"
                  fullWidth
                  value={form.module_name}
                  onChange={(e) => update("module_name", e.target.value)}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  label="Language"
                  fullWidth
                  select
                  value={form.language_code}
                  onChange={(e) => update("language_code", e.target.value)}
                >
                  <MenuItem value="th-TH">Thai (th-TH)</MenuItem>
                  <MenuItem value="en-US">English (en-US)</MenuItem>
                </TextField>
              </Grid>
            </Grid>
          </Box>

          <Divider />

          {/* ── Section 3: Content ── */}
          <Box sx={{ px: 2.5, pt: 2, pb: 2 }}>
            <Typography
              variant="overline"
              color="text.secondary"
              sx={{
                display: "block",
                mb: 1.5,
                letterSpacing: 1.2,
                fontSize: "0.7rem",
              }}
            >
              Content
            </Typography>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 6 }}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt,.md,.csv,.json,.xml,.yaml,.yml,.log"
                  style={{ display: "none" }}
                  onChange={handleFileUpload}
                />
                <TextField
                  label="Source Path"
                  fullWidth
                  value={form.source_path}
                  onChange={(e) => update("source_path", e.target.value)}
                  placeholder="docs/process/item.md"
                  helperText="พิมพ์ path หรืออัปโหลดไฟล์ (.txt .md .csv .json)"
                  slotProps={{
                    input: {
                      endAdornment: (
                        <InputAdornment position="end">
                          <Tooltip title="Upload file — content จะถูก import อัตโนมัติ">
                            <span>
                              <IconButton
                                size="small"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={busy || uploading}
                              >
                                {uploading ? (
                                  <CircularProgress size={16} />
                                ) : (
                                  <UploadFileIcon fontSize="small" />
                                )}
                              </IconButton>
                            </span>
                          </Tooltip>
                        </InputAdornment>
                      ),
                    },
                  }}
                />
              </Grid>
              <Grid size={{ xs: 6, md: 3 }}>
                <TextField
                  label="Schema"
                  fullWidth
                  value={form.schema_name}
                  onChange={(e) => update("schema_name", e.target.value)}
                />
              </Grid>
              <Grid size={{ xs: 6, md: 3 }}>
                <TextField
                  label="Table"
                  fullWidth
                  value={form.table_name}
                  onChange={(e) => update("table_name", e.target.value)}
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  label="Content"
                  fullWidth
                  multiline
                  required
                  minRows={10}
                  maxRows={20}
                  value={form.content}
                  onChange={(e) => update("content", e.target.value)}
                  helperText={
                    <Stack direction="row" justifyContent="space-between">
                      <span>เนื้อหาเอกสารที่จะนำไป chunk และ embed</span>
                      <span
                        style={{
                          color:
                            charCount > 50000
                              ? theme.palette.error.main
                              : charCount > 20000
                                ? theme.palette.warning.main
                                : theme.palette.text.disabled,
                        }}
                      >
                        {charCount.toLocaleString()} chars
                      </span>
                    </Stack>
                  }
                  sx={{
                    "& .MuiInputBase-root": {
                      fontFamily: "monospace",
                      fontSize: "0.8125rem",
                      lineHeight: 1.6,
                    },
                  }}
                />
              </Grid>
            </Grid>
          </Box>

          <Divider />

          {/* ── Section 4: Advanced Chunking ── */}
          <Box
            onClick={() => setChunkOpen((p) => !p)}
            sx={{
              px: 2.5,
              py: 1.5,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              userSelect: "none",
              "&:hover": { bgcolor: alpha(theme.palette.action.hover, 0.5) },
            }}
          >
            <Stack direction="row" spacing={1} alignItems="center">
              <TuneIcon fontSize="small" sx={{ color: "text.secondary" }} />
              <Typography
                variant="overline"
                color="text.secondary"
                sx={{ letterSpacing: 1.2, fontSize: "0.7rem" }}
              >
                Chunking Settings
              </Typography>
              {!form.generate_chunks && (
                <Chip
                  label="disabled"
                  size="small"
                  color="warning"
                  variant="outlined"
                />
              )}
            </Stack>
            <ExpandMoreIcon
              sx={{
                color: "text.secondary",
                fontSize: 20,
                transform: chunkOpen ? "rotate(180deg)" : "rotate(0deg)",
                transition: "transform 0.2s",
              }}
            />
          </Box>

          <Collapse in={chunkOpen}>
            <Box
              sx={{
                px: 2.5,
                pb: 2.5,
                bgcolor: alpha(theme.palette.background.default, 0.6),
                borderTop: `1px solid ${theme.palette.divider}`,
              }}
            >
              <FormControlLabel
                sx={{ mt: 1.5, mb: 1 }}
                control={
                  <Switch
                    checked={form.generate_chunks}
                    onChange={(e) =>
                      update("generate_chunks", e.target.checked)
                    }
                    color="primary"
                  />
                }
                label={
                  <Stack>
                    <Typography variant="body2" fontWeight={600}>
                      Auto-generate Chunks
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      แบ่ง content เป็น chunk และ index ทันทีหลังสร้าง
                    </Typography>
                  </Stack>
                }
              />
              <Collapse in={form.generate_chunks}>
                <Grid container spacing={2} sx={{ mt: 0.5 }}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      label="Chunk Size"
                      type="number"
                      fullWidth
                      value={form.chunk_size}
                      onChange={(e) =>
                        update("chunk_size", parseInt(e.target.value) || 1600)
                      }
                      slotProps={{
                        input: {
                          endAdornment: (
                            <InputAdornment position="end">
                              chars
                            </InputAdornment>
                          ),
                        },
                      }}
                      helperText="ขนาด chunk แนะนำ 1000–2000"
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      label="Chunk Overlap"
                      type="number"
                      fullWidth
                      value={form.chunk_overlap}
                      onChange={(e) =>
                        update("chunk_overlap", parseInt(e.target.value) || 200)
                      }
                      slotProps={{
                        input: {
                          endAdornment: (
                            <InputAdornment position="end">
                              chars
                            </InputAdornment>
                          ),
                        },
                      }}
                      helperText="ส่วนทับซ้อนระหว่าง chunk เพื่อรักษา context"
                    />
                  </Grid>
                </Grid>
              </Collapse>
            </Box>
          </Collapse>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 2.5, py: 1.5, gap: 1 }}>
        <Button onClick={onClose} disabled={busy} color="inherit">
          Cancel
        </Button>
        <Button
          startIcon={
            busy ? (
              <CircularProgress size={16} color="inherit" />
            ) : (
              <PlayArrowIcon />
            )
          }
          variant="contained"
          onClick={onSubmit}
          disabled={!form.title || !form.content || busy}
        >
          {busy ? "Creating..." : "Create & Chunk"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AIAdminConsole;
