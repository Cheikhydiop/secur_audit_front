import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  dashboardService,
  DashboardKpis,
  SiteCompliance,
  RegionCompliance,
  PrestataireStats,
  CriticalNonConformite,
  ActionPlanSummary,
  ActionsStats,
  DetailedSiteData,
  AvailableFilters,
  EvolutionData
} from "@/services/DashboardService";
import { inspectionService } from "@/services/InspectionService";
import planningService, { MissionType } from "@/services/PlanningService";
import { actionService, ReactivityScore } from "@/services/ActionService";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { OfflineQueueService } from "@/services/OfflineQueueService";
import { OfflineSyncService } from "@/services/OfflineSyncService";

import { Link, useLocation, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  MapPin,
  Calendar,
  CalendarRange,
  ArrowRight,
  Shield,
  Activity,
  FileText,
  Clock,
  History,
  RotateCcw,
  Loader2,
  FileBarChart,
  LayoutDashboard,
  ClipboardCheck,
  ListChecks,
  Archive,
  RefreshCw,
  Eye,
  Building2,
  User,
  ChevronDown,
  MoreHorizontal,
  PauseCircle,
  XCircle,
  BarChart3,
  BadgeAlert,
  Filter,
  Download,
  Search,
  FilterX,
  X,
  AlertCircle,
  Target,
  PieChart as PieChartIcon,
  Table as TableIcon,
  TrendingDownIcon,
  Users,
  Home,
  ArrowUpDown
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
  AreaChart,
  Area,
  Legend,
  LineChart,
  Line,
  ReferenceLine
} from "recharts";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from "@/components/ui/dropdown-menu";
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

// ========== Constants & Helper Functions ==========

const COLORS = {
  conforme: "#10B981", // Emeraude vif
  vigilance: "#F59E0B", // Ambre vif (plus distinct du rouge)
  critique: "#EF4444", // Rouge vif
  nonAudite: "#94A3B8"
};

// ========== Helper Functions ==========

// KPI Card Component with animated counter - hooks must be at top level!
interface KpiCardProps {
  kpi: {
    label: string;
    value: string;
    sub: string;
    icon: React.ElementType;
    color: string;
    up: boolean;
  };
  index: number;
}

function useAnimatedCounter(endValue: number, duration: number = 1000) {
  const [count, setCount] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);

  useEffect(() => {
    if (endValue === 0) {
      setCount(0);
      return;
    }
    setHasStarted(true);

    let startTime: number;
    let animationFrame: number;

    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);

      // Easing function
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      setCount(Math.floor(easeOutQuart * endValue));

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animationFrame);
  }, [endValue, duration]);

  return hasStarted ? count : 0;
}

function KpiCard({ kpi, index }: KpiCardProps) {
  const numericValue = useMemo(() => {
    const val = kpi.value.toString();
    if (val.includes('/')) {
      const parts = val.split('/');
      return { num: parseInt(parts[0]) || 0, den: parseInt(parts[1]) || 1 };
    }
    return { num: parseFloat(val.replace(/[^\d.]/g, '')) || 0, den: 100 };
  }, [kpi.value]);

  const [animatedValue, setAnimatedValue] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setAnimatedValue(numericValue.num), 100);
    return () => clearTimeout(timer);
  }, [numericValue]);

  const displayValue = kpi.value.includes('%')
    ? `${animatedValue}%`
    : kpi.value.includes('/')
      ? `${animatedValue}/${numericValue.den}`
      : animatedValue.toString();

  const pct = useMemo(() => {
    if (kpi.value.toString().includes('/')) {
      return Math.round((animatedValue / numericValue.den) * 100);
    }
    if (kpi.label === "Conformité Globale" || kpi.label === "Taux Clôture") {
      return Math.min(animatedValue, 100);
    }
    if (kpi.label === "NC Critiques" || kpi.label === "Actions en Retard") {
      return Math.min(animatedValue * 10, 100);
    }
    return Math.min(animatedValue * 5, 100);
  }, [animatedValue, numericValue, kpi.label, kpi.value]);

  // Visual theme per color
  const theme = {
    green: { icon: 'bg-emerald-500 shadow-emerald-200', bar: 'bg-emerald-400', text: 'text-emerald-800', ring: 'ring-emerald-100', bg: 'bg-gradient-to-br from-white to-emerald-50/40' },
    orange: { icon: 'bg-amber-500 shadow-amber-200', bar: 'bg-amber-400', text: 'text-amber-800', ring: 'ring-amber-100', bg: 'bg-gradient-to-br from-white to-amber-50/40' },
    red: { icon: 'bg-red-500 shadow-red-200', bar: 'bg-red-400', text: 'text-red-800', ring: 'ring-red-100', bg: 'bg-gradient-to-br from-white to-red-50/40' },
    blue: { icon: 'bg-sonatel-orange shadow-orange-200', bar: 'bg-sonatel-orange', text: 'text-sonatel-orange', ring: 'ring-orange-100', bg: 'bg-gradient-to-br from-white to-orange-50/40' },
  }[kpi.color] ?? { icon: 'bg-gray-400 shadow-gray-200', bar: 'bg-gray-400', text: 'text-gray-800', ring: 'ring-gray-100', bg: 'bg-white' };



  return (
    <div
      className={`group relative overflow-hidden rounded-[1.5rem] border-2 ${theme.bg} ring-2 ${theme.ring}
        border-gray-100 hover:border-gray-200 shadow-md hover:shadow-xl
        transition-all duration-500 cursor-default
        animate-in fade-in slide-in-from-bottom-4`}
      style={{ animationDelay: `${index * 80}ms` }}
    >
      {/* Top accent stripe */}
      <div className={`absolute top-0 left-0 right-0 h-1.5 ${theme.bar} opacity-80`} />

      <div className="p-4 flex flex-col gap-2">
        {/* Row 1: icon + badge */}
        <div className="flex items-center justify-between">
          <div className={`w-11 h-11 rounded-2xl ${theme.icon} shadow-lg flex items-center justify-center transition-transform group-hover:scale-110 duration-300`}>
            <kpi.icon className="w-5.5 h-5.5 text-white" />
          </div>
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-black text-xs
            ${kpi.up ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
            {kpi.up ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
            <span>{kpi.up ? 'Bon' : 'Attention'}</span>
          </div>
        </div>

        {/* Row 2: metric value */}
        <div>
          <div className="text-h6 font-black text-gray-700 uppercase tracking-[0.10em] mb-0.5">{kpi.label}</div>
          <div className={`text-5xl md:text-6xl font-black tracking-tighter ${theme.text} leading-none transition-all duration-300`}>
            {displayValue}
          </div>
          <div className="text-sm font-bold text-gray-600 mt-1 line-clamp-1">{kpi.sub}</div>
        </div>

        {/* Row 3: progress bar */}
        <div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full ${theme.bar} rounded-full transition-all duration-1000`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}



const getComplianceColor = (score: number): string => {
  if (score >= 90) return "#059669"; // Emerald-600 (Excellent)
  if (score >= 89) return "#10B981"; // Emerald-500 (Bon)
  if (score >= 60) return "#F59E0B"; // Amber (Vigilance)
  if (score > 0) return "#EF4444";   // Red (Critique)
  return "#94A3B8";                 // Slate (Non audité)
};

const getComplianceLabel = (score: number): string => {
  if (score >= 90) return "Excellent";
  if (score >= 89) return "Bon";
  if (score >= 60) return "Alerte";
  if (score > 0) return "Critique";
  return "Non audité";
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'IN_PROGRESS':
    case 'EN_COURS':
      return { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200' };
    case 'COMPLETED':
    case 'TERMINE':
      return { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200' };
    case 'PLANNED':
    case 'A_FAIRE':
      return { bg: 'bg-orange-50', text: 'text-sonatel-orange', border: 'border-orange-100' };
    case 'EN_RETARD':
      return { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200' };
    default:
      return { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-200' };
  }
};

const getStatusText = (status: string) => {
  switch (status) {
    case 'IN_PROGRESS': return 'En cours';
    case 'EN_COURS': return 'En cours';
    case 'COMPLETED': return 'Terminé';
    case 'TERMINE': return 'Terminé';
    case 'PLANNED': return 'Planifié';
    case 'A_FAIRE': return 'À faire';
    case 'EN_RETARD': return 'En retard';
    default: return status;
  }
};

const getKpiColorClass = (color: string) => {
  switch (color) {
    case 'green': return 'border-l-4 border-l-emerald-500';
    case 'orange': return 'border-l-4 border-l-amber-500';
    case 'red': return 'border-l-4 border-l-red-500';
    default: return 'border-l-4 border-l-sonatel-orange';
  }
};

// ========== Sub-Components ==========

// Compliance Bar Chart Component — Scrollable, dynamic height with smart filters
const SiteComplianceChart = React.memo(({
  data,
  globalAverage = 0,
  tri = "score_asc",
  onTriChange
}: {
  data: SiteCompliance[],
  globalAverage?: number,
  tri?: "score_asc" | "score_desc" | "nom",
  onTriChange?: (val: "score_asc" | "score_desc" | "nom") => void
}) => {
  const [mounted, setMounted] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [scoreFilter, setScoreFilter] = React.useState<"all" | "critical" | "warning" | "good" | "excellent">("all");
  const navigate = useNavigate();

  React.useEffect(() => { setMounted(true); return () => setMounted(false); }, []);

  // Smart Filtering & Sorting logic
  const filteredData = React.useMemo(() => {
    let result = data.filter(site => {
      // Search match
      const nameMatch = site.siteNom.toLowerCase().includes(searchTerm.toLowerCase());

      // Score match
      let scoreMatch = true;
      if (scoreFilter === 'critical') scoreMatch = site.score < 60;
      else if (scoreFilter === 'warning') scoreMatch = site.score >= 60 && site.score < 89;
      else if (scoreFilter === 'good') scoreMatch = site.score >= 89 && site.score < 90;
      else if (scoreFilter === 'excellent') scoreMatch = site.score >= 90;

      return nameMatch && scoreMatch;
    });

    // Client-side sorting reinforcement
    return result.sort((a, b) => {
      if (tri === 'score_asc') return a.score - b.score || a.siteNom.localeCompare(b.siteNom);
      if (tri === 'score_desc') return b.score - a.score || a.siteNom.localeCompare(b.siteNom);
      if (tri === 'nom') return a.siteNom.localeCompare(b.siteNom);
      return 0;
    });
  }, [data, searchTerm, scoreFilter, tri]);

  // Hauteur dynamique : 40px par site (plus d'air), min 300px
  const BAR_HEIGHT = 40;
  const chartHeight = Math.max(300, filteredData.length * BAR_HEIGHT + 80);
  // Hauteur du conteneur scrollable : max 700px visible pour éviter les débordements de page
  const containerHeight = Math.min(700, chartHeight);

  if (!mounted || data.length === 0) {
    return (
      <div className="h-96 w-full bg-gray-50/50 rounded-3xl animate-pulse flex items-center justify-center">
        <div className="text-center">
          <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-2 animate-bounce" />
          <p className="text-sm text-gray-400 font-bold">Chargement des données...</p>
        </div>
      </div>
    );
  }

  // Custom Axis Tick to handle long names
  const TruncatedAxisTick = (props: any) => {
    const { x, y, payload } = props;
    const name = payload.value;
    const truncatedName = name.length > 32 ? name.substring(0, 29) + '...' : name;

    return (
      <g transform={`translate(${x},${y})`}>
        <text
          x={-12}
          y={0}
          dy={4}
          textAnchor="end"
          fill="#334155"
          fontSize="11px"
          fontWeight="900"
          className="cursor-help uppercase tracking-tighter"
        >
          <title>{name}</title>
          {truncatedName}
        </text>
      </g>
    );
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const site = payload[0].payload;
      return (
        <div className="bg-white p-4 rounded-2xl shadow-2xl border-2 border-orange-50 flex flex-col gap-2 max-w-xs ring-4 ring-black/5 z-[100]">
          <div className="font-black text-gray-900 border-b pb-2 mb-1 text-base leading-tight">{site.siteNom}</div>
          {site.horsperiode && (
            <div className="flex items-center gap-1.5 text-[14px] font-black text-amber-600 bg-amber-50 px-2 py-1.5 rounded-lg border border-amber-100 uppercase tracking-tighter">
              <span className="text-sm">⚠️</span>
              <span>Dernier audit disponible (Hors Période)</span>
            </div>
          )}
          <div className="flex items-center justify-between gap-4 mt-1">
            <span className="text-[14px] font-black text-gray-400 uppercase">Conformité :</span>
            <span className="text-xl font-black" style={{ color: getComplianceColor(site.score) }}>{site.score}%</span>
          </div>
          <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${site.score}%`, backgroundColor: getComplianceColor(site.score) }} />
          </div>
          {site.nbNonConformites > 0 && (
            <div className="flex items-center justify-between gap-4 py-1.5 px-3 bg-red-50 rounded-xl mt-1 border border-red-100">
              <span className="text-xs font-black text-red-600 uppercase">NC Ouvertes :</span>
              <span className="text-base font-black text-red-700">{site.nbNonConformites}</span>
            </div>
          )}
          <div className="flex items-center justify-between gap-4 mt-1">
            <span className="text-[14px] font-black text-gray-400 uppercase tracking-tighter">Zone :</span>
            <span className="text-xs font-black text-gray-800">{site.zone}</span>
          </div>
          {site.dernierAudit && (
            <div className="text-[14px] font-black text-gray-400 mt-2 bg-gray-[50] px-2 py-1 rounded-md border border-gray-100 italic">
              AUDITÉ LE : {new Date(site.dernierAudit).toLocaleDateString()}
            </div>
          )}
          <div className="text-[14px] font-black text-sonatel-orange mt-2 uppercase tracking-tighter animate-pulse flex items-center justify-center gap-2 bg-orange-50 py-2 rounded-xl">
            <Search className="w-3 h-3" /> VOIR DÉTAILS
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full bg-white rounded-3xl border-2 border-gray-100 shadow-xl overflow-hidden flex flex-col">
      {/* Smart Filters Header */}
      <div className="bg-gray-50/80 p-4 border-b-2 border-gray-100 space-y-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="p-2 bg-sonatel-orange text-white rounded-xl shadow-lg shadow-orange-100">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div>
              <span className="text-base font-black text-gray-900 uppercase tracking-tighter block leading-none">
                {filteredData.length} site{filteredData.length > 1 ? 's' : ''} filtré{filteredData.length > 1 ? 's' : ''}
              </span>
              <span className="text-[14px] font-black text-gray-400 uppercase tracking-widest">
                Sur un total de {data.length}
              </span>
            </div>
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Chercher dans ce classement..."
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl border-2 border-gray-200 bg-white text-sm font-black focus:border-sonatel-orange focus:ring-0 transition-all outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[14px] font-black text-gray-400 uppercase tracking-widest mr-2">Filtrer par score :</span>
          {[
            { id: 'all', label: 'Tous', color: 'gray' },
            { id: 'critical', label: '< 60% (Critique)', color: '#EF4444' },
            { id: 'warning', label: '60-89% (Alerte)', color: '#F59E0B' },
            { id: 'good', label: '89-90% (Bon)', color: '#10B981' },
            { id: 'excellent', label: '>= 90% (Excellent)', color: '#059669' }
          ].map(btn => (
            <button
              key={btn.id}
              onClick={() => setScoreFilter(btn.id as any)}
              className={`px-3 py-1.5 rounded-xl text-[14px] font-black uppercase transition-all border-2
                 ${scoreFilter === btn.id
                  ? 'bg-sonatel-orange text-white border-sonatel-orange shadow-md scale-105'
                  : 'bg-white text-gray-500 border-gray-100 hover:border-gray-300'}`}
            >
              {btn.label}
            </button>
          ))}

          <div className="flex-1" />

          <div className="flex items-center gap-2 ml-auto">
            <span className="text-[14px] font-black text-gray-400 uppercase tracking-widest">Tri :</span>
            <Select value={tri} onValueChange={(v) => onTriChange?.(v as any)}>
              <SelectTrigger className="w-[180px] h-9 rounded-xl border-2 font-black text-xs uppercase">
                <SelectValue placeholder="Trier par" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-2">
                <SelectItem value="score_asc">Score croissant</SelectItem>
                <SelectItem value="score_desc">Score décroissant</SelectItem>
                <SelectItem value="nom">Nom A-Z</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Scrollable chart container */}
      <div
        className="flex-1 custom-scrollbar overflow-y-auto overflow-x-hidden min-h-[450px] bg-white scroll-smooth"
        style={{ height: `${containerHeight}px`, maxHeight: '700px' }}
      >
        {filteredData.length > 0 ? (
          <div style={{ height: `${chartHeight}px`, width: '100%' }} className="relative">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={filteredData}
                layout="vertical"
                margin={{ top: 20, right: 60, left: 230, bottom: 20 }}
                onClick={(chartData) => {
                  if (chartData && chartData.activePayload && chartData.activePayload.length) {
                    const siteId = chartData.activePayload[0].payload.siteId;
                    navigate(`/sites/${siteId}`);
                  }
                }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} vertical={true} stroke="#f1f5f9" />
                <XAxis
                  type="number"
                  domain={[0, 100]}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 13, fontWeight: 900, fill: "#94a3b8" }}
                  tickFormatter={(v) => `${v}%`}
                />
                <YAxis
                  type="category"
                  dataKey="siteNom"
                  axisLine={false}
                  tickLine={false}
                  tick={<TruncatedAxisTick />}
                  width={220}
                  interval={0}
                />
                <Tooltip
                  content={<CustomTooltip />}
                  cursor={{ fill: 'rgba(242, 142, 22, 0.03)' }}
                  allowEscapeViewBox={{ x: false, y: true }}
                />
                {globalAverage > 0 && (
                  <ReferenceLine
                    x={globalAverage}
                    stroke="#F28E16"
                    strokeDasharray="8 4"
                    strokeWidth={3}
                    className="animate-pulse"
                    label={{
                      position: 'insideTopRight',
                      value: `OBJECTIF: ${globalAverage}%`,
                      fill: '#F28E16',
                      fontSize: 12,
                      fontWeight: 900,
                      dx: 45
                    }}
                  />
                )}
                <Bar dataKey="score" radius={[0, 20, 20, 0]} barSize={28} cursor="pointer" animationDuration={1000} animationEasing="ease-out">
                  {filteredData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={getComplianceColor(entry.score)}
                      className="transition-all hover:opacity-80"
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-20 text-gray-400 gap-2">
            <Search className="w-16 h-16 opacity-10 animate-pulse" />
            <div className="text-center">
              <p className="text-base font-black uppercase tracking-widest text-gray-300">Aucun résultat trouvé</p>
              <button
                onClick={() => { setSearchTerm(""); setScoreFilter("all"); }}
                className="mt-6 text-sonatel-orange font-black text-xs uppercase border-2 border-orange-100 px-6 py-2 rounded-2xl hover:bg-orange-50 transition-all"
              >
                Réinitialiser la recherche
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer info bar */}
      <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
        <span className="text-[14px] font-black text-gray-400 uppercase tracking-widest">
          {filteredData.length} / {data.length} sites affichés
        </span>
        {filteredData.length > 10 && (
          <span className="text-[14px] font-black text-sonatel-orange flex items-center gap-2 animate-pulse">
            <ArrowRight className="w-3 h-3 rotate-90" /> DÉFILEZ POUR TOUT VOIR
          </span>
        )}
      </div>
    </div>
  );
});




// Region Compliance Chart
const RegionComplianceChart = React.memo(({ data }: { data: RegionCompliance[] }) => {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => { setMounted(true); return () => setMounted(false); }, []);

  if (!mounted) return <div className="h-80 w-full bg-gray-50/50 rounded-3xl animate-pulse" />;

  return (
    <div className="h-80 w-full bg-white rounded-3xl overflow-hidden py-4 border border-gray-50">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
          <XAxis dataKey="zone" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 800, fill: "#999" }} dy={10} />
          <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 800, fill: "#999" }} />
          <Tooltip
            contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', fontWeight: 'bold' }}
            formatter={(value: number, name: string) => [
              name === 'scoreMoyen' ? `${value}%` : value,
              name === 'scoreMoyen' ? 'Taux moyen' : 'Sites'
            ]}
          />
          <Legend />
          <Bar dataKey="scoreMoyen" name="Taux moyen" radius={[6, 6, 0, 0]} barSize={40}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getComplianceColor(entry.scoreMoyen)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
});

// Prestataire Performance Chart
const PrestataireChart = React.memo(({ data }: { data: PrestataireStats[] }) => {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => { setMounted(true); return () => setMounted(false); }, []);

  if (!mounted) return <div className="h-80 w-full bg-gray-50/50 rounded-3xl animate-pulse" />;

  return (
    <div className="h-80 w-full bg-white rounded-3xl overflow-hidden py-4 border border-gray-50">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 10, right: 30, left: 120, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f0f0f0" />
          <XAxis type="number" domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 800, fill: "#999" }} />
          <YAxis type="category" dataKey="prestataire" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 600, fill: "#666" }} width={110} />
          <Tooltip
            contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', fontWeight: 'bold' }}
            formatter={(value: number, name: string) => {
              if (name === 'scoreMoyen') return [`${value}%`, 'Conformité'];
              if (name === 'nbNonConformitesCritiques') return [value, 'NC Critiques'];
              return [value, name];
            }}
          />
          <Bar dataKey="scoreMoyen" name="Conformité" radius={[0, 6, 6, 0]} barSize={20}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getComplianceColor(entry.scoreMoyen)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
});

// Actions Donut Chart
const ActionsDonutChart = React.memo(({ data }: { data: ActionsStats }) => {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => { setMounted(true); return () => setMounted(false); }, []);

  if (!mounted) return <div className="h-64 w-full bg-gray-50/50 rounded-full animate-pulse" />;

  const chartData = [
    { name: 'À faire', value: data.aFaire, color: "#F9A94A" }, // sonatel-light-orange
    { name: 'En cours', value: data.enCours, color: "#F28E16" }, // sonatel-orange
    { name: 'À valider', value: data.aValider, color: "#3B82F6" }, // blue
    { name: 'Terminé', value: data.termine, color: "#10B981" },
    { name: 'En retard', value: data.enRetard, color: "#EF4444" },
  ].filter(d => d.value > 0);

  return (
    <div className="w-full h-full relative">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={90}
            paddingAngle={5}
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
            ))}
          </Pie>
          <Tooltip />
          <Legend verticalAlign="bottom" height={36} />
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
        <div className="text-3xl font-black text-gray-900">{data.total}</div>
        <div className="text-[14px] font-black text-muted-foreground uppercase tracking-widest">Total</div>
      </div>
    </div>
  );
});

// Evolution Chart
const EvolutionChart = React.memo(({ data, showRegions = false, regionData = [] }: { data: any[], showRegions?: boolean, regionData?: any[] }) => {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => { setMounted(true); return () => setMounted(false); }, []);

  if (!mounted) return <div className="h-80 w-full bg-gray-50/50 rounded-3xl animate-pulse" />;

  const chartData = data
    .map((item, idx) => {
      const result: any = {
        mois: item.moisCourt || item.mois,
        moisRaw: item.mois, // Keep full month string for sorting
        global: item.score,
        hasData: item.hasData !== undefined ? item.hasData : true
      };
      if (showRegions && regionData[idx]) {
        Object.entries(regionData[idx]).forEach(([key, val]) => {
          if (key !== 'mois') result[key] = val;
        });
      }
      return result;
    })
    .sort((a, b) => (a.moisRaw || "").localeCompare(b.moisRaw || "")); // Chronological ascending

  return (
    <div className="h-80 w-full bg-white rounded-3xl overflow-hidden py-4 border border-gray-50">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
          <XAxis dataKey="mois" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 800, fill: "#999" }} dy={10} />
          <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 800, fill: "#999" }} />
          <Tooltip
            contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', fontWeight: 'bold' }}
            formatter={(val: any, name: any, props: any) => {
              const hasData = props.payload.hasData;
              return [
                <div className="flex flex-col">
                  <span className="text-lg">{val}%</span>
                  {!hasData && name === "Global" && (
                    <span className="text-[14px] text-amber-500 uppercase font-black tracking-tighter">Valeur reportée (Aucun audit)</span>
                  )}
                </div>,
                name
              ];
            }}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="global"
            name="Global"
            stroke="#F28E16"
            strokeWidth={4}
            dot={(props: any) => {
              const { cx, cy, payload, index } = props;
              const key = `dot-${index}-${payload.mois}`;
              if (!payload.hasData) {
                return <circle key={key} cx={cx} cy={cy} r={4} stroke="#F28E16" strokeWidth={2} fill="white" />;
              }
              return <circle key={key} cx={cx} cy={cy} r={6} fill="#F28E16" />;
            }}
            activeDot={{ r: 8 }}
          />
          {showRegions && regionData.length > 0 && Object.keys(regionData[0] || {}).filter(k => k !== 'mois').slice(0, 5).map((region, idx) => (
            <Line
              key={region}
              type="monotone"
              dataKey={region}
              name={region}
              stroke={["#10B981", "#3B82F6", "#EF4444", "#8B5CF6", "#EC4899"][idx % 5]}
              strokeWidth={2}
              dot={{ r: 3 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
});

// ========== Main Dashboard Component ==========

export default function DashboardPage() {
  const { user } = useAuth();
  const location = useLocation();
  const { isOnline, isReachable } = useOnlineStatus();
  const navigate = useNavigate();
  const dashboardRef = React.useRef<HTMLDivElement>(null);

  // State
  const [activeTab, setActiveTab] = useState("overview");
  const [isLoading, setIsLoading] = useState(true);
  const [offlineCount, setOfflineCount] = useState(0);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState<number>(30); // seconds

  // Filters
  const [filters, setFilters] = useState({
    periode: "30",
    region: "all",
    site: "all",
    prestataire: "all",
    typeSite: "all",
    startDate: "",
    endDate: "",
    quickFilter: "none" as "none" | "critical" | "overdue",
    siteSearch: "",
    sitesTri: "score_asc",
    tableauTri: "score_asc"
  });

  // Data states
  const [kpiData, setKpiData] = useState<DashboardKpis | null>(null);
  const [sitesData, setSitesData] = useState<SiteCompliance[]>([]);
  const [regionsData, setRegionsData] = useState<RegionCompliance[]>([]);
  const [prestatairesData, setPrestatairesData] = useState<PrestataireStats[]>([]);
  const [ncCritiques, setNcCritiques] = useState<CriticalNonConformite[]>([]);
  const [plansActions, setPlansActions] = useState<ActionPlanSummary[]>([]);
  const [actionsStats, setActionsStats] = useState<ActionsStats>({ aFaire: 0, enCours: 0, termine: 0, enRetard: 0, aValider: 0, total: 0 });
  const [tableauSites, setTableauSites] = useState<DetailedSiteData[]>([]);
  const [availableFilters, setAvailableFilters] = useState<AvailableFilters | null>(null);

  // Interdependent filters logic
  const filteredAvailableSites = useMemo(() => {
    if (!availableFilters?.sites) return [];
    return availableFilters.sites.filter(site => {
      const regionMatch = filters.region === "all" || site.zone === filters.region;
      const prestataireMatch = filters.prestataire === "all" || site.prestataire === filters.prestataire;
      const typeMatch = filters.typeSite === "all" || site.type === filters.typeSite;
      return regionMatch && prestataireMatch && typeMatch;
    });
  }, [availableFilters?.sites, filters.region, filters.prestataire, filters.typeSite]);

  const filteredAvailablePrestataires = useMemo(() => {
    if (!availableFilters?.prestataires) return [];
    if (filters.region === "all") return availableFilters.prestataires;

    // Get unique prestataires from sites in the selected region
    const prestasInRegion = new Set(
      availableFilters.sites
        .filter(s => s.zone === filters.region)
        .map(s => s.prestataire)
        .filter(Boolean)
    );
    return Array.from(prestasInRegion) as string[];
  }, [availableFilters, filters.region]);
  const [evolutionData, setEvolutionData] = useState<any[]>([]);
  const [evolutionParRegion, setEvolutionParRegion] = useState<any[]>([]);
  const [evolutionInsight, setEvolutionInsight] = useState<string>("");
  const [isExporting, setIsExporting] = useState(false);
  const [recentInspections, setRecentInspections] = useState<any[]>([]);
  const [recentMissions, setRecentMissions] = useState<MissionType[]>([]);
  const [overviewSortMode, setOverviewSortMode] = useState<'top' | 'flop'>('top');
  const [reactivityScores, setReactivityScores] = useState<ReactivityScore[]>([]);

  // Table sort state
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

  // Sync offline count
  useEffect(() => {
    const updateOfflineCount = async () => {
      try {
        const count = await OfflineQueueService.getQueueCount();
        setOfflineCount(count);
      } catch (err) {
        setOfflineCount(0);
      }
    };
    updateOfflineCount();
  }, [location.pathname]);

  const handleSync = async () => {
    try {
      await OfflineSyncService.syncAll();
      const count = await OfflineQueueService.getQueueCount();
      setOfflineCount(count);
    } catch (err) {
      console.error("Sync failed:", err);
    }
  };

  const loadEvolution = useCallback(async () => {
    try {
      const res = await dashboardService.getEvolution({
        siteId: filters.site,
        periode: filters.periode,
        region: filters.region,
        prestataire: filters.prestataire,
        typeSite: filters.typeSite
      });
      if (res.data) {
        setEvolutionData(res.data.global || []);
        setEvolutionParRegion(res.data.parRegion || []);
        setEvolutionInsight(res.data.insight || "");
      }
    } catch (error) {
      console.error("Error loading evolution:", error);
    }
  }, [filters.site, filters.periode, filters.region, filters.prestataire, filters.typeSite]);

  // Fetch all dashboard data
  const fetchDashboardData = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setIsLoading(true);

    try {
      // Build filter params
      const filterParams = {
        periode: filters.periode,
        region: filters.region !== 'all' ? filters.region : undefined,
        site: filters.site !== 'all' ? filters.site : undefined,
        prestataire: filters.prestataire !== 'all' ? filters.prestataire : undefined,
        typeSite: filters.typeSite !== 'all' ? filters.typeSite : undefined,
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined,
        quickFilter: filters.quickFilter !== 'none' ? filters.quickFilter : undefined,
      };

      const qParams = new URLSearchParams(filterParams as any).toString();

      // [CACHE-FIRST] Try to load all components from cache first
      const cachedKpis = dashboardService.getCachedResponse<DashboardKpis>(`kpis?${qParams}`);
      const cachedSites = dashboardService.getCachedResponse<SiteCompliance[]>(`conformite-par-site?tri=${filters.sitesTri}&${qParams}`);
      const cachedRegions = dashboardService.getCachedResponse<RegionCompliance[]>(`conformite-par-region?${qParams}`);
      const cachedPrestataires = dashboardService.getCachedResponse<PrestataireStats[]>(`conformite-par-prestataire?${qParams}`);
      const cachedNCs = dashboardService.getCachedResponse<CriticalNonConformite[]>(`non-conformites-critiques?${qParams}`);
      const cachedActions = dashboardService.getCachedResponse<ActionPlanSummary[]>(`plans-actions?${qParams}`);
      const cachedStats = dashboardService.getCachedResponse<ActionsStats>(`actions-stats`);
      const cachedFilters = dashboardService.getCachedResponse<AvailableFilters>(`filters`);
      const cachedEvolution = dashboardService.getCachedResponse<EvolutionData>(`evolution?${qParams}`);
      const cachedReactivity = dashboardService.getCachedResponse<ReactivityScore[]>(`reactivity?zone=${filters.region}`);

      if (cachedKpis) setKpiData(cachedKpis);
      if (cachedSites) setSitesData(cachedSites);
      if (cachedRegions) setRegionsData(cachedRegions);
      if (cachedPrestataires) setPrestatairesData(cachedPrestataires);
      if (cachedNCs) setNcCritiques(cachedNCs);
      if (cachedActions) setPlansActions(cachedActions);
      if (cachedStats) setActionsStats(cachedStats);
      if (cachedFilters) setAvailableFilters(cachedFilters);
      if (cachedEvolution) {
        setEvolutionData(cachedEvolution.global || []);
        setEvolutionParRegion(cachedEvolution.parRegion || []);
        setEvolutionInsight(cachedEvolution.insight || "");
      }
      if (cachedReactivity) setReactivityScores(cachedReactivity);

      // If we had cache, we can hide the global loader early
      if (cachedKpis) setIsLoading(false);

      // [NETWORK REVALIDATION] Fetch all data in parallel
      const [
        kpisRes,
        sitesRes,
        regionsRes,
        prestatairesRes,
        ncRes,
        actionsRes,
        actionsStatsRes,
        tableauRes,
        filtersRes,
        evolutionRes,
        inspectionsRes,
        missionsRes,
        reactivityRes
      ] = await Promise.all([
        dashboardService.getEnhancedKpis(filterParams),
        dashboardService.getConformiteParSite({ ...filterParams, tri: filters.sitesTri as any }),
        dashboardService.getConformiteParRegion(filterParams),
        dashboardService.getConformiteParPrestataire(filterParams),
        dashboardService.getNonConformitesCritiques(filterParams),
        dashboardService.getPlansActions(filterParams),
        dashboardService.getActionsStats(),
        dashboardService.getTableauSites({ ...filterParams, tri: filters.tableauTri as any }),
        dashboardService.getAvailableFilters(),
        dashboardService.getEvolution({
          siteId: filterParams.site,
          periode: filterParams.periode,
          region: filterParams.region,
          prestataire: filterParams.prestataire,
          typeSite: filterParams.typeSite
        }),
        inspectionService.getAll({ limit: 5, page: 1 }),
        user?.role === 'INSPECTEUR' ? planningService.getPendingMissions(true) : planningService.getPlanningGlobal(),
        actionService.getReactivityScores({
          zone: filters.region !== 'all' ? filters.region : undefined
        })
      ]);

      // Update states with fresh network data
      if (kpisRes.data) setKpiData(kpisRes.data);
      if (sitesRes.data) setSitesData(sitesRes.data);
      if (regionsRes.data) setRegionsData(regionsRes.data);
      if (prestatairesRes.data) setPrestatairesData(prestatairesRes.data);
      if (ncRes.data) setNcCritiques(ncRes.data);
      if (actionsRes.data) setPlansActions(actionsRes.data);
      if (actionsStatsRes.data) setActionsStats(actionsStatsRes.data);
      if (tableauRes.data) setTableauSites(tableauRes.data);
      if (filtersRes.data) setAvailableFilters(filtersRes.data);
      if (evolutionRes.data) {
        setEvolutionData(evolutionRes.data.global || []);
        setEvolutionParRegion(evolutionRes.data.parRegion || []);
        setEvolutionInsight(evolutionRes.data.insight || "");
      }
      if (inspectionsRes.data?.inspections) setRecentInspections(inspectionsRes.data.inspections);
      if (missionsRes) {
        const missions = 'missions' in missionsRes ? (missionsRes as { missions: any[] }).missions : missionsRes;
        setRecentMissions(missions.slice(0, 4));
      }
      if (reactivityRes?.data) setReactivityScores(reactivityRes.data);

      setLastUpdate(new Date());
    } catch (error) {
      console.error("Erreur chargement dashboard:", error);
    } finally {
      setIsLoading(false);
    }
  }, [filters, user?.role]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Auto-refresh effect
  useEffect(() => {
    if (!autoRefresh || isLoading) return;

    const intervalId = setInterval(() => {
      console.log('🔄 Auto-refresh du dashboard...');
      fetchDashboardData(true);
      setLastUpdate(new Date());
    }, refreshInterval * 1000);

    return () => clearInterval(intervalId);
  }, [autoRefresh, refreshInterval, fetchDashboardData, isLoading]);

  // Sort function for tableau sites
  const sortedSites = useMemo(() => {
    let sorted = [...tableauSites];
    if (sortConfig) {
      sorted.sort((a, b) => {
        const aVal = a[sortConfig.key as keyof DetailedSiteData];
        const bVal = b[sortConfig.key as keyof DetailedSiteData];

        if (typeof aVal === 'string' && typeof bVal === 'string') {
          return sortConfig.direction === 'asc'
            ? aVal.localeCompare(bVal)
            : bVal.localeCompare(aVal);
        }

        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
        }

        return 0;
      });
    }
    return sorted;
  }, [tableauSites, sortConfig]);

  const handleSort = (key: string) => {
    setSortConfig(prev => ({
      key,
      direction: prev?.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // Export function (Server-side generated report)
  const handleExport = async () => {
    setIsExporting(true);
    try {
      const res = await dashboardService.exportDashboard(filters);
      if (res.data) {
        if (res.data.urlPdf) window.open(res.data.urlPdf, '_blank');
      }
    } catch (err) {
      console.error("Export Error:", err);
    } finally {
      setIsExporting(false);
    }
  };

  // Full Dashboard PDF Capture (Client-side snapshot)
  const handleDownloadFullDashboard = async () => {
    if (!dashboardRef.current) return;
    setIsExporting(true);

    try {
      // Temporarily hide elements we don't want in the PDF
      const container = dashboardRef.current;

      // We use a small delay to ensure everything is rendered
      await new Promise(resolve => setTimeout(resolve, 500));

      const canvas = await html2canvas(container, {
        scale: 2, // Higher quality
        useCORS: true, // Handle cross-origin images (like Cloudinary)
        logging: false,
        backgroundColor: '#F9FAFB',
        windowWidth: container.scrollWidth,
        windowHeight: container.scrollHeight
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

      // If the dashboard is very long, it will be multiple pages
      let heightLeft = pdfHeight;
      let position = 0;
      const pageHeight = pdf.internal.pageSize.getHeight();

      pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, pdfHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`Dashboard_Pilotage360_${format(new Date(), 'dd_MM_yyyy')}.pdf`);
    } catch (error) {
      console.error("Error capturing dashboard:", error);
    } finally {
      setIsExporting(false);
    }
  };

  const resetFilters = () => {
    setFilters({ site: 'all', periode: '30', region: 'all', prestataire: 'all', typeSite: 'all', startDate: '', endDate: '', quickFilter: 'none', siteSearch: '', sitesTri: 'score_asc', tableauTri: 'score_asc' });
  };

  // Formatted KPIs for display
  const kpisFormatted = useMemo(() => {
    if (!kpiData) return [];

    return [
      {
        label: "Conformité Globale",
        value: `${kpiData.tauxConformiteGlobal}%`,
        trend: "+0%",
        up: kpiData.tauxConformiteGlobal >= 70,
        icon: CheckCircle2,
        sub: `${kpiData.nbSitesConformes} sites conformes`,
        color: kpiData.tauxConformiteGlobal >= 90 ? 'green' : kpiData.tauxConformiteGlobal >= 61 ? 'orange' : 'red'
      },
      {
        label: "Sites Audités",
        value: `${kpiData.nbSitesAudites}/${kpiData.nbTotalSites}`,
        trend: `${Math.round((kpiData.nbSitesAudites / kpiData.nbTotalSites) * 100)}%`,
        up: true,
        icon: FileText,
        sub: "Sites avec inspection validée",
        color: 'blue'
      },
      {
        label: "À Valider",
        value: kpiData.nbPlanActionsAValider?.toString() || "0",
        trend: "Inspecteur",
        up: (kpiData.nbPlanActionsAValider || 0) === 0,
        icon: CheckCircle2,
        sub: "Actions en attente de validation",
        color: (kpiData.nbPlanActionsAValider || 0) > 0 ? 'orange' : 'green'
      },
      {
        label: "NC Critiques",
        value: kpiData.nbNonConformitesCritiques.toString(),
        trend: "!",
        up: kpiData.nbNonConformitesCritiques === 0,
        icon: BadgeAlert,
        sub: "Non conformités ouvertes",
        color: kpiData.nbNonConformitesCritiques > 0 ? 'red' : 'green'
      },
      {
        label: "Actions en Retard",
        value: kpiData.nbPlanActionsEnRetard.toString(),
        trend: "Planifiées",
        up: kpiData.nbPlanActionsEnRetard === 0,
        icon: Clock,
        sub: `${kpiData.nbPlanActionsOuverts} en cours`,
        color: kpiData.nbPlanActionsEnRetard > 0 ? 'red' : 'green'
      },
      {
        label: "Taux Clôture",
        value: `${kpiData.tauxClotureActions}%`,
        trend: "Actions closes",
        up: kpiData.tauxClotureActions >= 70,
        icon: Target,
        sub: `${kpiData.nbPlanActionsTotal - kpiData.nbPlanActionsOuverts} terminées`,
        color: kpiData.tauxClotureActions >= 90 ? 'green' : kpiData.tauxClotureActions >= 61 ? 'orange' : 'red'
      },
    ];
  }, [kpiData]);


  return (
    <div ref={dashboardRef} id="dashboard-page-container" className="p-4 md:p-6 lg:p-7 space-y-7 w-full overflow-hidden bg-[#F9FAFB]">
      {/* Header & Filters */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-4 group">
            <div className="w-16 h-16 rounded-[1.25rem] bg-gradient-to-br from-sonatel-orange to-orange-600 flex items-center justify-center shadow-2xl shadow-orange-200 shrink-0 transform group-hover:rotate-6 transition-transform duration-300">
              <LayoutDashboard className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-gray-900 leading-none">
                {user?.role === 'INSPECTEUR' ? "Mon Dashboard" : "Pilotage 360"}
              </h1>
              <p className="text-[14px] font-black text-gray-400 uppercase tracking-[0.2em] mt-1.5 flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${isReachable ? 'bg-sonatel-orange animate-ping' : 'bg-red-500'}`} />
                {isReachable ? 'CONFORMITÉ & SÉCURITÉ EN TEMPS RÉEL' : 'MODE HORS LIGNE (SERVEUR INDISPONIBLE)'}
              </p>
            </div>
          </div>

          <Separator orientation="vertical" className="h-12 hidden md:block" />

          {/* Global Smart Gauge */}
          {kpiData && (
            <div className="hidden sm:flex items-center gap-4 bg-white px-5 py-3 rounded-[1.5rem] border-2 border-gray-50 shadow-sm hover:shadow-md transition-all">
              <div className="relative w-14 h-14">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="28" cy="28" r="24" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-gray-100" />
                  <circle cx="28" cy="28" r="24" stroke="currentColor" strokeWidth="6" fill="transparent"
                    strokeDasharray={150}
                    strokeDashoffset={150 - (150 * kpiData.tauxConformiteGlobal) / 100}
                    strokeLinecap="round"
                    className="text-sonatel-orange transition-all duration-1000 ease-out"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center font-black text-sm text-gray-800">
                  {kpiData.tauxConformiteGlobal}%
                </div>
              </div>
              <div>
                <span className="text-[10px] font-black text-gray-700 uppercase block leading-none mb-1">Score Global</span>
                <Badge className={`font-black text-[10px] uppercase border-none ${kpiData.tauxConformiteGlobal >= 89 ? 'bg-emerald-100 text-emerald-800' :
                  kpiData.tauxConformiteGlobal >= 60 ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'
                  }`}>
                  {getComplianceLabel(kpiData.tauxConformiteGlobal)}
                </Badge>
              </div>
            </div>
          )}

          {isLoading && (
            <div className="flex items-center gap-2 px-4 py-2 bg-orange-50 rounded-2xl animate-pulse">
              <RefreshCw className="w-4 h-4 text-sonatel-orange animate-spin" />
              <span className="text-xs font-black text-sonatel-orange uppercase tracking-wider">Mise à jour...</span>
            </div>
          )}
        </div>
        {lastUpdate && !isLoading && (
          <div className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest bg-gray-50 border border-gray-100 px-3 py-1.5 rounded-xl self-end">
            <Clock className="w-3 h-3" />
            Sync à {lastUpdate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-4">
        {/* Quick Access Filters Bar (Urgences) */}
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant={filters.quickFilter === 'none' ? 'secondary' : 'outline'}
            size="sm"
            className={`h-9 px-4 rounded-xl text-[10px] font-black uppercase transition-all shadow-sm ${filters.quickFilter === 'none' ? 'bg-gray-900 text-white shadow-lg' : 'bg-white text-gray-500 border-gray-100 hover:border-gray-300'
              }`}
            onClick={() => setFilters(f => ({ ...f, quickFilter: 'none' }))}
          >
            <LayoutDashboard className="w-3.5 h-3.5 mr-2" />
            Vue Globale
          </Button>
          <Button
            variant={filters.quickFilter === 'critical' ? 'secondary' : 'outline'}
            size="sm"
            className={`h-9 px-4 rounded-xl text-[10px] font-black uppercase transition-all shadow-sm ${filters.quickFilter === 'critical' ? 'bg-red-600 text-white shadow-red-200 shadow-lg scale-105' : 'bg-white text-red-500 border-red-50 hover:bg-red-50'
              }`}
            onClick={() => setFilters(f => ({ ...f, quickFilter: 'critical' }))}
          >
            <BadgeAlert className="w-3.5 h-3.5 mr-2" />
            Urgences (NC Critiques)
          </Button>
          <Button
            variant={filters.quickFilter === 'overdue' ? 'secondary' : 'outline'}
            size="sm"
            className={`h-9 px-4 rounded-xl text-[10px] font-black uppercase transition-all shadow-sm ${filters.quickFilter === 'overdue' ? 'bg-amber-600 text-white shadow-amber-200 shadow-lg scale-105' : 'bg-white text-amber-500 border-amber-50 hover:bg-amber-50'
              }`}
            onClick={() => setFilters(f => ({ ...f, quickFilter: 'overdue' }))}
          >
            <AlertTriangle className="w-3.5 h-3.5 mr-2" />
            Actions en retard
          </Button>

          <div className="h-4 w-[2px] bg-gray-100 mx-2 hidden md:block" />

          <div className="flex items-center gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    disabled={isExporting}
                    className="h-10 px-4 bg-white border-2 border-gray-100 rounded-2xl font-black text-xs uppercase tracking-widest text-sonatel-orange hover:bg-orange-50 hover:border-sonatel-orange transition-all duration-300"
                  >
                    {isExporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileText className="w-4 h-4 mr-2" />}
                    {isExporting ? 'Génération...' : 'Exporter PDF'}
                    <ChevronDown className="w-4 h-4 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="rounded-2xl border-2 w-56">
                  <DropdownMenuLabel className="font-black text-[10px] uppercase tracking-widest text-gray-400">Options d'export</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleExport} className="cursor-pointer p-3 rounded-xl focus:bg-orange-50 focus:text-sonatel-orange transition-colors">
                    <FileBarChart className="w-4 h-4 mr-3" />
                    <div>
                      <div className="font-bold text-sm">Rapport Executive</div>
                      <div className="text-[10px] text-gray-400 font-bold uppercase">Synthèse Pro (PDF)</div>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleDownloadFullDashboard} className="cursor-pointer p-3 rounded-xl focus:bg-orange-50 focus:text-sonatel-orange transition-colors">
                    <LayoutDashboard className="w-4 h-4 mr-3" />
                    <div>
                      <div className="font-bold text-sm">Capture Dashboard</div>
                      <div className="text-[10px] text-gray-400 font-bold uppercase">Même format qu'à l'écran</div>
                    </div>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                variant="outline"
                onClick={resetFilters}
                className="h-10 px-4 bg-white border-2 border-gray-100 rounded-2xl font-black text-xs uppercase tracking-widest text-gray-500 hover:bg-gray-50 hover:border-gray-300 transition-all duration-300"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Réinitialiser
              </Button>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSync}
              className="h-9 px-3 rounded-xl text-[10px] font-black uppercase text-gray-400 hover:text-sonatel-orange transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Sync.
            </Button>
            <div className="flex items-center gap-3 px-3 py-1.5 bg-gray-100/30 rounded-xl border border-gray-100/50">
              <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider">MAJ Auto</span>
              <div
                className={`w-8 h-4 rounded-full relative cursor-pointer transition-colors ${autoRefresh ? 'bg-orange-500' : 'bg-gray-200'}`}
                onClick={() => setAutoRefresh(!autoRefresh)}
              >
                <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${autoRefresh ? 'right-0.5' : 'left-0.5'}`} />
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 bg-white p-2 rounded-2xl border-2 border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 px-3 border-r-2 border-gray-50">
            <Calendar className="w-4 h-4 text-sonatel-orange" />
            <Select value={filters.periode} onValueChange={(v) => setFilters(f => ({ ...f, periode: v }))}>
              <SelectTrigger className="w-[130px] border-none bg-transparent font-black text-xs uppercase focus:ring-0">
                <SelectValue placeholder="Période" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-2">
                <SelectItem value="7">7 jours</SelectItem>
                <SelectItem value="30">30 jours</SelectItem>
                <SelectItem value="90">3 mois</SelectItem>
                <SelectItem value="365">Année</SelectItem>
                <SelectItem value="custom">Plage perso</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2 px-3 border-r-2 border-gray-50">
            <MapPin className="w-4 h-4 text-sonatel-orange" />
            <Select value={filters.region} onValueChange={(v) => setFilters(f => ({ ...f, region: v }))}>
              <SelectTrigger className="w-[120px] border-none bg-transparent font-black text-xs uppercase focus:ring-0">
                <SelectValue placeholder="Région" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-2">
                <SelectItem value="all">Toutes</SelectItem>
                {availableFilters?.regions.map(r => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2 px-3 border-r-2 border-gray-50">
            <Shield className="w-4 h-4 text-sonatel-orange" />
            <Select value={filters.typeSite} onValueChange={(v) => setFilters(f => ({ ...f, typeSite: v }))}>
              <SelectTrigger className="w-[120px] border-none bg-transparent font-black text-xs uppercase focus:ring-0">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-2">
                <SelectItem value="all">Tous</SelectItem>
                {availableFilters?.typesSites.map(t => (
                  <SelectItem key={t.name} value={t.name}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2 px-3 border-r-2 border-gray-50">
            <Users className="w-4 h-4 text-sonatel-orange" />
            <Select value={filters.prestataire} onValueChange={(v) => setFilters(f => ({ ...f, prestataire: v, site: 'all' }))}>
              <SelectTrigger className="w-[120px] border-none bg-transparent font-black text-xs uppercase focus:ring-0">
                <SelectValue placeholder="Prestataire" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-2">
                <SelectItem value="all">Tous</SelectItem>
                {filteredAvailablePrestataires.map(p => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2 px-3 border-r-2 border-gray-50 flex-1 min-w-[200px]">
            <Building2 className="w-4 h-4 text-sonatel-orange shrink-0" />
            <div className="relative flex-1">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <Select value={filters.site} onValueChange={(v) => setFilters(f => ({ ...f, site: v }))}>
                <SelectTrigger className="w-full border-none bg-transparent font-black text-xs uppercase focus:ring-0 pl-7">
                  <SelectValue placeholder="Chercher un site..." />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-2 max-h-[400px]">
                  <div className="p-2 border-b border-gray-50 flex items-center gap-2 sticky top-0 bg-white z-10">
                    <Search className="w-4 h-4 text-gray-400" />
                    <input
                      className="flex-1 bg-gray-50 rounded-lg px-3 py-1.5 text-xs font-black outline-none border-none"
                      placeholder="Filtrer la liste..."
                      value={filters.siteSearch}
                      onChange={(e) => {
                        e.stopPropagation();
                        setFilters(f => ({ ...f, siteSearch: e.target.value }));
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                  <SelectItem value="all">Tous les sites</SelectItem>
                  {filteredAvailableSites
                    .filter(s => s.nom.toLowerCase().includes((filters.siteSearch || "").toLowerCase()))
                    .slice(0, 100) // Performance cap for the dropdown
                    .map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.nom}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-2 pl-2">
            {/* Auto-refresh toggle */}
            <div className="flex items-center gap-2 px-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-sonatel-orange focus:ring-sonatel-orange"
                />
                <span className="text-[10px] font-black text-muted-foreground uppercase">Auto</span>
              </label>
              {autoRefresh && (
                <Select value={refreshInterval.toString()} onValueChange={(v) => setRefreshInterval(Number(v))}>
                  <SelectTrigger className="w-[80px] h-8 text-[10px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15s</SelectItem>
                    <SelectItem value="30">30s</SelectItem>
                    <SelectItem value="60">1m</SelectItem>
                    <SelectItem value="300">5m</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
            <Separator orientation="vertical" className="h-8 mx-1" />
            <Button variant="ghost" size="icon" className="h-10 w-10 text-gray-400" onClick={() => fetchDashboardData()}>
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="icon"
                  disabled={isExporting}
                  className="h-10 w-10 rounded-xl bg-sonatel-orange text-white shadow-lg shadow-orange-500/20"
                >
                  {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="rounded-2xl border-2 w-56">
                <DropdownMenuItem onClick={handleExport} className="cursor-pointer p-3 rounded-xl focus:bg-orange-50 focus:text-sonatel-orange transition-colors">
                  <FileBarChart className="w-4 h-4 mr-3" />
                  <div>
                    <div className="font-bold text-sm">Rapport Executive</div>
                    <div className="text-[10px] text-gray-400 font-bold uppercase">PDF Professionnel</div>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDownloadFullDashboard} className="cursor-pointer p-3 rounded-xl focus:bg-orange-50 focus:text-sonatel-orange transition-colors">
                  <LayoutDashboard className="w-4 h-4 mr-3" />
                  <div>
                    <div className="font-bold text-sm">Capture Écran</div>
                    <div className="text-[10px] text-gray-400 font-bold uppercase">Format Dashboard</div>
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {filters.periode === 'custom' && (
          <div className="flex flex-wrap items-center gap-4 bg-gray-50/50 p-3 rounded-2xl border border-dashed border-sonatel-orange/30 animate-in slide-in-from-top-2 duration-300">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-muted-foreground uppercase">Du</span>
              <Input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters(f => ({ ...f, startDate: e.target.value }))}
                className="h-9 w-36 bg-white border-2 border-gray-100 rounded-xl text-xs font-bold"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-muted-foreground uppercase">Au</span>
              <Input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters(f => ({ ...f, endDate: e.target.value }))}
                className="h-9 w-36 bg-white border-2 border-gray-100 rounded-xl text-xs font-bold"
              />
            </div>
            {(filters.startDate && filters.endDate) && (
              <Button
                size="sm"
                onClick={() => fetchDashboardData()}
                className="h-9 rounded-xl bg-sonatel-orange font-black text-[10px] uppercase px-4"
              >
                Appliquer
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Offline Sync Banner */}
      {
        offlineCount > 0 && (
          <Card className={`border-2 animate-in slide-in-from-top duration-500 overflow-hidden ${isOnline ? "border-amber-200 bg-amber-50" : "border-red-100 bg-red-50"}`}>
            <CardContent className="p-0">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 md:p-6">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${isReachable ? "bg-amber-100 text-amber-600" : "bg-red-100 text-red-600"}`}>
                    {isReachable ? <RefreshCw className="w-6 h-6 animate-spin" style={{ animationDuration: '3s' }} /> : <XCircle className="w-6 h-6" />}
                  </div>
                  <div>
                    <h3 className={`text-lg font-black ${isOnline ? "text-amber-900" : "text-red-900"}`}>
                      {offlineCount} audits en attente
                    </h3>
                    <p className={`text-sm font-bold ${isReachable ? "text-amber-700" : "text-red-700"}`}>
                      {isReachable ? "Synchronisez maintenant" : "Hors-ligne"}
                    </p>
                  </div>
                </div>
                {isReachable && (
                  <Button onClick={handleSync} className="bg-amber-500 hover:bg-amber-600 font-black px-6 h-10 rounded-xl gap-2">
                    <RefreshCw className="w-4 h-4" /> Synchroniser
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )
      }

      {/* KPI Cards Banner with Animations */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6 gap-4">
        {kpisFormatted.map((kpi, i) => (
          <KpiCard key={i} kpi={kpi} index={i} />
        ))}
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="overview" className="space-y-6" onValueChange={setActiveTab}>
        <div className="bg-white p-2 rounded-2xl shadow-sm border border-gray-100 inline-block overflow-x-auto max-w-full">
          <TabsList className="bg-transparent h-auto gap-1 p-1">
            <TabsTrigger value="overview" className="rounded-xl px-4 md:px-6 py-2 data-[state=active]:bg-sonatel-orange data-[state=active]:text-white font-black text-xs uppercase tracking-wider">
              Vue d'ensemble
            </TabsTrigger>
            <TabsTrigger value="sites" className="rounded-xl px-4 md:px-6 py-2 data-[state=active]:bg-sonatel-orange data-[state=active]:text-white font-black text-xs uppercase tracking-wider">
              Sites
            </TabsTrigger>
            <TabsTrigger value="regions" className="rounded-xl px-4 md:px-6 py-2 data-[state=active]:bg-sonatel-orange data-[state=active]:text-white font-black text-xs uppercase tracking-wider">
              Régions
            </TabsTrigger>
            <TabsTrigger value="prestataires" className="rounded-xl px-4 md:px-6 py-2 data-[state=active]:bg-sonatel-orange data-[state=active]:text-white font-black text-xs uppercase tracking-wider">
              Prestataires
            </TabsTrigger>
            <TabsTrigger value="actions" className="rounded-xl px-4 md:px-6 py-2 data-[state=active]:bg-sonatel-orange data-[state=active]:text-white font-black text-xs uppercase tracking-wider">
              Plans Actions
            </TabsTrigger>
            <TabsTrigger value="nc" className="rounded-xl px-4 md:px-6 py-2 data-[state=active]:bg-sonatel-orange data-[state=active]:text-white font-black text-xs uppercase tracking-wider">
              NC Critiques
            </TabsTrigger>
            <TabsTrigger value="reactivity" className="rounded-xl px-4 md:px-6 py-2 data-[state=active]:bg-sonatel-orange data-[state=active]:text-white font-black text-xs uppercase tracking-wider">
              Réactivité
            </TabsTrigger>
            <TabsTrigger value="table" className="rounded-xl px-4 md:px-6 py-2 data-[state=active]:bg-sonatel-orange data-[state=active]:text-white font-black text-xs uppercase tracking-wider">
              Comparatif
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Tab: Vue d'ensemble */}
        <TabsContent value="overview" className="mt-0 space-y-6 animate-none">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Evolution Chart */}
            <Card className="bg-white border-2 border-gray-100 shadow-sm overflow-hidden">
              <CardHeader className="p-6 pb-2">
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="text-4xl font-black text-gray-900">Historique Conformité</CardTitle>
                    <p className="text-[10px] text-gray-600 font-black uppercase tracking-wider">Tendance sur la période</p>
                  </div>
                  <TrendingUp className="w-5 h-5 text-sonatel-orange" />
                </div>
              </CardHeader>
              <CardContent className="p-6 pt-2">
                {evolutionInsight && (
                  <div className="mb-4 flex items-start gap-3 bg-orange-50/50 p-4 rounded-3xl border-2 border-orange-100 animate-in fade-in zoom-in duration-500">
                    <div className="p-2 bg-sonatel-orange text-white rounded-xl">
                      <Shield className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-[10px] font-black text-sonatel-orange uppercase tracking-widest mb-1">Analyse Intelligente</div>
                      <p className="text-sm font-bold text-gray-700 leading-relaxed italic">
                        "{evolutionInsight}"
                      </p>
                    </div>
                  </div>
                )}
                <EvolutionChart data={evolutionData} showRegions={false} />
              </CardContent>
            </Card>

            {/* Actions Stats Donut */}
            <Card className="bg-white border-2 border-gray-100 shadow-sm overflow-hidden">
              <CardHeader className="p-6 pb-2">
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="text-4xl font-black text-gray-900">Plans d'Actions</CardTitle>
                    <p className="text-xs text-gray-600 font-bold uppercase tracking-tighter">Répartition par statut</p>
                  </div>
                  <ListChecks className="w-5 h-5 text-sonatel-orange" />
                </div>
              </CardHeader>
              <CardContent className="p-6 pt-2">
                <div className="h-64">
                  <ActionsDonutChart data={actionsStats} />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Top Sites Chart */}
            <Card className="lg:col-span-2 bg-white border-2 border-gray-100 shadow-sm overflow-hidden">
              <CardHeader className="p-6 pb-2">
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="text-4xl font-black text-gray-900">
                      {overviewSortMode === 'top' ? "Classement des Sites" : "Classement des Sites (Flop)"} - Conformité
                    </CardTitle>
                    <p className="text-sm text-muted-foreground font-bold uppercase tracking-tighter">
                      {overviewSortMode === 'top' ? "Performance des sites du plus conforme au moins conforme" : "Sites nécessitant une attention immédiate"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex bg-gray-100 p-0.5 rounded-lg border border-gray-200">
                      <button
                        onClick={() => setOverviewSortMode('top')}
                        className={`px-3 py-1.5 text-xs font-black uppercase rounded-md transition-all ${overviewSortMode === 'top' ? 'bg-white text-sonatel-orange shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                      >
                        Top
                      </button>
                      <button
                        onClick={() => setOverviewSortMode('flop')}
                        className={`px-3 py-1.5 text-xs font-black uppercase rounded-md transition-all ${overviewSortMode === 'flop' ? 'bg-white text-sonatel-orange shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                      >
                        Flop
                      </button>
                    </div>
                    <BarChart3 className="w-5 h-5 text-sonatel-orange" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6 pt-2">
                <div className="flex flex-wrap gap-2 mb-4">
                  {availableFilters?.regions.map(region => (
                    <button
                      key={region}
                      className={`cursor-pointer font-black text-[11px] uppercase px-3 py-1 rounded-lg border transition-all ${filters.region === region ? 'bg-sonatel-orange text-white border-sonatel-orange' : 'bg-white hover:border-sonatel-orange/50 text-gray-400 border-gray-100'}`}
                      onClick={() => setFilters(f => ({ ...f, region: f.region === region ? 'all' : region }))}
                    >
                      {region}
                    </button>
                  ))}
                  <button
                    className="cursor-pointer font-black text-[11px] uppercase px-3 py-1 rounded-lg text-sonatel-orange border border-orange-100 hover:bg-orange-50 bg-white"
                    onClick={() => setFilters(f => ({ ...f, region: 'all', typeSite: 'all', prestataire: 'all' }))}
                  >
                    Reset
                  </button>
                </div>
                <SiteComplianceChart
                  data={[...sitesData].sort((a, b) => overviewSortMode === 'top' ? b.score - a.score : a.score - b.score)}
                  globalAverage={kpiData?.tauxConformiteGlobal}
                />
              </CardContent>
            </Card>

            {/* Regions Summary */}
            <Card className="bg-white border-2 border-gray-100 shadow-sm overflow-hidden">
              <CardHeader className="p-6 pb-2">
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="text-4xl font-black text-gray-900">Par Région</CardTitle>
                    <p className="text-xs text-muted-foreground font-bold uppercase tracking-tighter">Moyenne par zone</p>
                  </div>
                  <MapPin className="w-5 h-5 text-sonatel-orange" />
                </div>
              </CardHeader>
              <CardContent className="p-6 pt-2">
                <div className="space-y-4">
                  {regionsData.map((region, i) => (
                    <div key={i} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-lg font-black text-gray-700">{region.zone}</span>
                        <span className="text-lg font-black" style={{ color: getComplianceColor(region.scoreMoyen) }}>
                          {region.scoreMoyen}%
                        </span>
                      </div>
                      <Progress
                        value={region.scoreMoyen}
                        className="h-2 bg-gray-100 rounded-full"
                        style={{
                          '--progress-fill-color': getComplianceColor(region.scoreMoyen)
                        } as any}
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Dernières Inspections */}
            <Card className="bg-white border-2 border-gray-100 shadow-sm overflow-hidden">
              <CardHeader className="p-6 pb-2">
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="text-4xl font-black text-gray-900">Derniers Audits</CardTitle>
                    <p className="text-xs text-muted-foreground font-bold uppercase tracking-tighter">Flux d'activité récent</p>
                  </div>
                  <History className="w-5 h-5 text-sonatel-orange" />
                </div>
              </CardHeader>
              <CardContent className="p-6 pt-2">
                <div className="space-y-4">
                  {recentInspections.length > 0 ? (
                    recentInspections.map((insp, i) => (
                      <div key={i} className="flex items-center gap-4 p-3 rounded-xl border border-gray-50 hover:bg-gray-50 transition-all group">
                        <div className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center shrink-0 font-black text-xs ${(insp.score || 0) >= 90 ? 'bg-emerald-50 text-emerald-600' :
                          (insp.score || 0) >= 70 ? 'bg-amber-50 text-amber-600' :
                            'bg-red-50 text-red-600'
                          }`}>
                          <span>{insp.score || 0}%</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-black text-gray-900 truncate group-hover:text-sonatel-orange transition-colors">
                            {insp.site?.nom || "Site inconnu"}
                          </p>
                          <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase">
                            <span>{new Date(insp.date).toLocaleDateString()}</span>
                            <span>•</span>
                            <span>{insp.inspecteur?.name || "Inspecteur"}</span>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="rounded-lg h-8 w-8 text-gray-400 opacity-0 group-hover:opacity-100 transition-all"
                          onClick={() => navigate(`/historique/${insp.id}`)}
                        >
                          <ArrowRight className="w-4 h-4" />
                        </Button>
                      </div>
                    ))
                  ) : (
                    <div className="h-48 flex flex-col items-center justify-center text-gray-300 gap-2">
                      <Search className="w-8 h-8 opacity-20" />
                      <p className="text-[10px] font-black uppercase">Aucun audit récent</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Missions à venir / Planning */}
            <Card className="bg-white border-2 border-gray-100 shadow-sm overflow-hidden">
              <CardHeader className="p-6 pb-2">
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="text-4xl font-black text-gray-900">Prochaines Missions</CardTitle>
                    <p className="text-xs text-muted-foreground font-bold uppercase tracking-tighter">Planning prévisionnel</p>
                  </div>
                  <CalendarRange className="w-5 h-5 text-sonatel-orange" />
                </div>
              </CardHeader>
              <CardContent className="p-6 pt-2">
                <div className="space-y-4">
                  {recentMissions.length > 0 ? (
                    recentMissions.map((mission, i) => (
                      <div key={i} className="flex items-center gap-4 p-3 rounded-xl border border-gray-50 hover:bg-gray-50 transition-all group">
                        <div className="w-12 h-12 bg-orange-50 rounded-xl flex flex-col items-center justify-center shrink-0 font-black text-sonatel-orange">
                          <span className="text-[10px] leading-none mb-0.5">{new Date(mission.dateDeb).toLocaleDateString('fr-FR', { month: 'short' }).toUpperCase()}</span>
                          <span className="text-base leading-none">{new Date(mission.dateDeb).getDate()}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-black text-gray-900 truncate">
                            {mission.site?.nom || mission.titre}
                          </p>
                          <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase">
                            <MapPin className="w-2.5 h-2.5" />
                            <span>{mission.site?.zone || "Zone non définie"}</span>
                            <span className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-500">{mission.type || "Audit"}</span>
                          </div>
                        </div>
                        <div className="shrink-0">
                          <Badge variant="outline" className="text-[9px] border-none bg-orange-50 text-sonatel-orange font-black uppercase">
                            {mission.statut === 'A_FAIRE' ? 'À faire' : mission.statut}
                          </Badge>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="h-48 flex flex-col items-center justify-center text-gray-300 gap-2">
                      <Clock className="w-8 h-8 opacity-20" />
                      <p className="text-[10px] font-black uppercase">Aucune mission planifiée</p>
                    </div>
                  )}
                </div>
                {recentMissions.length > 0 && (
                  <Button
                    variant="ghost"
                    className="w-full mt-4 text-[10px] font-black uppercase text-sonatel-orange hover:bg-orange-50 hover:text-sonatel-orange rounded-xl h-10 border border-dashed border-orange-200"
                    onClick={() => navigate('/planning')}
                  >
                    Voir le planning complet
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab: Sites */}
        <TabsContent value="sites" className="mt-0 space-y-6 animate-none">
          <Card className="bg-white border-2 border-gray-100 shadow-sm overflow-hidden">
            <CardHeader className="p-6 pb-2">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-xl font-black text-gray-900">Conformité par Site</CardTitle>
                  <p className="text-xs text-muted-foreground font-bold uppercase tracking-tighter">Classement par taux de conformité</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 pt-2">
              <div className="flex flex-wrap gap-2 mb-4">
                <span className="text-[11px] font-black text-gray-400 uppercase mr-1 pt-1">Filtres rapides :</span>
                {availableFilters?.regions.map(region => (
                  <button
                    key={region}
                    className={`cursor-pointer font-black text-[11px] uppercase px-3 py-1 rounded-lg border transition-all ${filters.region === region ? 'bg-sonatel-orange text-white border-sonatel-orange' : 'bg-white hover:border-sonatel-orange/50 text-gray-400 border-gray-100'}`}
                    onClick={() => setFilters(f => ({ ...f, region: f.region === region ? 'all' : region }))}
                  >
                    {region}
                  </button>
                ))}
              </div>
              <SiteComplianceChart
                data={sitesData}
                globalAverage={kpiData?.tauxConformiteGlobal}
                tri={filters.sitesTri as any}
                onTriChange={(v) => {
                  setFilters(f => ({ ...f, sitesTri: v }));
                  dashboardService.getConformiteParSite({ ...filters, tri: v }).then(r => {
                    if (r.data) setSitesData(r.data);
                  });
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Régions */}
        <TabsContent value="regions" className="mt-0 space-y-6 animate-none">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-white border-2 border-gray-100 shadow-sm overflow-hidden">
              <CardHeader className="p-6 pb-2">
                <CardTitle className="text-xl font-black text-gray-900">Conformité par Région</CardTitle>
                <p className="text-xs text-muted-foreground font-bold uppercase tracking-tighter">Taux moyen par zone</p>
              </CardHeader>
              <CardContent className="p-6 pt-2">
                <RegionComplianceChart data={regionsData} />
              </CardContent>
            </Card>

            <Card className="bg-white border-2 border-gray-100 shadow-sm overflow-hidden">
              <CardHeader className="p-6 pb-2">
                <CardTitle className="text-lg font-black text-gray-900">Historique par Région</CardTitle>
                <p className="text-xs text-muted-foreground font-bold uppercase tracking-tighter">Tendance mensuelle</p>
              </CardHeader>
              <CardContent className="p-6 pt-2">
                <EvolutionChart data={evolutionData} showRegions={true} regionData={evolutionParRegion} />
              </CardContent>
            </Card>
          </div>

          {/* Region Details Table */}
          <Card className="bg-white border-2 border-gray-100 shadow-sm overflow-hidden">
            <CardHeader className="p-6">
              <CardTitle className="text-lg font-black text-gray-900">Détails par Région</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="font-black text-xs uppercase">Région</TableHead>
                    <TableHead className="font-black text-xs uppercase">Sites Total</TableHead>
                    <TableHead className="font-black text-xs uppercase">Sites Audités</TableHead>
                    <TableHead className="font-black text-xs uppercase">Taux Moyen</TableHead>
                    <TableHead className="font-black text-xs uppercase">Conformes</TableHead>
                    <TableHead className="font-black text-xs uppercase">À Risque</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {regionsData.map((region, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-black text-base">{region.zone}</TableCell>
                      <TableCell className="text-base">{region.nbSites}</TableCell>
                      <TableCell>{region.nbSitesAudites}</TableCell>
                      <TableCell>
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-black" style={{ backgroundColor: getComplianceColor(region.scoreMoyen) + '20', color: getComplianceColor(region.scoreMoyen) }}>
                          {region.scoreMoyen}%
                        </span>
                      </TableCell>
                      <TableCell className="text-emerald-600 font-black">{region.sitesConformes}</TableCell>
                      <TableCell className="text-red-600 font-black">{region.sitesRisque}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Prestataires */}
        <TabsContent value="prestataires" className="mt-0 space-y-6 animate-none">
          <Card className="bg-white border-2 border-gray-100 shadow-sm overflow-hidden">
            <CardHeader className="p-6 pb-2">
              <CardTitle className="text-lg font-black text-gray-900">Performance par Société de Gardiennage</CardTitle>
              <p className="text-xs text-muted-foreground font-bold uppercase tracking-tighter">Taux de conformité moyen</p>
            </CardHeader>
            <CardContent className="p-6 pt-2">
              <PrestataireChart data={prestatairesData} />
            </CardContent>
          </Card>

          <Card className="bg-white border-2 border-gray-100 shadow-sm overflow-hidden">
            <CardHeader className="p-6">
              <CardTitle className="text-lg font-black text-gray-900">Détails par Prestataire</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="font-black text-xs uppercase">Prestataire</TableHead>
                    <TableHead className="font-black text-xs uppercase">Sites Gérés</TableHead>
                    <TableHead className="font-black text-xs uppercase">Sites Audités</TableHead>
                    <TableHead className="font-black text-xs uppercase">Score Moyen</TableHead>
                    <TableHead className="font-black text-xs uppercase">NC Critiques</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {prestatairesData.map((p, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-black text-base">{p.prestataire}</TableCell>
                      <TableCell className="text-base">{p.nbSites}</TableCell>
                      <TableCell>{p.nbSitesAudites}</TableCell>
                      <TableCell>
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-black" style={{ backgroundColor: getComplianceColor(p.scoreMoyen) + '20', color: getComplianceColor(p.scoreMoyen) }}>
                          {p.scoreMoyen}%
                        </span>
                      </TableCell>
                      <TableCell>
                        {p.nbNonConformitesCritiques > 0 ? (
                          <Badge variant="destructive">{p.nbNonConformitesCritiques}</Badge>
                        ) : (
                          <span className="text-emerald-600 font-black">0</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Plans Actions */}
        <TabsContent value="actions" className="mt-0 space-y-6 animate-none">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-1 bg-white border-2 border-gray-100 shadow-sm overflow-hidden">
              <CardHeader className="p-6 pb-2">
                <CardTitle className="text-lg font-black text-gray-900">Répartition</CardTitle>
              </CardHeader>
              <CardContent className="p-6 pt-2">
                <div className="h-72">
                  <ActionsDonutChart data={actionsStats} />
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2 bg-white border-2 border-gray-100 shadow-sm overflow-hidden">
              <CardHeader className="p-6">
                <CardTitle className="text-lg font-black text-gray-900">Liste des Plans d'Actions</CardTitle>
              </CardHeader>
              <CardContent className="p-0 max-h-[500px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50 sticky top-0">
                      <TableHead className="font-black text-xs uppercase">Site</TableHead>
                      <TableHead className="font-black text-xs uppercase">Description</TableHead>
                      <TableHead className="font-black text-xs uppercase">Responsable</TableHead>
                      <TableHead className="font-black text-xs uppercase">Échéance</TableHead>
                      <TableHead className="font-black text-xs uppercase">Statut</TableHead>
                      <TableHead className="font-black text-xs uppercase">Progression</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {plansActions.slice(0, 20).map((action, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-black text-base">{action.siteNom}</TableCell>
                        <TableCell className="max-w-[200px] truncate text-base">{action.description}</TableCell>
                        <TableCell className="text-xs">{action.responsableNom}</TableCell>
                        <TableCell className="text-xs">
                          {new Date(action.dateEcheance).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Badge className={`text-[10px] font-black ${getStatusColor(action.statut).bg} ${getStatusColor(action.statut).text}`}>
                            {getStatusText(action.statut)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress value={action.progression} className="h-2 w-16" />
                            <span className="text-xs font-black">{action.progression}%</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab: NC Critiques */}
        <TabsContent value="nc" className="mt-0 space-y-6 animate-none">
          <Card className="bg-white border-2 border-gray-100 shadow-sm overflow-hidden">
            <CardHeader className="p-6">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-lg font-black text-gray-900">Non-Conformités Critiques</CardTitle>
                  <p className="text-xs text-muted-foreground font-bold uppercase tracking-tighter">Prioritaires à traiter</p>
                </div>
                <Badge variant="destructive" className="font-black text-sm">{ncCritiques.length}</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0 max-h-[600px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50 sticky top-0">
                    <TableHead className="font-black text-xs uppercase">Site</TableHead>
                    <TableHead className="font-black text-xs uppercase">Zone</TableHead>
                    <TableHead className="font-black text-xs uppercase">Description</TableHead>
                    <TableHead className="font-black text-xs uppercase">Criticité</TableHead>
                    <TableHead className="font-black text-xs uppercase">Détection</TableHead>
                    <TableHead className="font-black text-xs uppercase">Échéance</TableHead>
                    <TableHead className="font-black text-xs uppercase">Statut Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ncCritiques.map((nc, i) => (
                    <TableRow key={i} className={nc.criticite === 'CRITIQUE' ? 'bg-red-50' : ''}>
                      <TableCell className="font-black text-base">{nc.siteNom}</TableCell>
                      <TableCell className="text-base">{nc.zone}</TableCell>
                      <TableCell className="max-w-[250px] truncate text-xs">{nc.description}</TableCell>
                      <TableCell>
                        <Badge variant={nc.criticite === 'CRITIQUE' ? 'destructive' : 'default'} className="text-[10px] font-black">
                          {nc.criticite}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">
                        {new Date(nc.dateDetection).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-xs">
                        {new Date(nc.dateEcheance).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Badge className={`text-[10px] font-black ${getStatusColor(nc.statut).bg} ${getStatusColor(nc.statut).text}`}>
                          {getStatusText(nc.statut)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {ncCritiques.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="h-64 text-center">
                        <div className="flex flex-col items-center justify-center text-gray-400 gap-2">
                          <CheckCircle2 className="w-12 h-12 text-emerald-100" />
                          <p className="font-black text-xs uppercase tracking-widest">Aucune NC critique ouverte</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Réactivité */}
        <TabsContent value="reactivity" className="mt-0 space-y-6 animate-none">
          <Card className="bg-white border-2 border-gray-100 shadow-sm overflow-hidden">
            <CardHeader className="p-6">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-xl font-black text-gray-900">Score de Réactivité par Entité</CardTitle>
                  <p className="text-xs text-muted-foreground font-bold uppercase tracking-tighter">Performance de clôture des plans d'actions</p>
                </div>
                <Activity className="w-6 h-6 text-sonatel-orange" />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="font-black text-xs uppercase py-4 pl-6 text-gray-400">Site / Entité</TableHead>
                    <TableHead className="font-black text-xs uppercase py-4 text-center text-gray-400">Total Actions</TableHead>
                    <TableHead className="font-black text-xs uppercase py-4 text-center text-gray-400">Respect Délais</TableHead>
                    <TableHead className="font-black text-xs uppercase py-4 text-center text-gray-400">Moy. Clôture (Jours)</TableHead>
                    <TableHead className="font-black text-xs uppercase py-4 text-right pr-6 text-gray-400">Score Performance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reactivityScores.sort((a, b) => b.score - a.score).map((s, i) => (
                    <TableRow key={i} className="group hover:bg-gray-50/50 transition-colors">
                      <TableCell className="py-5 pl-6">
                        <div className="flex flex-col">
                          <span className="font-black text-gray-900 group-hover:text-sonatel-orange transition-colors">{s.siteName}</span>
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">{s.total} actions suivies</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-sm font-black text-gray-900">{s.completed} / {s.total}</span>
                          <Progress value={s.completionRate} className="h-1.5 w-16 bg-gray-100" />
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className={`rounded-lg py-1 px-3 border-none font-black text-[11px] ${s.respectRate >= 80 ? 'bg-emerald-100 text-emerald-700' :
                          s.respectRate >= 50 ? 'bg-amber-100 text-amber-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                          {s.respectRate}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center font-black text-gray-600">
                        {s.averageClosingDays}j
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <div className="flex flex-col items-end gap-1">
                          <span className={`text-2xl font-black ${s.score >= 80 ? 'text-emerald-600' :
                            s.score >= 60 ? 'text-amber-600' :
                              'text-red-600'
                            }`}>
                            {s.score}
                          </span>
                          <span className="text-[8px] font-black uppercase text-gray-400 tracking-widest">Sur 100</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {reactivityScores.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="h-48 text-center text-gray-400 italic">
                        Chargement des indicateurs de performance...
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Tableau Comparatif */}
        <TabsContent value="table" className="mt-0 space-y-6 animate-none">
          <Card className="bg-white border-2 border-gray-100 shadow-sm overflow-hidden">
            <CardHeader className="p-6">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-lg font-black text-gray-900">Tableau Comparatif des Sites</CardTitle>
                  <p className="text-xs text-muted-foreground font-bold uppercase tracking-tighter">Données complètes exportables</p>
                </div>
                <Button onClick={handleExport} className="gap-2">
                  <Download className="w-4 h-4" /> Exporter CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50 sticky top-0">
                    <TableHead className="font-black text-xs uppercase cursor-pointer" onClick={() => handleSort('siteNom')}>
                      Site <ArrowUpDown className="w-3 h-3 ml-1 inline" />
                    </TableHead>
                    <TableHead className="font-black text-xs uppercase cursor-pointer" onClick={() => handleSort('region')}>
                      Région <ArrowUpDown className="w-3 h-3 ml-1 inline" />
                    </TableHead>
                    <TableHead className="font-black text-xs uppercase">Type</TableHead>
                    <TableHead className="font-black text-xs uppercase">Prestataire</TableHead>
                    <TableHead className="font-black text-xs uppercase cursor-pointer" onClick={() => handleSort('tauxConformite')}>
                      Conformité <ArrowUpDown className="w-3 h-3 ml-1 inline" />
                    </TableHead>
                    <TableHead className="font-black text-xs uppercase">NC</TableHead>
                    <TableHead className="font-black text-xs uppercase">Plans Actions</TableHead>
                    <TableHead className="font-black text-xs uppercase">Statut</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedSites.map((site, i) => (
                    <TableRow key={i} className={`hover:bg-gray-50 ${site.horsperiode ? 'bg-amber-50/40' : ''}`}>
                      <TableCell className="font-black text-base">
                        <div className="flex flex-col gap-0.5">
                          <span>{site.siteNom}</span>
                          {site.horsperiode && (
                            <span className="text-[9px] font-black text-amber-600 uppercase tracking-tight">⚠ Hors période</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{site.region}</TableCell>
                      <TableCell className="text-xs">{site.type}</TableCell>
                      <TableCell className="text-xs">{site.prestataire}</TableCell>
                      <TableCell>
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-black" style={{ backgroundColor: getComplianceColor(site.tauxConformite) + '20', color: getComplianceColor(site.tauxConformite) }}>
                          {site.tauxConformite}%
                        </span>
                      </TableCell>
                      <TableCell>
                        {site.nbNonConformites > 0 ? (
                          <Badge variant="outline" className="border-red-200 text-red-600">{site.nbNonConformites}</Badge>
                        ) : (
                          <span className="text-emerald-600">0</span>
                        )}
                      </TableCell>
                      <TableCell>{site.nbPlanActions}</TableCell>
                      <TableCell>
                        <Badge className={`text-[10px] font-black ${getStatusColor(site.statutGlobal).bg} ${getStatusColor(site.statutGlobal).text}`}>
                          {getStatusText(site.statutGlobal)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div >
  );
}
