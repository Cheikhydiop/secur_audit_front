import { useState, useMemo, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { inspectionService, Inspection as InspectionType, InspectionQuestion, ActionPlan } from "@/services/InspectionService";
// Force HMR Refresh after toast import fix

import {
  Search,
  FileText,
  Download,
  Eye,
  Calendar,
  MapPin,
  User,
  Filter,
  ChevronRight,
  ChevronLeft,
  ArrowLeft,
  Shield,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ExternalLink,
  Printer,
  Share2,
  Building2,
  Activity,
  CheckCircle,
  FileSpreadsheet,
  Star,
  Camera,
  ChevronDown,
  ChevronUp,
  X,
  ImageIcon,
  ClipboardList,
  AlertCircle,
  Layers
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { PhotoLightbox } from "@/components/PhotoLightbox";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";



import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { rapportsService } from "@/services/RapportService";
import { PdfInspectionGenerator } from "@/pdf-generators/PdfInspectionGenerator";
import { InspectionReportData } from "@/pdf-generators/PdfTypes";

function getScoreColor(score: number) {
  if (score >= 90) return "text-emerald-500 border-emerald-500/20 bg-emerald-50/50";
  if (score >= 61) return "text-amber-500 border-amber-500/20 bg-amber-50/50";
  return "text-destructive border-destructive/20 bg-red-50/50";
}

export default function HistoriquePage() {
  const { user } = useAuth();
  const [isUpdating, setIsUpdating] = useState(false);
  const { id: selectedId } = useParams();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [dbInspections, setDbInspections] = useState<InspectionType[]>([]);
  const [selectedDetails, setSelectedDetails] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [reportUrls, setReportUrls] = useState<{ pdf?: string; excel?: string; id?: string }>({});

  // Expanded rows state
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [inspectionDetails, setInspectionDetails] = useState<Record<string, { questions: InspectionQuestion[]; actions: ActionPlan[] }>>({});

  // Lightbox State
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxPhotos, setLightboxPhotos] = useState<string[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const toggleExpand = async (inspectionId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(inspectionId)) {
      newExpanded.delete(inspectionId);
    } else {
      newExpanded.add(inspectionId);
      // Fetch details if not already loaded
      if (!inspectionDetails[inspectionId]) {
        try {
          const res = await inspectionService.getById(inspectionId);
          if (res.data) {
            setInspectionDetails(prev => ({
              ...prev,
              [inspectionId]: {
                questions: (res.data as any).inspectionQuestions || [],
                actions: (res.data as any).actions || []
              }
            }));
          }
        } catch (error) {
          console.error("Erreur chargement détails:", error);
        }
      }
    }
    setExpandedRows(newExpanded);
  };

  const openPhotos = (photos: string[], index: number = 0) => {
    setLightboxPhotos(photos);
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  useEffect(() => {
    const fetchInspections = async () => {
      setIsLoading(true);
      try {
        const response = await inspectionService.getAll({
          startDate: startDate || undefined,
          endDate: endDate || undefined
        });
        if (response.data && 'inspections' in response.data) {
          setDbInspections(response.data.inspections);
        } else if (Array.isArray(response.data)) {
          setDbInspections(response.data);
        }
      } catch (error) {
        console.error("Erreur chargement historique:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchInspections();
  }, [startDate, endDate]);

  useEffect(() => {
    if (selectedId) {
      const fetchDetails = async () => {
        try {
          const res = await inspectionService.getById(selectedId);
          if (res.data) {
            // Mapper les données backend vers le format attendu par le template
            // On utilise inspectionQuestions pour avoir les photos
            const inspectionQuestions = (res.data as any).inspectionQuestions || [];
            const reponses = (res.data.reponses as any[]) || [];

            // Fusionner les réponses JSON avec les questions de la table
            const mergedReponses = reponses.map((r: any) => {
              // Chercher la question correspondante dans inspectionQuestions
              const iq = inspectionQuestions.find((iq: any) => iq.questionIdOriginal === r.questionId);
              return {
                ...r,
                // Prioriser la photo de la table InspectionQuestion si disponible
                photos: iq?.photoUrl ? [iq.photoUrl] : (r.photos || [])
              };
            });

            // Grouper par rubrique
            const rubriquesMap: Record<string, any> = {};
            mergedReponses.forEach(r => {
              if (!rubriquesMap[r.rubrique]) {
                rubriquesMap[r.rubrique] = { name: r.rubrique, conforme: 0, nonConforme: 0, totalPonderation: 0, conformePonderation: 0 };
              }
              const p = r.ponderation || 1;
              rubriquesMap[r.rubrique].totalPonderation += p;
              if (r.valeur === 'CONFORME') {
                rubriquesMap[r.rubrique].conforme++;
                rubriquesMap[r.rubrique].conformePonderation += p;
              } else if (r.valeur === 'NON_CONFORME') {
                rubriquesMap[r.rubrique].nonConforme++;
              }
            });

            const rubriques = Object.values(rubriquesMap).map(r => ({
              ...r,
              score: Math.round((r.conformePonderation / r.totalPonderation) * 100) || 0,
              questions: r.conforme + r.nonConforme
            }));

            const nonConformitesDetails = reponses
              .filter(r => r.valeur === 'NON_CONFORME')
              .map(r => ({
                rubrique: r.rubrique,
                text: r.texte,
                criticality: r.ponderation >= 4 ? "Critique" : r.ponderation >= 2 ? "Majeur" : "Mineur",
                observation: r.observation || "N/A",
                recommendation: r.recommandation || "N/A",
                porteur: "À assigner",
                echeance: "N/A",
                photos: r.photos || []
              }));

            // Récupérer les URLs des rapports
            const rapports = (res.data as any).rapports || [];
            if (rapports.length > 0) {
              const latest = rapports[rapports.length - 1];
              setReportUrls({ pdf: latest.urlPdf, excel: latest.urlExcel, id: latest.id });
            } else {
              setReportUrls({});
            }

            setSelectedDetails({ rubriques, nonConformitesDetails });
          }
        } catch (error) {
          console.error("Erreur détails:", error);
        }
      };
      fetchDetails();
    }
  }, [selectedId]);

  const handleApprove = async () => {
    if (!selectedId) return;
    setIsUpdating(true);
    try {
      await inspectionService.valider(selectedId);
      toast.success("Audit approuvé avec succès !");
      window.location.reload();
    } catch (error) {
      toast.error("Erreur lors de la validation");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleReject = async () => {
    if (!selectedId) return;
    setIsUpdating(true);
    try {
      await inspectionService.rejeter(selectedId);
      toast.success("Audit marqué comme rejeté");
      window.location.reload();
    } catch (error) {
      toast.error("Erreur lors de la mise à jour");
    } finally {
      setIsUpdating(false);
    }
  };

  // Fonction d'export CSV Client-Side
  const handleCsvExport = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!activeInspection || !selectedDetails) return;

    try {
      const headers = ["Rubrique", "Question", "Statut", "Critique", "Observation", "Recommandation", "Photos"];
      const rows = selectedDetails.nonConformitesDetails.map(nc => [
        nc.rubrique,
        nc.text,
        "NON_CONFORME",
        nc.criticality,
        nc.observation,
        nc.recommendation,
        (nc.photos || []).join(" | ")
      ]);

      // Synthèse par rubriques
      const summaryRows = selectedDetails.rubriques.map(r => [
        r.name,
        "-- Score Global --",
        `${r.score}%`,
        "",
        "",
        "",
        ""
      ]);

      const csvContent = [
        headers.join(";"),
        ...summaryRows.map(r => r.join(";")),
        ...rows.map(r => r.join(";"))
      ].join("\n");

      const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `Rapport_${activeInspection.site.replace(/\s+/g, '_')}_${activeInspection.date.replace(/\//g, '-')}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Rapport CSV généré (avec photos)");
    } catch (error) {
      console.error("Erreur export CSV:", error);
      toast.error("Impossible de générer le CSV");
    }
  };
  // Nouvelle fonction pour télécharger via le proxy backend (évite 401 Cloudinary)
  const handleDownloadReport = async (reportId: string, extension: 'pdf' | 'xlsx') => {
    const toastId = toast.loading(`Préparation du rapport ${extension.toUpperCase()}...`);
    try {
      const blob = await rapportsService.download(reportId);
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = `Rapport_${activeInspection?.site || 'Audit'}_${reportId.substring(0, 5)}.${extension}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setTimeout(() => URL.revokeObjectURL(url), 100);
      toast.success("Rapport téléchargé", { id: toastId });
    } catch (error) {
      console.error("Erreur download:", error);
      toast.error("Erreur lors du téléchargement", { id: toastId });
    }
  };

  const handlePrint = async (e: React.MouseEvent) => {
    e.stopPropagation();

    // Si un PDF officiel existe déjà sur le serveur, on l'utilise
    if (reportUrls.id && reportUrls.pdf) {
      handleDownloadReport(reportUrls.id, 'pdf');
      return;
    }

    // Sinon, on génère le PDF dynamiquement sur le client
    if (!activeInspection || !selectedDetails) {
      toast.error("Données du rapport non chargées");
      return;
    }

    const toastId = toast.loading("Génération du rapport PDF Sonatel...");

    try {
      const generator = new PdfInspectionGenerator();

      // Récupérer les données complètes depuis l'API si nécessaire
      let fullData = activeInspection;

      // Préparer les données pour le générateur
      const pdfData: InspectionReportData = {
        id: activeInspection.id,
        site: {
          nom: activeInspection.site,
          code: (dbInspections.find(i => i.id === activeInspection.id) as any)?.site?.code || "N/A",
          zone: activeInspection.zone,
          type: (dbInspections.find(i => i.id === activeInspection.id) as any)?.site?.type || "N/A",
        },
        inspecteur: {
          name: activeInspection.inspecteur,
          email: "", // Optionnel
          entite: "DG/SECU"
        },
        metadata: {
          date: activeInspection.date,
          score: activeInspection.score,
          statut: activeInspection.status.toUpperCase(),
        },
        scoresParRubrique: selectedDetails.rubriques.map((r: any) => ({
          nom: r.name,
          score: r.score,
          totalQuestions: r.questions,
          questionsConformes: r.conforme
        })),
        nonConformites: selectedDetails.nonConformitesDetails.map((nc: any) => ({
          rubrique: nc.rubrique,
          question: nc.text,
          criticite: nc.criticality,
          observation: nc.observation,
          recommendation: nc.recommendation,
          photoUrl: nc.photos && nc.photos.length > 0 ? nc.photos[0] : undefined
        }))
      };

      const doc = generator.generateInspectionPDF(pdfData);
      doc.save(`Rapport_Audit_${activeInspection.site.replace(/\s+/g, '_')}_${activeInspection.date.replace(/\//g, '-')}.pdf`);

      toast.success("Rapport PDF généré avec succès", { id: toastId });
    } catch (error) {
      console.error("Erreur génération PDF:", error);
      toast.error("Erreur lors de la génération du PDF", { id: toastId });
      // Fallback au print du navigateur
      window.print();
    }
  };

  const allInspections = useMemo(() => {
    const list = Array.isArray(dbInspections) ? dbInspections : [];
    return list.map(ins => ({
      id: ins.id,
      site: (ins as any).site?.nom || (ins as any).site?.code || "Site inconnu",
      zone: (ins as any).site?.zone || "Inconnu",
      date: new Date(ins.date).toLocaleDateString("fr-FR"),
      inspecteur: (ins as any).inspecteur?.name || ((ins as any).inspecteur?.prenom || (ins as any).inspecteur?.nom ? `${(ins as any).inspecteur?.prenom || ''} ${(ins as any).inspecteur?.nom || ''}`.trim() : "Inconnu"),
      score: Math.round(ins.score || 0),
      status: ins.statut ? ins.statut.toLowerCase().replace('validee', 'validé').replace('rejetee', 'rejeté').replace('en_cours', 'en cours') : "en cours",
      nonConformites: Array.isArray(ins.reponses) ? ins.reponses.filter((r: any) => r.valeur === 'NON_CONFORME').length : 0,
      rubriqueInfo: ins.score && ins.score >= 90 ? "Conforme" : ins.score >= 61 ? "Risque modéré" : "Non-conformité",
    }));
  }, [dbInspections]);

  const filtered = useMemo(() => {
    return allInspections.filter(
      (ins) => {
        const matchesSearch =
          ins.site.toLowerCase().includes(search.toLowerCase()) ||
          ins.zone.toLowerCase().includes(search.toLowerCase()) ||
          ins.id.toLowerCase().includes(search.toLowerCase()) ||
          ins.inspecteur.toLowerCase().includes(search.toLowerCase());

        if (!matchesSearch) return false;

        if (startDate || endDate) {
          // Parse date from "DD/MM/YYYY" or "YYYY-MM-DD"
          let insDate: Date;
          if (ins.date.includes('/')) {
            const [d, m, y] = ins.date.split('/');
            insDate = new Date(`${y}-${m}-${d}`);
          } else {
            insDate = new Date(ins.date);
          }

          if (startDate && insDate < new Date(startDate)) return false;
          if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            if (insDate > end) return false;
          }
        }

        return true;
      }
    );
  }, [allInspections, search, startDate, endDate]);

  const activeInspection = useMemo(() =>
    allInspections.find(i => i.id === selectedId),
    [selectedId, allInspections]);

  const details = useMemo(() => {
    if (!selectedId) return null;
    return selectedDetails;
  }, [selectedId, selectedDetails]);

  if (selectedId && activeInspection && details) {
    return (
      <div className="p-4 md:p-10 space-y-8 w-full animate-in fade-in slide-in-from-right-4 duration-500">
        {/* Detail Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-4">
            <button
              onClick={() => navigate("/historique")}
              className="group flex items-center gap-2 text-sm font-black text-muted-foreground hover:text-sonatel-orange transition-colors uppercase tracking-widest"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              Retour à la liste
            </button>
            <div className="space-y-1">
              <h1 className="text-3xl font-black tracking-tight text-gray-900 flex items-center gap-4">
                Rapports de l'Inspection
                <div className="flex items-center gap-1">
                  <Badge className="bg-primary/10 text-primary border-none font-black text-xs h-7 px-3">{activeInspection.id}</Badge>
                  <div className="h-7 w-7 rounded-full bg-orange-50 flex items-center justify-center border border-orange-100 shadow-sm animate-pulse">
                    <Star className="w-4 h-4 text-sonatel-orange fill-sonatel-orange" />
                  </div>
                </div>
              </h1>
              <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                <MapPin className="w-4 h-4 text-sonatel-orange" />
                {activeInspection.site} • {activeInspection.zone}
              </p>
            </div>
          </div>
          <div className="flex gap-3 relative z-50">
            {user?.role === 'ADMIN' && activeInspection.status !== 'validé' && (
              <>
                <Button
                  className="h-12 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase text-xs tracking-widest shadow-lg shadow-emerald-500/20 gap-2"
                  onClick={handleApprove}
                  disabled={isUpdating}
                >
                  <CheckCircle className="w-4 h-4" /> Approuver l'Audit
                </Button>
                <Button
                  variant="outline"
                  className="h-12 px-6 rounded-2xl border-2 border-red-100 text-red-600 hover:bg-red-50 font-black uppercase text-xs tracking-widest gap-2"
                  onClick={handleReject}
                  disabled={isUpdating}
                >
                  <X className="w-4 h-4" /> Rejeter
                </Button>
              </>
            )}

            <Button
              variant="outline"
              className="h-12 px-6 rounded-2xl font-black uppercase text-xs tracking-widest border-2 gap-2 border-gray-100 hover:bg-gray-50 shadow-sm relative z-50"
              onClick={handleCsvExport}
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-500" /> Export CSV
            </Button>
            {reportUrls.id && reportUrls.excel && (
              <Button
                variant="outline"
                className="h-12 px-6 rounded-2xl font-black uppercase text-xs tracking-widest border-2 gap-2 relative z-50"
                onClick={(e) => { e.stopPropagation(); handleDownloadReport(reportUrls.id!, 'xlsx'); }}
              >
                <FileText className="w-4 h-4 text-emerald-600" /> Excel Officiel
              </Button>
            )}
            <Button
              className="h-12 px-6 rounded-2xl bg-sonatel-orange hover:bg-orange-600 text-white font-black uppercase text-xs tracking-widest shadow-lg shadow-orange-500/20 gap-2 relative z-50"
              onClick={handlePrint}
            >
              <Printer className="w-4 h-4" /> Rapport PDF / Imprimer
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Summary Sidebar */}
          <div className="space-y-6">
            <Card className="bg-white border-2 border-gray-100 rounded-3xl shadow-sm overflow-hidden">
              <div className={`p-8 text-center border-b-2 border-gray-50 bg-gradient-to-b from-gray-50/50 to-white relative overflow-hidden`}>
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-4">Score de Conformité Global</p>
                <div className="flex items-center justify-center gap-2">
                  <div className={`text-6xl font-black ${activeInspection.score >= 90 ? "text-emerald-500" : activeInspection.score >= 61 ? "text-amber-500" : "text-destructive"}`}>
                    {activeInspection.score}%
                  </div>
                  {activeInspection.status === "validé" && (
                    <div className="flex flex-col items-center">
                      <Star className="w-8 h-8 text-sonatel-orange fill-sonatel-orange drop-shadow-lg animate-bounce" />
                      <span className="text-[7px] font-black text-sonatel-orange uppercase tracking-widest">Validé</span>
                    </div>
                  )}
                </div>
                <p className="text-xs font-bold text-muted-foreground mt-4 uppercase tracking-widest">{activeInspection.rubriqueInfo}</p>
              </div>
              <CardContent className="p-8 space-y-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-center text-sm font-bold">
                    <span className="text-muted-foreground uppercase text-[10px] tracking-widest">Date Inspection</span>
                    <span className="text-gray-900">{activeInspection.date}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm font-bold">
                    <span className="text-muted-foreground uppercase text-[10px] tracking-widest">Inspecteur</span>
                    <span className="text-gray-900">{activeInspection.inspecteur}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm font-bold">
                    <span className="text-muted-foreground uppercase text-[10px] tracking-widest">Statut Rapport</span>
                    <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none font-black text-[10px] uppercase">Validé</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-2 border-gray-100 rounded-3xl shadow-sm p-8 space-y-6">
              <h4 className="font-black text-xs uppercase tracking-[0.2em] text-gray-900">Résumé des Rubriques</h4>
              <div className="space-y-6">
                {details.rubriques.map((rub, i) => (
                  <div key={i} className="space-y-2">
                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-wider">
                      <span>{rub.name}</span>
                      <span className={rub.score >= 90 ? "text-emerald-500" : rub.score >= 61 ? "text-amber-500" : "text-destructive"}>{rub.score}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-1000 ${rub.score >= 90 ? "bg-emerald-500" : rub.score >= 61 ? "bg-amber-500" : "bg-destructive"}`}
                        style={{ width: `${rub.score}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[9px] font-bold text-muted-foreground">
                      <span>{rub.conforme} Conformités</span>
                      <span className={rub.nonConforme > 0 ? "text-destructive" : ""}>{rub.nonConforme} NC</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Main Detail Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Key NCs */}
            <Card className="bg-white border-2 border-gray-100 rounded-3xl shadow-sm overflow-hidden">
              <CardHeader className="p-8 border-b border-gray-50 flex flex-row items-center justify-between bg-gray-50/30">
                <div>
                  <CardTitle className="text-lg font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-destructive" />
                    Non-Conformités Relevées
                  </CardTitle>
                  <CardDescription className="font-bold">Total de {activeInspection.nonConformites} points d'attention détectés.</CardDescription>
                </div>
                <Badge className="bg-destructive text-white border-none font-black px-4 py-1.5 rounded-full">{activeInspection.nonConformites}</Badge>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-gray-100">
                  {details.nonConformitesDetails.map((nc, idx) => (
                    <div key={idx} className="p-8 space-y-6 hover:bg-red-50/30 transition-colors">
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-2">
                          <Badge variant="outline" className={`text-[9px] font-black uppercase tracking-wider ${nc.criticality === "Critique" ? "border-destructive text-destructive bg-red-50" : "border-amber-500 text-amber-600 bg-amber-50"}`}>
                            {nc.criticality}
                          </Badge>
                          <h4 className="text-base font-black text-gray-900 leading-tight">{nc.text}</h4>
                          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">{nc.rubrique}</p>
                        </div>
                        <div className="flex gap-2">
                          <button className="p-2.5 rounded-xl bg-white border border-gray-200 text-gray-400 hover:text-sonatel-orange transition-all shadow-sm">
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-white p-8 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-red-50/50 rounded-bl-[4rem] -mr-8 -mt-8 transition-transform group-hover:scale-110" />
                        <div className="space-y-4">
                          <div>
                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1.5 mb-2">
                              <Activity className="w-3.5 h-3.5 text-sonatel-orange" /> Observation
                            </p>
                            <p className="text-sm font-bold text-gray-700 leading-relaxed italic border-l-4 border-gray-100 pl-4 py-1">"{nc.observation}"</p>
                          </div>

                          {/* Preuves Photos */}
                          {nc.photos && nc.photos.length > 0 && (
                            <div className="mt-4 pt-4 border-t border-gray-50">
                              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-3">Preuves Photographiques ({nc.photos.length})</p>
                              <div className="flex flex-wrap gap-3">
                                {nc.photos.map((url: string, pIdx: number) => (
                                  <div
                                    key={pIdx}
                                    className="relative group/photo w-28 h-28 rounded-2xl overflow-hidden border-2 border-gray-100 shadow-sm cursor-pointer hover:border-sonatel-orange/30 transition-all hover:shadow-lg hover:shadow-orange-500/5"
                                    onClick={() => openPhotos(nc.photos, pIdx)}
                                  >
                                    <img src={url} alt="Preuve" className="w-full h-full object-cover transition-transform duration-500 group-hover/photo:scale-110" />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/photo:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                      <div className="bg-white/20 backdrop-blur-md p-2 rounded-xl mb-1">
                                        <Eye className="w-5 h-5 text-white" />
                                      </div>
                                    </div>
                                    <div className="absolute bottom-1 right-1 h-5 w-5 bg-sonatel-orange flex items-center justify-center rounded-lg text-white font-black text-[8px]">{pIdx + 1}</div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="space-y-4">
                          <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-1.5 mb-2">
                            <CheckCircle className="w-3.5 h-3.5" /> Plan d'Action Correctif
                          </p>
                          <div className="space-y-4">
                            <p className="text-sm font-black text-gray-800 bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100/50">{nc.recommendation}</p>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1">Porteur</p>
                                <div className="flex items-center gap-2 text-xs font-bold text-gray-700">
                                  <User className="w-3 h-3 text-sonatel-orange" />
                                  {nc.porteur}
                                </div>
                              </div>
                              <div>
                                <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1">Échéance</p>
                                <div className="flex items-center gap-2 text-xs font-bold text-gray-700">
                                  <Calendar className="w-3 h-3 text-sonatel-orange" />
                                  {nc.echeance}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Galerie Globale */}
            {details.nonConformitesDetails.some((nc: any) => nc.photos && nc.photos.length > 0) && (
              <Card className="bg-white border-2 border-gray-100 rounded-[2.5rem] shadow-sm p-10">
                <div className="flex items-center justify-between mb-8">
                  <h4 className="font-black text-xs uppercase tracking-[0.2em] text-gray-900 flex items-center gap-2">
                    <Camera className="w-4 h-4 text-sonatel-orange" /> Galerie Complète de l'Inspection
                  </h4>
                  <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest border-2">
                    {details.nonConformitesDetails.flatMap((nc: any) => nc.photos || []).length} Photos
                  </Badge>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
                  {details.nonConformitesDetails.flatMap((nc: any) => nc.photos || []).map((url: string, i: number, arr: string[]) => (
                    <div
                      key={i}
                      className="aspect-square rounded-[2rem] overflow-hidden border-4 border-white bg-gray-50 flex items-center justify-center group/gal cursor-pointer shadow-lg shadow-gray-200/20 hover:shadow-orange-500/10 hover:border-sonatel-orange/20 transition-all duration-300"
                      onClick={() => openPhotos(arr, i)}
                    >
                      <img src={url} alt="Evidance" className="w-full h-full object-cover transition-transform duration-700 group-hover/gal:scale-110" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover/gal:opacity-100 transition-opacity flex items-end justify-center pb-4">
                        <div className="bg-white/90 p-2 rounded-xl text-sonatel-orange shadow-lg scale-90 group-hover/gal:scale-100 transition-transform">
                          <Eye className="w-4 h-4" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            <PhotoLightbox
              isOpen={lightboxOpen}
              onClose={() => setLightboxOpen(false)}
              photos={lightboxPhotos}
              initialIndex={lightboxIndex}
            />

            {/* Signatures / Validation */}
            <Card className="bg-white border-2 border-gray-100 rounded-3xl shadow-sm p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                <div className="space-y-4 border-r border-dashed border-gray-100 pr-12">
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Signé numériquement par l'Inspecteur</p>
                  <div className="pt-4">
                    <div className="text-xl font-black italic text-gray-400 opacity-50 mb-2 font-serif">A. Diallo</div>
                    <Separator className="bg-gray-200" />
                    <p className="text-xs font-bold text-gray-900 mt-3">{activeInspection.inspecteur}</p>
                    <p className="text-[10px] font-medium text-muted-foreground">Le {activeInspection.date} à 11:43</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Validation Direction de Sécurité</p>
                  <div className="pt-2">
                    <div className="flex items-center gap-3 p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                      <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                      <div>
                        <p className="text-xs font-black text-emerald-700 uppercase">Rapport Validé</p>
                        <p className="text-[10px] font-bold text-emerald-600/70 uppercase">C. A. DIOP (Manager)</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  const handleExportAll = () => {
    if (filtered.length === 0) {
      toast.error("Aucune inspection à exporter");
      return;
    }

    const headers = ["Référence", "Site", "Zone", "Inspecteur", "Date", "Score", "Non-Conformités", "Statut", "Photos (URLs)"];

    const rows = filtered.map(ins => {
      const details = inspectionDetails[ins.id];
      const photos = details?.questions
        ? details.questions.filter(q => q.photoUrl).map(q => q.photoUrl).join(" | ")
        : "";

      return [
        ins.id,
        ins.site,
        ins.zone,
        ins.inspecteur,
        ins.date,
        `${ins.score}%`,
        ins.nonConformites,
        ins.status,
        photos
      ].map(val => `"${String(val).replace(/"/g, '""')}"`).join(";");
    });

    const csvContent = [headers.join(";"), ...rows].join("\n");
    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Historique_Inspections_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Export CSV généré !");
  };

  return (
    <div className="p-4 md:p-10 space-y-10 w-full animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-foreground tracking-tight">Archives & Historique</h1>
          <p className="text-muted-foreground font-medium mt-1 uppercase tracking-widest text-[11px] font-black">
            Traçabilité numérique des rapports d'inspection DG/SECU
          </p>
        </div>
        <div className="flex gap-2 relative z-50">
          <Button
            variant="outline"
            onClick={(e) => { e.stopPropagation(); handleExportAll(); }}
            className="h-12 px-6 rounded-2xl font-black uppercase text-xs tracking-widest border-2 gap-2 shadow-sm border-gray-200 relative z-50"
          >
            <Download className="w-4 h-4 text-sonatel-orange" /> Export Complet (CSV)
          </Button>
        </div>
      </div>

      {/* Filters & Search */}
      <Card className="border-2 border-gray-100 bg-white rounded-3xl shadow-sm p-4 overflow-hidden space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-sonatel-orange transition-colors" />
            <Input
              placeholder="Rechercher un rapport, un site ou un inspecteur..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-12 h-14 border-none bg-gray-50/50 rounded-2xl focus-visible:ring-sonatel-orange/10 focus-visible:bg-white transition-all font-bold"
            />
          </div>
          <Button
            variant={showFilters ? "default" : "outline"}
            onClick={() => setShowFilters(!showFilters)}
            className={`h-14 px-8 rounded-2xl font-black uppercase text-xs tracking-widest border-2 gap-2 ${showFilters ? 'bg-sonatel-orange hover:bg-orange-600 border-sonatel-orange' : 'border-gray-100 bg-white hover:bg-gray-50'}`}
          >
            <Filter className={`w-4 h-4 ${showFilters ? 'text-white' : 'text-sonatel-orange'}`} /> {showFilters ? 'Masquer Filtres' : 'Filtres Avancés'}
          </Button>
        </div>

        {showFilters && (
          <div className="flex flex-col md:flex-row items-center gap-6 p-6 bg-gray-50/50 rounded-[2rem] border border-gray-100 animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="flex items-center gap-4 w-full md:w-auto">
              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                <Calendar className="w-4 h-4 text-sonatel-orange" /> Du
              </span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="flex-1 md:w-48 bg-white border-2 border-gray-100 rounded-xl px-4 py-2.5 text-sm font-bold text-gray-700 outline-none focus:border-sonatel-orange/30 transition-all shadow-sm"
              />
            </div>
            <div className="flex items-center gap-4 w-full md:w-auto">
              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Au</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="flex-1 md:w-48 bg-white border-2 border-gray-100 rounded-xl px-4 py-2.5 text-sm font-bold text-gray-700 outline-none focus:border-sonatel-orange/30 transition-all shadow-sm"
              />
            </div>
            {(startDate || endDate) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setStartDate(""); setEndDate(""); }}
                className="text-sonatel-orange font-black text-[10px] uppercase tracking-widest hover:bg-sonatel-orange/10 rounded-xl h-10 px-4"
              >
                <X className="w-3.5 h-3.5 mr-2" /> Réinitialiser
              </Button>
            )}
          </div>
        )}
      </Card>

      {/* List */}
      <div className="space-y-4">
        {/* Table Header (Desktop) */}
        <div className="hidden lg:grid grid-cols-12 gap-4 px-8 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-70">
          <div className="col-span-1"></div>
          <div className="col-span-2">Référence</div>
          <div className="col-span-3">Site Sonatel</div>
          <div className="col-span-2">Équipe Inspection</div>
          <div className="col-span-2 text-center">Score Maturité</div>
          <div className="col-span-1 text-center">Diagnostics</div>
          <div className="col-span-1 text-right">Actions</div>
        </div>

        {filtered.map((ins, i) => {
          const isExpanded = expandedRows.has(ins.id);
          const details = inspectionDetails[ins.id];
          const questions = details?.questions || [];
          const actions = details?.actions || [];
          const nonConformes = questions.filter(q => q.reponse === 'NON_CONFORME');
          const allPhotos = questions.filter(q => q.photoUrl).map(q => q.photoUrl as string);

          return (
            <div key={ins.id} className="space-y-2">
              <Card className={`group border-2 ${isExpanded ? 'border-sonatel-orange/50 shadow-lg shadow-orange-500/10' : (ins.status === 'en cours' ? 'border-amber-300 shadow-sm bg-orange-50/10' : 'border-gray-100')} bg-white hover:border-sonatel-orange/30 hover:shadow-xl hover:shadow-orange-500/5 transition-all duration-300 rounded-[2rem] overflow-hidden animate-in slide-in-from-bottom-4`} style={{ animationDelay: `${i * 100}ms` }}>
                <CardContent className="p-0">
                  <div className="lg:grid lg:grid-cols-12 lg:gap-4 lg:items-center p-6 lg:px-8">
                    {/* Expand Button */}
                    <div className="col-span-1 flex items-center justify-start lg:justify-center">
                      <button
                        onClick={() => toggleExpand(ins.id)}
                        className={`h-10 w-10 rounded-2xl flex items-center justify-center transition-all duration-300 ${isExpanded ? 'bg-sonatel-orange text-white rotate-180' : 'bg-gray-50 text-gray-400 hover:bg-sonatel-light-bg hover:text-sonatel-orange'}`}
                      >
                        <ChevronDown className="w-5 h-5" />
                      </button>
                    </div>

                    {/* ID */}
                    <div className="col-span-2 mb-2 lg:mb-0">
                      <span className="text-[11px] font-black text-sonatel-orange bg-sonatel-light-bg px-4 py-2 rounded-xl border border-sonatel-orange/10 uppercase tracking-widest">
                        {ins.id.substring(0, 8)}...
                      </span>
                    </div>

                    {/* Site */}
                    <div className="col-span-3 mb-4 lg:mb-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-black text-gray-900 group-hover:text-sonatel-orange transition-colors">{ins.site}</h3>
                        {ins.status === "validé" && (
                          <div className="h-5 w-5 rounded-full bg-orange-50 flex items-center justify-center">
                            <Star className="w-3 h-3 text-sonatel-orange fill-sonatel-orange" />
                          </div>
                        )}
                        {ins.status === "en cours" && (
                          <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-none font-black text-[9px] uppercase h-5 px-2 animate-pulse">À traiter</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] font-black text-muted-foreground uppercase tracking-wider mt-2">
                        <MapPin className="w-3.5 h-3.5 text-sonatel-orange/50" />
                        {ins.zone}
                      </div>
                    </div>

                    {/* Inspector */}
                    <div className="col-span-2 mb-4 lg:mb-0">
                      <div className="flex items-center gap-3 text-sm font-bold text-gray-700">
                        <div className="w-9 h-9 rounded-2xl bg-sonatel-light-bg text-sonatel-orange flex items-center justify-center text-[11px] font-black border border-sonatel-orange/5 shadow-inner">
                          {ins.inspecteur && ins.inspecteur.length > 0 ? ins.inspecteur.split(' ').map(n => n[0]).join('').substring(0, 2) : '?'}
                        </div>
                        {ins.inspecteur}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-2 font-black uppercase tracking-widest pl-12">
                        <Clock className="w-3 h-3" />
                        {ins.date}
                      </div>
                    </div>

                    {/* Score */}
                    <div className="col-span-2 flex flex-col items-center mb-4 lg:mb-0">
                      <div className={`px-5 py-2 rounded-2xl text-lg font-black border-2 ${getScoreColor(ins.score)}`}>
                        {ins.score}%
                      </div>
                      <span className="text-[9px] font-black text-muted-foreground mt-2 uppercase tracking-tighter tracking-[0.2em]">{ins.rubriqueInfo}</span>
                    </div>

                    {/* NC Count */}
                    <div className="col-span-1 flex flex-col items-center mb-4 lg:mb-0">
                      <Badge variant={ins.nonConformites > 10 ? "destructive" : "secondary"} className={`font-black text-[10px] px-3 py-1 rounded-lg ${ins.nonConformites > 10 ? "" : "bg-gray-100 text-gray-500 border-none"}`}>
                        {ins.nonConformites} NC
                      </Badge>
                    </div>

                    {/* Actions */}
                    <div className="col-span-1 flex justify-end items-center gap-2">
                      <button
                        onClick={() => navigate(`/historique/${ins.id}`)}
                        className="h-10 px-4 rounded-2xl border-2 border-gray-100 bg-white text-gray-400 hover:text-white hover:bg-sonatel-orange hover:border-sonatel-orange transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest group/btn shadow-sm"
                      >
                        <Eye className="w-4 h-4" />
                        <span className="hidden md:inline">Consulter</span>
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Expanded Content */}
              {isExpanded && (
                <Card className="border-2 border-sonatel-orange/20 bg-gradient-to-br from-gray-50/50 to-white rounded-[2rem] overflow-hidden animate-in slide-in-from-top-2 duration-300">
                  <CardContent className="p-6 lg:p-8">
                    <Accordion type="multiple" defaultValue={['general', 'questionnaire', 'non-conformities', 'gallery']} className="space-y-4">
                      {/* Section 1: Informations générales */}
                      <AccordionItem value="general" className="border-2 border-gray-100 rounded-2xl px-4">
                        <AccordionTrigger className="hover:no-underline">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-sonatel-orange/10 flex items-center justify-center">
                              <Shield className="w-5 h-5 text-sonatel-orange" />
                            </div>
                            <div className="text-left">
                              <h4 className="font-black text-sm uppercase tracking-wider text-gray-900">Informations générales</h4>
                              <p className="text-[10px] font-medium text-muted-foreground">Détails de l'inspection</p>
                            </div>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-4">
                            <div className="space-y-2">
                              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Date</p>
                              <p className="font-bold text-gray-900">{ins.date}</p>
                            </div>
                            <div className="space-y-2">
                              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Inspecteur</p>
                              <p className="font-bold text-gray-900">{ins.inspecteur}</p>
                            </div>
                            <div className="space-y-2">
                              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Site</p>
                              <p className="font-bold text-gray-900">{ins.site}</p>
                            </div>
                            <div className="space-y-2">
                              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Statut</p>
                              <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none font-black text-[10px] uppercase">
                                {ins.status}
                              </Badge>
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>

                      {/* Section 2: Réponses au questionnaire */}
                      <AccordionItem value="questionnaire" className="border-2 border-gray-100 rounded-2xl px-4">
                        <AccordionTrigger className="hover:no-underline">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-orange-100 flex items-center justify-center">
                              <ClipboardList className="w-5 h-5 text-sonatel-orange" />
                            </div>
                            <div className="text-left">
                              <h4 className="font-black text-sm uppercase tracking-wider text-gray-900">Réponses au questionnaire</h4>
                              <p className="text-[10px] font-medium text-muted-foreground">{questions.length} questions évaluées</p>
                            </div>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="pt-4 space-y-3 max-h-96 overflow-y-auto">
                            {questions.length === 0 ? (
                              <p className="text-sm text-muted-foreground text-center py-8">Aucune réponse enregistrée</p>
                            ) : (
                              questions.slice(0, 20).map((q, idx) => (
                                <div key={idx} className="flex items-start gap-4 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm">
                                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-black ${q.reponse === 'CONFORME' ? 'bg-emerald-100 text-emerald-600' : q.reponse === 'NON_CONFORME' ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'}`}>
                                    {q.ordreSnapshot}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold text-gray-900 line-clamp-2">{q.questionTextSnapshot}</p>
                                    <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wider">{q.categorieSnapshot}</p>
                                  </div>
                                  <div className="flex flex-col items-end gap-2">
                                    <Badge variant={q.reponse === 'CONFORME' ? 'default' : q.reponse === 'NON_CONFORME' ? 'destructive' : 'secondary'} className="text-[10px] font-black uppercase">
                                      {q.reponse || 'Non répondu'}
                                    </Badge>
                                    {q.photoUrl && (
                                      <div className="flex flex-col items-end gap-1">
                                        <button
                                          onClick={() => openPhotos([q.photoUrl as string], 0)}
                                          className="p-1.5 rounded-lg bg-gray-50 hover:bg-gray-100 flex items-center gap-2 text-[9px] font-bold text-gray-500 transition-all hover:text-sonatel-orange"
                                        >
                                          <ImageIcon className="w-3.5 h-3.5" />
                                          Photo
                                        </button>
                                        <a
                                          href={q.photoUrl}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-[8px] font-mono text-blue-500 hover:underline max-w-[120px] truncate"
                                          title={q.photoUrl}
                                        >
                                          {q.photoUrl}
                                        </a>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))
                            )}
                            {questions.length > 20 && (
                              <p className="text-center text-[10px] text-muted-foreground py-2">
                                + {questions.length - 20} autres questions... Cliquez sur "Consulter" pour voir tout le détail
                              </p>
                            )}
                          </div>
                        </AccordionContent>
                      </AccordionItem>

                      {/* Section 3: Non-conformités */}
                      <AccordionItem value="non-conformities" className="border-2 border-gray-100 rounded-2xl px-4">
                        <AccordionTrigger className="hover:no-underline">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-red-100 flex items-center justify-center">
                              <AlertCircle className="w-5 h-5 text-red-600" />
                            </div>
                            <div className="text-left">
                              <h4 className="font-black text-sm uppercase tracking-wider text-gray-900">Non-conformités</h4>
                              <p className="text-[10px] font-medium text-muted-foreground">{nonConformes.length} non-conformités identifiées</p>
                            </div>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="pt-4 space-y-4 max-h-80 overflow-y-auto">
                            {nonConformes.length === 0 ? (
                              <div className="text-center py-8">
                                <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-2" />
                                <p className="text-sm font-bold text-gray-900">Aucune non-conformité</p>
                                <p className="text-[10px] text-muted-foreground">Toutes les questions sont conformes</p>
                              </div>
                            ) : (
                              nonConformes.map((nc, idx) => (
                                <div key={idx} className="p-4 bg-red-50/50 rounded-2xl border border-red-100 space-y-3">
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1">
                                      <Badge variant="outline" className={`text-[9px] font-black uppercase tracking-wider mb-2 ${nc.criticiteSnapshot === 'ELEVEE' || nc.ponderationSnapshot >= 4 ? 'border-red-500 text-red-600 bg-red-50' : 'border-amber-500 text-amber-600 bg-amber-50'}`}>
                                        {nc.criticiteSnapshot === 'ELEVEE' || nc.ponderationSnapshot >= 4 ? 'Critique' : nc.ponderationSnapshot >= 2 ? 'Majeur' : 'Mineur'}
                                      </Badge>
                                      <p className="text-sm font-bold text-gray-900">{nc.questionTextSnapshot}</p>
                                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">{nc.categorieSnapshot}</p>
                                    </div>
                                    {nc.photoUrl && (
                                      <button
                                        onClick={() => openPhotos([nc.photoUrl as string], 0)}
                                        className="w-16 h-16 rounded-xl overflow-hidden border-2 border-gray-200 hover:border-sonatel-orange/30 transition-all"
                                      >
                                        <img src={nc.photoUrl as string} alt="Preuve" className="w-full h-full object-cover" />
                                      </button>
                                    )}
                                  </div>
                                  {nc.observation && (
                                    <div className="text-[11px]">
                                      <span className="font-black text-muted-foreground uppercase tracking-wider">Observation: </span>
                                      <span className="text-gray-700 italic">"{nc.observation}"</span>
                                    </div>
                                  )}
                                  {nc.photoUrl && (
                                    <div className="text-[9px] bg-white/50 p-2 rounded-xl border border-red-100/50 flex items-center gap-2">
                                      <ExternalLink className="w-3 h-3 text-blue-500" />
                                      <span className="font-black text-muted-foreground uppercase tracking-tighter">Lien média :</span>
                                      <a href={nc.photoUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 font-mono truncate hover:underline flex-1">
                                        {nc.photoUrl}
                                      </a>
                                    </div>
                                  )}
                                  {nc.recommendation && (
                                    <div className="text-[11px]">
                                      <span className="font-black text-emerald-600 uppercase tracking-wider">Recommandation: </span>
                                      <span className="text-gray-700">{nc.recommendation}</span>
                                    </div>
                                  )}
                                </div>
                              ))
                            )}

                            {/* Action Plans from backend */}
                            {actions.length > 0 && (
                              <div className="mt-4 pt-4 border-t border-gray-200">
                                <h5 className="font-black text-xs uppercase tracking-wider text-gray-900 mb-3">Plans d'action associés</h5>
                                <div className="space-y-2">
                                  {actions.map((action, idx) => (
                                    <div key={idx} className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-100">
                                      <div className={`w-2 h-2 rounded-full ${action.statut === 'A_FAIRE' ? 'bg-amber-500' : action.statut === 'EN_COURS' ? 'bg-sonatel-orange' : 'bg-emerald-500'}`} />
                                      <div className="flex-1 min-w-0">
                                        <p className="text-xs font-bold text-gray-900 truncate">{action.description}</p>
                                      </div>
                                      <Badge variant="secondary" className="text-[9px] font-black uppercase">
                                        {action.statut}
                                      </Badge>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </AccordionContent>
                      </AccordionItem>

                      {/* Section 4: Galerie photos */}
                      <AccordionItem value="gallery" className="border-2 border-gray-100 rounded-2xl px-4">
                        <AccordionTrigger className="hover:no-underline">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-orange-100 flex items-center justify-center">
                              <Camera className="w-5 h-5 text-sonatel-orange" />
                            </div>
                            <div className="text-left">
                              <h4 className="font-black text-sm uppercase tracking-wider text-gray-900">Galerie de preuves</h4>
                              <p className="text-[10px] font-medium text-muted-foreground">{allPhotos.length} photos collectées</p>
                            </div>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="pt-4">
                            {allPhotos.length === 0 ? (
                              <div className="text-center py-8">
                                <ImageIcon className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                                <p className="text-sm font-bold text-gray-900">Aucune photo</p>
                                <p className="text-[10px] text-muted-foreground">Aucune preuve photographique enregistrée</p>
                              </div>
                            ) : (
                              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                                {allPhotos.map((photo, idx) => (
                                  <div key={idx} className="space-y-2">
                                    <button
                                      onClick={() => openPhotos(allPhotos, idx)}
                                      className="w-full aspect-square rounded-2xl overflow-hidden border-2 border-gray-100 hover:border-sonatel-orange/30 hover:shadow-lg transition-all group relative"
                                    >
                                      <img src={photo} alt={`Preuve ${idx + 1}`} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                      <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <Eye className="w-6 h-6 text-white" />
                                      </div>
                                    </button>
                                    <div className="bg-gray-50 p-2 rounded-xl border border-gray-100 flex items-center gap-2 overflow-hidden">
                                      <a href={photo} target="_blank" rel="noopener noreferrer" className="text-[9px] font-mono text-blue-500 truncate hover:underline flex-1 text-center">
                                        Lien Photo {idx + 1}
                                      </a>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 rounded-lg hover:bg-white"
                                        onClick={() => {
                                          navigator.clipboard.writeText(photo);
                                          toast.success("URL copiée !");
                                        }}
                                      >
                                        <Share2 className="w-3 h-3 text-gray-400" />
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </CardContent>
                </Card>
              )}
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="text-center py-24 bg-gray-50/50 rounded-[3rem] border-2 border-dashed border-gray-100">
            <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-gray-200/50">
              <FileText className="w-10 h-10 text-gray-200" />
            </div>
            <p className="text-sm font-black text-muted-foreground uppercase tracking-widest">Aucun rapport correspondant à votre recherche.</p>
          </div>
        )}
      </div>
    </div>
  );
}
