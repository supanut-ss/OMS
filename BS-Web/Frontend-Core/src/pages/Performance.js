import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    Alert,
    Box,
    Card,
    CardContent,
    Chip,
    Divider,
    FormControl,
    Grid,
    InputLabel,
    LinearProgress,
    MenuItem,
    Select,
    Skeleton,
    Stack,
    Typography
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import AssessmentIcon from "@mui/icons-material/Assessment";
import PaidIcon from "@mui/icons-material/Paid";
import PercentIcon from "@mui/icons-material/Percent";
import WorkOutlineIcon from "@mui/icons-material/WorkOutline";
import AxiosMaster from "../utils/AxiosMaster";

const Performance = () => {
    const theme = useTheme();
    const isDark = theme.palette.mode === "dark";
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [year, setYear] = useState(new Date().getFullYear());
    const [month, setMonth] = useState(0); // 0 means all months
    const refreshedAllYearRef = useRef(false);

    useEffect(() => {
        refreshedAllYearRef.current = false;
    }, [year, month]);

    const monthMap = {
        jan: 1,
        january: 1,
        "ม.ค.": 1,
        feb: 2,
        february: 2,
        "ก.พ.": 2,
        mar: 3,
        march: 3,
        "มี.ค.": 3,
        apr: 4,
        april: 4,
        "เม.ย.": 4,
        may: 5,
        "พ.ค.": 5,
        jun: 6,
        june: 6,
        "มิ.ย.": 6,
        jul: 7,
        july: 7,
        "ก.ค.": 7,
        aug: 8,
        august: 8,
        "ส.ค.": 8,
        sep: 9,
        sept: 9,
        september: 9,
        "ก.ย.": 9,
        oct: 10,
        october: 10,
        "ต.ค.": 10,
        nov: 11,
        november: 11,
        "พ.ย.": 11,
        dec: 12,
        december: 12,
        "ธ.ค.": 12
    };

    const getMonthValue = (value) => {
        if (value === null || value === undefined) return null;
        if (typeof value === "number") return value;
        const normalized = String(value).trim().toLowerCase();
        if (!normalized) return null;
        const numeric = Number.parseInt(normalized, 10);
        if (!Number.isNaN(numeric)) return numeric;
        return monthMap[normalized] || null;
    };

    const extractMonthFromItem = (item) => {
        const keys = [
            "month",
            "month_no",
            "monthNo",
            "month_number",
            "monthNumber",
            "project_month",
            "projectMonth",
            "period_month",
            "periodMonth",
            "invoice_month",
            "invoiceMonth",
            "month_name",
            "monthName"
        ];
        for (const key of keys) {
            if (Object.prototype.hasOwnProperty.call(item, key)) {
                const monthValue = getMonthValue(item[key]);
                if (monthValue) return monthValue;
            }
        }
        return null;
    };

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const res = await AxiosMaster(`/projects/performance?year=${year}&month=${month}`);
            if (res.data.message_code === 0) {
                const responseData = res.data.data || [];
                setData(responseData);
                if (month === 0 && !refreshedAllYearRef.current) {
                    const currentMonth = new Date().getMonth() + 1;
                    const hasCurrentMonth = responseData.some((item) => extractMonthFromItem(item) === currentMonth);
                    if (!hasCurrentMonth) {
                        await AxiosMaster(`/projects/performance?year=${year}&month=${currentMonth}`);
                        const refreshAll = await AxiosMaster(`/projects/performance?year=${year}&month=0`);
                        if (refreshAll.data.message_code === 0) {
                            setData(refreshAll.data.data || []);
                        }
                    }
                    refreshedAllYearRef.current = true;
                }
            } else {
                setData([]);
                setError(res.data.message_text);
            }
        } catch (err) {
            setData([]);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [year, month]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const dashboardData = data;

    const formatCurrency = (value) =>
        new Intl.NumberFormat("th-TH", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(value || 0);

    const projectSummaries = useMemo(() =>
        dashboardData.map((project) => {
            const totalIncentive = (project.roles || []).reduce(
                (sum, role) => sum + (Number(role.incentive_amount) || 0),
                0
            );
            const totalRolePercentage = (project.roles || []).reduce(
                (sum, role) => sum + (Number(role.role_percentage) || 0),
                0
            );
            return {
                ...project,
                totalIncentive,
                totalRolePercentage
            };
        }), [dashboardData]
    );

    const roleDistribution = useMemo(() => {
        const roleMap = new Map();
        projectSummaries.forEach((project) => {
            (project.roles || []).forEach((role) => {
                const key = role.role;
                const current = roleMap.get(key) || { role: key, totalIncentive: 0, totalPercentage: 0, projectCount: 0 };
                roleMap.set(key, {
                    role: key,
                    totalIncentive: current.totalIncentive + (Number(role.incentive_amount) || 0),
                    totalPercentage: current.totalPercentage + (Number(role.role_percentage) || 0),
                    projectCount: current.projectCount + 1
                });
            });
        });
        return Array.from(roleMap.values()).sort((a, b) => b.totalIncentive - a.totalIncentive);
    }, [projectSummaries]);

    const metrics = useMemo(() => {
        const totalInvoice = projectSummaries.reduce(
            (sum, project) => sum + (Number(project.total_invoice) || 0),
            0
        );
        const totalIncentive = projectSummaries.reduce(
            (sum, project) => sum + (Number(project.totalIncentive) || 0),
            0
        );
        const incentiveRate = totalInvoice > 0 ? (totalIncentive / totalInvoice) * 100 : 0;
        return {
            totalProjects: projectSummaries.length,
            totalInvoice,
            totalIncentive,
            incentiveRate
        };
    }, [projectSummaries]);

    const pageBg = theme.palette.background.default;
    const cardBg = theme.palette.background.paper;
    const cardBorder = theme.palette.divider;
    const cardShadow = theme.shadows[6];
    const softChipBg = alpha(theme.palette.primary.main, isDark ? 0.2 : 0.12);
    const softChipColor = isDark ? theme.palette.primary.light : theme.palette.primary.dark;
    const monthOptions = [
        { value: 0, label: "All" },
        { value: 1, label: "Jan" },
        { value: 2, label: "Feb" },
        { value: 3, label: "Mar" },
        { value: 4, label: "Apr" },
        { value: 5, label: "May" },
        { value: 6, label: "Jun" },
        { value: 7, label: "Jul" },
        { value: 8, label: "Aug" },
        { value: 9, label: "Sep" },
        { value: 10, label: "Oct" },
        { value: 11, label: "Nov" },
        { value: 12, label: "Dec" }
    ];
    const years = Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - i);
    const monthLabel = monthOptions.find((m) => m.value === month)?.label || "All";

    return (
        <Box sx={{ p: { xs: 2, md: 3 }, bgcolor: pageBg, minHeight: "100%" }}>
            <Card sx={{ mb: 3, borderRadius: 1, background: cardBg, border: `1px solid ${cardBorder}`, boxShadow: cardShadow }}>
                <CardContent>
                    <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ xs: "flex-start", md: "center" }}>
                        <Box flex={1}>
                            <Typography variant="h4" fontWeight={700}  gutterBottom>
                                Executive Performance Dashboard
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                สรุปภาพรวมโครงการและ Performance ตามข้อมูลที่ให้มา (ปี {year}, เดือน {monthLabel})
                            </Typography>
                        </Box>
                        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ xs: "stretch", sm: "center" }}>
                            <FormControl size="small" sx={{ minWidth: 120 }}>
                                <InputLabel>Year</InputLabel>
                                <Select
                                    value={year}
                                    label="Year"
                                    onChange={(event) => setYear(Number(event.target.value))}
                                    sx={{ bgcolor: isDark ? "rgba(15, 23, 42, 0.3)" : "#fff" }}
                                >
                                    {years.map((item) => (
                                        <MenuItem key={item} value={item}>
                                            {item}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                            <FormControl size="small" sx={{ minWidth: 140 }}>
                                <InputLabel>Month</InputLabel>
                                <Select
                                    value={month}
                                    label="Month"
                                    onChange={(event) => setMonth(Number(event.target.value))}
                                    sx={{ bgcolor: isDark ? "rgba(15, 23, 42, 0.3)" : "#fff" }}
                                >
                                    {monthOptions.map((item) => (
                                        <MenuItem key={item.value} value={item.value}>
                                            {item.label}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                            <Chip
                                label={`${metrics.totalProjects} Projects`}
                                sx={{ bgcolor: softChipBg, color: softChipColor, fontWeight: 600 }}
                            />
                            {/* <Chip
                                label="Executive View"
                                variant="outlined"
                                sx={{ borderColor: cardBorder, color: softChipColor, fontWeight: 600 }}
                            /> */}
                        </Stack>
                    </Stack>
                </CardContent>
            </Card>

            {error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                    {error}
                </Alert>
            )}

            <Grid container spacing={3} sx={{ mb: 4 }}>
                {["Total Projects", "Total Invoice", "Total Performance", "Performance Rate"].map((label, index) => (
                    <Grid key={label} size={{ xs: 12, sm: 6, md: 3 }}>
                        <Card sx={{ borderRadius: 1, height: "100%", background: cardBg, border: `1px solid ${cardBorder}`, boxShadow: cardShadow }}>
                            <CardContent>
                                <Stack direction="row" spacing={1.5} alignItems="center">
                                    {index === 0 && <WorkOutlineIcon color="primary" />}
                                    {index === 1 && <AssessmentIcon color="primary" />}
                                    {index === 2 && <PaidIcon color="primary" />}
                                    {index === 3 && <PercentIcon color="primary" />}
                                    <Typography variant="subtitle2" color="text.secondary">
                                        {label}
                                    </Typography>
                                </Stack>
                                {loading ? (
                                    <Skeleton variant="text" height={44} sx={{ mt: 1, width: "70%" }} />
                                ) : (
                                    <Typography variant="h4" fontWeight={700} sx={{ mt: 1 }}>
                                        {index === 0 && metrics.totalProjects}
                                        {index === 1 && `฿${formatCurrency(metrics.totalInvoice)}`}
                                        {index === 2 && `฿${formatCurrency(metrics.totalIncentive)}`}
                                        {index === 3 && `${metrics.incentiveRate.toFixed(2)}%`}
                                    </Typography>
                                )}
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>

            <Grid container spacing={3}>
                <Grid size={{ xs: 12, lg: 7 }}>
                    <Card sx={{ borderRadius: 1, background: cardBg, border: `1px solid ${cardBorder}`, boxShadow: cardShadow }}>
                        <CardContent>
                            <Typography variant="h6" fontWeight={700} gutterBottom>
                                Project Summary
                            </Typography>
                            <Divider sx={{ mb: 2 }} />
                            <Stack spacing={2}>
                                {loading
                                    ? Array.from({ length: 3 }).map((_, index) => (
                                        <Card
                                            key={index}
                                            variant="outlined"
                                            sx={{
                                                borderRadius: 3,
                                                borderColor: cardBorder,
                                                bgcolor: isDark ? "rgba(15, 23, 42, 0.3)" : "rgba(248, 250, 252, 0.9)"
                                            }}
                                        >
                                            <CardContent>
                                                <Skeleton variant="text" height={28} width="60%" />
                                                <Skeleton variant="text" height={22} width="40%" />
                                                <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                                                    <Skeleton variant="rounded" height={28} width={120} />
                                                    <Skeleton variant="rounded" height={28} width={120} />
                                                </Stack>
                                            </CardContent>
                                        </Card>
                                    ))
                                    : projectSummaries.map((project) => (
                                        <Card
                                            key={project.project_header_id}
                                            variant="outlined"
                                            sx={{
                                                borderRadius: 3,
                                                borderColor: cardBorder,
                                                bgcolor: isDark ? "rgba(15, 23, 42, 0.3)" : "rgba(248, 250, 252, 0.9)"
                                            }}
                                        >
                                            <CardContent>
                                                <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ xs: "flex-start", md: "center" }}>
                                                    <Box flex={1}>
                                                        <Typography variant="subtitle1" fontWeight={700}>
                                                            {project.project_no} • {project.project_name}
                                                        </Typography>
                                                        <Typography variant="body2" color="text.secondary">
                                                            Invoice: ฿{formatCurrency(project.total_invoice)}
                                                        </Typography>
                                                    </Box>
                                                    <Stack direction="row" spacing={2} sx={{ m: 1 }} flexWrap="wrap">
                                                        <Grid container spacing={1}>
                                                            <Grid size={{ xs: "auto", md: "auto" }}>
                                                                <Chip
                                                                    label={`Performance ฿${formatCurrency(project.totalIncentive)}`}
                                                                    variant="outlined"
                                                                    sx={{ borderColor: cardBorder, color: softChipColor, fontWeight: 600 }}
                                                                />
                                                                <Chip
                                                                    label={`Role % ${project.totalRolePercentage.toFixed(1)}%`}
                                                                    variant="outlined"
                                                                    sx={{ borderColor: cardBorder, color: softChipColor, fontWeight: 600 }}
                                                                />
                                                            </Grid>
                                                        </Grid>
                                                    </Stack>
                                                </Stack>
                                                <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 2 }}>
                                                    <Grid container spacing={1}>
                                                        {(project.roles || []).map((role) => (
                                                            <Grid size={{ xs: "auto", md: "auto" }}>
                                                                <Chip
                                                                    key={`${project.project_header_id}-${role.role}`}
                                                                    label={`${role.role}: ฿${formatCurrency(role.incentive_amount)}`}
                                                                    size="small"
                                                                    sx={{ bgcolor: softChipBg, color: softChipColor }}
                                                                />
                                                            </Grid>
                                                        ))}
                                                    </Grid>
                                                </Stack>
                                            </CardContent>
                                        </Card>
                                    ))}
                            </Stack>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid size={{ xs: 12, lg: 5 }}>
                    <Card sx={{ borderRadius: 1, height: "100%", background: cardBg, border: `1px solid ${cardBorder}`, boxShadow: cardShadow }}>
                        <CardContent>
                            <Typography variant="h6" fontWeight={700} gutterBottom>
                                Role Distribution
                            </Typography>
                            <Divider sx={{ mb: 2 }} />
                            <Stack spacing={2}>
                                {loading
                                    ? Array.from({ length: 5 }).map((_, index) => (
                                        <Box key={index}>
                                            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
                                                <Skeleton variant="text" width="40%" />
                                                <Skeleton variant="text" width="30%" />
                                            </Stack>
                                            <Skeleton variant="rounded" height={8} />
                                        </Box>
                                    ))
                                    : roleDistribution.map((role) => {
                                        const share = metrics.totalIncentive > 0
                                            ? (role.totalIncentive / metrics.totalIncentive) * 100
                                            : 0;
                                        return (
                                            <Box key={role.role}>
                                                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
                                                    <Typography variant="subtitle2" fontWeight={600}>
                                                        {role.role}
                                                    </Typography>
                                                    <Typography variant="subtitle2" color="text.secondary">
                                                        ฿{formatCurrency(role.totalIncentive)} ({share.toFixed(1)}%)
                                                    </Typography>
                                                </Stack>
                                                <LinearProgress
                                                    variant="determinate"
                                                    value={share}
                                                    sx={{
                                                        height: 8,
                                                        borderRadius: 1,
                                                        bgcolor: cardBorder,
                                                        "& .MuiLinearProgress-bar": {
                                                            borderRadius: 1,
                                                            bgcolor: isDark ? theme.palette.primary.light : theme.palette.primary.main
                                                        }
                                                    }}
                                                />
                                            </Box>
                                        );
                                    })}
                            </Stack>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Box>
    );
};
export default Performance;