import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  IconButton,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import StarRoundedIcon from "@mui/icons-material/StarRounded";
import StarBorderRoundedIcon from "@mui/icons-material/StarBorderRounded";
import SendIcon from "@mui/icons-material/Send";
import AnalyticsIcon from "@mui/icons-material/Analytics";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TimelineIcon from "@mui/icons-material/Timeline";
import LightbulbOutlinedIcon from "@mui/icons-material/LightbulbOutlined";
import { Line } from "react-chartjs-2";
import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
} from "chart.js";
import AxiosMaster from "../../utils/AxiosMaster";
import Config from "../../utils/Config";
import SecureStorage from "../../utils/SecureStorage";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler,
);

const sanitizeBaseUrl = (url) => String(url || "").replace(/\/+$/, "");

const DEFAULT_API_BASE_URL = "";
const GENERATE_FORECAST_PATH = "/dashboard/generate-forecast";

const normalizeTrend = (trend) => {
  const value = String(trend || "").toLowerCase();
  if (value === "up" || value === "down" || value === "stable") {
    return value;
  }
  return "stable";
};

const getTrendColor = (trend) => {
  if (trend === "up") return "success.main";
  if (trend === "down") return "error.main";
  return "warning.main";
};

const extractJsonObject = (value) => {
  if (!value) return null;
  if (typeof value === "object") return value;

  const text = String(value).trim();
  try {
    return JSON.parse(text);
  } catch (_) {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch (error) {
      return null;
    }
  }
};

const normalizeDashboardPayload = (rawData) => {
  const parsed = extractJsonObject(rawData);
  if (!parsed) {
    throw new Error("AI response is not valid JSON");
  }

  const widget = parsed?.widget || {};
  const chart = widget?.chart || {};
  const datasets = Array.isArray(chart?.datasets) ? chart.datasets : [];

  const actualDataset =
    datasets.find((dataset) => {
      const label = String(dataset?.label || "").toLowerCase();
      return label.includes("actual") || label.includes("ข้อมูลจริง");
    }) || datasets[0];

  const forecastDataset =
    datasets.find((dataset) => {
      const label = String(dataset?.label || "").toLowerCase();
      return label.includes("forecast") || label.includes("พยากรณ์");
    }) || datasets[1];

  const labels = Array.isArray(parsed?.chartData?.labels)
    ? parsed.chartData.labels
    : Array.isArray(chart?.labels)
      ? chart.labels
      : [];

  const values = Array.isArray(parsed?.chartData?.values)
    ? parsed.chartData.values
    : Array.isArray(actualDataset?.data)
      ? actualDataset.data
      : [];

  const forecast = Array.isArray(parsed?.chartData?.forecast)
    ? parsed.chartData.forecast
    : Array.isArray(forecastDataset?.data)
      ? forecastDataset.data
      : [];

  const insights = parsed?.insights || widget?.insights || {};

  return {
    title: widget?.title || parsed?.title || "AI Forecast Dashboard",
    insights: {
      summary: insights?.summary || "-",
      trend: normalizeTrend(insights?.trend),
      prediction: insights?.prediction || "-",
      recommendation: insights?.recommendation || "-",
    },
    chartData: {
      labels,
      values,
      forecast,
    },
  };
};

const normalizeSuggestionsPayload = (rawData) => {
  const parsed = extractJsonObject(rawData) || rawData;

  const normalizeSuggestionList = (list) =>
    (Array.isArray(list) ? list : [])
      .map((item) => String(item || "").trim())
      .filter(Boolean);

  if (Array.isArray(parsed)) {
    return {
      success: true,
      suggestions: normalizeSuggestionList(parsed),
      category: null,
      generatedAt: null,
      errorMessage: null,
    };
  }

  if (parsed && typeof parsed === "object") {
    const suggestions = normalizeSuggestionList(parsed.suggestions);
    const errorMessage =
      parsed.error_message || parsed.errorMessage || parsed.message || null;

    return {
      success:
        typeof parsed.success === "boolean"
          ? parsed.success
          : suggestions.length > 0,
      suggestions,
      category: parsed.category || null,
      generatedAt: parsed.generatedAt || null,
      errorMessage,
    };
  }

  return {
    success: false,
    suggestions: [],
    category: null,
    generatedAt: null,
    errorMessage: null,
  };
};

const ForecastDashboard = ({ lang = "th" }) => {
  const [suggestions, setSuggestions] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [inputQuestion, setInputQuestion] = useState("");
  const [results, setResults] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [apiError, setApiError] = useState("");
  const hasFetchedSuggestions = useRef(false);
  const [progress, setProgress] = useState({ completed: 0, total: 0 });
  const [favorites, setFavorites] = useState(new Set());
  const [togglingFavorite, setTogglingFavorite] = useState(new Set());
  const [favoritePrompts, setFavoritePrompts] = useState([]);
  const [loadingFavorites, setLoadingFavorites] = useState(false);
  const { pathname } = useLocation();

  const apiBaseUrl = useMemo(() => {
    const resolvedBaseUrl =
      process.env.REACT_APP_API_URL || Config.API_URL || DEFAULT_API_BASE_URL;

    return sanitizeBaseUrl(resolvedBaseUrl);
  }, []);

  const dashboardRequestConfig = useMemo(() => {
    const config = {
      headers: {
        Accept: "application/json",
      },
    };

    if (apiBaseUrl) {
      config.baseURL = apiBaseUrl;
    }

    return config;
  }, [apiBaseUrl]);

  const dashboardApi = useMemo(() => {
    console.log(
      "[ForecastDashboard] API Base URL:",
      apiBaseUrl || "[AxiosMaster default]",
    );
    return {
      getSuggestions: () =>
        AxiosMaster.post("/ai/suggestions", dashboardRequestConfig),
      generateDashboard: (question) =>
        AxiosMaster.post(
          GENERATE_FORECAST_PATH,
          { question },
          dashboardRequestConfig,
        ),
    };
  }, [apiBaseUrl, dashboardRequestConfig]);

  const generateEndpoint = `${apiBaseUrl}${GENERATE_FORECAST_PATH}`;

  const loadSuggestions = useCallback(
    async (force = false) => {
      if (!force && hasFetchedSuggestions.current) return;
      hasFetchedSuggestions.current = true;
      setLoadingSuggestions(true);
      setApiError("");
      try {
        // --- Build payload ---
        const rawUserInfo = SecureStorage.get("userInfo");
        const userInfo =
          typeof rawUserInfo === "string"
            ? (() => {
                try {
                  return JSON.parse(rawUserInfo);
                } catch {
                  return {};
                }
              })()
            : rawUserInfo || {};
        const userId =
          userInfo?.UserId || userInfo?.user_id || userInfo?.userId || "";
        const userName =
          userInfo?.UserName ||
          userInfo?.user_name ||
          `${userInfo?.FirstName || ""} ${userInfo?.LastName || ""}`.trim() ||
          "";
        const token = SecureStorage.get("token");
        const payload = {
          process: pathname,
          user_id: userId,
          user_name: userName,
          lang,
          count: 5,
        };
        console.log(
          "[ForecastDashboard] AI Suggestions payload:",
          JSON.stringify(payload, null, 2),
        );
        const suggestionsApiUrl = `${apiBaseUrl}/ai/suggestions`;
        const response = await fetch(suggestionsApiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });
        const data = await response.json();
        const normalizedSuggestions = normalizeSuggestionsPayload(data);
        if (!normalizedSuggestions.success) {
          throw new Error(
            normalizedSuggestions.errorMessage ||
              (lang === "th"
                ? "ไม่สามารถโหลดคำถามแนะนำจาก AI ได้"
                : "Cannot load AI suggestions"),
          );
        }
        setSuggestions(normalizedSuggestions.suggestions);
      } catch (error) {
        hasFetchedSuggestions.current = false;
        setApiError(
          error?.message ||
            (lang === "th"
              ? "ไม่สามารถโหลดคำถามแนะนำจาก AI ได้"
              : "Cannot load AI suggestions"),
        );
      } finally {
        setLoadingSuggestions(false);
      }
    },
    [apiBaseUrl, lang, pathname],
  );

  const loadFavoritePrompts = useCallback(async () => {
    setLoadingFavorites(true);
    try {
      const rawUserInfo = SecureStorage.get("userInfo");
      const userInfo =
        typeof rawUserInfo === "string"
          ? (() => {
              try {
                return JSON.parse(rawUserInfo);
              } catch {
                return {};
              }
            })()
          : rawUserInfo || {};
      const userId =
        userInfo?.UserId || userInfo?.user_id || userInfo?.userId || "";
      const token = SecureStorage.get("token");

      const url = `${apiBaseUrl}/ai/favorite-prompts?process=${encodeURIComponent(pathname)}&user_id=${encodeURIComponent(userId)}`;
      const response = await fetch(url, {
        headers: {
          accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (data?.success && Array.isArray(data?.favorites)) {
        setFavoritePrompts(data.favorites);
        setFavorites(new Set(data.favorites.map((f) => f.user_message)));
      }
    } catch (error) {
      console.error("[ForecastDashboard] loadFavoritePrompts error", error);
    } finally {
      setLoadingFavorites(false);
    }
  }, [apiBaseUrl, pathname]);

  useEffect(() => {
    loadSuggestions(false);
    loadFavoritePrompts();
  }, [loadSuggestions, loadFavoritePrompts]);

  const addQuestion = useCallback((questionText) => {
    const nextQuestion = String(questionText || "").trim();
    if (!nextQuestion) return;

    setQuestions((prev) => {
      if (prev.includes(nextQuestion)) return prev;
      return [...prev, nextQuestion];
    });
  }, []);

  const removeQuestion = useCallback((questionText) => {
    setQuestions((prev) => prev.filter((q) => q !== questionText));
  }, []);

  const clearAllQuestions = useCallback(() => {
    setQuestions([]);
  }, []);

  const toggleFavorite = useCallback(
    async (question) => {
      setTogglingFavorite((prev) => new Set([...prev, question]));
      try {
        const rawUserInfo = SecureStorage.get("userInfo");
        const userInfo =
          typeof rawUserInfo === "string"
            ? (() => {
                try {
                  return JSON.parse(rawUserInfo);
                } catch {
                  return {};
                }
              })()
            : rawUserInfo || {};
        const userId =
          userInfo?.UserId || userInfo?.user_id || userInfo?.userId || "";
        const token = SecureStorage.get("token");

        await fetch(`${apiBaseUrl}/ai/favorite-prompts/toggle`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            process: pathname,
            user_id: userId,
            user_message: question,
          }),
        });

        setFavorites((prev) => {
          const next = new Set(prev);
          if (next.has(question)) {
            next.delete(question);
            setFavoritePrompts((prevPrompts) =>
              prevPrompts.filter((f) => f.user_message !== question),
            );
          } else {
            next.add(question);
            setFavoritePrompts((prevPrompts) => [
              ...prevPrompts,
              {
                ai_fav_id: Date.now(),
                process: pathname,
                user_id: userId,
                user_message: question,
                create_date: new Date().toISOString(),
                update_date: new Date().toISOString(),
              },
            ]);
          }
          return next;
        });
      } catch (error) {
        console.error("[ForecastDashboard] toggleFavorite error", error);
      } finally {
        setTogglingFavorite((prev) => {
          const next = new Set(prev);
          next.delete(question);
          return next;
        });
      }
    },
    [apiBaseUrl, pathname],
  );

  const handleAddInputQuestion = useCallback(() => {
    addQuestion(inputQuestion);
    setInputQuestion("");
  }, [addQuestion, inputQuestion]);

  const handleGenerateDashboard = useCallback(async () => {
    if (!questions.length || isGenerating) return;

    setApiError("");
    setIsGenerating(true);
    setResults([]);
    setProgress({ completed: 0, total: questions.length });

    const generatedResults = [];

    for (let index = 0; index < questions.length; index += 1) {
      const question = questions[index];

      try {
        console.log("[ForecastDashboard] POST generate:start", {
          endpoint: generateEndpoint,
          index: index + 1,
          total: questions.length,
          question,
        });
        const response = await dashboardApi.generateDashboard(question);

        const normalized = normalizeDashboardPayload(response?.data);
        console.log("[ForecastDashboard] POST generate:success", {
          index: index + 1,
          total: questions.length,
          question,
          title: normalized?.title,
        });
        generatedResults.push({
          question,
          success: true,
          data: normalized,
        });
      } catch (error) {
        console.error("[ForecastDashboard] POST generate:error", {
          endpoint: generateEndpoint,
          index: index + 1,
          total: questions.length,
          question,
          error,
        });
        generatedResults.push({
          question,
          success: false,
          error:
            error?.response?.data?.message ||
            error?.message ||
            "Failed to generate dashboard",
        });
      } finally {
        setProgress({ completed: index + 1, total: questions.length });
      }
    }

    setResults(generatedResults);
    setIsGenerating(false);
  }, [dashboardApi, generateEndpoint, isGenerating, questions]);

  const successResults = useMemo(
    () => results.filter((item) => item.success),
    [results],
  );

  const failedResults = useMemo(
    () => results.filter((item) => !item.success),
    [results],
  );

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Stack spacing={2.5}>
        <Card>
          <CardContent>
            <Stack spacing={2}>
              <Stack direction="row" spacing={1.25} alignItems="center">
                <AutoAwesomeIcon color="primary" />
                <Typography variant="h5" fontWeight={700}>
                  {lang === "th" ? "AI Forecast Chat" : "AI Forecast Chat"}
                </Typography>
              </Stack>

              <Typography variant="body1" color="text.secondary">
                {lang === "th"
                  ? "เลือกคำถามแนะนำหรือพิมพ์คำถามของคุณ ระบบจะประมวลผลคำถามทั้งหมดและสร้าง Dashboard ให้อัตโนมัติ"
                  : "Start by choosing AI suggestions or typing your own question. The system will call all questions and auto-generate dashboard cards."}
              </Typography>

              {apiError ? (
                <Alert
                  severity="error"
                  action={
                    <motion.div
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      transition={{
                        type: "spring",
                        stiffness: 300,
                        damping: 22,
                      }}
                    >
                      <Button
                        color="inherit"
                        size="small"
                        onClick={() => loadSuggestions(true)}
                      >
                        {lang === "th" ? "ลองใหม่" : "Retry"}
                      </Button>
                    </motion.div>
                  }
                >
                  {apiError}
                </Alert>
              ) : null}

              {(loadingFavorites || favoritePrompts.length > 0) && (
                <Box>
                  <Stack
                    direction="row"
                    spacing={0.75}
                    alignItems="center"
                    sx={{ mb: 1 }}
                  >
                    <StarRoundedIcon
                      fontSize="small"
                      sx={{ color: "#F59E0B" }}
                    />
                    <Typography variant="subtitle2">
                      {lang === "th" ? "คำถามโปรด" : "Favorite Prompts"}
                    </Typography>
                  </Stack>
                  {loadingFavorites ? (
                    <Stack direction="row" spacing={1} alignItems="center">
                      <CircularProgress size={18} />
                      <Typography variant="body2" color="text.secondary">
                        {lang === "th"
                          ? "กำลังโหลดคำถามโปรด..."
                          : "Loading favorites..."}
                      </Typography>
                    </Stack>
                  ) : (
                    <Stack direction="row" flexWrap="wrap" gap={1}>
                      {favoritePrompts.map((item) => (
                        <Chip
                          key={item.ai_fav_id}
                          label={item.user_message}
                          onClick={() => addQuestion(item.user_message)}
                          clickable
                          icon={
                            <StarRoundedIcon
                              sx={{ color: "#F59E0B !important" }}
                            />
                          }
                          variant="outlined"
                          sx={{
                            borderColor: "#F59E0B",
                            color: "#92400E",
                            bgcolor: "rgba(245, 158, 11, 0.07)",
                            fontWeight: 500,
                            "&:hover": {
                              bgcolor: "rgba(245, 158, 11, 0.14)",
                            },
                          }}
                        />
                      ))}
                    </Stack>
                  )}
                </Box>
              )}

              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  {lang === "th" ? "คำถามแนะนำจาก AI" : "AI Suggestions"}
                </Typography>
                <Stack direction="row" flexWrap="wrap" gap={1}>
                  {loadingSuggestions ? (
                    <Stack direction="row" spacing={1} alignItems="center">
                      <CircularProgress size={18} />
                      <Typography variant="body2" color="text.secondary">
                        {lang === "th"
                          ? "กำลังโหลดคำถามแนะนำ..."
                          : "Loading suggestions..."}
                      </Typography>
                    </Stack>
                  ) : (
                    suggestions.map((item) => (
                      <Chip
                        key={item}
                        label={item}
                        onClick={() => addQuestion(item)}
                        clickable
                        variant="outlined"
                      />
                    ))
                  )}
                </Stack>
              </Box>

              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={1}
                alignItems="stretch"
              >
                <TextField
                  size="small"
                  sx={{ flex: 1 }}
                  value={inputQuestion}
                  placeholder={
                    lang === "th"
                      ? "พิมพ์คำถาม เช่น แสดง Top 10 สินค้าที่มีการเบิกจ่ายมากที่สุด"
                      : "Type your own question"
                  }
                  onChange={(event) => setInputQuestion(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      handleAddInputQuestion();
                    }
                  }}
                />
                <motion.div
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  transition={{ type: "spring", stiffness: 300, damping: 22 }}
                >
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<AddIcon />}
                    onClick={handleAddInputQuestion}
                    sx={{ whiteSpace: "nowrap" }}
                  >
                    {lang === "th" ? "เพิ่มคำถาม" : "Add"}
                  </Button>
                </motion.div>
              </Stack>

              <Box>
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                  sx={{ mb: 1 }}
                >
                  <Typography variant="subtitle2">
                    {lang === "th"
                      ? "รายการคำถามที่จะส่ง"
                      : "Questions to Send"}{" "}
                    ({questions.length})
                  </Typography>
                  {questions.length > 0 && (
                    <motion.div
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      transition={{
                        type: "spring",
                        stiffness: 300,
                        damping: 22,
                      }}
                    >
                      <Button
                        size="small"
                        variant="outlined"
                        color="error"
                        onClick={clearAllQuestions}
                      >
                        {lang === "th" ? "ลบทั้งหมด" : "Delete All"}
                      </Button>
                    </motion.div>
                  )}
                </Stack>
                {questions.length === 0 ? (
                  <Alert severity="info">
                    {lang === "th"
                      ? "ยังไม่มีคำถาม กรุณาเลือกจากคำแนะนำหรือพิมพ์เพิ่ม"
                      : "No questions yet. Select a suggestion or type one."}
                  </Alert>
                ) : (
                  <List dense disablePadding>
                    {questions.map((question) => (
                      <ListItem
                        key={question}
                        disablePadding
                        secondaryAction={
                          <Stack direction="row" spacing={0.25}>
                            <motion.div
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                            >
                              <IconButton
                                edge="end"
                                disabled={togglingFavorite.has(question)}
                                onClick={() => toggleFavorite(question)}
                                sx={{
                                  color: favorites.has(question)
                                    ? "#F59E0B"
                                    : "action.disabled",
                                  transition: "color 0.2s",
                                }}
                              >
                                {favorites.has(question) ? (
                                  <StarRoundedIcon fontSize="small" />
                                ) : (
                                  <StarBorderRoundedIcon fontSize="small" />
                                )}
                              </IconButton>
                            </motion.div>
                            <motion.div
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                            >
                              <IconButton
                                edge="end"
                                color="error"
                                onClick={() => removeQuestion(question)}
                              >
                                <DeleteOutlineIcon />
                              </IconButton>
                            </motion.div>
                          </Stack>
                        }
                        sx={{ py: 0.5, pr: 10 }}
                      >
                        <ListItemText primary={question} />
                      </ListItem>
                    ))}
                  </List>
                )}
              </Box>

              <Stack direction="row" spacing={1.5} alignItems="center">
                <motion.div
                  whileHover={
                    isGenerating || questions.length === 0
                      ? {}
                      : { scale: 1.03 }
                  }
                  whileTap={
                    isGenerating || questions.length === 0
                      ? {}
                      : { scale: 0.97 }
                  }
                  transition={{ type: "spring", stiffness: 300, damping: 22 }}
                >
                  <Button
                    variant="contained"
                    startIcon={<SendIcon />}
                    disabled={isGenerating || questions.length === 0}
                    onClick={handleGenerateDashboard}
                  >
                    {isGenerating
                      ? lang === "th"
                        ? "กำลังสร้าง Dashboard"
                        : "Generating"
                      : lang === "th"
                        ? "Generate Dashboard"
                        : "Generate Dashboard"}
                  </Button>
                </motion.div>

                {isGenerating ? (
                  <Typography variant="body2" color="text.secondary">
                    {lang === "th"
                      ? `ประมวลผลแล้ว ${progress.completed}/${progress.total}`
                      : `Processed ${progress.completed}/${progress.total}`}
                  </Typography>
                ) : null}
              </Stack>

              {isGenerating ? <LinearProgress /> : null}
            </Stack>
          </CardContent>
        </Card>

        {results.length > 0 ? (
          <>
            <Card>
              <CardContent>
                <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>
                  {lang === "th" ? "ผลลัพธ์การประมวลผล" : "Generation Result"}
                </Typography>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                  <Alert severity="success" sx={{ width: "100%" }}>
                    {lang === "th"
                      ? `สำเร็จ ${successResults.length} รายการ`
                      : `Success ${successResults.length} item(s)`}
                  </Alert>
                  {failedResults.length > 0 ? (
                    <Alert severity="warning" sx={{ width: "100%" }}>
                      {lang === "th"
                        ? `ไม่สำเร็จ ${failedResults.length} รายการ`
                        : `Failed ${failedResults.length} item(s)`}
                    </Alert>
                  ) : null}
                </Stack>

                {failedResults.length > 0 ? (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>
                      {lang === "th" ? "คำถามที่ล้มเหลว" : "Failed Questions"}
                    </Typography>
                    <List dense disablePadding>
                      {failedResults.map((item) => (
                        <ListItem
                          key={item.question}
                          disablePadding
                          sx={{ py: 0.5 }}
                        >
                          <ListItemText
                            primary={item.question}
                            secondary={item.error}
                            secondaryTypographyProps={{ color: "error" }}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </Box>
                ) : null}
              </CardContent>
            </Card>

            {successResults.map((item, index) => {
              const labels = item?.data?.chartData?.labels || [];
              const values = item?.data?.chartData?.values || [];
              const forecast = item?.data?.chartData?.forecast || [];
              const trend = item?.data?.insights?.trend || "stable";

              const chartData = {
                labels,
                datasets: [
                  {
                    label: lang === "th" ? "ค่าจริง" : "Actual",
                    data: values,
                    borderColor: "#1976d2",
                    backgroundColor: "rgba(25, 118, 210, 0.16)",
                    tension: 0.32,
                    fill: true,
                  },
                  {
                    label: lang === "th" ? "คาดการณ์" : "Forecast",
                    data: forecast,
                    borderColor: "#ef6c00",
                    backgroundColor: "rgba(239, 108, 0, 0.12)",
                    borderDash: [6, 5],
                    tension: 0.32,
                  },
                ],
              };

              return (
                <Card key={`${item.question}-${index}`}>
                  <CardContent>
                    <Stack spacing={2}>
                      <Box>
                        <Typography variant="h6" fontWeight={700}>
                          {item?.data?.title}
                        </Typography>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ mt: 0.5 }}
                        >
                          {item.question}
                        </Typography>
                      </Box>

                      <Divider />

                      <Grid container spacing={2}>
                        <Grid item xs={12} md={6}>
                          <Card variant="outlined" sx={{ height: "100%" }}>
                            <CardContent>
                              <Stack
                                direction="row"
                                spacing={1}
                                alignItems="center"
                                sx={{ mb: 1 }}
                              >
                                <AnalyticsIcon
                                  color="primary"
                                  fontSize="small"
                                />
                                <Typography variant="subtitle2">
                                  {lang === "th" ? "สรุป" : "Summary"}
                                </Typography>
                              </Stack>
                              <Typography variant="body2">
                                {item?.data?.insights?.summary}
                              </Typography>
                            </CardContent>
                          </Card>
                        </Grid>

                        <Grid item xs={12} md={6}>
                          <Card variant="outlined" sx={{ height: "100%" }}>
                            <CardContent>
                              <Stack
                                direction="row"
                                spacing={1}
                                alignItems="center"
                                sx={{ mb: 1 }}
                              >
                                <TrendingUpIcon
                                  fontSize="small"
                                  sx={{ color: getTrendColor(trend) }}
                                />
                                <Typography variant="subtitle2">
                                  {lang === "th" ? "แนวโน้ม" : "Trend"}
                                </Typography>
                              </Stack>
                              <Chip
                                size="small"
                                label={trend}
                                sx={{
                                  textTransform: "capitalize",
                                  color: "white",
                                  bgcolor: getTrendColor(trend),
                                }}
                              />
                            </CardContent>
                          </Card>
                        </Grid>

                        <Grid item xs={12} md={6}>
                          <Card variant="outlined" sx={{ height: "100%" }}>
                            <CardContent>
                              <Stack
                                direction="row"
                                spacing={1}
                                alignItems="center"
                                sx={{ mb: 1 }}
                              >
                                <TimelineIcon
                                  color="primary"
                                  fontSize="small"
                                />
                                <Typography variant="subtitle2">
                                  {lang === "th" ? "การคาดการณ์" : "Prediction"}
                                </Typography>
                              </Stack>
                              <Typography variant="body2">
                                {item?.data?.insights?.prediction}
                              </Typography>
                            </CardContent>
                          </Card>
                        </Grid>

                        <Grid item xs={12} md={6}>
                          <Card variant="outlined" sx={{ height: "100%" }}>
                            <CardContent>
                              <Stack
                                direction="row"
                                spacing={1}
                                alignItems="center"
                                sx={{ mb: 1 }}
                              >
                                <LightbulbOutlinedIcon
                                  color="primary"
                                  fontSize="small"
                                />
                                <Typography variant="subtitle2">
                                  {lang === "th" ? "คำแนะนำ" : "Recommendation"}
                                </Typography>
                              </Stack>
                              <Typography variant="body2">
                                {item?.data?.insights?.recommendation}
                              </Typography>
                            </CardContent>
                          </Card>
                        </Grid>
                      </Grid>

                      <Box sx={{ minHeight: 260 }}>
                        <Line
                          data={chartData}
                          options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            interaction: { mode: "index", intersect: false },
                            plugins: {
                              legend: { position: "top" },
                            },
                            scales: {
                              y: { beginAtZero: true },
                            },
                          }}
                        />
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              );
            })}
          </>
        ) : null}
      </Stack>
    </Box>
  );
};

export default ForecastDashboard;
