import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { actionService, ActionPlan, ActionComment } from "@/services/ActionService";
import { toast } from "sonner";
import {
  Clock,
  User,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Search,
  Building2,
  Filter,
  MoreVertical,
  ExternalLink,
  ChevronRight,
  MessageSquare,
  TrendingUp,
  Activity,
  ClipboardCheck,
  Zap,
  Tag,
  Download,
  CheckCircle,
  ChevronDown,
  SortAsc,
  BarChart3,
  X
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { CameraCapture } from "@/components/CameraCapture";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ORIGINES_ACTION, AVANCEMENT_ACTION, STATUT_ACTION } from "@/constants/actionPlan";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const actions = [

];

const statutConfig: Record<string, { label: string; className: string }> = {
  "Echu non soldé": { label: "Echu non soldé", className: "bg-red-100 text-red-700 border-red-200" },
  "En cours": { label: "En Cours", className: "bg-amber-100 text-amber-700 border-amber-200" },
  "Non échu": { label: "Non échu", className: "bg-orange-100 text-sonatel-orange border-orange-200" },
  "Fait": { label: "Fait", className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  "Soldé": { label: "Soldé", className: "bg-emerald-500 text-white border-emerald-600" },
  "Echu": { label: "Echu", className: "bg-red-500 text-white border-red-600" },
  "En attente de validation": { label: "À Valider", className: "bg-sonatel-light-bg text-sonatel-orange border-sonatel-orange/20" },
  "Bloqué": { label: "Bloqué", className: "bg-red-100 text-red-600 border-red-200" },
};

const prioriteConfig: Record<string, { label: string; className: string }> = {
  critique: { label: "Critique", className: "bg-red-500 text-white shadow-lg shadow-red-500/20" },
  majeur: { label: "Majeur", className: "bg-sonatel-orange text-white shadow-lg shadow-orange-500/20" },
  mineur: { label: "Mineur", className: "bg-gray-100 text-gray-700 border-gray-200" },
};

export default function ActionsPage() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState("tous");
  const [search, setSearch] = useState("");
  const [showAddAction, setShowAddAction] = useState(false);
  const [dbActions, setDbActions] = useState<ActionPlan[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sortBy, setSortBy] = useState<"echeance" | "priorite" | "progression">("echeance");
  const [priorityFilter, setPriorityFilter] = useState<string>("tous");
  const { user } = useAuth();

  // States for Propose Closing
  const [showEvidenceDialog, setShowEvidenceDialog] = useState(false);
  const [selectedAction, setSelectedAction] = useState<any>(null);
  const [closingNotes, setClosingNotes] = useState("");
  const [closingPhoto, setClosingPhoto] = useState<string | null>(null);

  // Comments State
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<ActionComment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  // State for Block Dialog
  const [showBlockDialog, setShowBlockDialog] = useState(false);
  const [blockNotes, setBlockNotes] = useState("");

  // State for Validation Dialog
  const [showValidationDialog, setShowValidationDialog] = useState(false);

  // Helper to check if can edit
  const canModifyAction = (action: any) => {
    return ['ADMIN', 'SUPER_ADMIN'].includes(user?.role || '') || user?.id === action.responsableId;
  };

  // State for Detail Dialog
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [activeActionDetail, setActiveActionDetail] = useState<any>(null);

  const fetchActions = async () => {
    const cached = actionService.getCachedResponse<any>('');

    if (cached) {
      if (cached.actions && Array.isArray(cached.actions)) {
        setDbActions(cached.actions as ActionPlan[]);
      } else if (Array.isArray(cached)) {
        setDbActions(cached);
      }
      setIsLoading(false);
    } else {
      setIsLoading(true);
    }

    try {
      const response = await actionService.getAll();
      if (response.data && 'actions' in response.data) {
        setDbActions(response.data.actions as ActionPlan[]);
      } else if (Array.isArray(response.data)) {
        setDbActions(response.data);
      }
    } catch (error) {
      console.error("Erreur chargement actions:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchActions();
  }, []);

  const handleUpdateStatut = async (id: string, newStatut: 'TERMINE' | 'A_FAIRE' | 'EN_COURS' | 'EN_RETARD') => {
    try {
      const res = await actionService.updateStatut(id, { statut: newStatut });
      if (!res.error) {
        toast.success("Statut mis à jour");
        fetchActions();
      } else {
        toast.error(res.error);
      }
    } catch (error) {
      toast.error("Erreur lors de la mise à jour");
    }
  };

  const handleProposeCloture = async () => {
    if (!selectedAction) return;
    try {
      const res = await actionService.proposerCloture(selectedAction.realId, {
        photoUrl: closingPhoto || undefined,
        notes: closingNotes
      });
      if (!res.error) {
        toast.success("Clôture proposée avec succès");
        setShowEvidenceDialog(false);
        setClosingPhoto(null);
        setClosingNotes("");
        fetchActions();
      } else {
        toast.error(res.error);
      }
    } catch (error) {
      toast.error("Erreur lors de l'envoi");
    }
  };

  const handleValiderCloture = async (actionId: string) => {
    try {
      const res = await actionService.validerCloture(actionId);
      if (!res.error) {
        toast.success("Action validée et clôturée");
        setShowValidationDialog(false);
        fetchActions();
      } else {
        toast.error(res.error);
      }
    } catch (error) {
      toast.error("Erreur lors de la validation");
    }
  };

  const loadComments = async (id: string) => {
    try {
      const res = await actionService.getComments(id);
      if (res.data) setComments(res.data);
    } catch (error) {
      console.error("Error loading comments", error);
    }
  };

  const handleOpenComments = (action: any) => {
    setSelectedAction(action);
    setComments([]);
    setShowComments(true);
    loadComments(action.realId || action.id);
  };

  const handleAddComment = async () => {
    if (!selectedAction || !newComment.trim()) return;
    setIsSubmittingComment(true);
    try {
      const actionId = selectedAction.realId || selectedAction.id;
      const res = await actionService.addComment(actionId, newComment);
      if (res.data) {
        setNewComment("");
        loadComments(actionId);
      }
    } catch (error) {
      toast.error("Erreur lors de l'ajout du commentaire");
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const allActions = useMemo(() => {
    const listToMap = Array.isArray(dbActions) ? dbActions : [];
    const mappedDb = listToMap.map(a => ({
      id: a.id,
      titre: a.description,
      site: (a as any).inspection?.site?.nom || "Inconnu",
      rubrique: "N/A",
      porteur: (a as any).responsable?.name || "Non assigné",
      responsableId: a.responsableId,
      inspecteurId: (a as any).inspection?.inspecteurId,
      echeance: new Date(a.dateEcheance).toLocaleDateString('fr-FR'),
      origine: "Inspection DG/SECU",
      avancement: a.statut === 'TERMINE' ? "Fait" : a.statut === 'A_VALIDER' ? "En validation" : a.statut === 'EN_COURS' ? "En cours" : "A faire",
      statut: a.statut === 'TERMINE' ? "Soldé" : a.statut === 'A_VALIDER' ? "En attente de validation" : a.statut === 'EN_RETARD' ? "Echu non soldé" : a.statut === 'EN_COURS' ? "En cours" : "Non échu",
      progression: a.statut === 'TERMINE' ? 100 : a.statut === 'A_VALIDER' ? 90 : a.statut === 'EN_COURS' ? 50 : 0,
      priorite: a.criticite === 'ELEVEE' ? "critique" : a.criticite === 'MOYENNE' ? "majeur" : "mineur",
      realId: a.id, // keep for API
      evidencePhotoUrl: a.evidencePhotoUrl,
      evidenceNotes: a.evidenceNotes
    }));

    return [...mappedDb, ...actions];
  }, [dbActions]);

  const priorityOrder: Record<string, number> = {
    critique: 1,
    majeur: 2,
    mineur: 3,
  };

  const filtered = allActions
    .filter((a) => filter === "tous" || a.statut === filter)
    .filter((a) => priorityFilter === "tous" || a.priorite === priorityFilter)
    .filter((a) =>
      a.titre.toLowerCase().includes(search.toLowerCase()) ||
      a.site.toLowerCase().includes(search.toLowerCase()) ||
      a.id.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === "echeance") {
        return new Date(a.echeance).getTime() - new Date(b.echeance).getTime();
      }
      if (sortBy === "priorite") {
        return priorityOrder[a.priorite] - priorityOrder[b.priorite];
      }
      return b.progression - a.progression;
    });

  const summary = {
    total: allActions.length,
    enRetard: allActions.filter((a) => a.statut === "Echu non soldé" || a.statut === "Echu").length,
    enCours: allActions.filter((a) => a.statut === "En cours").length,
    cloture: allActions.filter((a) => a.statut === "Fait" || a.statut === "Soldé").length,
  };

  return (
    <div className="p-4 md:p-8 space-y-6 md:space-y-10 w-full animate-in fade-in duration-500">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="text-center md:text-left">
          <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">Cahier d'Actions</h1>
          <p className="text-muted-foreground font-bold mt-1 uppercase tracking-widest text-[9px] md:text-[11px] flex items-center justify-center md:justify-start gap-2">
            <Activity className="w-3.5 h-3.5 text-sonatel-orange" />
            Pilotage des remédiations DG/SECU
          </p>
        </div>
        <div className="flex items-center gap-2 md:gap-3 w-full md:w-auto">
          <Button variant="outline" className="flex-1 md:flex-none h-11 md:h-12 px-4 md:px-6 rounded-2xl font-black uppercase text-[10px] md:text-xs tracking-widest border-2 gap-2 border-gray-200 shadow-sm">
            <Download className="w-4 h-4 text-sonatel-orange" /> Export
          </Button>
          <Button
            onClick={() => setShowAddAction(true)}
            className="flex-1 md:flex-none h-11 md:h-12 px-4 md:px-6 rounded-2xl bg-sonatel-orange hover:bg-orange-600 text-white font-black uppercase text-[10px] md:text-xs tracking-widest shadow-lg shadow-orange-500/20 gap-2"
          >
            Action
          </Button>
        </div>
      </div>

      <Dialog open={showAddAction} onOpenChange={setShowAddAction}>
        <DialogContent className="max-w-2xl rounded-[2rem] border-none p-5 md:p-10">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-gray-900 uppercase">Nouvelle Action Corrective</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <div className="space-y-2 col-span-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Titre de l'action</Label>
              <Input placeholder="Description de l'anomalie..." className="rounded-xl h-12" />
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Site</Label>
              <Input placeholder="Nom du site..." className="rounded-xl h-12" />
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Origine</Label>
              <Select>
                <SelectTrigger className="rounded-xl h-12 text-xs font-bold">
                  <SelectValue placeholder="Sélectionner l'origine..." />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {ORIGINES_ACTION.map(o => (
                    <SelectItem key={o} value={o} className="text-xs font-bold">{o}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Porteur (Responsable)</Label>
              <Input placeholder="Nom du responsable..." className="rounded-xl h-12" />
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Échéance</Label>
              <Input type="date" className="rounded-xl h-12" />
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Avancement</Label>
              <Select>
                <SelectTrigger className="rounded-xl h-12 text-xs font-bold">
                  <SelectValue placeholder="Niveau d'avancement..." />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {AVANCEMENT_ACTION.map(a => (
                    <SelectItem key={a} value={a} className="text-xs font-bold">{a}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Statut</Label>
              <Select>
                <SelectTrigger className="rounded-xl h-12 text-xs font-bold">
                  <SelectValue placeholder="Statut de suivi..." />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {STATUT_ACTION.map(s => (
                    <SelectItem key={s} value={s} className="text-xs font-bold">{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="mt-10">
            <Button variant="ghost" onClick={() => setShowAddAction(false)} className="rounded-xl h-12 font-black uppercase text-[10px] tracking-widest">Annuler</Button>
            <Button className="bg-sonatel-orange hover:bg-orange-600 text-white rounded-xl h-12 px-8 font-black uppercase text-[10px] tracking-widest">Créer l'action</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Summary Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {[
          { label: "Actions", value: summary.total, icon: ClipboardCheck, color: "text-gray-900", bg: "bg-gray-50" },
          { label: "En Retard", value: summary.enRetard, icon: AlertTriangle, color: "text-red-600", bg: "bg-red-50" },
          { label: "En cours", value: summary.enCours, icon: Clock, color: "text-amber-600", bg: "bg-amber-50" },
          { label: "Taux Clôture", value: `${Math.round((summary.cloture / summary.total) * 100 || 0)}%`, icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50" },
        ].map((item, i) => (
          <Card key={i} className={`border-2 border-transparent hover:border-sonatel-orange/20 transition-all rounded-3xl shadow-sm ${item.bg}`}>
            <CardContent className="p-3 md:p-6 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xl md:text-3xl font-black text-gray-900 tracking-tighter">{item.value}</p>
                <p className="text-[9px] md:text-[10px] font-black text-muted-foreground uppercase tracking-widest">{item.label}</p>
              </div>
              <div className={`p-2.5 md:p-4 rounded-xl md:rounded-2xl bg-white shadow-sm shrink-0`}>
                <item.icon className={`w-4 h-4 md:w-6 md:h-6 ${item.color}`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card className="border-2 border-gray-100 bg-white rounded-3xl shadow-sm overflow-hidden p-2">
        <CardContent className="p-4 flex flex-col gap-4 items-center">
          <div className="relative flex-1 group w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-sonatel-orange transition-colors" />
            <Input
              placeholder="Rechercher par titre, site, porteur..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-12 h-14 border-none bg-gray-50/50 rounded-2xl focus-visible:ring-sonatel-orange/10 focus-visible:bg-white transition-all font-bold"
            />
          </div>
          <div className="flex flex-col md:flex-row gap-4 w-full">
            {/* Status Filters */}
            <div className="flex bg-gray-50 p-1.5 rounded-2xl border border-gray-100 w-full md:w-auto overflow-x-auto whitespace-nowrap">
              {["tous", "Echu non soldé", "En cours", "Fait", "Soldé"].map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filter === f ? "bg-white text-sonatel-orange shadow-md" : "text-muted-foreground hover:text-gray-900"
                    }`}
                >
                  {f === "tous" ? "Tous" : f.replace('_', ' ')}
                </button>
              ))}
            </div>

            {/* Priority Filters */}
            <div className="flex bg-gray-50 p-1.5 rounded-2xl border border-gray-100 w-full md:w-auto overflow-x-auto whitespace-nowrap">
              {["tous", "critique", "majeur", "mineur"].map((f) => (
                <button
                  key={`prio-${f}`}
                  onClick={() => setPriorityFilter(f)}
                  className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${priorityFilter === f
                    ? f === "critique"
                      ? "bg-red-500 text-white shadow-md"
                      : f === "majeur"
                        ? "bg-sonatel-orange text-white shadow-md"
                        : "bg-gray-700 text-white shadow-md"
                    : "text-muted-foreground hover:text-gray-900"
                    }`}
                >
                  {f === "tous" ? "Toutes priorités" : f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>

            {/* Sort Options */}
            <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-2xl border border-gray-100">
              <SortAsc className="w-4 h-4 text-gray-400 ml-2" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-transparent text-xs font-black uppercase tracking-widest text-gray-600 focus:outline-none cursor-pointer"
              >
                <option value="echeance">Échéance</option>
                <option value="priorite">Priorité</option>
                <option value="progression">Avancement</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>
      {/* List */}
      <div className="space-y-6">
        {filtered.map((action_raw, i) => {
          const action = action_raw as any;
          const s = statutConfig[action.statut];
          const p = prioriteConfig[action.priorite];

          return (
            <Card key={action.id} className="group border-2 border-gray-100 bg-white hover:border-sonatel-orange/30 hover:shadow-xl hover:shadow-orange-500/5 transition-all duration-300 rounded-[2rem] overflow-hidden animate-in slide-in-from-bottom-4" style={{ animationDelay: `${i * 80}ms` }}>
              <CardContent className="p-4 md:p-8">
                <div className="flex flex-col lg:flex-row gap-8 lg:items-center">
                  {/* Left part */}
                  <div className="flex-1 space-y-6">
                    <div className="flex items-center gap-3">
                      <span className="text-[11px] font-black text-sonatel-orange bg-sonatel-light-bg px-3 py-1.5 rounded-lg border border-sonatel-orange/10 tracking-widest">
                        {action.id}
                      </span>
                      <Badge className={`${p.className} px-3 py-1 font-black text-[9px] uppercase tracking-widest border-none`}>
                        {p.label}
                      </Badge>
                      <Badge className={`${s.className} px-3 py-1 font-black text-[9px] uppercase tracking-widest border-2`}>
                        {s.label}
                      </Badge>
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-lg md:text-xl font-black text-gray-900 leading-tight group-hover:text-sonatel-orange transition-colors">
                        {action.titre}
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400">
                            <Building2 className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-[9px] font-black text-muted-foreground uppercase">Site</p>
                            <p className="text-xs font-bold text-gray-700">{action.site}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400">
                            <User className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-[9px] font-black text-muted-foreground uppercase">Porteur</p>
                            <p className="text-xs font-bold text-gray-700">{action.porteur}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400">
                            <Calendar className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-[9px] font-black text-muted-foreground uppercase">Échéance</p>
                            <p className="text-xs font-bold text-gray-700">{action.echeance}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400">
                            <Zap className="w-4 h-4" />
                          </div>
                          <div className="max-w-[150px]">
                            <p className="text-[9px] font-black text-muted-foreground uppercase">Origine</p>
                            <p className="text-[10px] font-bold text-gray-700 truncate" title={action.origine}>{action.origine}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400">
                            <Activity className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-[9px] font-black text-muted-foreground uppercase">Avancement</p>
                            <p className="text-xs font-bold text-gray-700">{action.avancement}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Progress & Actions */}
                  <div className="flex flex-col sm:flex-row lg:flex-col items-center gap-6 lg:w-64">
                    <div className="flex-1 w-full space-y-3">
                      <div className="flex justify-between items-end">
                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Mise en œuvre</span>
                        <div className="flex items-center gap-1.5">
                          <TrendingUp className={`w-3 h-3 ${action.progression > 50 ? "text-emerald-500" : "text-amber-500"}`} />
                          <span className="text-sm font-black text-gray-900">{action.progression}%</span>
                        </div>
                      </div>
                      <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden p-0.5 border border-gray-50">
                        <div
                          className={`h-full rounded-full transition-all duration-1000 ${action.statut === "en_retard" ? "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.4)]" :
                            action.progression > 50 ? "bg-emerald-500" : "bg-sonatel-orange"
                            }`}
                          style={{ width: `${action.progression}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex gap-3 w-full sm:w-auto lg:w-full">
                      {action.statut === "En attente de validation" ? (
                        user?.id === action.inspecteurId || ['ADMIN', 'SUPER_ADMIN'].includes(user?.role || '') ? (
                          <Button
                            onClick={() => { setSelectedAction(action); setShowValidationDialog(true); }}
                            className="flex-1 h-12 rounded-2xl bg-sonatel-orange hover:bg-orange-600 text-white font-black text-[10px] uppercase transition-all shadow-lg shadow-orange-500/20"
                          >
                            Valider
                          </Button>
                        ) : (
                          <Button disabled variant="outline" className="flex-1 h-12 rounded-2xl border-2 border-gray-100 font-black text-[10px] uppercase">
                            En Validation
                          </Button>
                        )
                      ) : action.statut !== "Soldé" && (user?.id === action.responsableId || ['ADMIN', 'SUPER_ADMIN'].includes(user?.role || '')) ? (
                        <Button
                          onClick={() => { setSelectedAction(action); setShowEvidenceDialog(true); }}
                          className="flex-1 h-12 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] uppercase transition-all shadow-lg shadow-emerald-500/20"
                        >
                          Clôturer
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          className="flex-1 h-12 rounded-2xl border-2 border-gray-100 hover:border-sonatel-orange hover:text-sonatel-orange font-black text-[10px] uppercase transition-all"
                          onClick={() => { setActiveActionDetail(action); setShowDetailDialog(true); }}
                        >
                          Consulter
                        </Button>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="icon" className="h-12 w-12 rounded-2xl border-2 border-gray-100 text-gray-400 hover:text-sonatel-orange hover:bg-sonatel-light-bg transition-all">
                            <MoreVertical className="w-5 h-5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 p-2 rounded-2xl border-2 border-gray-100 shadow-xl">
                          <DropdownMenuItem
                            className="p-3 gap-3 rounded-xl font-bold text-xs uppercase cursor-pointer hover:bg-gray-50"
                            onClick={() => { setActiveActionDetail(action); setShowDetailDialog(true); }}
                          >
                            <ExternalLink className="w-4 h-4 text-sonatel-orange" /> Voir Détails
                          </DropdownMenuItem>
                          {canModifyAction(action) && action.statut !== "Soldé" && action.statut !== "En attente de validation" && (
                            <DropdownMenuItem
                              className="p-3 gap-3 rounded-xl font-bold text-xs uppercase cursor-pointer hover:bg-gray-50 text-emerald-600"
                              onClick={() => (action as any).realId && handleUpdateStatut((action as any).realId, 'TERMINE')}
                            >
                              <CheckCircle className="w-4 h-4" /> Marquer Terminé
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            className="p-3 gap-3 rounded-xl font-bold text-xs uppercase cursor-pointer hover:bg-gray-100"
                            onClick={() => handleOpenComments(action)}
                          >
                            <MessageSquare className="w-4 h-4 text-sonatel-orange" /> Commentaires
                          </DropdownMenuItem>
                          {canModifyAction(action) && action.statut !== "Bloqué" && action.statut !== "Soldé" && (
                            <DropdownMenuItem
                              className="p-3 gap-3 rounded-xl font-bold text-xs uppercase cursor-pointer hover:bg-gray-50 text-red-600"
                              onClick={() => { setSelectedAction(action); setShowBlockDialog(true); }}
                            >
                              <AlertTriangle className="w-4 h-4" /> Signaler Blocage
                            </DropdownMenuItem>
                          )}
                          {canModifyAction(action) && action.statut === "Bloqué" && (
                            <DropdownMenuItem
                              className="p-3 gap-3 rounded-xl font-bold text-xs uppercase cursor-pointer hover:bg-gray-50 text-emerald-600"
                              onClick={() => handleUpdateStatut(action.realId, 'EN_COURS')}
                            >
                              <Activity className="w-4 h-4" /> Débloquer / Reprendre
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {filtered.length === 0 && (
          <div className="text-center py-24 bg-gray-50/50 rounded-[3rem] border-2 border-dashed border-gray-100">
            <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-gray-200/50">
              <ClipboardCheck className="w-10 h-10 text-gray-200" />
            </div>
            <p className="text-sm font-black text-muted-foreground uppercase tracking-widest">Aucune action correspondante.</p>
          </div>
        )}
      </div>

      {/* Modal Clôture avec Preuve */}
      <Dialog open={showEvidenceDialog} onOpenChange={setShowEvidenceDialog}>
        <DialogContent className="max-w-xl rounded-[2rem] p-8">
          <DialogHeader>
            <DialogTitle className="text-xl font-black uppercase">Clôturer l'action</DialogTitle>
            <p className="text-sm text-muted-foreground">{selectedAction?.titre}</p>
          </DialogHeader>
          <div className="space-y-6 mt-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Preuve Photo (Après)</Label>
              <div className="rounded-2xl overflow-hidden border-2 border-dashed border-gray-200 aspect-video flex items-center justify-center bg-gray-50 overflow-hidden relative">
                {closingPhoto ? (
                  <div className="relative w-full h-full">
                    <img src={closingPhoto} alt="Preuve" className="w-full h-full object-cover" />
                    <Button
                      variant="destructive" size="icon" className="absolute top-2 right-2 rounded-full h-8 w-8"
                      onClick={() => setClosingPhoto(null)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <CameraCapture
                    photos={closingPhoto ? [closingPhoto] : []}
                    onPhotosChange={(ps) => setClosingPhoto(ps[ps.length - 1] || null)}
                  />
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Observations / Notes de clôture</Label>
              <Textarea
                placeholder="Détaillez les travaux effectués..."
                className="rounded-xl min-h-[100px]"
                value={closingNotes}
                onChange={(e) => setClosingNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="mt-8">
            <Button variant="ghost" onClick={() => setShowEvidenceDialog(false)}>Annuler</Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-8"
              onClick={handleProposeCloture}
              disabled={!closingPhoto && !closingNotes}
            >
              Soumettre pour validation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Validation par l'Inspecteur */}
      <Dialog open={showValidationDialog} onOpenChange={setShowValidationDialog}>
        <DialogContent className="max-w-xl rounded-[2rem] p-8">
          <DialogHeader>
            <DialogTitle className="text-xl font-black uppercase">Validation de l'action</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 mt-4">
            {selectedAction?.evidencePhotoUrl && (
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Preuve Photo soumise</Label>
                <div className="rounded-2xl overflow-hidden border-2 border-gray-100 aspect-video">
                  <img src={selectedAction.evidencePhotoUrl} alt="Preuve" className="w-full h-full object-cover" />
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Notes du responsable</Label>
              <div className="p-4 bg-gray-50 rounded-xl text-sm italic">
                {selectedAction?.evidenceNotes || "Aucune note fournie."}
              </div>
            </div>
          </div>
          <DialogFooter className="mt-8 flex gap-3">
            <Button variant="outline" onClick={() => setShowValidationDialog(false)} className="flex-1">Plus tard</Button>
            <Button
              className="bg-sonatel-orange hover:bg-orange-600 text-white rounded-xl flex-1"
              onClick={() => handleValiderCloture(selectedAction.realId)}
            >
              Valider définitivement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Commentaires / Collaboration */}
      <Dialog open={showComments} onOpenChange={setShowComments}>
        <DialogContent className="max-w-2xl rounded-[2.5rem] p-0 overflow-hidden border-none shadow-2xl">
          <div className="bg-gradient-to-br from-sonatel-orange to-orange-600 p-8 text-white relative">
            <div className="absolute top-4 right-4 h-12 w-12 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-md">
              <MessageSquare className="w-6 h-6 text-white" />
            </div>
            <DialogTitle className="text-2xl font-black uppercase tracking-tight">Discussion & Collaboration</DialogTitle>
            <p className="text-orange-50 text-sm mt-1 font-medium opacity-80">{selectedAction?.titre}</p>
          </div>

          <div className="p-6 space-y-6">
            <div className="h-[400px] overflow-y-auto space-y-4 pr-2 custom-scrollbar">
              {comments.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-3">
                  <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center">
                    <MessageSquare className="w-8 h-8 text-gray-200" />
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em]">Aucun échange pour le moment</p>
                </div>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className={`flex flex-col ${comment.userId === user?.id ? 'items-end' : 'items-start'}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">{comment.user?.name}</span>
                      <span className="text-[9px] text-gray-300 font-medium">{new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div className={`max-w-[85%] p-4 rounded-3xl text-sm shadow-sm ${comment.userId === user?.id
                      ? 'bg-sonatel-orange text-white rounded-tr-none'
                      : 'bg-gray-100 text-gray-800 rounded-tl-none border-2 border-gray-50'
                      }`}>
                      {comment.content}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-4 border-t-2 border-gray-100 flex gap-3 items-end">
              <div className="flex-1 bg-gray-50 rounded-[2rem] p-2 focus-within:bg-white focus-within:ring-2 focus-within:ring-orange-100 transition-all border-2 border-transparent focus-within:border-sonatel-orange/30">
                <Textarea
                  placeholder="Écrivez votre message..."
                  className="bg-transparent border-none focus-visible:ring-0 resize-none min-h-[44px] h-[44px] py-3 px-4 text-sm font-semibold"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleAddComment();
                    }
                  }}
                />
              </div>
              <Button
                onClick={handleAddComment}
                disabled={isSubmittingComment || !newComment.trim()}
                className="h-[60px] w-[60px] rounded-[1.5rem] bg-sonatel-orange hover:bg-orange-600 text-white shadow-xl shadow-orange-500/20 active:scale-95 transition-all flex items-center justify-center p-0"
              >
                {isSubmittingComment ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Zap className="w-5 h-5 fill-white" />
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Détails Complets de l'Action */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-3xl rounded-[2.5rem] p-0 overflow-hidden border-none shadow-2xl">
          {activeActionDetail && (
            <>
              <div className="bg-gradient-to-br from-gray-900 to-gray-800 p-8 text-white relative">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-[10px] font-black bg-sonatel-orange px-3 py-1 rounded-lg tracking-widest uppercase">
                    {activeActionDetail.id}
                  </span>
                  <Badge variant="outline" className="border-white/20 text-white/70 font-black text-[9px] uppercase tracking-widest">
                    {activeActionDetail.priorite}
                  </Badge>
                </div>
                <DialogTitle className="text-2xl font-black uppercase leading-tight max-w-[90%]">
                  {activeActionDetail.titre}
                </DialogTitle>
                <button
                  onClick={() => setShowDetailDialog(false)}
                  className="absolute top-8 right-8 text-white/50 hover:text-white transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-8 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Info Column */}
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-2">
                        <Building2 className="w-3.5 h-3.5 text-sonatel-orange" /> Localisation & Contexte
                      </h4>
                      <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100 space-y-4">
                        <div>
                          <p className="text-[9px] font-black text-gray-400 uppercase mb-1">Site Intervenant</p>
                          <p className="font-bold text-gray-900">{activeActionDetail.site}</p>
                        </div>
                        <div>
                          <p className="text-[9px] font-black text-gray-400 uppercase mb-1">Origine de l'Action</p>
                          <div className="flex items-center justify-between group">
                            <p className="font-bold text-gray-700">{activeActionDetail.origine}</p>
                            {activeActionDetail.realId && (
                              <button
                                onClick={() => navigate(`/historique/${(activeActionDetail as any).inspectionId || activeActionDetail.realId}`)}
                                className="text-[10px] font-black text-sonatel-orange flex items-center gap-1 hover:underline"
                              >
                                Rapport Source <ExternalLink className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-sonatel-orange" /> Délais & Suivi
                      </h4>
                      <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100 space-y-4">
                        <div className="flex justify-between">
                          <div>
                            <p className="text-[9px] font-black text-gray-400 uppercase mb-1">Échéance</p>
                            <p className="font-bold text-gray-900">{activeActionDetail.echeance}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-[9px] font-black text-gray-400 uppercase mb-1">Statut Actuel</p>
                            <Badge className="font-black text-[9px] uppercase tracking-widest border-2">
                              {activeActionDetail.statut}
                            </Badge>
                          </div>
                        </div>
                        <div>
                          <p className="text-[9px] font-black text-gray-400 uppercase mb-2 text-center">Avancement des travaux</p>
                          <div className="h-4 w-full bg-white rounded-full p-1 border border-gray-100">
                            <div
                              className="h-full bg-sonatel-orange rounded-full transition-all duration-1000"
                              style={{ width: `${activeActionDetail.progression}%` }}
                            />
                          </div>
                          <p className="text-center font-black text-xs text-gray-900 mt-2">{activeActionDetail.progression}% complété</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Evidence / Proof Column */}
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-2">
                        <User className="w-3.5 h-3.5 text-sonatel-orange" /> Acteurs & Responsabilités
                      </h4>
                      <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100">
                        <div className="flex items-center gap-4">
                          <div className="h-12 w-12 rounded-2xl bg-white border-2 border-gray-100 flex items-center justify-center font-black text-sonatel-orange shadow-sm">
                            {(activeActionDetail.porteur || "U").substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-[9px] font-black text-gray-400 uppercase">Responsable (Porteur)</p>
                            <p className="font-bold text-gray-900">{activeActionDetail.porteur}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {activeActionDetail.evidencePhotoUrl && (
                      <div>
                        <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-2">
                          <Tag className="w-3.5 h-3.5 text-sonatel-orange" /> Preuve de Réalisation
                        </h4>
                        <div className="bg-gray-50 p-4 rounded-3xl border border-gray-100 space-y-4">
                          <div className="aspect-video rounded-2xl overflow-hidden border-4 border-white shadow-sm group relative">
                            <img src={activeActionDetail.evidencePhotoUrl} className="w-full h-full object-cover" alt="Preuve" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <Button variant="outline" className="bg-white/20 backdrop-blur-md text-white border-white/30 rounded-xl" onClick={() => window.open(activeActionDetail.evidencePhotoUrl, '_blank')}>
                                <ExternalLink className="w-4 h-4 mr-2" /> Agrandir
                              </Button>
                            </div>
                          </div>
                          {activeActionDetail.evidenceNotes && (
                            <div className="text-xs font-bold text-gray-600 italic px-2">
                              "{activeActionDetail.evidenceNotes}"
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <Separator className="my-8" />

                <div className="flex gap-4">
                  <Button
                    className="flex-1 h-14 rounded-2xl bg-sonatel-orange hover:bg-orange-600 text-white font-black uppercase text-xs tracking-widest gap-2"
                    onClick={() => { setShowComments(true); loadComments(activeActionDetail.realId || activeActionDetail.id); }}
                  >
                    <MessageSquare className="w-4 h-4" /> Discussion & Collaboration
                  </Button>
                  <Button variant="outline" className="h-14 w-14 rounded-2xl border-2 border-gray-100 text-gray-400 hover:text-sonatel-orange" onClick={() => window.print()}>
                    <Download className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal Signalement de Blocage */}
      <Dialog open={showBlockDialog} onOpenChange={setShowBlockDialog}>
        <DialogContent className="max-w-md rounded-[2.5rem] p-8 border-none ring-1 ring-gray-100">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="h-16 w-16 bg-red-50 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
            <DialogTitle className="text-xl font-black uppercase tracking-tight">Signaler un blocage</DialogTitle>
            <p className="text-xs text-muted-foreground font-medium px-4">
              Veuillez expliquer la raison pour laquelle cette action est bloquée (manque de budget, prestataire, accès...).
            </p>
          </div>

          <div className="mt-8 space-y-4">
            <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Motif du blocage</Label>
            <Textarea
              className="rounded-2xl bg-gray-50 border-gray-100 min-h-[120px] focus:ring-red-500/20 focus:border-red-500 transition-all font-bold"
              placeholder="Ex: En attente de validation du devis par le Service Achat..."
              value={blockNotes}
              onChange={(e) => setBlockNotes(e.target.value)}
            />
          </div>

          <DialogFooter className="mt-8 gap-3">
            <Button variant="ghost" onClick={() => { setShowBlockDialog(false); setBlockNotes(""); }} className="rounded-xl flex-1 h-12">Annuler</Button>
            <Button
              className="bg-red-500 hover:bg-red-600 text-white rounded-xl flex-1 h-12 font-black uppercase text-xs shadow-lg shadow-red-500/20"
              onClick={async () => {
                try {
                  const res = await (actionService as any).updateStatut(selectedAction.realId, {
                    statut: 'BLOQUE',
                    notes: blockNotes
                  });
                  if (!res.error) {
                    toast.success("Action marquée comme BLOQUÉE");
                    setShowBlockDialog(false);
                    setBlockNotes("");
                    fetchActions();
                  } else {
                    toast.error(res.error);
                  }
                } catch (e) {
                  toast.error("Erreur serveur");
                }
              }}
              disabled={!blockNotes.trim()}
            >
              Confirmer Blocage
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div >
  );
}
