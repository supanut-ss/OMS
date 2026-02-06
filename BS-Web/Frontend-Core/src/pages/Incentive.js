import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
    Box, Card, CardContent, Typography, Grid, useTheme, useMediaQuery,
    Skeleton, Divider, Stack, Paper, Chip, Alert, TextField, MenuItem,
    Select, FormControl, InputLabel, Fade, Dialog, DialogTitle, DialogContent,
    IconButton, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    InputAdornment
} from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import BarChartIcon from '@mui/icons-material/BarChart';
import PendingIcon from '@mui/icons-material/Pending';
import CloseIcon from '@mui/icons-material/Close';
import PersonIcon from '@mui/icons-material/Person';
import SearchIcon from '@mui/icons-material/Search';
import { Line, Doughnut, Pie } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
    Filler
} from 'chart.js';
import AxiosMaster from '../utils/AxiosMaster';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

const Incentive = () => {
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const isTablet = useMediaQuery(theme.breakpoints.down('md'));

    const [year, setYear] = useState(new Date().getFullYear());
    const [data, setData] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const searchInputRef = React.useRef(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [selectedProject, setSelectedProject] = useState(null);
    const [dialogOpen, setDialogOpen] = useState(false);

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const res = await AxiosMaster(`/projects/incentive?year=${year}`);
            if (res.data.message_code === 0) {
                setData(res.data.data || []);
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
    }, [year]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        const handleKeyDown = (event) => {
            if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
                event.preventDefault();
                searchInputRef.current?.focus();
            }
            if (event.key === 'Escape') {
                setSearchTerm('');
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('th-TH', {
            style: 'decimal',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(value || 0);
    };

    const years = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i);

    // Calculate metrics
    const metrics = useMemo(() => {
        if (!data || data.length === 0) return {
            totalEarnings: 0,
            unpaidEarnings: 0,
            monthlyData: [],
            projectData: []
        };

        let totalEarnings = 0;
        let unpaidEarnings = 0;
        let totalProjectValue = 0;
        let totalCollectedAmount = 0;
        const monthlyMap = {};
        const projectData = [];

        data.forEach(project => {
            let projectTotal = 0;
            let projectPaid = 0;

            // Get project month for distribution
            let projectMonth = null;
            if (project.plan_project_end) {
                const endDate = new Date(project.plan_project_end);
                projectMonth = endDate.toLocaleString('en-US', { month: 'short' });
            } else if (project.plan_project_start) {
                const startDate = new Date(project.plan_project_start);
                projectMonth = startDate.toLocaleString('en-US', { month: 'short' });
            }

            // Accumulate project values
            totalProjectValue += parseFloat(project.project_value) || 0;
            totalCollectedAmount += parseFloat(project.collected_amount) || 0;

            project.roles?.forEach(role => {
                role.member?.forEach(member => {
                    // Calculate incentive_total if not present
                    const incentiveTotal = member.incentive_total ??
                        ((parseFloat(member.incentive_by_manday) || 0) + (parseFloat(member.incentive_by_actual_work) || 0));

                    totalEarnings += incentiveTotal;
                    projectTotal += incentiveTotal;

                    // Check if paid based on paid_date field
                    if (!member.paid_date) {
                        unpaidEarnings += incentiveTotal;
                    } else {
                        projectPaid += incentiveTotal;
                    }

                    // Group by month for trend (multiple sources)
                    let monthToUse = null;

                    // Priority 1: paid_date (if paid)
                    if (member.paid_date) {
                        const paidDate = new Date(member.paid_date);
                        monthToUse = paidDate.toLocaleString('en-US', { month: 'short' });
                    }
                    // Priority 2: created_at
                    else if (member.created_at) {
                        const createdDate = new Date(member.created_at);
                        monthToUse = createdDate.toLocaleString('en-US', { month: 'short' });
                    }
                    // Priority 3: project end/start date
                    else if (projectMonth) {
                        monthToUse = projectMonth;
                    }
                    // Priority 4: current month (fallback)
                    else {
                        monthToUse = new Date().toLocaleString('en-US', { month: 'short' });
                    }

                    if (monthToUse) {
                        monthlyMap[monthToUse] = (monthlyMap[monthToUse] || 0) + incentiveTotal;
                    }
                });
            });

            // Add all projects (including zero incentive)
            projectData.push({
                name: project.project_name || 'Unknown Project',
                projectNo: project.project_no || '',
                total: projectTotal,
                paid: projectPaid,
                unpaid: projectTotal - projectPaid,
                projectValue: parseFloat(project.project_value) || 0,
                collectedAmount: parseFloat(project.collected_amount) || 0
            });
        });

        // Separate projects with and without incentive
        const projectsWithIncentive = projectData.filter(p => p.total > 0);
        const projectsWithoutIncentive = projectData.filter(p => p.total === 0);

        // Sort project data by total descending
        projectsWithIncentive.sort((a, b) => b.total - a.total);
        projectsWithoutIncentive.sort((a, b) => (b.projectValue || 0) - (a.projectValue || 0));

        // Convert monthly map to array (last 12 months)
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const currentMonth = new Date().getMonth();
        const monthlyData = [];

        for (let i = 0; i < 12; i++) {
            const monthIndex = (currentMonth - 11 + i + 12) % 12;
            const monthName = months[monthIndex];
            monthlyData.push({
                month: monthName,
                value: monthlyMap[monthName] || 0
            });
        }

        return {
            totalEarnings,
            unpaidEarnings,
            totalProjectValue,
            totalCollectedAmount,
            monthlyData,
            projectData: projectsWithIncentive.slice(0, 10), // Top 10 projects with incentive
            allProjects: projectsWithIncentive,
            zeroIncentiveProjects: projectsWithoutIncentive
        };
    }, [data]);

    // Rank Dashboard - Top 5 by person
    const rankDashboard = useMemo(() => {
        if (!data || data.length === 0) return [];

        return Object.values(
            data
                .flatMap((project) =>
                    project.roles?.flatMap((role) =>
                        role.member?.map((member) => ({
                            user_id: member.user_id,
                            full_name: `${member.first_name} ${member.last_name}`,
                            role: role.role,
                            project_id: project.project_header_id,
                            incentive_total: member.incentive_total ?? ((member.incentive_by_manday || 0) + (member.incentive_by_actual_work || 0))
                        })) || []
                    ) || []
                )
                .reduce((acc, item) => {
                    const existing = acc[item.user_id];
                    if (existing) {
                        existing.incentive_total += item.incentive_total || 0;
                        existing.roles.add(item.role);
                        existing.projects.add(item.project_id);
                    } else {
                        acc[item.user_id] = {
                            user_id: item.user_id,
                            full_name: item.full_name,
                            incentive_total: item.incentive_total || 0,
                            roles: new Set([item.role]),
                            projects: new Set([item.project_id])
                        };
                    }
                    return acc;
                }, {})
        )
            .map((item) => ({
                ...item,
                roles: Array.from(item.roles),
                project_count: item.projects.size
            }))
            .filter((item) => (item.incentive_total || 0) > 0)
            .sort((a, b) => b.incentive_total - a.incentive_total)
            .map((item, index) => ({ ...item, rank: index + 1 }))
            .slice(0, 5);
    }, [data]);

    // Filtered projects for search
    const filteredProjects = useMemo(() => {
        if (!searchTerm.trim()) return metrics.projectData;
        const q = searchTerm.trim().toLowerCase();
        return metrics.projectData.filter((project) =>
            project.projectNo?.toLowerCase().includes(q) ||
            project.name?.toLowerCase().includes(q)
        );
    }, [metrics.projectData, searchTerm]);

    const filteredZeroIncentiveProjects = useMemo(() => {
        if (!searchTerm.trim()) return metrics.zeroIncentiveProjects;
        const q = searchTerm.trim().toLowerCase();
        return metrics.zeroIncentiveProjects.filter((project) =>
            project.projectNo?.toLowerCase().includes(q) ||
            project.name?.toLowerCase().includes(q)
        );
    }, [metrics.zeroIncentiveProjects, searchTerm]);

    // Chart configurations
    const lineChartData = {
        labels: metrics.monthlyData.map(d => d.month),
        datasets: [
            {
                label: 'Active Earnings',
                data: metrics.monthlyData.map(d => d.value),
                borderColor: isDark ? '#90caf9' : '#1976d2',
                backgroundColor: isDark ? 'rgba(144, 202, 249, 0.1)' : 'rgba(25, 118, 210, 0.1)',
                fill: true,
                tension: 0.4,
                pointRadius: 4,
                pointHoverRadius: 6
            }
        ]
    };

    const doughnutChartData = {
        labels: metrics.projectData.map(d => {
            const label = d.projectNo ? `${d.projectNo}` : d.name;
            return label.length > 20 ? label.substring(0, 20) + '...' : label;
        }),
        datasets: [
            {
                label: 'Total Earnings',
                data: metrics.projectData.map(d => d.total),
                backgroundColor: [
                    'rgba(156, 39, 176, 0.8)',
                    'rgba(33, 150, 243, 0.8)',
                    'rgba(76, 175, 80, 0.8)',
                    'rgba(255, 152, 0, 0.8)',
                    'rgba(244, 67, 54, 0.8)',
                    'rgba(233, 30, 99, 0.8)',
                    'rgba(103, 58, 183, 0.8)',
                    'rgba(0, 150, 136, 0.8)',
                    'rgba(255, 193, 7, 0.8)',
                    'rgba(121, 85, 72, 0.8)'
                ],
                borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                borderWidth: 2,
                hoverOffset: 10
            }
        ]
    };

    const pieChartData = {
        labels: ['เก็บเงินแล้ว', 'ค้างเก็บ'],
        datasets: [
            {
                data: [
                    metrics.totalCollectedAmount,
                    metrics.totalProjectValue - metrics.totalCollectedAmount
                ],
                backgroundColor: [
                    'rgba(76, 175, 80, 0.8)',
                    'rgba(158, 158, 158, 0.3)'
                ],
                borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                borderWidth: 2,
                hoverOffset: 8
            }
        ]
    };

    const lineChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: !isMobile,
                labels: {
                    color: isDark ? '#fff' : '#000'
                }
            },
            tooltip: {
                callbacks: {
                    label: function (context) {
                        return `${context.dataset.label}: ฿${formatCurrency(context.parsed.y)}`;
                    }
                }
            }
        },
        scales: {
            x: {
                grid: {
                    color: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
                },
                ticks: {
                    color: isDark ? '#aaa' : '#666'
                }
            },
            y: {
                grid: {
                    color: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
                },
                ticks: {
                    color: isDark ? '#aaa' : '#666',
                    callback: function (value) {
                        return '฿' + (value / 1000).toFixed(0) + 'K';
                    }
                }
            }
        }
    };

    const doughnutChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: isMobile ? 'bottom' : 'right',
                labels: {
                    color: isDark ? '#fff' : '#000',
                    padding: 15,
                    font: {
                        size: isMobile ? 10 : 12
                    },
                    boxWidth: isMobile ? 15 : 20
                }
            },
            tooltip: {
                callbacks: {
                    label: function (context) {
                        const total = context.dataset.data.reduce((a, b) => a + b, 0);
                        const percentage = ((context.parsed / total) * 100).toFixed(1);
                        return `${context.label}: ฿${formatCurrency(context.parsed)} (${percentage}%)`;
                    }
                }
            }
        },
        cutout: '60%'
    };

    const pieChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        layout: {
            padding: isMobile ? 10 : 20
        },
        plugins: {
            legend: {
                position: isMobile ? 'bottom' : 'right',
                align: 'center',
                labels: {
                    color: isDark ? '#fff' : '#000',
                    padding: isMobile ? 10 : 15,
                    font: {
                        size: isMobile ? 10 : 12,
                        weight: 600
                    },
                    boxWidth: isMobile ? 15 : 18,
                    usePointStyle: false,
                    generateLabels: (chart) => {
                        const data = chart.data;
                        return data.labels.map((label, index) => ({
                            text: label,
                            fillStyle: data.datasets[0].backgroundColor[index],
                            hidden: false,
                            index: index,
                            pointStyle: 'rect'
                        }));
                    }
                }
            },
            tooltip: {
                backgroundColor: isDark ? 'rgba(0,0,0,0.8)' : 'rgba(0,0,0,0.8)',
                titleColor: '#fff',
                bodyColor: '#fff',
                padding: 12,
                displayColors: true,
                borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.2)',
                borderWidth: 1,
                callbacks: {
                    label: function (context) {
                        const total = metrics.totalProjectValue;
                        const percentage = ((context.parsed / total) * 100).toFixed(1);
                        return `${context.label}: ฿${formatCurrency(context.parsed)} (${percentage}%)`;
                    }
                }
            }
        }
    };

    const StatCard = ({ title, value, icon: Icon, color, subtitle }) => (
        <Card
            sx={{
                height: '100%',
                borderRadius: 4,
                background: isDark
                    ? `linear-gradient(135deg, rgba(30, 30, 40, 1) 0%, rgba(40, 40, 55, 1) 100%)`
                    : `linear-gradient(135deg, rgba(248, 249, 250, 1) 0%, rgba(255, 255, 255, 1) 100%)`,
                borderLeft: `5px solid ${color}`,
                transition: 'all 0.3s ease',
                boxShadow: isDark ? '0 2px 8px rgba(0,0,0,0.3)' : '0 1px 3px rgba(0,0,0,0.08)',
                '&:hover': {
                    transform: 'translateY(-6px)',
                    boxShadow: isDark ? '0 8px 16px rgba(0,0,0,0.4)' : '0 4px 12px rgba(0,0,0,0.12)'
                }
            }}
        >
            <CardContent sx={{ p: 3 }}>
                <Stack spacing={2}>
                    <Stack direction="row" spacing={2} alignItems="center">
                        <Box
                            sx={{
                                p: 1.5,
                                borderRadius: 3.5,
                                background: `${color}15`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                        >
                            <Icon sx={{ fontSize: 38, color }} />
                        </Box>
                        <Box flex={1}>
                            <Typography variant="overline" color="text.secondary" fontWeight={700} letterSpacing={1.5}>
                                {title}
                            </Typography>
                            {subtitle && (
                                <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                                    {subtitle}
                                </Typography>
                            )}
                        </Box>
                    </Stack>
                    {loading ? (
                        <Skeleton width="80%" height={50} />
                    ) : (
                        <Box>
                            <Typography variant="h3" fontWeight={800} color={color} sx={{ letterSpacing: -1 }}>
                                ฿{formatCurrency(value)}
                            </Typography>
                        </Box>
                    )}
                </Stack>
            </CardContent>
        </Card>
    );

    const ChartCard = ({ title, icon: Icon, children, height = 400 }) => (
        <Card sx={{
            height: '100%',
            borderRadius: 4,
            background: isDark
                ? 'linear-gradient(135deg, rgba(35, 35, 50, 1) 0%, rgba(45, 45, 60, 1) 100%)'
                : 'linear-gradient(135deg, rgba(255, 255, 255, 1) 0%, rgba(248, 249, 251, 1) 100%)',
            boxShadow: isDark ? '0 2px 8px rgba(0,0,0,0.3)' : '0 1px 3px rgba(0,0,0,0.08)',
            transition: 'all 0.3s ease',
            '&:hover': {
                boxShadow: isDark ? '0 8px 16px rgba(0,0,0,0.4)' : '0 4px 12px rgba(0,0,0,0.12)'
            }
        }}>
            <CardContent sx={{ p: 3 }}>
                <Stack direction="row" spacing={1.5} alignItems="center" mb={3}>
                    <Icon sx={{ color: theme.palette.primary.main, fontSize: 28 }} />
                    <Typography variant="h5" fontWeight={700}>
                        {title}
                    </Typography>
                </Stack>
                <Divider sx={{ mb: 3, opacity: 0.5 }} />
                <Box sx={{ height, position: 'relative' }}>
                    {loading ? (
                        <Skeleton variant="rectangular" width="100%" height="100%" />
                    ) : (
                        children
                    )}
                </Box>
            </CardContent>
        </Card>
    );

    const handleProjectClick = (projectNo) => {
        const project = data.find(p => p.project_no === projectNo);
        if (project) {
            setSelectedProject(project);
            setDialogOpen(true);
        }
    };

    const handleCloseDialog = () => {
        setDialogOpen(false);
        setSelectedProject(null);
    };

    return (
        <Box
            sx={{
                minHeight: '100vh',
                background: isDark
                    ? 'linear-gradient(135deg, rgba(18, 18, 30, 1) 0%, rgba(28, 28, 40, 1) 100%)'
                    : 'linear-gradient(135deg, rgba(245, 247, 255, 1) 0%, rgba(250, 250, 250, 1) 100%)',
                p: { xs: 2 }
            }}
        >
            <Box sx={{ width: '100%' }}>
                {/* Header */}
                <Card
                    sx={{
                        mb: 4,
                        borderRadius: 4,
                        background: isDark
                            ? 'linear-gradient(135deg, rgba(15, 45, 130, 1) 0%, rgba(100, 20, 170, 1) 100%)'
                            : 'linear-gradient(135deg, rgba(63, 129, 222, 1) 0%, rgba(140, 75, 215, 1) 100%)',
                        color: 'white',
                        boxShadow: isDark ? '0 8px 24px rgba(0,0,0,0.4)' : '0 4px 16px rgba(0,0,0,0.15)'
                    }}
                >
                    <CardContent sx={{ py: 5, px: 4 }}>
                        <Typography variant={isMobile ? "h5" : "h3"} fontWeight={900} gutterBottom sx={{ mb: 1 }}>
                            📊 Incentives Dashboard
                        </Typography>
                        <Typography variant="h6" sx={{ opacity: 0.95, fontWeight: 300, mb: 3 }}>
                            Track and monitor incentive earnings across all projects
                        </Typography>
                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ pt: 1 }}>
                            <FormControl sx={{ minWidth: { xs: '100%', sm: 200 } }}>
                                <InputLabel sx={{ color: 'rgba(255,255,255,0.8)' }}>เลือกปี</InputLabel>
                                <Select
                                    value={year}
                                    label="เลือกปี"
                                    onChange={(e) => setYear(e.target.value)}
                                    disabled={loading}
                                    sx={{
                                        color: 'white',
                                        '.MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.3)' },
                                        '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.5)' },
                                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: 'white' },
                                        '.MuiSvgIcon-root': { color: 'white' }
                                    }}
                                >
                                    {years.map((y) => (<MenuItem key={y} value={y}>{y + 543}</MenuItem>))}
                                </Select>
                            </FormControl>
                            <TextField
                                label="ค้นหา Project"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="รหัส/ชื่อโปรเจกต์"
                                size="medium"
                                inputRef={searchInputRef}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <SearchIcon sx={{ color: 'rgba(255,255,255,0.8)' }} />
                                        </InputAdornment>
                                    ),
                                    endAdornment: searchTerm ? (
                                        <InputAdornment position="end">
                                            <IconButton
                                                aria-label="clear search"
                                                size="small"
                                                onClick={() => setSearchTerm('')}
                                                sx={{ color: 'rgba(255,255,255,0.8)' }}
                                            >
                                                <CloseIcon fontSize="small" />
                                            </IconButton>
                                        </InputAdornment>
                                    ) : null
                                }}
                                sx={{
                                    minWidth: { xs: '100%', sm: 280 },
                                    '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.8)' },
                                    '& .MuiInputLabel-root.Mui-focused': { color: '#ffffff' },
                                    '& .MuiOutlinedInput-root': {
                                        color: 'white',
                                        '& fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                                        '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.6)' },
                                        '&.Mui-focused fieldset': { borderColor: '#ffffff', borderWidth: 2 }
                                    },
                                    '& .MuiOutlinedInput-input::selection': { backgroundColor: 'rgba(255,255,255,0.35)' },
                                    '& input::placeholder': { color: 'rgba(255,255,255,0.5)' }
                                }}
                            />
                            {!loading && (
                                <Chip
                                    label={`${(metrics?.projectData?.length ?? 0) + (metrics?.zeroIncentiveProjects?.length ?? 0)} Projects`}
                                    sx={{
                                        backgroundColor: 'rgba(255,255,255,0.25)',
                                        color: 'white',
                                        fontWeight: 600,
                                        width: { xs: '100%', sm: 'auto' },
                                        fontSize: '0.95rem',
                                        height: 40
                                    }}
                                />
                            )}
                        </Stack>
                    </CardContent>
                </Card>

                {error && (
                    <Alert severity="error" sx={{ mb: 3 }}>
                        {error}
                    </Alert>
                )}
                {/* Summary Cards */}
                <Grid container spacing={3} sx={{ mb: 4 }}>
                    <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                        <StatCard
                            title="Total Earnings"
                            value={metrics.totalEarnings}
                            icon={AttachMoneyIcon}
                            color="#2e7d32"
                            subtitle="Last 12 Months"
                        />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                        <StatCard
                            title="Unpaid Earnings"
                            value={metrics.unpaidEarnings}
                            icon={PendingIcon}
                            color="#ed6c02"
                            subtitle="Pending payout"
                        />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                        <StatCard
                            title="Total Project Value"
                            value={metrics.totalProjectValue}
                            icon={BarChartIcon}
                            color="#1976d2"
                            subtitle="All Projects"
                        />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                        <StatCard
                            title="Collected Amount"
                            value={metrics.totalCollectedAmount}
                            icon={TrendingUpIcon}
                            color="#0288d1"
                            subtitle={`${((metrics.totalCollectedAmount / metrics.totalProjectValue) * 100).toFixed(1)}% of Total`}
                        />
                    </Grid>
                </Grid>

                {/* Charts */}
                <Grid container spacing={3}>
                    <Grid size={{
                        xs: 12,
                        md: 6,
                        lg: 4
                    }}>
                        <ChartCard title="Active Earnings (Last 12 Months)" icon={TrendingUpIcon} height={450}>
                            <Line data={lineChartData} options={lineChartOptions} />
                        </ChartCard>
                    </Grid>
                    <Grid size={{
                        xs: 12,
                        md: 6,
                        lg: 4
                    }}>
                        <ChartCard title="Earnings by Project" icon={BarChartIcon} height={450}>
                            <Doughnut data={doughnutChartData} options={doughnutChartOptions} />
                        </ChartCard>
                    </Grid>
                    <Grid size={{
                        xs: 12,
                        md: 6,
                        lg: 4
                    }}>
                        <ChartCard title="Collection Progress" icon={AttachMoneyIcon} height={400}>
                            <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 2 }}>
                                <Box sx={{ flex: 1, position: 'relative', minHeight: 250 }}>
                                    <Pie data={pieChartData} options={pieChartOptions} />
                                </Box>
                                <Box sx={{
                                    p: 2,
                                    bgcolor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(33,150,243,0.05)',
                                    borderRadius: 2,
                                    textAlign: 'center',
                                    borderTop: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(33,150,243,0.2)'
                                }}>
                                    <Typography variant="h5" fontWeight={800} color="primary" sx={{ mb: 0.5 }}>
                                        {((metrics.totalCollectedAmount / metrics.totalProjectValue) * 100).toFixed(1)}%
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                                        Collection Rate
                                    </Typography>
                                </Box>
                            </Box>
                        </ChartCard>
                    </Grid>
                </Grid>
                {/* Rank Dashboard */}
                {!loading && rankDashboard.length > 0 && (
                    <Fade in={true}>
                        <Card sx={{
                            mt: 4,
                            mb: 4,
                            boxShadow: isDark ? '0 2px 8px rgba(0,0,0,0.3)' : '0 1px 3px rgba(0,0,0,0.08)',
                            background: isDark
                                ? 'linear-gradient(135deg, rgba(35, 35, 50, 1) 0%, rgba(45, 45, 60, 1) 100%)'
                                : 'linear-gradient(135deg, rgba(255, 255, 255, 1) 0%, rgba(248, 249, 251, 1) 100%)',
                            borderRadius: 4
                        }}>
                            <CardContent sx={{ p: 3 }}>
                                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
                                    <Typography variant="h6" fontWeight={700}>
                                        🏆 Top 5 Performers
                                    </Typography>
                                    <Chip label="Updated" size="small" color="success" variant="filled" />
                                </Stack>
                                <Grid container spacing={2}>
                                    {rankDashboard.map((item, index) => (
                                        <Grid size={{ xs: 6, sm: 4, md: 3, lg: 3 }} key={item.user_id}>
                                            <Box
                                                sx={{
                                                    p: 2.5,
                                                    borderRadius: 3.5,
                                                    border: `2px solid ${index === 0 ? '#FFD700' :
                                                        index === 1 ? '#C0C0C0' :
                                                            index === 2 ? '#CD7F32' :
                                                                theme.palette.divider
                                                        }`,
                                                    background: isDark
                                                        ? `linear-gradient(135deg, rgba(33,150,243,0.08) 0%, rgba(156,39,176,0.08) 100%)`
                                                        : `linear-gradient(135deg, rgba(33,150,243,0.05) 0%, rgba(156,39,176,0.03) 100%)`,
                                                    transition: 'all 0.3s ease',
                                                    boxShadow: isDark ? '0 2px 8px rgba(0,0,0,0.3)' : '0 1px 3px rgba(0,0,0,0.08)',
                                                    '&:hover': {
                                                        transform: 'translateY(-6px)',
                                                        boxShadow: isDark ? '0 8px 16px rgba(0,0,0,0.4)' : '0 4px 12px rgba(0,0,0,0.12)',
                                                        borderColor: theme.palette.primary.main
                                                    }
                                                }}
                                            >
                                                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                                                    <Typography variant="subtitle1" fontWeight={700}>
                                                        {item.full_name}
                                                    </Typography>
                                                    <Chip
                                                        label={`#${item.rank}`}
                                                        size="small"
                                                        sx={{
                                                            background: index === 0 ? '#FFD700' :
                                                                index === 1 ? '#C0C0C0' :
                                                                    index === 2 ? '#CD7F32' :
                                                                        theme.palette.primary.main,
                                                            color: index < 3 ? '#000' : 'white',
                                                            fontWeight: 700
                                                        }}
                                                    />
                                                </Stack>
                                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                                                    {item.roles.join(', ')}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
                                                    📁 {item.project_count} Project{item.project_count > 1 ? 's' : ''}
                                                </Typography>
                                                <Divider sx={{ mb: 1.5 }} />
                                                <Typography variant="h6" fontWeight={700} color="primary">
                                                    ฿{formatCurrency(item.incentive_total)}
                                                </Typography>
                                            </Box>
                                        </Grid>
                                    ))}
                                </Grid>
                            </CardContent>
                        </Card>
                    </Fade>
                )}
                {/* Project Details Table */}
                <Card sx={{
                    mt: 4,
                    borderRadius: 4,
                    background: isDark
                        ? 'linear-gradient(135deg, rgba(35, 35, 50, 1) 0%, rgba(45, 45, 60, 1) 100%)'
                        : 'linear-gradient(135deg, rgba(255, 255, 255, 1) 0%, rgba(248, 249, 251, 1) 100%)',
                    boxShadow: isDark ? '0 2px 8px rgba(0,0,0,0.3)' : '0 1px 3px rgba(0,0,0,0.08)'
                }}>
                    <CardContent sx={{ p: 3 }}>
                        <Typography variant="h5" fontWeight={700} gutterBottom>
                            Top Projects by Earnings
                        </Typography>
                        <Divider sx={{ mb: 3, opacity: 0.5 }} />
                        {loading ? (
                            <Skeleton variant="rectangular" height={300} />
                        ) : filteredProjects.length === 0 ? (
                            <Alert severity="info">
                                {searchTerm.trim()
                                    ? `ไม่พบโปรเจกต์ที่ค้นหา: ${searchTerm}`
                                    : 'ไม่มีข้อมูลโปรเจกต์'}
                            </Alert>
                        ) : (
                            <Stack spacing={1.5}>
                                {filteredProjects.map((project, index) => (
                                    <Paper
                                        key={index}
                                        onClick={() => handleProjectClick(project.projectNo)}
                                        sx={{
                                            p: 2.5,
                                            borderRadius: 3.5,
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 2,
                                            cursor: 'pointer',
                                            transition: 'all 0.3s ease',
                                            boxShadow: isDark ? '0 2px 8px rgba(0,0,0,0.3)' : '0 1px 3px rgba(0,0,0,0.08)',
                                            '&:hover': {
                                                bgcolor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
                                                transform: 'translateX(8px)',
                                                boxShadow: isDark ? '0 8px 16px rgba(0,0,0,0.4)' : '0 4px 12px rgba(0,0,0,0.12)'
                                            }
                                        }}
                                        elevation={1}
                                    >
                                        <Chip
                                            label={`#${index + 1}`}
                                            size="medium"
                                            color="primary"
                                            sx={{ minWidth: 50, fontWeight: 700, fontSize: '0.95rem' }}
                                        />
                                        <Box flex={1}>
                                            <Typography variant="body1" fontWeight={600} gutterBottom>
                                                {project.projectNo && `${project.projectNo} - `}{project.name}
                                            </Typography>
                                            <Stack direction="row" spacing={2} mt={1} flexWrap="wrap" gap={0.5}>
                                                <Chip
                                                    label={`Value: ฿${formatCurrency(project.projectValue)}`}
                                                    size="small"
                                                    variant="outlined"
                                                    color="default"
                                                />
                                                <Chip
                                                    label={`Collected: ฿${formatCurrency(project.collectedAmount)}`}
                                                    size="small"
                                                    variant="outlined"
                                                    color="info"
                                                />
                                                <Chip
                                                    label={`Paid: ฿${formatCurrency(project.paid)}`}
                                                    size="small"
                                                    color="success"
                                                />
                                                <Chip
                                                    label={`Unpaid: ฿${formatCurrency(project.unpaid)}`}
                                                    size="small"
                                                    color="warning"
                                                />
                                            </Stack>
                                        </Box>
                                        <Box sx={{ textAlign: 'right', minWidth: { xs: '100px', md: '150px' } }}>
                                            <Typography variant="caption" color="text.secondary" display="block">
                                                Total Incentive
                                            </Typography>
                                            <Typography variant="h6" fontWeight={700} color="primary">
                                                ฿{formatCurrency(project.total)}
                                            </Typography>
                                        </Box>
                                    </Paper>
                                ))}
                            </Stack>
                        )}
                    </CardContent>
                </Card>

                {/* Zero Incentive Projects */}
                {!loading && metrics.zeroIncentiveProjects && metrics.zeroIncentiveProjects.length > 0 && (
                    <Card sx={{
                        mt: 4,
                        borderRadius: 4,
                        borderLeft: '4px solid',
                        borderColor: 'warning.main',
                        background: isDark
                            ? 'linear-gradient(135deg, rgba(35, 35, 50, 1) 0%, rgba(45, 45, 60, 1) 100%)'
                            : 'linear-gradient(135deg, rgba(255, 255, 255, 1) 0%, rgba(248, 249, 251, 1) 100%)',
                        boxShadow: isDark ? '0 2px 8px rgba(0,0,0,0.3)' : '0 1px 3px rgba(0,0,0,0.08)'
                    }}>
                        <CardContent sx={{ p: 3 }}>
                            <Stack direction="row" spacing={2} alignItems="center" mb={2}>
                                <Typography variant="h5" fontWeight={700}>
                                    โปรเจคที่ไม่มี Incentive
                                </Typography>
                                <Chip
                                    label={`${metrics.zeroIncentiveProjects.length} Projects`}
                                    color="warning"
                                    size="small"
                                />
                            </Stack>
                            <Divider sx={{ mb: 3 }} />
                            {filteredZeroIncentiveProjects.length === 0 && searchTerm.trim() ? (
                                <Alert severity="info">
                                    {`ไม่พบโปรเจกต์ที่ค้นหา: ${searchTerm}`}
                                </Alert>
                            ) : (
                                <Stack spacing={1.5}>
                                    {filteredZeroIncentiveProjects.map((project, index) => (
                                        <Paper
                                            key={index}
                                            onClick={() => handleProjectClick(project.projectNo)}
                                            sx={{
                                                p: 2.5,
                                                borderRadius: 3.5,
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 2,
                                                cursor: 'pointer',
                                                bgcolor: isDark ? 'rgba(255, 152, 0, 0.05)' : 'rgba(255, 152, 0, 0.03)',
                                                border: '1px solid',
                                                borderColor: isDark ? 'rgba(255, 152, 0, 0.3)' : 'rgba(255, 152, 0, 0.2)',
                                                transition: 'all 0.3s ease',
                                                boxShadow: isDark ? '0 2px 8px rgba(0,0,0,0.3)' : '0 1px 3px rgba(0,0,0,0.08)',
                                                '&:hover': {
                                                    bgcolor: isDark ? 'rgba(255, 152, 0, 0.08)' : 'rgba(255, 152, 0, 0.05)',
                                                    borderColor: 'warning.main',
                                                    transform: 'translateX(8px)',
                                                    boxShadow: isDark ? '0 8px 16px rgba(0,0,0,0.4)' : '0 4px 12px rgba(0,0,0,0.12)'
                                                }
                                            }}
                                            elevation={0}
                                        >
                                            <Chip
                                                label={`#${index + 1}`}
                                                size="medium"
                                                color="warning"
                                                variant="outlined"
                                                sx={{ minWidth: 50, fontWeight: 700, fontSize: '0.95rem' }}
                                            />
                                            <Box flex={1}>
                                                <Typography variant="body1" fontWeight={600} gutterBottom>
                                                    {project.projectNo && `${project.projectNo} - `}{project.name}
                                                </Typography>
                                                <Stack direction="row" spacing={2} mt={1} flexWrap="wrap" gap={0.5}>
                                                    <Chip
                                                        label={`Value: ฿${formatCurrency(project.projectValue)}`}
                                                        size="small"
                                                        variant="outlined"
                                                        color="default"
                                                    />
                                                    <Chip
                                                        label={`Collected: ฿${formatCurrency(project.collectedAmount)}`}
                                                        size="small"
                                                        variant="outlined"
                                                        color="info"
                                                    />
                                                </Stack>
                                            </Box>
                                            <Box sx={{ textAlign: 'right', minWidth: { xs: '100px', md: '150px' } }}>
                                                <Chip
                                                    label="No Incentive"
                                                    color="warning"
                                                    size="small"
                                                    sx={{ fontWeight: 600 }}
                                                />
                                            </Box>
                                        </Paper>
                                    ))}
                                </Stack>
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* Project Details Dialog */}
                <Dialog
                    open={dialogOpen}
                    onClose={handleCloseDialog}
                    maxWidth="lg"
                    fullWidth
                    PaperProps={{
                        sx: {
                            borderRadius: 4,
                            maxHeight: '90vh'
                        }
                    }}
                >
                    <DialogTitle sx={{ pb: 1 }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Box>
                                <Typography variant="h5" fontWeight={700}>
                                    {selectedProject?.project_no} - {selectedProject?.project_name}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    Project Details
                                </Typography>
                            </Box>
                            <IconButton onClick={handleCloseDialog} size="small">
                                <CloseIcon />
                            </IconButton>
                        </Stack>
                    </DialogTitle>
                    <Divider />
                    <DialogContent sx={{ pt: 3 }}>
                        {selectedProject && (
                            <Box>
                                {/* Project Summary */}
                                <Grid container spacing={2} sx={{ mb: 3 }}>
                                    <Grid item xs={6} md={3}>
                                        <Paper sx={{ p: 2, bgcolor: 'success.50', borderRadius: 3 }} elevation={0}>
                                            <Typography variant="caption" color="text.secondary">มูลค่าโปรเจกต์</Typography>
                                            <Typography variant="h6" fontWeight={700} color="success.main">
                                                ฿{formatCurrency(selectedProject.project_value)}
                                            </Typography>
                                        </Paper>
                                    </Grid>
                                    <Grid item xs={6} md={3}>
                                        <Paper sx={{ p: 2, bgcolor: 'info.50', borderRadius: 3 }} elevation={0}>
                                            <Typography variant="caption" color="text.secondary">เก็บเงินแล้ว</Typography>
                                            <Typography variant="h6" fontWeight={700} color="info.main">
                                                ฿{formatCurrency(selectedProject.collected_amount)}
                                            </Typography>
                                        </Paper>
                                    </Grid>
                                    <Grid item xs={6} md={3}>
                                        <Paper sx={{ p: 2, bgcolor: 'primary.50', borderRadius: 3 }} elevation={0}>
                                            <Typography variant="caption" color="text.secondary">ระยะเวลา (เริ่ม)</Typography>
                                            <Typography variant="body2" fontWeight={600}>
                                                {selectedProject.plan_project_start ? new Date(selectedProject.plan_project_start).toLocaleDateString('th-TH') : '-'}
                                            </Typography>
                                        </Paper>
                                    </Grid>
                                    <Grid item xs={6} md={3}>
                                        <Paper sx={{ p: 2, bgcolor: 'primary.50', borderRadius: 3 }} elevation={0}>
                                            <Typography variant="caption" color="text.secondary">ระยะเวลา (สิ้นสุด)</Typography>
                                            <Typography variant="body2" fontWeight={600}>
                                                {selectedProject.plan_project_end ? new Date(selectedProject.plan_project_end).toLocaleDateString('th-TH') : '-'}
                                            </Typography>
                                        </Paper>
                                    </Grid>
                                </Grid>

                                {/* Members by Role */}
                                {selectedProject.roles?.map((role, roleIndex) => (
                                    <Box key={roleIndex} sx={{ mb: 3 }}>
                                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                                            <PersonIcon color="primary" />
                                            <Typography variant="h6" fontWeight={700}>
                                                {role.role}
                                            </Typography>
                                            <Chip label={`${role.role_percentage}%`} size="small" color="primary" />
                                            <Chip label={`${role.member?.length || 0} คน`} size="small" variant="outlined" />
                                        </Stack>
                                        <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 3 }}>
                                            <Table size={isMobile ? "small" : "medium"}>
                                                <TableHead>
                                                    <TableRow sx={{
                                                        bgcolor: isDark ? 'rgba(100, 100, 120, 0.4)' : 'rgba(33, 150, 243, 0.08)',
                                                        '& th': { fontWeight: 700, borderBottom: isDark ? '1px solid rgba(255,255,255,0.1)' : '2px solid rgba(33, 150, 243, 0.3)' }
                                                    }}>
                                                        <TableCell sx={{ fontWeight: 700 }}>ชื่อ-นามสกุล</TableCell>
                                                        <TableCell align="right" sx={{ fontWeight: 700 }}>Assign Manday</TableCell>
                                                        <TableCell align="right" sx={{ fontWeight: 700, display: { xs: 'none', md: 'table-cell' } }}>Actual Work (hr)</TableCell>
                                                        <TableCell align="right" sx={{ fontWeight: 700, display: { xs: 'none', md: 'table-cell' } }}>Total Manday</TableCell>
                                                        <TableCell align="right" sx={{ fontWeight: 700 }}>Incentive (Manday)</TableCell>
                                                        <TableCell align="right" sx={{ fontWeight: 700 }}>Incentive (Work)</TableCell>
                                                        <TableCell align="right" sx={{ fontWeight: 700 }}>Total Incentive</TableCell>
                                                    </TableRow>
                                                </TableHead>
                                                <TableBody>
                                                    {role.member
                                                        ?.sort((a, b) => {
                                                            const totalA = a.incentive_total ?? ((parseFloat(a.incentive_by_manday) || 0) + (parseFloat(a.incentive_by_actual_work) || 0));
                                                            const totalB = b.incentive_total ?? ((parseFloat(b.incentive_by_manday) || 0) + (parseFloat(b.incentive_by_actual_work) || 0));
                                                            return totalB - totalA; // เรียงจากมากไปน้อย
                                                        })
                                                        .map((member, memberIndex) => {
                                                            const incentiveTotal = member.incentive_total ??
                                                                ((parseFloat(member.incentive_by_manday) || 0) + (parseFloat(member.incentive_by_actual_work) || 0));
                                                            return (
                                                                <TableRow
                                                                    key={memberIndex}
                                                                    sx={{
                                                                        bgcolor: memberIndex % 2 === 0
                                                                            ? (isDark ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.5)')
                                                                            : 'transparent',
                                                                        '&:hover': { bgcolor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(33,150,243,0.05)' },
                                                                        borderBottom: isDark ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(0,0,0,0.05)'
                                                                    }}
                                                                >
                                                                    <TableCell>
                                                                        <Typography variant="body2" fontWeight={600}>
                                                                            {member.first_name} {member.last_name}
                                                                        </Typography>
                                                                        <Typography variant="caption" color="text.secondary">
                                                                            {member.user_id}
                                                                        </Typography>
                                                                    </TableCell>
                                                                    <TableCell align="right">{formatCurrency(member.assign_manday)}</TableCell>
                                                                    <TableCell align="right" sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                                                                        {member.actual_work_hour !== null ? formatCurrency(member.actual_work_hour) : '-'}
                                                                    </TableCell>
                                                                    <TableCell align="right" sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                                                                        {formatCurrency(member.total_project_manday)}
                                                                    </TableCell>
                                                                    <TableCell align="right" sx={{ bgcolor: isDark ? 'rgba(76,175,80,0.1)' : 'success.50' }}>
                                                                        <Typography variant="body2" fontWeight={700} color="success.main">
                                                                            ฿{formatCurrency(member.incentive_by_manday)}
                                                                        </Typography>
                                                                    </TableCell>
                                                                    <TableCell align="right" sx={{ bgcolor: isDark ? 'rgba(33,150,243,0.1)' : 'info.50' }}>
                                                                        <Typography variant="body2" fontWeight={700} color="info.main">
                                                                            ฿{formatCurrency(member.incentive_by_actual_work)}
                                                                        </Typography>
                                                                    </TableCell>
                                                                    <TableCell align="right">
                                                                        <Typography variant="body1" fontWeight={700} color={incentiveTotal > 0 ? 'primary' : 'warning.main'}>
                                                                            {incentiveTotal > 0 ? `฿${formatCurrency(incentiveTotal)}` : 'No Incentive'}
                                                                        </Typography>
                                                                    </TableCell>
                                                                </TableRow>
                                                            );
                                                        })}
                                                </TableBody>
                                            </Table>
                                        </TableContainer>
                                    </Box>
                                ))}
                            </Box>
                        )}
                    </DialogContent>
                </Dialog>
            </Box>
        </Box>
    );
};

export default Incentive;
