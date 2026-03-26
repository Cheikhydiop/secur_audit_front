import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
    History,
    Search,
    Filter,
    User,
    Clock,
    Shield,
    AlertCircle,
    ArrowRight,
    Download,
    Calendar,
    CheckCircle2,
    Trash2,
    Edit,
    Plus,
    RefreshCw,
    Loader2,
    ChevronLeft,
    ChevronRight,
    Activity,
    BarChart3,
    Eye,
    X,
    Building2,
    ClipboardCheck,
    ListChecks,
    UserCheck,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { logService, LogEntry, LogFilters, LogStats } from "@/services/LogService";

// ─── Types & Constants ────────────────────────────────────────────────────────

interface LogEntryFormatted extends LogEntry {
    displayUser?: string;
    displayAction?: string;
    displayTarget?: string;
}

const ACTION_LABELS: Record<string, string> = {
    USER_LOGIN: "Connexion",
    USER_LOGOUT: "Déconnexion",
    USER_LOGIN_FAILED: "Échec connexion",
    PASSWORD_CHANGE: "Changement mot de passe",
    PASSWORD_RESET: "Réinitialisation mot de passe",
    DEVICE_VERIFIED: "Vérification appareil",
    USER_CREATE: "Création utilisateur",
    USER_UPDATE: "Modification utilisateur",
    USER_INVITE: "Invitation utilisateur",
    USER_ACTIVATE: "Activation compte",
    USER_DEACTIVATE: "Désactivation compte",
    SITE_CREATE: "Création site",
    SITE_UPDATE: "Modification site",
    SITE_DELETE: "Suppression site",
    INSPECTION_START: "Démarrage inspection",
    INSPECTION_UPDATE: "Sauvegarde inspection",
    INSPECTION_SUBMIT: "Soumission inspection",
    INSPECTION_VALIDATE: "Validation inspection",
    INSPECTION_REJECT: "Rejet inspection",
    INSPECTION_DELETE: "Suppression inspection",
    ACTION_CREATE: "Création plan d'action",
    ACTION_UPDATE: "Mise à jour action",
    ACTION_COMPLETE: "Action complétée",
    PLANNING_CREATE: "Création mission",
    PLANNING_UPDATE: "Modification mission",
    PLANNING_START: "Démarrage mission",
    RAPPORT_GENERATE: "Génération rapport",
};

const ENTITY_LABELS: Record<string, string> = {
    USER: "Utilisateur",
    SITE: "Site",
    INSPECTION: "Inspection",
    ACTION: "Plan d'action",
    PLANNING: "Planning",
    RAPPORT: "Rapport",
    QUESTION: "Question",
    SYSTEM: "Système",
};

function mapCategory(action: string): "create" | "update" | "delete" | "system" {
    const upper = action.toUpperCase();
    if (upper.includes("CREATE") || upper.includes("START") || upper.includes("SUBMIT") || upper.includes("ADD") || upper.includes("INVITE")) return "create";
    if (upper.includes("UPDATE") || upper.includes("EDIT") || upper.includes("CHANGE") || upper.includes("SAVE") || upper.includes("VALIDATE") || upper.includes("COMPLETE") || upper.includes("ACTIVATE")) return "update";
    if (upper.includes("DELETE") || upper.includes("REMOVE") || upper.includes("CANCEL") || upper.includes("REJECT") || upper.includes("DEACTIVATE")) return "delete";
    return "system";
}

function formatLogEntry(log: LogEntry): LogEntryFormatted {
    const category = mapCategory(log.action);
    const entity = log.entity || log.entityType || "";
    return {
        ...log,
        category,
        displayUser: log.user || log.userId || "Système",
        displayAction: ACTION_LABELS[log.action] || log.action,
        displayTarget: entity ? `${ENTITY_LABELS[entity] || entity}${log.entityId ? ` #${log.entityId.slice(0, 8)}` : ""}` : "-",
    };
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────

function LogDetailModal({ log, onClose }: { log: LogEntryFormatted; onClose: () => void }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-[2rem] shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto animate-in slide-in-from-bottom duration-300">
                <div className="flex items-center justify-between p-6 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${getCategoryTheme(log.category)}`}>
                            {getCategoryIcon(log.category)}
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-gray-900">{log.displayAction}</h2>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                                {new Date(log.timestamp).toLocaleString("fr-FR")}
                            </p>
                        </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={onClose} className="rounded-xl">
                        <X className="w-5 h-5" />
                    </Button>
                </div>

                <div className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <InfoRow label="Utilisateur" value={log.displayUser} />
                        <InfoRow label="Email" value={log.userEmail} />
                        <InfoRow label="Rôle" value={log.userRole} />
                        <InfoRow label="Entité" value={log.displayTarget} />
                        <InfoRow label="Adresse IP" value={log.ipAddress} />
                        <InfoRow label="Catégorie" value={log.category} />
                    </div>

                    {log.details && (
                        <div className="mt-4 p-4 bg-gray-50 rounded-2xl">
                            <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Détails</h3>
                            <pre className="text-sm text-gray-700 font-mono whitespace-pre-wrap break-all">
                                {JSON.stringify(JSON.parse(log.details || '{}'), null, 2)}
                            </pre>
                        </div>
                    )}

                    {log.userAgent && (
                        <div className="mt-2 p-4 bg-gray-50 rounded-2xl">
                            <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-2">User Agent</h3>
                            <p className="text-xs text-gray-600 font-mono break-all">{log.userAgent}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function InfoRow({ label, value }: { label: string; value?: string }) {
    if (!value) return null;
    return (
        <div>
            <p className="text-xs font-black text-gray-400 uppercase tracking-widest">{label}</p>
            <p className="text-sm font-bold text-gray-900 mt-0.5">{value}</p>
        </div>
    );
}

// ─── Helper Functions ─────────────────────────────────────────────────────────

function getCategoryIcon(category: LogEntry["category"], size: string = "w-5 h-5") {
    switch (category) {
        case "create": return <Plus className={`${size} text-emerald-500`} />;
        case "update": return <Edit className={`${size} text-amber-500`} />;
        case "delete": return <Trash2 className={`${size} text-red-500`} />;
        case "system": return <Shield className={`${size} text-sonatel-orange`} />;
    }
}

function getCategoryTheme(category: LogEntry["category"]) {
    switch (category) {
        case "create": return "bg-emerald-50 border-2 border-emerald-100";
        case "update": return "bg-amber-50 border-2 border-amber-100";
        case "delete": return "bg-red-50 border-2 border-red-100";
        case "system": return "bg-orange-50 border-2 border-orange-100";
    }
}

function getCategoryBadge(category: LogEntry["category"]) {
    switch (category) {
        case "create": return "bg-emerald-100 text-emerald-700";
        case "update": return "bg-amber-100 text-amber-700";
        case "delete": return "bg-red-100 text-red-700";
        case "system": return "bg-orange-100 text-orange-700";
    }
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function LogsPage() {
    const [logs, setLogs] = useState<LogEntryFormatted[]>([]);
    const [stats, setStats] = useState<LogStats | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [refreshing, setRefreshing] = useState<boolean>(false);
    const [search, setSearch] = useState("");
    const [autoRefresh, setAutoRefresh] = useState<boolean>(false);
    const [refreshInterval, setRefreshInterval] = useState<number>(30);
    const [totalItems, setTotalItems] = useState<number>(0);
    const [totalPages, setTotalPages] = useState<number>(1);
    const [selectedLog, setSelectedLog] = useState<LogEntryFormatted | null>(null);
    const [showFilters, setShowFilters] = useState(false);

    const [filters, setFilters] = useState<LogFilters>({
        page: 1,
        limit: 50,
    });

    // Fetch logs from backend
    const fetchLogs = useCallback(async (isRefresh: boolean = false) => {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);

        try {
            const response = await logService.getAllLogs(filters);

            if (response.error) {
                toast.error("Erreur lors du chargement des logs");
                return;
            }

            if (response.data) {
                const formattedLogs = (response.data.logs || []).map(formatLogEntry);
                setLogs(formattedLogs);
                setTotalItems(response.data.total || 0);
                setTotalPages(response.data.totalPages || 1);
            }
        } catch (error) {
            toast.error("Erreur lors du chargement des logs");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [filters]);

    // Fetch stats
    const fetchStats = useCallback(async () => {
        try {
            const response = await logService.getStats(30);
            if (response.data) setStats(response.data);
        } catch (e) { /* silent */ }
    }, []);

    // Initial fetch
    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    // Fetch stats on mount
    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    // Auto-refresh
    useEffect(() => {
        if (!autoRefresh) return;
        const interval = setInterval(() => fetchLogs(true), refreshInterval * 1000);
        return () => clearInterval(interval);
    }, [autoRefresh, refreshInterval, fetchLogs]);

    const handleRefresh = () => fetchLogs(true);

    const handleExport = () => {
        const csvContent = [
            ["ID", "Utilisateur", "Email", "Action", "Entité", "Cible", "Date", "IP"].join(","),
            ...logs.map(log => [
                log.id,
                log.displayUser,
                log.userEmail || "",
                log.displayAction,
                log.entity || "",
                log.displayTarget,
                new Date(log.timestamp).toLocaleString("fr-FR"),
                log.ipAddress || "",
            ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(","))
        ].join("\n");

        const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `audit_logs_${new Date().toISOString().split("T")[0]}.csv`;
        link.click();
        URL.revokeObjectURL(url);
        toast.success("Logs exportés avec succès");
    };

    const handleFilterChange = (key: keyof LogFilters, value: string) => {
        setFilters(prev => ({ ...prev, [key]: value || undefined, page: 1 }));
    };

    const handlePageChange = (newPage: number) => {
        setFilters(prev => ({ ...prev, page: newPage }));
    };

    // Filter locally by search text
    const filteredLogs = useMemo(() => {
        if (!search) return logs;
        const s = search.toLowerCase();
        return logs.filter(log =>
            log.displayUser?.toLowerCase().includes(s) ||
            log.displayTarget?.toLowerCase().includes(s) ||
            log.displayAction?.toLowerCase().includes(s) ||
            log.ipAddress?.toLowerCase().includes(s) ||
            log.id.toLowerCase().includes(s)
        );
    }, [logs, search]);

    // Category stats
    const categoryStats = useMemo(() => ({
        create: logs.filter(l => l.category === "create").length,
        update: logs.filter(l => l.category === "update").length,
        delete: logs.filter(l => l.category === "delete").length,
        system: logs.filter(l => l.category === "system").length,
    }), [logs]);

    return (
        <div className="p-4 md:p-8 space-y-8 w-full animate-in fade-in duration-500 pb-32">

            {/* ─── Header ─── */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shadow-lg shadow-orange-200">
                            <History className="w-6 h-6 text-white" />
                        </div>
                        Journal d'Audit
                    </h1>
                    <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest mt-2 ml-1">
                        Traçabilité complète des actions — SmartAudit DG-SECU/Sonatel
                    </p>
                </div>
                <div className="flex gap-3">
                    <Button
                        variant="outline"
                        onClick={handleRefresh}
                        disabled={refreshing}
                        className="h-12 px-5 rounded-2xl border-2 font-black uppercase text-xs tracking-widest gap-2"
                    >
                        {refreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                        Actualiser
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => setShowFilters(!showFilters)}
                        className={`h-12 px-5 rounded-2xl border-2 font-black uppercase text-xs tracking-widest gap-2 ${showFilters ? "bg-orange-50 border-orange-200 text-orange-700" : ""}`}
                    >
                        <Filter className="w-4 h-4" />
                        Filtres
                    </Button>
                    <Button
                        onClick={handleExport}
                        className="h-12 px-5 rounded-2xl font-black uppercase text-xs tracking-widest gap-2 bg-gray-900 text-white hover:bg-gray-800"
                    >
                        <Download className="w-4 h-4" />
                        Exporter CSV
                    </Button>
                </div>
            </div>

            {/* ─── Stats Summary Cards ─── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    label="Créations"
                    value={categoryStats.create}
                    total={totalItems}
                    icon={<Plus className="w-5 h-5 text-emerald-600" />}
                    color="emerald"
                />
                <StatCard
                    label="Modifications"
                    value={categoryStats.update}
                    total={totalItems}
                    icon={<Edit className="w-5 h-5 text-amber-600" />}
                    color="amber"
                />
                <StatCard
                    label="Suppressions"
                    value={categoryStats.delete}
                    total={totalItems}
                    icon={<Trash2 className="w-5 h-5 text-red-600" />}
                    color="red"
                />
                <StatCard
                    label="Système / Auth"
                    value={categoryStats.system}
                    total={totalItems}
                    icon={<Shield className="w-5 h-5 text-sonatel-orange" />}
                    color="orange"
                />
            </div>

            {/* ─── Auto-refresh bar ─── */}
            <Card className="border-2 border-gray-100 bg-white rounded-[1.5rem] shadow-sm">
                <CardContent className="p-4 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <div className={`w-2.5 h-2.5 rounded-full ${autoRefresh ? "bg-emerald-500 animate-pulse" : "bg-gray-300"}`} />
                            <span className="text-sm font-bold text-gray-700">
                                {autoRefresh ? "Auto-refresh activé" : "Auto-refresh désactivé"}
                            </span>
                        </div>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={autoRefresh}
                                onChange={e => setAutoRefresh(e.target.checked)}
                                className="w-4 h-4 rounded accent-orange-500"
                            />
                        </label>
                        {autoRefresh && (
                            <select
                                value={refreshInterval}
                                onChange={e => setRefreshInterval(Number(e.target.value))}
                                className="h-9 px-3 rounded-xl border-2 border-gray-100 font-bold text-sm"
                            >
                                <option value={10}>10 sec</option>
                                <option value={30}>30 sec</option>
                                <option value={60}>1 min</option>
                                <option value={300}>5 min</option>
                            </select>
                        )}
                    </div>
                    <div className="flex items-center gap-3 text-xs font-bold text-gray-400">
                        <Activity className="w-4 h-4 text-orange-400" />
                        <span>{totalItems.toLocaleString("fr-FR")} entrées au total</span>
                        <span>•</span>
                        <span>Page {filters.page} / {totalPages}</span>
                    </div>
                </CardContent>
            </Card>

            {/* ─── Filters Panel ─── */}
            {showFilters && (
                <Card className="border-2 border-orange-100 bg-orange-50/30 rounded-[1.5rem] shadow-sm animate-in slide-in-from-top duration-300">
                    <CardContent className="p-6">
                        <h3 className="text-sm font-black text-gray-700 uppercase tracking-widest mb-4">Filtres avancés</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="text-xs font-black text-gray-500 uppercase tracking-widest block mb-1">Action</label>
                                <select
                                    className="w-full h-11 px-3 rounded-xl border-2 border-gray-100 bg-white font-bold text-sm"
                                    value={filters.action || ""}
                                    onChange={e => handleFilterChange("action", e.target.value)}
                                >
                                    <option value="">Toutes les actions</option>
                                    {Object.entries(ACTION_LABELS).map(([key, label]) => (
                                        <option key={key} value={key}>{label}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-black text-gray-500 uppercase tracking-widest block mb-1">Entité</label>
                                <select
                                    className="w-full h-11 px-3 rounded-xl border-2 border-gray-100 bg-white font-bold text-sm"
                                    value={filters.entity || ""}
                                    onChange={e => handleFilterChange("entity", e.target.value)}
                                >
                                    <option value="">Toutes les entités</option>
                                    {Object.entries(ENTITY_LABELS).map(([key, label]) => (
                                        <option key={key} value={key}>{label}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-black text-gray-500 uppercase tracking-widest block mb-1">Résultats par page</label>
                                <select
                                    className="w-full h-11 px-3 rounded-xl border-2 border-gray-100 bg-white font-bold text-sm"
                                    value={filters.limit || 50}
                                    onChange={e => setFilters(prev => ({ ...prev, limit: Number(e.target.value), page: 1 }))}
                                >
                                    <option value={25}>25 par page</option>
                                    <option value={50}>50 par page</option>
                                    <option value={100}>100 par page</option>
                                    <option value={200}>200 par page</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-black text-gray-500 uppercase tracking-widest block mb-1">Date début</label>
                                <input
                                    type="date"
                                    className="w-full h-11 px-3 rounded-xl border-2 border-gray-100 bg-white font-bold text-sm"
                                    value={filters.dateDebut || ""}
                                    onChange={e => handleFilterChange("dateDebut", e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="text-xs font-black text-gray-500 uppercase tracking-widest block mb-1">Date fin</label>
                                <input
                                    type="date"
                                    className="w-full h-11 px-3 rounded-xl border-2 border-gray-100 bg-white font-bold text-sm"
                                    value={filters.dateFin || ""}
                                    onChange={e => handleFilterChange("dateFin", e.target.value)}
                                />
                            </div>
                            <div className="flex items-end">
                                <Button
                                    variant="outline"
                                    onClick={() => setFilters({ page: 1, limit: 50 })}
                                    className="w-full h-11 rounded-xl border-2 font-black text-sm"
                                >
                                    <X className="w-4 h-4 mr-2" /> Réinitialiser
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* ─── Search ─── */}
            <div className="relative group">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-orange-500 transition-colors" />
                <Input
                    placeholder="Rechercher par utilisateur, action, IP..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="pl-14 h-14 border-2 border-gray-100 bg-white rounded-2xl focus-visible:ring-orange-200 focus-visible:border-orange-300 transition-all font-bold text-base"
                />
                {search && (
                    <button
                        onClick={() => setSearch("")}
                        className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                        <X className="w-4 h-4" />
                    </button>
                )}
            </div>

            {/* ─── Logs Table ─── */}
            <Card className="border-2 border-gray-100 bg-white rounded-[2rem] shadow-sm overflow-hidden">
                <CardContent className="p-0">
                    {loading ? (
                        <div className="flex items-center justify-center py-24">
                            <Loader2 className="w-10 h-10 animate-spin text-orange-500" />
                            <span className="ml-3 text-lg font-bold text-gray-500">Chargement des logs...</span>
                        </div>
                    ) : filteredLogs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-24">
                            <div className="w-20 h-20 rounded-3xl bg-gray-100 flex items-center justify-center mb-4">
                                <AlertCircle className="w-10 h-10 text-gray-300" />
                            </div>
                            <p className="text-xl font-black text-gray-400">Aucun log trouvé</p>
                            <p className="text-sm text-gray-400 mt-1">Essayez de modifier vos filtres</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-50">
                            {/* Table Header */}
                            <div className="hidden lg:grid grid-cols-12 gap-4 px-8 py-3 bg-gray-50 text-xs font-black text-gray-400 uppercase tracking-widest">
                                <div className="col-span-1">Type</div>
                                <div className="col-span-3">Action</div>
                                <div className="col-span-2">Utilisateur</div>
                                <div className="col-span-2">Entité</div>
                                <div className="col-span-2">Date / Heure</div>
                                <div className="col-span-1">IP</div>
                                <div className="col-span-1 text-right">Détail</div>
                            </div>

                            {filteredLogs.map((log, i) => (
                                <div
                                    key={log.id}
                                    className="group flex flex-col lg:grid lg:grid-cols-12 gap-3 lg:gap-4 px-6 lg:px-8 py-5 hover:bg-gray-50/80 transition-all animate-in slide-in-from-left duration-300 cursor-pointer"
                                    style={{ animationDelay: `${Math.min(i * 30, 300)}ms` }}
                                    onClick={() => setSelectedLog(log)}
                                >
                                    {/* Category Icon */}
                                    <div className="col-span-1 flex lg:justify-center">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${getCategoryTheme(log.category)}`}>
                                            {getCategoryIcon(log.category)}
                                        </div>
                                    </div>

                                    {/* Action */}
                                    <div className="col-span-3 flex flex-col justify-center">
                                        <span className="text-sm font-black text-gray-900 leading-tight">{log.displayAction}</span>
                                        <span className={`text-[10px] font-black uppercase tracking-widest mt-0.5 inline-block px-2 py-0.5 rounded-full w-fit ${getCategoryBadge(log.category)}`}>
                                            {log.category}
                                        </span>
                                    </div>

                                    {/* User */}
                                    <div className="col-span-2 flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-xl bg-orange-100 flex items-center justify-center shrink-0">
                                            <User className="w-4 h-4 text-orange-600" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-gray-900 leading-tight truncate max-w-[100px]">{log.displayUser}</p>
                                            {log.userRole && (
                                                <p className="text-[10px] font-bold text-gray-400">{log.userRole}</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Entity */}
                                    <div className="col-span-2 flex items-center">
                                        <span className="text-sm font-bold text-gray-600 truncate">{log.displayTarget}</span>
                                    </div>

                                    {/* Timestamp */}
                                    <div className="col-span-2 flex flex-col justify-center">
                                        <div className="flex items-center gap-1.5 text-gray-900 font-black text-sm">
                                            <Clock className="w-3.5 h-3.5 text-gray-300" />
                                            {new Date(log.timestamp).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                                        </div>
                                        <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-0.5">
                                            {new Date(log.timestamp).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })}
                                        </div>
                                    </div>

                                    {/* IP */}
                                    <div className="col-span-1 flex items-center">
                                        <span className="text-xs font-mono text-gray-400 truncate">{log.ipAddress || "—"}</span>
                                    </div>

                                    {/* Detail button */}
                                    <div className="col-span-1 flex items-center justify-end">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="rounded-xl h-9 px-3 text-[10px] font-black uppercase tracking-widest hover:bg-orange-50 hover:text-orange-600 opacity-0 group-hover:opacity-100 transition-all"
                                            onClick={e => { e.stopPropagation(); setSelectedLog(log); }}
                                        >
                                            <Eye className="w-3.5 h-3.5 mr-1" /> Voir
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* ─── Pagination ─── */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between px-2">
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={(filters.page || 1) <= 1}
                        onClick={() => handlePageChange((filters.page || 1) - 1)}
                        className="h-10 px-4 rounded-xl border-2 font-black text-sm gap-2"
                    >
                        <ChevronLeft className="w-4 h-4" /> Précédent
                    </Button>

                    <div className="flex items-center gap-2">
                        {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                            const page = i + 1;
                            const isActive = page === (filters.page || 1);
                            return (
                                <button
                                    key={page}
                                    onClick={() => handlePageChange(page)}
                                    className={`w-9 h-9 rounded-xl font-black text-sm transition-all ${isActive
                                        ? "bg-orange-500 text-white shadow-md shadow-orange-200"
                                        : "text-gray-500 hover:bg-gray-100"
                                        }`}
                                >
                                    {page}
                                </button>
                            );
                        })}
                        {totalPages > 7 && (
                            <span className="text-gray-400 font-bold">... {totalPages}</span>
                        )}
                    </div>

                    <Button
                        variant="outline"
                        size="sm"
                        disabled={(filters.page || 1) >= totalPages}
                        onClick={() => handlePageChange((filters.page || 1) + 1)}
                        className="h-10 px-4 rounded-xl border-2 font-black text-sm gap-2"
                    >
                        Suivant <ChevronRight className="w-4 h-4" />
                    </Button>
                </div>
            )}

            {/* ─── Stats from Backend ─── */}
            {stats && stats.logsByAction.length > 0 && (
                <Card className="border-2 border-gray-100 bg-white rounded-[2rem] shadow-sm overflow-hidden">
                    <CardHeader className="px-8 pt-8 pb-4">
                        <div className="flex items-center gap-3">
                            <BarChart3 className="w-5 h-5 text-orange-500" />
                            <CardTitle className="text-lg font-black">Top Actions — 30 derniers jours</CardTitle>
                        </div>
                        <CardDescription className="font-bold text-xs uppercase tracking-widest">
                            {stats.totalLogs.toLocaleString("fr-FR")} actions enregistrées au total
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="px-8 pb-8">
                        <div className="space-y-3">
                            {stats.logsByAction.slice(0, 8).map(({ action, count }) => {
                                const max = stats.logsByAction[0]?.count || 1;
                                const pct = Math.round((count / max) * 100);
                                const label = ACTION_LABELS[action] || action;
                                const category = mapCategory(action);
                                return (
                                    <div key={action} className="flex items-center gap-4">
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${getCategoryTheme(category)}`}>
                                            {getCategoryIcon(category, "w-4 h-4")}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex justify-between mb-1">
                                                <span className="text-sm font-bold text-gray-800">{label}</span>
                                                <span className="text-sm font-black text-gray-500">{count.toLocaleString("fr-FR")}</span>
                                            </div>
                                            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full transition-all duration-700 ${category === "create" ? "bg-emerald-400" :
                                                        category === "update" ? "bg-amber-400" :
                                                            category === "delete" ? "bg-red-400" : "bg-orange-400"
                                                        }`}
                                                    style={{ width: `${pct}%` }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* ─── Detail Modal ─── */}
            {selectedLog && (
                <LogDetailModal log={selectedLog} onClose={() => setSelectedLog(null)} />
            )}
        </div>
    );
}

// ─── Stat Card Component ──────────────────────────────────────────────────────

function StatCard({
    label,
    value,
    total,
    icon,
    color,
}: {
    label: string;
    value: number;
    total: number;
    icon: React.ReactNode;
    color: "emerald" | "amber" | "red" | "orange";
}) {
    const pct = total > 0 ? Math.round((value / total) * 100) : 0;
    const colorMap = {
        emerald: "bg-emerald-50 border-emerald-100 text-emerald-700",
        amber: "bg-amber-50 border-amber-100 text-amber-700",
        red: "bg-red-50 border-red-100 text-red-700",
        orange: "bg-orange-50 border-orange-100 text-orange-700",
    };
    const barMap = {
        emerald: "bg-emerald-400",
        amber: "bg-amber-400",
        red: "bg-red-400",
        orange: "bg-orange-400",
    };

    return (
        <Card className={`border-2 rounded-[1.5rem] shadow-sm ${colorMap[color]}`}>
            <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-white/60 flex items-center justify-center">{icon}</div>
                    <span className="text-xs font-black uppercase tracking-widest opacity-60">{pct}%</span>
                </div>
                <div className="text-3xl font-black">{value}</div>
                <div className="text-xs font-black uppercase tracking-widest mt-1 opacity-70">{label}</div>
                <div className="h-1.5 bg-white/40 rounded-full mt-3 overflow-hidden">
                    <div className={`h-full rounded-full ${barMap[color]} transition-all duration-700`} style={{ width: `${pct}%` }} />
                </div>
            </CardContent>
        </Card>
    );
}
