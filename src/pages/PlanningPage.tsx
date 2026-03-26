import React, { useState, useMemo, useEffect } from "react";
import {
    Calendar as CalendarIcon,
    MapPin,
    Plus,
    Filter,
    Search,
    ChevronRight,
    Clock,
    User,
    CheckCircle2,
    AlertTriangle,
    Edit,
    Trash2,
    LayoutGrid,
    List as ListIcon,
    ChevronLeft as ChevronLeftIcon,
    ChevronRight as ChevronRightIcon,
    Loader2,
    Download,
    FileJson,
    FileSpreadsheet,
    Play,
    Lock
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from "@/components/ui/dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "sonner";

import planningService, { Mission, InspectionStats } from "@/services/PlanningService";
import { siteService, Site as BackendSite } from "@/services/SiteService";
import { getCurrentPosition } from "@/utils/geolocation";
import { adminService } from "@/services/AdminService";
import { User as AuthUser } from "@/services/AuthService";
import { useAuth } from "@/contexts/AuthContext";

interface InspectionSchedule {
    id: string;
    site: string;
    siteId?: string;
    inspecteur: string;
    inspecteurId?: string;
    entite?: string;
    date: string;
    dateRealisation?: string | null;
    status: "planifie" | "en_cours" | "termine" | "en_retard" | "anticipe" | "annule" | "archive";
    priority: "haute" | "moyenne" | "basse";
    type: string;
    // FIX: champs d'accès entité provenant du backend
    belongsToUserEntite?: boolean;
    isEditable?: boolean;
    canStart?: boolean;
}

export default function PlanningPage() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [schedules, setSchedules] = useState<InspectionSchedule[]>([]);
    const [loading, setLoading] = useState(true);
    const [backendSites, setBackendSites] = useState<BackendSite[]>([]);
    const [backendUsers, setBackendUsers] = useState<AuthUser[]>([]);

    const [search, setSearch] = useState("");
    const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSchedule, setEditingSchedule] = useState<InspectionSchedule | null>(null);
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [openSiteSelect, setOpenSiteSelect] = useState(false);
    const [openInspecteurSelect, setOpenInspecteurSelect] = useState(false);
    const [siteSearchQuery, setSiteSearchQuery] = useState("");
    const [siteSearchLoading, setSiteSearchLoading] = useState(false);
    const [inspecteurSearchQuery, setInspecteurSearchQuery] = useState("");
    const [inspecteurSearchLoading, setInspecteurSearchLoading] = useState(false);

    const [stats, setStats] = useState<InspectionStats | null>(null);
    const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

    const [filterSite, setFilterSite] = useState("");
    const [filterInspecteur, setFilterInspecteur] = useState("");
    const [filterDate, setFilterDate] = useState("");
    const [showFilters, setShowFilters] = useState(false);

    // États pour l'importation
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [importFile, setImportFile] = useState<File | null>(null);
    const [importYear, setImportYear] = useState(new Date().getFullYear());
    const [importLoading, setImportLoading] = useState(false);

    const [isRenewModalOpen, setIsRenewModalOpen] = useState(false);
    const [renewSourceYear, setRenewSourceYear] = useState(new Date().getFullYear());
    const [renewTargetYear, setRenewTargetYear] = useState(new Date().getFullYear() + 1);
    const [renewLoading, setRenewLoading] = useState(false);

    // États pour le résumé d'import
    const [importSummary, setImportSummary] = useState<{ count: number; errors?: string[] } | null>(null);
    const [showSummary, setShowSummary] = useState(false);

    const [formData, setFormData] = useState<Partial<InspectionSchedule>>({
        site: "",
        siteId: "",
        inspecteur: "",
        inspecteurId: "",
        entite: "",
        date: "",
        status: "planifie",
        priority: "moyenne",
        type: "Audit Périodique"
    });

    // ✅ FIX 3 — plus de filtre automatique par inspecteur au chargement
    // L'inspecteur voit TOUS les plannings, sans pré-filtrage
    useEffect(() => {
        loadAllData();
        // Charger les données statiques (sites et utilisateurs) une seule fois au montage
        loadStaticData();
    }, [user]);

    const loadStaticData = async () => {
        try {
            const [sRes, uRes] = await Promise.all([
                siteService.getAll({ limit: 500 }),
                adminService.getUsers({ role: 'INSPECTEUR' })
            ]);
            if (sRes?.data?.data) setBackendSites(sRes.data.data);
            if (uRes?.data) setBackendUsers(uRes.data);
        } catch (err) {
            console.error("Failed to load static data:", err);
        }
    };

    useEffect(() => {
        const handleVisibilityChange = () => {
            if (!document.hidden) loadAllData(true);
        };
        const interval = setInterval(() => loadAllData(true), 30000);
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            clearInterval(interval);
        };
    }, []);

    useEffect(() => {
        const fetchSites = async () => {
            if (siteSearchQuery.length >= 3) {
                setSiteSearchLoading(true);
                try {
                    const res = await siteService.quickSearch(siteSearchQuery, 20);
                    if (res.data) setBackendSites(res.data as any);
                } catch (e) {
                    console.error("Erreur recherche site:", e);
                } finally {
                    setSiteSearchLoading(false);
                }
            } else if (siteSearchQuery.length === 0) {
                const res = await siteService.getAll({ limit: 50 });
                if (res.data) setBackendSites(res.data.data);
            }
        };
        const timer = setTimeout(fetchSites, 300);
        return () => clearTimeout(timer);
    }, [siteSearchQuery]);

    useEffect(() => {
        const fetchUsers = async () => {
            if (inspecteurSearchQuery.length >= 3) {
                setInspecteurSearchLoading(true);
                try {
                    const res = await adminService.getUsers({ role: 'INSPECTEUR', search: inspecteurSearchQuery });
                    if (res.data) setBackendUsers(res.data);
                } catch (e) {
                    console.error("Erreur recherche inspecteur:", e);
                } finally {
                    setInspecteurSearchLoading(false);
                }
            } else if (inspecteurSearchQuery.length === 0) {
                const res = await adminService.getUsers({ role: 'INSPECTEUR' });
                if (res.data) setBackendUsers(res.data);
            }
        };
        const timer = setTimeout(fetchUsers, 300);
        return () => clearTimeout(timer);
    }, [inspecteurSearchQuery]);

    const loadAllData = async (isRefresh = false) => {
        // [CACHE-FIRST] Try to load from local storage first
        const cachedPlanning = planningService.getCachedResponse<any>('global');
        const cachedStats = planningService.getCachedResponse<InspectionStats>('stats');

        if (cachedPlanning) {
            const raw = cachedPlanning;
            const rawMissions: Mission[] = Array.isArray(raw) ? raw : raw?.data ?? raw?.missions ?? [];
            processMissions(rawMissions);
            // Si on a du cache, on considère que ce n'est plus le "premier" chargement bloquant
            if (!isRefresh) setLoading(false);
        }

        if (cachedStats) setStats(cachedStats);

        if (!cachedPlanning && !isRefresh) setLoading(true);

        try {
            const [mRes, statsRes] = await Promise.all([
                planningService.getPlanningGlobal(),
                planningService.getStats()
            ]);

            const raw = mRes as any;
            const rawMissions: Mission[] = Array.isArray(raw)
                ? raw
                : raw?.data ?? raw?.missions ?? [];

            processMissions(rawMissions);

            if (statsRes) setStats(statsRes);
            setLastUpdate?.(new Date());
        } catch (err) {
            console.error(err);
            if (!cachedPlanning && !isRefresh) toast.error("Erreur de chargement");
        } finally {
            if (!isRefresh) setLoading(false);
        }
    };

    const processMissions = (rawMissions: Mission[]) => {
        const userEntite = (user?.entite || '').toUpperCase().trim();

        const mappedMissions: InspectionSchedule[] = rawMissions.map((m: any) => {
            const missionEntite = (m.inspecteur?.entite || m.entite || '').toUpperCase().trim();
            const belongsToUserEntite = userEntite === missionEntite;
            const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';

            return {
                id: m.id,
                site: m.site?.nom || "Site inconnu",
                siteId: m.siteId,
                inspecteur: m.inspecteur?.name || "Non assigné",
                inspecteurId: m.inspecteurId,
                entite: m.inspecteur?.entite || m.entite || "SEC",
                date: m.dateDeb?.split('T')[0] ?? '',
                dateRealisation: m.dateRealisation ? m.dateRealisation.split('T')[0] : null,
                status: mapBackendStatus(m.statut),
                priority: "moyenne",
                type: m.type || "Audit Périodique",
                belongsToUserEntite,
                isEditable: isAdmin || belongsToUserEntite,
                canStart: (isAdmin || belongsToUserEntite)
                    && !m.startedById
                    && m.statut === 'A_FAIRE',
            };
        });

        // Sort mapping: descending date
        mappedMissions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        setSchedules(mappedMissions);
    };

    const mapBackendStatus = (status: string): InspectionSchedule["status"] => {
        const s = (status || '').toUpperCase();
        if (s === 'A_FAIRE' || s === 'PLANIFIE') return 'planifie';
        if (s === 'EN_COURS') return 'en_cours';
        if (s === 'TERMINE') return 'termine';
        if (s === 'EN_RETARD') return 'en_retard';
        if (s === 'ANTICIPE') return 'anticipe';
        if (s === 'ANNULE') return 'annule';
        if (s === 'ARCHIVE') return 'archive';
        return 'planifie';
    };

    const filtered = useMemo(() => {
        return schedules.filter(s => {
            const matchesSearch = search === "" ||
                s.site.toLowerCase().includes(search.toLowerCase()) ||
                s.inspecteur.toLowerCase().includes(search.toLowerCase());
            const matchesSite = filterSite === "" || s.site.toLowerCase().includes(filterSite.toLowerCase());
            const matchesInspecteur = filterInspecteur === "" || s.inspecteur.toLowerCase().includes(filterInspecteur.toLowerCase());
            const matchesDate = filterDate === "" || s.date === filterDate;
            return matchesSearch && matchesSite && matchesInspecteur && matchesDate;
        });
    }, [schedules, search, filterSite, filterInspecteur, filterDate]);

    const handleOpenAddModal = () => {
        setEditingSchedule(null);
        setFormData({
            site: "",
            siteId: "",
            inspecteur: user?.role === 'INSPECTEUR' ? user.name : "",
            inspecteurId: user?.role === 'INSPECTEUR' ? user.id : "",
            entite: user?.role === 'INSPECTEUR' ? (user.entite || "SEC") : "",
            date: new Date().toISOString().split('T')[0],
            status: "planifie",
            priority: "moyenne",
            type: "Audit Périodique"
        });
        setIsModalOpen(true);
    };

    const handleOpenEditModal = (schedule: InspectionSchedule) => {
        // Seuls les éditables peuvent ouvrir le modal d'édition
        if (!schedule.isEditable && user?.role === 'INSPECTEUR') {
            toast.error("Vous n'avez pas accès à ce planning");
            return;
        }
        setEditingSchedule(schedule);
        setFormData(schedule);
        setIsModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (confirm("Voulez-vous supprimer définitivement ce planning ?")) {
            try {
                await planningService.deleteMission(id);
                setSchedules(prev => prev.filter(s => s.id !== id));
                toast.success("Planning supprimé");
            } catch (e) {
                toast.error("Erreur lors de la suppression");
            }
        }
    };

    const handleCancel = async (id: string) => {
        if (confirm("Voulez-vous annuler cette mission ?")) {
            try {
                await planningService.updateStatus(id, "ANNULE");
                setSchedules(prev => prev.map(s => s.id === id ? { ...s, status: "annule" } : s));
                toast.success("Mission annulée");
            } catch (e) {
                toast.error("Erreur lors de l'annulation");
            }
        }
    };

    const handleArchive = async (id: string) => {
        try {
            await planningService.updateStatus(id, "ARCHIVE");
            setSchedules(prev => prev.map(s => s.id === id ? { ...s, status: "archive" } : s));
            toast.success("Mission archivée");
        } catch (e) {
            toast.error("Erreur lors de l'archivage");
        }
    };

    const handleRenewYear = async () => {
        setRenewLoading(true);
        const promise = planningService.renewYearPlanning(renewSourceYear, renewTargetYear);

        toast.promise(promise, {
            loading: `Reconduction du planning vers ${renewTargetYear} en cours...`,
            success: (res) => {
                setRenewLoading(false);
                setIsRenewModalOpen(false);
                loadAllData();
                return `${res.count} missions reconduites pour ${renewTargetYear} !`;
            },
            error: (err) => {
                setRenewLoading(false);
                return err.message || "Erreur lors de la reconduction";
            }
        });
    };

    const handleImport = async () => {
        if (!importFile) {
            toast.error("Veuillez sélectionner un fichier");
            return;
        }
        setImportLoading(true);
        const promise = planningService.importRoadmap(importFile, importYear);

        toast.promise(promise, {
            loading: "Analyse et importation du fichier Excel...",
            success: (res) => {
                setImportLoading(false);
                setIsImportModalOpen(false);
                setImportFile(null);
                loadAllData();

                if (res.errors && res.errors.length > 0) {
                    setImportSummary(res);
                    setShowSummary(true);
                    return `Fichier importé : ${res.count} missions créées (${res.errors.length} erreurs)`;
                }

                return `${res.count} missions importées avec succès !`;
            },
            error: (err) => {
                setImportLoading(false);
                return err.message || "Erreur lors de l'importation";
            }
        });
    };

    const handleStatusChange = async (scheduleId: string, newStatus: InspectionSchedule["status"]) => {
        const schedule = schedules.find(s => s.id === scheduleId);
        // Vérification frontend (le backend vérifie aussi)
        if (schedule && !schedule.isEditable && user?.role === 'INSPECTEUR') {
            toast.error("Vous n'avez pas accès à ce planning");
            return;
        }
        try {
            const backendStatusMap: Record<string, string> = {
                'planifie': 'A_FAIRE',
                'en_cours': 'EN_COURS',
                'termine': 'TERMINE',
                'en_retard': 'EN_RETARD',
                'anticipe': 'ANTICIPE',
                'annule': 'ANNULE',
                'archive': 'ARCHIVE'
            };
            await planningService.updateStatus(scheduleId, backendStatusMap[newStatus]);
            setSchedules(prev => prev.map(s =>
                s.id === scheduleId ? { ...s, status: newStatus } : s
            ));
            toast.success(`Statut mis à jour: ${getStatusLabel(newStatus)}`);
        } catch (e: any) {
            const msg = e?.response?.data?.message || "Erreur lors de la mise à jour du statut";
            toast.error(msg);
        }
    };

    const handleStartInspection = async (scheduleId: string) => {
        const schedule = schedules.find(s => s.id === scheduleId);
        // Vérification UI (le backend vérifie aussi côté serveur)
        if (!schedule?.canStart) {
            toast.error("Vous n'avez pas accès à ce planning");
            return;
        }
        try {
            toast.info("Récupération de la position...");
            const geoResult = await getCurrentPosition();
            const gpsData = geoResult.success && geoResult.position ? {
                latitudeStart: geoResult.position.latitude,
                longitudeStart: geoResult.position.longitude
            } : undefined;

            await planningService.startInspection(scheduleId, gpsData);
            setSchedules(prev => prev.map(s =>
                s.id === scheduleId
                    ? { ...s, status: 'en_cours' as const, canStart: false }
                    : s
            ));
            toast.success(geoResult.success
                ? "Inspection démarrée avec position GPS"
                : "Inspection démarrée (position non disponible)"
            );
        } catch (e: any) {
            const msg = e?.response?.data?.message || "Erreur lors du démarrage de l'inspection";
            toast.error(msg);
        }
    };

    const handleFinishInspection = async (scheduleId: string) => {
        const schedule = schedules.find(s => s.id === scheduleId);
        if (schedule && !schedule.isEditable && user?.role === 'INSPECTEUR') {
            toast.error("Vous n'avez pas accès à ce planning");
            return;
        }
        try {
            const result = await planningService.finishInspection(scheduleId);
            if (result && result.mission) {
                const newStatus = mapBackendStatus(result.mission.statut);
                setSchedules(prev => prev.map(s =>
                    s.id === scheduleId ? {
                        ...s,
                        status: newStatus,
                        dateRealisation: new Date().toISOString().split('T')[0]
                    } : s
                ));
                toast.success(result.mission.statut === 'ANTICIPE'
                    ? "Inspection terminée en avance!"
                    : "Inspection terminée"
                );
            }
        } catch (e: any) {
            const msg = e?.response?.data?.message || "Erreur lors de la terminaison de l'inspection";
            toast.error(msg);
        }
    };

    const getStatusLabel = (status: InspectionSchedule["status"]): string => {
        const labels: Record<string, string> = {
            'planifie': 'Planifié',
            'en_cours': 'En cours',
            'termine': 'Terminé',
            'en_retard': 'En retard',
            'anticipe': 'Anticipé',
            'annule': 'Annulé',
            'archive': 'Archivé'
        };
        return labels[status] || status;
    };

    const handleSubmit = async () => {
        if (!formData.siteId || !formData.date || !formData.inspecteurId) {
            toast.error("Veuillez remplir tous les champs obligatoires");
            return;
        }
        const date = new Date(formData.date!);
        const payload = {
            titre: `Audit ${formData.site}`,
            siteId: formData.siteId,
            inspecteurId: formData.inspecteurId,
            dateDeb: date.toISOString(),
            dateFin: new Date(date.getTime() + 3600000).toISOString(),
            type: formData.type,
            description: `Audit planifié via l'interface de gestion`
        };
        try {
            if (editingSchedule) {
                await planningService.updateMission(editingSchedule.id, payload as any);
                toast.success("Planning mis à jour");
            } else {
                await planningService.createMission(payload as any);
                toast.success("Nouvelle inspection planifiée");
            }
            loadAllData();
            setIsModalOpen(false);
        } catch (e: any) {
            const errorMsg = e.response?.data?.message || e.message || "Erreur lors de l'enregistrement";
            toast.error(errorMsg);
        }
    };

    const exportToCSV = () => {
        if (filtered.length === 0) { toast.error("Aucune donnée à exporter"); return; }
        const headers = ["Site", "Inspecteur", "Entité", "Date", "Statut", "Type"];
        const csvContent = [
            headers.join(";"),
            ...filtered.map(s => {
                const dateParts = s.date.split('-');
                const formattedDate = dateParts.length === 3
                    ? `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`
                    : s.date;
                return [s.site, s.inspecteur, s.entite || "SEC", formattedDate, s.status, s.type]
                    .map(val => `"${val?.toString().replace(/"/g, '""') || ''}"`).join(";");
            })
        ].join("\n");
        const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        link.setAttribute("href", URL.createObjectURL(blob));
        link.setAttribute("download", `planning_export_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("Export CSV réussi");
    };

    const exportToJSON = () => {
        if (filtered.length === 0) { toast.error("Aucune donnée à exporter"); return; }
        const dataStr = JSON.stringify(filtered, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
        const link = document.createElement('a');
        link.setAttribute('href', dataUri);
        link.setAttribute('download', `planning_export_${new Date().toISOString().split('T')[0]}.json`);
        link.click();
        toast.success("Export JSON réussi");
    };

    const getStatusBadge = (status: InspectionSchedule["status"]) => {
        switch (status) {
            case "planifie": return <Badge className="bg-orange-50 text-orange-600 border-none font-black text-[10px] uppercase">Planifié</Badge>;
            case "en_cours": return <Badge className="bg-amber-100 text-amber-700 border-none font-black text-[10px] uppercase animate-pulse">En cours</Badge>;
            case "termine": return <Badge className="bg-emerald-100 text-emerald-700 border-none font-black text-[10px] uppercase">Terminé</Badge>;
            case "en_retard": return <Badge className="bg-destructive/10 text-destructive border-none font-black text-[10px] uppercase">En retard</Badge>;
            case "anticipe": return <Badge className="bg-orange-100 text-sonatel-orange border-none font-black text-[10px] uppercase">Anticipé</Badge>;
            case "annule": return <Badge className="bg-gray-100 text-gray-500 border-none font-black text-[10px] uppercase">Annulé</Badge>;
            case "archive": return <Badge className="bg-slate-100 text-slate-500 border-none font-black text-[10px] uppercase">Archivé</Badge>;
        }
    };

    const getPriorityBadge = (priority: InspectionSchedule["priority"]) => {
        switch (priority) {
            case "haute": return <Badge className="bg-red-500 text-white border-none font-black text-[9px] uppercase">Haute</Badge>;
            case "moyenne": return <Badge className="bg-orange-400 text-white border-none font-black text-[9px] uppercase">Moyenne</Badge>;
            case "basse": return <Badge className="bg-slate-400 text-white border-none font-black text-[9px] uppercase">Basse</Badge>;
        }
    };

    // Helper: l'inspecteur peut-il interagir avec cette mission ?
    const isInspecteur = user?.role === 'INSPECTEUR';
    const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';

    if (loading) {
        return (
            <div className="flex h-[80vh] items-center justify-center">
                <Loader2 className="w-12 h-12 text-sonatel-orange animate-spin" />
            </div>
        );
    }

    return (
        <div className="p-4 md:p-10 space-y-10 w-full animate-in fade-in duration-500 pb-32">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                        <CalendarIcon className="w-8 h-8 text-sonatel-orange" />
                        Planning de visite {currentMonth.getFullYear()}
                    </h1>
                    <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest mt-1">
                        Programmation et suivi des audits de sécurité DG/SECU
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    {isAdmin && (
                        <>
                            <Button
                                variant="outline"
                                onClick={() => setIsImportModalOpen(true)}
                                className="h-14 px-8 rounded-2xl font-black uppercase text-xs tracking-widest border-2 gap-2 border-gray-100 bg-white hover:bg-gray-50 text-gray-600"
                            >
                                <FileSpreadsheet className="w-5 h-5 text-sonatel-orange" /> Importer
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => setIsRenewModalOpen(true)}
                                className="h-14 px-8 rounded-2xl font-black uppercase text-xs tracking-widest border-2 gap-2 border-gray-100 bg-white hover:bg-gray-50 text-gray-600"
                            >
                                <LayoutGrid className="w-5 h-5 text-sonatel-orange" /> Reconduire Planning
                            </Button>
                        </>
                    )}

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="h-14 px-8 rounded-2xl font-black uppercase text-xs tracking-widest border-2 gap-2 border-gray-100 bg-white hover:bg-gray-50 text-gray-600">
                                <Download className="w-5 h-5 text-sonatel-orange" /> Exporter
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="rounded-2xl border-none shadow-2xl p-2 bg-white">
                            <DropdownMenuItem onClick={exportToCSV} className="rounded-xl p-3 font-bold hover:bg-orange-50 cursor-pointer gap-3">
                                <FileSpreadsheet className="w-5 h-5 text-emerald-600" /> Format Excel (CSV)
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={exportToJSON} className="rounded-xl p-3 font-bold hover:bg-orange-50 cursor-pointer gap-3">
                                <FileJson className="w-5 h-5 text-sonatel-orange" /> Format JSON
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Seuls les admins peuvent créer un planning */}
                    {isAdmin && (
                        <Button
                            onClick={handleOpenAddModal}
                            className="h-14 px-8 rounded-2xl bg-sonatel-orange hover:bg-orange-600 text-white font-black uppercase text-xs tracking-widest shadow-lg shadow-orange-500/20 gap-3"
                        >
                            <Plus className="w-5 h-5" /> Planifier Inspection
                        </Button>
                    )}
                </div>
            </div>

            {/* Filters & Search */}
            <Card className="border-2 border-gray-100 bg-white rounded-[2.5rem] shadow-sm p-2 overflow-hidden">
                <CardContent className="p-4 flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1 group">
                        <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-sonatel-orange transition-colors" />
                        <Input
                            placeholder="Rechercher par site ou inspecteur..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-14 h-14 border-none bg-gray-50/50 rounded-2xl focus-visible:ring-sonatel-orange/10 focus-visible:bg-white transition-all font-bold"
                        />
                    </div>
                    <div className="flex bg-gray-50 p-1.5 rounded-2xl border border-gray-100 shrink-0">
                        <Button
                            variant={viewMode === "list" ? "secondary" : "ghost"}
                            onClick={() => setViewMode("list")}
                            className={`h-11 px-4 rounded-xl font-black uppercase text-[10px] tracking-wider gap-2 ${viewMode === "list" ? "bg-white shadow-sm text-sonatel-orange" : "text-gray-400"}`}
                        >
                            <ListIcon className="w-4 h-4" /> Liste
                        </Button>
                        <Button
                            variant={viewMode === "calendar" ? "secondary" : "ghost"}
                            onClick={() => setViewMode("calendar")}
                            className={`h-11 px-4 rounded-xl font-black uppercase text-[10px] tracking-wider gap-2 ${viewMode === "calendar" ? "bg-white shadow-sm text-sonatel-orange" : "text-gray-400"}`}
                        >
                            <LayoutGrid className="w-4 h-4" /> Calendrier
                        </Button>
                    </div>
                    <Button
                        variant={showFilters ? "secondary" : "outline"}
                        onClick={() => setShowFilters(!showFilters)}
                        className={`h-14 px-8 rounded-2xl font-black uppercase text-xs tracking-widest border-2 gap-2 border-gray-100 ${showFilters ? 'bg-orange-50 text-sonatel-orange border-sonatel-orange/20' : 'bg-white hover:bg-gray-50'}`}
                    >
                        <Filter className="w-4 h-4" /> {showFilters ? "Fermer Filtres" : "Filtres"}
                    </Button>
                </CardContent>

                {showFilters && (
                    <CardContent className="px-6 pb-6 pt-0 animate-in slide-in-from-top-4 duration-300">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-6 bg-gray-50/50 rounded-[2rem] border border-gray-100">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Filtrer par Lieu (Site)</label>
                                <Input placeholder="Ex: Rufisque..." value={filterSite} onChange={(e) => setFilterSite(e.target.value)} className="h-12 bg-white border-gray-100 rounded-xl font-bold" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Filtrer par Nom (Inspecteur)</label>
                                <Input placeholder="Ex: Cheikh..." value={filterInspecteur} onChange={(e) => setFilterInspecteur(e.target.value)} className="h-12 bg-white border-gray-100 rounded-xl font-bold" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Filtrer par Date</label>
                                <Input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className="h-12 bg-white border-gray-100 rounded-xl font-bold" />
                            </div>
                        </div>
                        <div className="flex justify-end mt-4">
                            <Button variant="ghost" onClick={() => { setFilterSite(""); setFilterInspecteur(""); setFilterDate(""); }} className="text-[10px] font-black uppercase text-gray-400 hover:text-sonatel-orange gap-2">
                                <Trash2 className="w-4 h-4" /> Réinitialiser les filtres
                            </Button>
                        </div>
                    </CardContent>
                )}
            </Card>

            {/* Statistiques */}
            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    <Card className="bg-orange-50 border-orange-100 rounded-2xl"><CardContent className="p-4 text-center"><p className="text-3xl font-black text-sonatel-orange">{stats.total}</p><p className="text-[10px] font-black text-orange-400 uppercase">Total</p></CardContent></Card>
                    <Card className="bg-orange-50 border-orange-100 rounded-2xl"><CardContent className="p-4 text-center"><p className="text-3xl font-black text-sonatel-orange">{stats.planifies}</p><p className="text-[10px] font-black text-orange-400 uppercase">Planifiés</p></CardContent></Card>
                    <Card className="bg-amber-50 border-amber-100 rounded-2xl"><CardContent className="p-4 text-center"><p className="text-3xl font-black text-amber-600">{stats.enCours}</p><p className="text-[10px] font-black text-amber-400 uppercase">En cours</p></CardContent></Card>
                    <Card className="bg-emerald-50 border-emerald-100 rounded-2xl"><CardContent className="p-4 text-center"><p className="text-3xl font-black text-emerald-600">{stats.termines}</p><p className="text-[10px] font-black text-emerald-400 uppercase">Terminés</p></CardContent></Card>
                    <Card className="bg-orange-50 border-orange-100 rounded-2xl"><CardContent className="p-4 text-center"><p className="text-3xl font-black text-sonatel-orange">{stats.anticipes}</p><p className="text-[10px] font-black text-orange-400 uppercase">Anticipés</p></CardContent></Card>
                    <Card className="bg-red-50 border-red-100 rounded-2xl"><CardContent className="p-4 text-center"><p className="text-3xl font-black text-red-600">{stats.enRetard}</p><p className="text-[10px] font-black text-red-400 uppercase">En retard</p></CardContent></Card>
                </div>
            )}

            {viewMode === "list" ? (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                    {filtered.map((s) => {
                        // ✅ Mission hors entité = visible mais désactivée pour l'inspecteur
                        const isLocked = isInspecteur && !s.belongsToUserEntite;

                        return (
                            <Card
                                key={s.id}
                                className={`group border-2 bg-white transition-all duration-300 rounded-[2.5rem] overflow-hidden
                                    ${isLocked
                                        ? 'border-gray-100 opacity-60 grayscale-[30%]'
                                        : 'border-gray-100 hover:border-sonatel-orange/30 hover:shadow-xl hover:shadow-orange-500/5'
                                    }`}
                            >
                                <CardContent className="p-8">
                                    <div className="flex justify-between items-start mb-6">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner border
                                                ${isLocked
                                                    ? 'bg-gray-100 border-gray-200'
                                                    : 'bg-sonatel-light-bg border-sonatel-orange/5'
                                                }`}>
                                                {isLocked
                                                    ? <Lock className="w-6 h-6 text-gray-400" />
                                                    : <CalendarIcon className="w-7 h-7 text-sonatel-orange" />
                                                }
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h3 className={`text-xl font-black uppercase tracking-tight transition-colors
                                                        ${isLocked ? 'text-gray-400' : 'text-gray-900 group-hover:text-sonatel-orange'}`}>
                                                        {s.site}
                                                    </h3>
                                                    {getStatusBadge(s.status)}
                                                    {isLocked && (
                                                        <Badge className="bg-gray-100 text-gray-400 border-none font-black text-[9px] uppercase gap-1">
                                                            <Lock className="w-2.5 h-2.5" /> {s.entite}
                                                        </Badge>
                                                    )}
                                                </div>
                                                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">{s.type}</p>
                                            </div>
                                        </div>

                                        {/* Actions — masquées si mission hors entité pour l'inspecteur */}
                                        {!isLocked && (
                                            <div className="flex gap-2 items-center">
                                                {/* Changement de statut — seulement pour les éditables */}
                                                {s.isEditable && (
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="outline" size="sm" className="h-9 px-3 rounded-xl font-black text-[10px] uppercase tracking-wider border-gray-200 hover:border-sonatel-orange hover:text-sonatel-orange">
                                                                <CheckCircle2 className="w-3 h-3 mr-1" /> Statut
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent className="rounded-xl p-1 bg-white shadow-xl border-gray-100">
                                                            {(['planifie', 'en_cours', 'termine', 'en_retard', 'anticipe', 'annule', 'archive'] as const).map(st => (
                                                                <DropdownMenuItem
                                                                    key={st}
                                                                    onClick={() => handleStatusChange(s.id, st)}
                                                                    className={`rounded-lg p-2 cursor-pointer gap-2 ${s.status === st ? 'bg-orange-50 text-sonatel-orange' : 'hover:bg-gray-50'}`}
                                                                >
                                                                    <div className={`w-2 h-2 rounded-full ${st === 'planifie' ? 'bg-orange-400' :
                                                                        st === 'en_cours' ? 'bg-amber-500' :
                                                                            st === 'termine' ? 'bg-emerald-500' :
                                                                                st === 'en_retard' ? 'bg-red-500' :
                                                                                    st === 'annule' ? 'bg-gray-400' :
                                                                                        st === 'archive' ? 'bg-slate-400' :
                                                                                            'bg-sonatel-orange'
                                                                        }`} />
                                                                    {getStatusLabel(st)}
                                                                </DropdownMenuItem>
                                                            ))}
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                )}

                                                {/* Annuler — admin uniquement */}
                                                {isAdmin && s.status !== 'annule' && (
                                                    <Button variant="ghost" size="icon" onClick={() => handleCancel(s.id)} className="h-11 w-11 rounded-xl hover:bg-red-50 hover:text-red-500 transition-all" title="Annuler">
                                                        <AlertTriangle className="w-5 h-5" />
                                                    </Button>
                                                )}

                                                {/* Archiver — admin uniquement */}
                                                {isAdmin && s.status !== 'archive' && (
                                                    <Button variant="ghost" size="icon" onClick={() => handleArchive(s.id)} className="h-11 w-11 rounded-xl hover:bg-slate-50 hover:text-slate-500 transition-all" title="Archiver">
                                                        <Clock className="w-5 h-5" />
                                                    </Button>
                                                )}

                                                {/* Édition — admin ou même entité */}
                                                {(isAdmin || s.isEditable) && (
                                                    <Button variant="ghost" size="icon" onClick={() => handleOpenEditModal(s)} className="h-11 w-11 rounded-xl hover:bg-sonatel-light-bg hover:text-sonatel-orange transition-all">
                                                        <Edit className="w-5 h-5" />
                                                    </Button>
                                                )}

                                                {/* Suppression — admin uniquement */}
                                                {isAdmin && (
                                                    <Button variant="ghost" size="icon" onClick={() => handleDelete(s.id)} className="h-11 w-11 rounded-xl hover:bg-red-50 hover:text-destructive transition-all">
                                                        <Trash2 className="w-5 h-5" />
                                                    </Button>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-2 gap-8 bg-gray-50/50 p-6 rounded-[2rem] border border-gray-100/50">
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-xl bg-white shadow-sm flex items-center justify-center">
                                                    <User className="w-5 h-5 text-gray-400" />
                                                </div>
                                                <div>
                                                    <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest leading-none mb-1">Inspecteur</p>
                                                    <p className="text-sm font-black text-gray-900">{s.inspecteur}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-xl bg-white shadow-sm flex items-center justify-center">
                                                    <Clock className="w-5 h-5 text-gray-400" />
                                                </div>
                                                <div>
                                                    <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest leading-none mb-1">Date Prévue</p>
                                                    <p className="text-sm font-black text-gray-900">
                                                        {new Date(s.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
                                                    </p>
                                                </div>
                                            </div>
                                            {s.dateRealisation && (
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
                                                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                                    </div>
                                                    <div>
                                                        <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest leading-none mb-1">Date Réalisation</p>
                                                        <p className="text-sm font-black text-emerald-700">
                                                            {new Date(s.dateRealisation).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
                                                        </p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <div className="space-y-4 flex flex-col justify-center items-end">
                                            <div className="text-right">
                                                <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest leading-none mb-2">Priorité Audit</p>
                                                {getPriorityBadge(s.priority)}
                                            </div>

                                            {/* Message d'accès restreint pour l'inspecteur hors entité */}
                                            {isLocked && (
                                                <div className="flex items-center gap-2 text-gray-400 bg-gray-100 px-3 py-2 rounded-xl w-full justify-center">
                                                    <Lock className="w-3 h-3" />
                                                    <span className="text-[9px] font-black uppercase tracking-widest">Autre entité</span>
                                                </div>
                                            )}

                                            {/* Boutons d'action pour l'inspecteur de la même entité */}
                                            {isInspecteur && !isLocked && s.status !== 'termine' && s.status !== 'anticipe' && (
                                                <div className="flex gap-2 w-full">
                                                    {/* Démarrer — seulement si canStart */}
                                                    {s.canStart && (
                                                        <Button
                                                            onClick={() => handleStartInspection(s.id)}
                                                            className="h-10 px-4 rounded-xl font-black uppercase text-[9px] tracking-widest bg-amber-500 hover:bg-amber-600 text-white flex-1 gap-1"
                                                        >
                                                            <Play className="w-3 h-3" /> Démarrer
                                                        </Button>
                                                    )}
                                                    {/* Terminer — seulement en_cours ou en_retard */}
                                                    {(s.status === 'en_cours' || s.status === 'en_retard') && s.isEditable && (
                                                        <Button
                                                            onClick={() => handleFinishInspection(s.id)}
                                                            className="h-10 px-4 rounded-xl font-black uppercase text-[9px] tracking-widest bg-emerald-500 hover:bg-emerald-600 text-white flex-1 gap-1"
                                                        >
                                                            <CheckCircle2 className="w-3 h-3" /> Terminer
                                                        </Button>
                                                    )}
                                                </div>
                                            )}

                                            {/* Bouton Détails — tout le monde */}
                                            <Button variant="outline" className="h-10 px-6 rounded-xl border-2 font-black uppercase text-[10px] tracking-widest w-full">
                                                Détails
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}

                    {filtered.length === 0 && (
                        <div className="col-span-2 flex flex-col items-center justify-center py-24 text-gray-400">
                            <CalendarIcon className="w-16 h-16 mb-4 opacity-20" />
                            <p className="font-black uppercase tracking-widest text-sm">Aucun planning trouvé</p>
                        </div>
                    )}
                </div>
            ) : (
                /* Calendar View */
                <Card className="border-2 border-gray-100 bg-white rounded-[3rem] shadow-sm overflow-hidden">
                    <CardHeader className="p-8 border-b border-gray-50 flex flex-row items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl" onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}>
                                <ChevronLeftIcon className="w-5 h-5" />
                            </Button>
                            <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tight min-w-[200px] text-center">
                                {currentMonth.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                            </h3>
                            <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl" onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}>
                                <ChevronRightIcon className="w-5 h-5" />
                            </Button>
                        </div>
                        <div className="flex flex-wrap gap-4">
                            {[{ label: 'CPS Management', color: 'bg-orange-500' }, { label: 'SUR Sûreté', color: 'bg-emerald-500' }, { label: 'SEC Sécurité', color: 'bg-slate-600' }].map(e => (
                                <div key={e.label} className="flex items-center gap-2">
                                    <div className={`w-3 h-3 rounded-full ${e.color}`} />
                                    <span className="text-[10px] font-black uppercase text-gray-400 font-mono tracking-tighter">{e.label}</span>
                                </div>
                            ))}
                        </div>
                    </CardHeader>
                    <CardContent className="p-4 grid grid-cols-7 gap-2 min-h-[400px]">
                        {Array.from({ length: 31 }).map((_, i) => {
                            const day = i + 1;
                            const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                            const daySchedules = filtered.filter(s => s.date === dateStr);
                            return (
                                <div
                                    key={day}
                                    onClick={() => {
                                        if (!isAdmin) return; // seul l'admin peut créer depuis le calendrier
                                        setEditingSchedule(null);
                                        setFormData({ siteId: "", inspecteurId: "", entite: "", date: dateStr, type: "Audit Périodique", site: "", inspecteur: "" });
                                        setIsModalOpen(true);
                                    }}
                                    className={`border border-gray-100 rounded-2xl p-2 min-h-[110px] bg-white transition-all
                                        ${isAdmin ? 'hover:bg-orange-50/20 hover:border-sonatel-orange/10 hover:shadow-lg cursor-pointer' : 'cursor-default'}
                                        group`}
                                >
                                    <span className="text-xs font-black text-gray-400 group-hover:text-sonatel-orange">{day}</span>
                                    <div className="space-y-1 mt-1">
                                        {daySchedules.map(ds => {
                                            const isLockedCal = isInspecteur && !ds.belongsToUserEntite;
                                            const entityColor = isLockedCal ? 'bg-gray-50 border-gray-200 border-l-4 border-l-gray-400 shadow-none' :
                                                ds.entite === 'CPS' ? 'bg-orange-500' :
                                                    ds.entite === 'SUR' ? 'bg-emerald-500' : 'bg-slate-600';
                                            const textColor = isLockedCal ? 'text-gray-600' : 'text-white';
                                            const iconColor = isLockedCal ? 'text-gray-400' : 'text-white/80';
                                            return (
                                                <div
                                                    key={ds.id}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (isLockedCal) {
                                                            toast.info("Accès en lecture seule : cette mission appartient à une autre entité.");
                                                            return;
                                                        }
                                                        setEditingSchedule(ds);
                                                        setFormData({ site: ds.site, siteId: ds.siteId, inspecteur: ds.inspecteur, inspecteurId: ds.inspecteurId, entite: ds.entite, date: ds.date, type: ds.type });
                                                        setIsModalOpen(true);
                                                    }}
                                                    className={`${entityColor} ${textColor} p-2 rounded-xl font-bold border transition-all cursor-pointer flex flex-col gap-1.5 group relative overflow-hidden
                                                        ${isLockedCal ? 'hover:bg-gray-200' : 'shadow-lg border-white/30 hover:scale-[1.03] hover:shadow-xl'}`}
                                                >
                                                    {isLockedCal && (
                                                        <div className="flex items-center gap-1.5 mb-1 px-1.5 py-0.5 bg-gray-200/50 rounded-md w-fit">
                                                            <Lock className="w-2.5 h-2.5 text-gray-500" />
                                                            <span className="text-[8px] font-black uppercase tracking-widest text-gray-600">Lecture seule</span>
                                                        </div>
                                                    )}
                                                    <div className="flex items-start gap-1">
                                                        <MapPin className={`w-3 h-3 mt-0.5 shrink-0 ${iconColor}`} />
                                                        <div className={`text-[11px] leading-tight font-black uppercase break-words line-clamp-2 ${isLockedCal ? 'text-gray-700' : 'text-white'}`}>{ds.site}</div>
                                                    </div>
                                                    <div className={`text-[9px] opacity-95 flex items-center gap-1.5 border-t pt-1.5 mt-0.5 ${isLockedCal ? 'border-gray-200' : 'border-white/20'}`}>
                                                        <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${isLockedCal ? 'bg-gray-200' : 'bg-white/20'}`}>
                                                            <User className={`w-2 h-2 ${iconColor}`} />
                                                        </div>
                                                        <span className={`truncate font-black normal-case ${isLockedCal ? 'text-gray-500' : 'text-white'}`}>{ds.inspecteur}</span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </CardContent>
                </Card>
            )}

            {/* Modal Add/Edit — accessible uniquement si autorisé */}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="max-w-2xl rounded-[3rem] p-0 border-none shadow-2xl overflow-hidden">
                    <div className="p-10 space-y-8">
                        <DialogHeader>
                            <div className="w-16 h-16 rounded-[2rem] bg-sonatel-orange/10 flex items-center justify-center mb-6">
                                <CalendarIcon className="text-sonatel-orange w-8 h-8" />
                            </div>
                            <DialogTitle className="text-3xl font-black text-gray-900 uppercase tracking-tight">
                                {editingSchedule ? "Modifier le Planning" : "Nouvelle Inspection"}
                            </DialogTitle>
                            <DialogDescription className="text-gray-500 font-medium">
                                Veuillez remplir les informations pour planifier ou modifier l'intervention.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Site Sonatel</label>
                                <Popover open={openSiteSelect} onOpenChange={setOpenSiteSelect} modal={false}>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" className="w-full h-14 bg-gray-50 border-gray-100 rounded-2xl font-bold justify-between px-4 group">
                                            {formData.site ? <span className="text-gray-900 font-extrabold">{formData.site}</span> : <span className="text-gray-400">Choisir un site...</span>}
                                            <ChevronRight className="w-4 h-4 opacity-50 rotate-90 group-data-[state=open]:rotate-[-90deg] transition-transform" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 rounded-2xl border-none shadow-2xl mt-2 overflow-hidden bg-white">
                                        <Command shouldFilter={false}>
                                            <CommandInput placeholder="Saisir au moins 3 caractères..." className="h-12" onValueChange={setSiteSearchQuery} />
                                            <CommandList className="min-h-[200px]">
                                                {siteSearchLoading && <div className="p-4 text-center"><Loader2 className="w-6 h-6 animate-spin text-sonatel-orange mx-auto" /></div>}
                                                {!siteSearchLoading && siteSearchQuery.length >= 3 && (backendSites?.length || 0) === 0 && <CommandEmpty className="py-6 text-center text-sm">Aucun site trouvé pour "{siteSearchQuery}".</CommandEmpty>}
                                                {!siteSearchLoading && siteSearchQuery.length > 0 && siteSearchQuery.length < 3 && <div className="py-4 text-center text-xs text-muted-foreground">Saisissez encore {3 - siteSearchQuery.length} caractère(s)...</div>}
                                                <CommandGroup className="max-h-60 overflow-y-auto">
                                                    {(backendSites || []).map((site) => (
                                                        <CommandItem key={site.id} value={`${site.nom} ${site.code} ${site.id}`} onSelect={() => { setFormData({ ...formData, site: site.nom, siteId: site.id }); setOpenSiteSelect(false); }} className="cursor-pointer flex justify-between items-center gap-2 p-3 hover:bg-orange-50 data-[selected='true']:bg-orange-50">
                                                            <div className="flex flex-col">
                                                                <span className="font-bold text-gray-900">{site.nom}</span>
                                                                <span className="text-[10px] text-muted-foreground uppercase">{site.code}</span>
                                                            </div>
                                                            <div className="flex flex-col items-end gap-1">
                                                                <Badge variant="secondary" className="text-[8px] font-black h-4 px-1 bg-gray-100 text-gray-600 border-none">{site.zone}</Badge>
                                                                <span className="text-[8px] text-muted-foreground">{site.type}</span>
                                                            </div>
                                                        </CommandItem>
                                                    ))}
                                                </CommandGroup>
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                            </div>

                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Inspecteur</label>
                                <Popover open={openInspecteurSelect} onOpenChange={setOpenInspecteurSelect} modal={false}>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" className="w-full h-14 bg-gray-50 border-gray-100 rounded-2xl font-bold justify-between px-4 group">
                                            {formData.inspecteur ? (
                                                <div className="flex items-center gap-3">
                                                    <span className="text-gray-900 font-extrabold">{formData.inspecteur}</span>
                                                    <Badge className={`text-[8px] font-black h-4 px-1 ${formData.entite === 'CPS' ? 'bg-orange-100 text-orange-600' : formData.entite === 'SUR' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-600'}`}>{formData.entite || 'SEC'}</Badge>
                                                </div>
                                            ) : <span className="text-gray-400">Nom de l'auditeur...</span>}
                                            <ChevronRight className="w-4 h-4 opacity-50 rotate-90 group-data-[state=open]:rotate-[-90deg] transition-transform" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 rounded-2xl border-none shadow-2xl mt-2 overflow-hidden bg-white">
                                        <Command shouldFilter={false}>
                                            <CommandInput placeholder="Saisir au moins 3 caractères..." className="h-12" onValueChange={setInspecteurSearchQuery} />
                                            <CommandList className="min-h-[200px]">
                                                {inspecteurSearchLoading ? (
                                                    <div className="p-4 text-center"><Loader2 className="w-6 h-6 animate-spin text-sonatel-orange mx-auto" /></div>
                                                ) : (
                                                    <>
                                                        {(backendUsers || []).length === 0 && <div className="p-8 text-center"><p className="text-gray-400 text-sm">{inspecteurSearchQuery.length >= 3 ? "Aucun auditeur trouvé" : "Saisissez au moins 3 caractères..."}</p></div>}
                                                        <CommandGroup className="max-h-60 overflow-y-auto">
                                                            {(backendUsers || []).map((u) => (
                                                                <CommandItem key={u.id} value={u.name} onSelect={() => {
                                                                    const auditType = u.entite === 'CPS' ? 'CPS (Visite Managériale)' : u.entite === 'SUR' ? 'SUR (Contrôle Sûreté)' : 'SEC (Vérification Sécurité)';
                                                                    setFormData({ ...formData, inspecteur: u.name, inspecteurId: u.id, entite: u.entite || 'SEC', type: auditType });
                                                                    setOpenInspecteurSelect(false);
                                                                }} className="cursor-pointer flex justify-between gap-2">
                                                                    <span>{u.name}</span>
                                                                    <Badge variant="outline" className={`text-[8px] font-black h-4 px-1 ${u.entite === 'CPS' ? 'bg-orange-50 text-orange-600' : u.entite === 'SUR' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-600'}`}>{u.entite || 'SEC'}</Badge>
                                                                </CommandItem>
                                                            ))}
                                                        </CommandGroup>
                                                    </>
                                                )}
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                            </div>

                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Date</label>
                                <Input type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} className="h-14 bg-gray-50 border-gray-100 rounded-2xl font-bold" />
                            </div>
                        </div>

                        <DialogFooter className="pt-4 flex flex-col md:flex-row gap-4 items-center sm:justify-between w-full">
                            <div className="flex gap-2 w-full md:w-auto">
                                <Button variant="ghost" onClick={() => setIsModalOpen(false)} className="flex-1 md:flex-none h-14 rounded-2xl">Annuler</Button>
                                {editingSchedule && editingSchedule.status !== 'termine' && (
                                    <Button
                                        variant="outline"
                                        className="border-sonatel-orange text-sonatel-orange hover:bg-orange-50 font-black uppercase text-[10px] tracking-widest px-6 h-14 rounded-2xl flex-1 md:flex-none gap-2"
                                        onClick={() => {
                                            const params = new URLSearchParams({
                                                missionId: editingSchedule.id,
                                                siteId: editingSchedule.siteId || "",
                                                siteName: editingSchedule.site || "",
                                                inspecteur: editingSchedule.inspecteur || "",
                                                date: editingSchedule.date || ""
                                            });
                                            navigate(`/inspection?${params.toString()}`);
                                        }}
                                    >
                                        <Play className="w-4 h-4 fill-current" /> Démarrer l'audit
                                    </Button>
                                )}
                            </div>
                            <Button onClick={handleSubmit} className="h-14 px-12 rounded-2xl bg-sonatel-orange text-white font-black uppercase w-full md:w-auto shadow-lg shadow-orange-500/20">
                                {editingSchedule ? "Enregistrer les modifications" : "Confirmer la Planification"}
                            </Button>
                        </DialogFooter>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Modal d'Importation */}
            <Dialog open={isImportModalOpen} onOpenChange={setIsImportModalOpen}>
                <DialogContent className="max-w-md bg-white rounded-[2rem] border-none shadow-2xl p-8 animate-in zoom-in-95 duration-300">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                            <FileSpreadsheet className="w-7 h-7 text-sonatel-orange" />
                            Importer une Roadmap
                        </DialogTitle>
                        <DialogDescription className="text-sm font-bold text-gray-400 uppercase tracking-widest pt-2">
                            Charger un fichier Excel pour planifier les audits
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-6 py-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Fichier Excel (.xlsx)</label>
                            <div className="relative group cursor-pointer h-24 border-2 border-dashed border-gray-100 rounded-2xl flex items-center justify-center hover:border-sonatel-orange hover:bg-orange-50/50 transition-all overflow-hidden">
                                <input
                                    type="file"
                                    accept=".xlsx, .xls"
                                    onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                                    className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                />
                                <div className="text-center group-hover:scale-105 transition-transform duration-300">
                                    {importFile ? (
                                        <p className="font-black text-sm text-sonatel-orange tracking-tight px-4 truncate max-w-full">
                                            {importFile.name}
                                        </p>
                                    ) : (
                                        <>
                                            <p className="font-black text-sm text-gray-400 group-hover:text-sonatel-orange tracking-tight">Cliquer pour choisir ou glisser-déposer</p>
                                            <p className="text-[10px] font-bold text-gray-300 uppercase mt-1 tracking-widest">Excel XLSX uniquement</p>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Année Planifiée</label>
                                <select
                                    value={importYear}
                                    onChange={(e) => setImportYear(Number(e.target.value))}
                                    className="w-full h-14 bg-gray-50 border-none rounded-2xl px-5 font-black text-xs uppercase tracking-widest focus:ring-2 focus:ring-sonatel-orange/10 outline-none"
                                >
                                    {[2024, 2025, 2026, 2027].map(y => (
                                        <option key={y} value={y}>{y}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="gap-3 pt-4 border-t border-gray-50">
                        <Button
                            variant="ghost"
                            onClick={() => setIsImportModalOpen(false)}
                            className="h-14 px-8 rounded-2xl font-black uppercase text-xs tracking-widest text-gray-400 hover:text-gray-600 hover:bg-gray-50"
                        >
                            Annuler
                        </Button>
                        <Button
                            disabled={!importFile || importLoading}
                            onClick={handleImport}
                            className="h-14 flex-1 rounded-2xl bg-sonatel-orange hover:bg-orange-600 text-white font-black uppercase text-xs tracking-widest shadow-lg shadow-orange-500/20 gap-3"
                        >
                            {importLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5 fill-current" />}
                            Démarrer l'importation
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            {/* Modal de Reconduction Annuelle */}
            <Dialog open={isRenewModalOpen} onOpenChange={setIsRenewModalOpen}>
                <DialogContent className="max-w-md bg-white rounded-[2rem] border-none shadow-2xl p-8">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                            <LayoutGrid className="w-7 h-7 text-sonatel-orange" />
                            Reconduire le Planning
                        </DialogTitle>
                        <DialogDescription className="text-gray-500 font-bold mt-2">
                            Cette action dupliquera toutes les missions de l'année source vers l'année cible.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-6 mt-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Année Source</label>
                            <select
                                value={renewSourceYear}
                                onChange={(e) => setRenewSourceYear(Number(e.target.value))}
                                className="w-full h-14 bg-gray-50 border-none rounded-2xl px-5 font-black text-xs uppercase tracking-widest focus:ring-2 focus:ring-sonatel-orange/10 outline-none"
                            >
                                {[2024, 2025, 2026, 2027].map(y => (
                                    <option key={y} value={y}>{y}</option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Année Cible</label>
                            <select
                                value={renewTargetYear}
                                onChange={(e) => setRenewTargetYear(Number(e.target.value))}
                                className="w-full h-14 bg-gray-50 border-none rounded-2xl px-5 font-black text-xs uppercase tracking-widest focus:ring-2 focus:ring-sonatel-orange/10 outline-none"
                            >
                                {[2025, 2026, 2027, 2028].map(y => (
                                    <option key={y} value={y}>{y}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <DialogFooter className="mt-8 gap-3">
                        <Button
                            variant="ghost"
                            onClick={() => setIsRenewModalOpen(false)}
                            className="h-14 flex-1 rounded-2xl font-black uppercase text-xs tracking-widest"
                        >
                            Annuler
                        </Button>
                        <Button
                            disabled={renewLoading}
                            onClick={handleRenewYear}
                            className="h-14 flex-1 rounded-2xl bg-sonatel-orange hover:bg-orange-600 text-white font-black uppercase text-xs tracking-widest shadow-lg shadow-orange-500/20 gap-2"
                        >
                            {renewLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                            Confirmer
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Modal de Résumé d'Importation — FLUIDE & DESIGN PREMIUM */}
            <Dialog open={showSummary} onOpenChange={setShowSummary}>
                <DialogContent className="max-w-2xl rounded-[3rem] border-none shadow-2xl p-0 overflow-hidden bg-white/95 backdrop-blur-xl animate-in zoom-in-95 fade-in duration-500">
                    <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-12 text-white relative h-64 flex flex-col justify-end">
                        <div className="absolute top-0 right-0 p-12 opacity-10">
                            <CheckCircle2 className="w-48 h-48 rotate-12 translate-x-8 -translate-y-8" />
                        </div>
                        <div className="relative z-10">
                            <DialogTitle className="text-5xl font-black tracking-tighter leading-none">
                                Importation<br />Terminée
                            </DialogTitle>
                            <p className="text-emerald-50/70 font-black uppercase tracking-[0.3em] text-[10px] mt-4 flex items-center gap-2">
                                Rapport d'analyse Roadmap {importYear}
                            </p>
                        </div>
                    </div>

                    <div className="p-12 pt-10 space-y-10">
                        <div className="grid grid-cols-2 gap-6">
                            <div className="p-8 bg-emerald-50/50 rounded-[2.5rem] border-2 border-emerald-100/50 flex flex-col items-center justify-center text-center translate-y-[-2rem] bg-white shadow-xl shadow-emerald-500/10 transition-transform">
                                <span className="text-5xl font-black text-emerald-600 tracking-tighter tabular-nums">{importSummary?.count}</span>
                                <span className="text-[11px] font-black uppercase text-emerald-400 mt-2 tracking-widest text-center">Missions Créées</span>
                            </div>
                            <div className={`p-8 rounded-[2.5rem] border-2 flex flex-col items-center justify-center text-center translate-y-[-2rem] shadow-xl ${importSummary?.errors && importSummary.errors.length > 0 ? 'bg-red-50/50 border-red-100/50 shadow-red-500/10' : 'bg-gray-50 border-gray-100 shadow-gray-200/20'}`}>
                                <span className={`text-5xl font-black tracking-tighter tabular-nums ${importSummary?.errors && importSummary.errors.length > 0 ? 'text-red-500' : 'text-gray-300'}`}>
                                    {importSummary?.errors?.length || 0}
                                </span>
                                <span className={`text-[11px] font-black uppercase mt-2 tracking-widest text-center ${importSummary?.errors && importSummary.errors.length > 0 ? 'text-red-300' : 'text-gray-400'}`}>
                                    Anomalies Détectées
                                </span>
                            </div>
                        </div>

                        {importSummary?.errors && importSummary.errors.length > 0 && (
                            <div className="space-y-6">
                                <h4 className="text-[12px] font-black text-gray-400 uppercase tracking-[0.25em] flex items-center gap-3">
                                    <AlertTriangle className="w-4 h-4 text-red-500" />
                                    Détails des points de blocage
                                </h4>

                                <div className="max-h-[250px] overflow-y-auto p-3 bg-gray-50/30 rounded-[2.5rem] border border-gray-100 flex flex-col gap-3 custom-scrollbar list-none">
                                    {importSummary.errors.map((err, idx) => (
                                        <li key={idx} className="flex gap-4 text-[13px] font-bold text-gray-700 bg-white p-5 rounded-[1.8rem] border border-gray-100/50 shadow-sm transition-shadow">
                                            <div className="shrink-0 w-10 h-10 rounded-2xl bg-gray-50 text-gray-400 flex items-center justify-center font-black text-xs">{(idx + 1).toString().padStart(2, '0')}</div>
                                            <div className="py-2 leading-relaxed opacity-90">{err}</div>
                                        </li>
                                    ))}
                                </div>
                            </div>
                        )}

                        <Button
                            onClick={() => setShowSummary(false)}
                            className="w-full h-20 rounded-[1.8rem] bg-gray-900 hover:bg-black text-white font-black uppercase text-xs tracking-[0.3em] shadow-2xl shadow-gray-400 gap-4"
                        >
                            Fermer le rapport d'analyse
                            <ChevronRight className="w-6 h-6" />
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}