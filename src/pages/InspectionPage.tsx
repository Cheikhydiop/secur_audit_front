import { useState, useMemo, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { useDebounce } from "@/hooks/use-debounce";
import { siteService, SiteQuickSearch } from "@/services/SiteService";
import { inspectionService } from "@/services/InspectionService";
import { questionService, Rubrique as DBRubrique } from "@/services/QuestionService";
import { photoService } from "@/services/PhotoService";
import { CameraCapture } from "@/components/CameraCapture";
import { getCurrentPosition } from "@/utils/geolocation";
import {
  FileText,
  Shield,
  Flame,
  Video,
  DoorOpen,
  Building2,
  UserCheck,
  AlertTriangle,
  Camera,
  Paperclip,
  ChevronRight,
  ChevronLeft,
  Check,
  Save,
  AlertCircle,
  Clock,
  User,
  Info,
  ClipboardCheck,
  ListChecks,
  Calendar,
  MapPin,
  Activity,
  Plus,
  Zap,
  Lock,
  Phone,
  Users,
  RotateCcw,
  RefreshCw,
  ArrowLeft,
  LayoutDashboard,
  BookOpen,
  CheckSquare,
  FileImage,
  History,
  Send,
  Download,
  CheckCircle2,
  Mail,
} from "lucide-react";
import { PdfInspectionGenerator } from "@/pdf-generators/PdfInspectionGenerator";
import { InspectionReportData } from "@/pdf-generators/PdfTypes";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { ORIGINES_ACTION, AVANCEMENT_ACTION, STATUT_ACTION } from "@/constants/actionPlan";
import { useAuth } from "@/contexts/AuthContext";
import planningService from "@/services/PlanningService";
import { OfflineQueueService } from "@/services/OfflineQueueService";
import { useOnlineStatus } from "@/hooks/use-online-status";


type Criticality = "Critique" | "Majeur" | "Mineur";

interface Question {
  text: string;
  criticality: Criticality;
  helper?: string;
}

// SITES est maintenant récupéré dynamiquement depuis le backend


type Status = "conforme" | "non-conforme" | "na" | null;

interface Answer {
  status: Status;
  observation: string;
  recommendation: string;
  assignee: string;
  dueDate: string;
  origine: string;
  avancement: string;
  statut_suivi: string;
  photos: string[];
  showActionPlan?: boolean;
  porteurEmail: string;
}

const RUBRIQUE_ICONS: Record<string, any> = {
  "documents": FileText,
  "consignes": Shield,
  "incendie": Flame,
  "video": Video,
  "acces": DoorOpen,
  "poste": Building2,
  "agent": UserCheck,
  "infra": AlertTriangle,
  "physique": Shield,
  "default": FileText
};

export default function InspectionPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
  const [gpsStatus, setGpsStatus] = useState<'checking' | 'granted' | 'denied' | 'prompt'>('checking');
  const [dbRubriques, setDbRubriques] = useState<any[]>([]);
  const [dbQuestionsData, setDbQuestionsData] = useState<Record<string, any[]>>({});
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(true);
  const [currentRubriqueIdx, setCurrentRubriqueIdx] = useLocalStorage("inspection_current_rubrique", 0);
  const [openSiteSelect, setOpenSiteSelect] = useState(false);

  // Planning selection state
  const [selectedMissionId, setSelectedMissionId] = useLocalStorage("inspection_selected_mission_id", "");
  const [availableMissions, setAvailableMissions] = useState<any[]>([]);
  const [isLoadingMissions, setIsLoadingMissions] = useState(false);
  const [openMissionSelect, setOpenMissionSelect] = useState(false);
  const [openPlanningSelect, setOpenPlanningSelect] = useState(false);
  const [pendingMissions, setPendingMissions] = useState<any[]>([]);
  const [isLoadingPending, setIsLoadingPending] = useState(false);

  const [answers, setAnswers] = useLocalStorage<Record<string, Answer>>("inspection_answers", {});
  const [siteName, setSiteName] = useLocalStorage("inspection_site_name", "");
  const [siteId, setSiteId] = useLocalStorage("inspection_site_id", "");
  const [searchQuery, setSearchQuery] = useState("");
  const [fetchedSites, setFetchedSites] = useState<SiteQuickSearch[]>([]);
  const [isLoadingSites, setIsLoadingSites] = useState(false);
  const debouncedSearchQuery = useDebounce(searchQuery, 400);

  const [siteType, setSiteType] = useLocalStorage("inspection_site_type", "");
  const [siteZone, setSiteZone] = useLocalStorage("inspection_site_zone", "");
  const [sessionUUID, setSessionUUID] = useLocalStorage("inspection_session_uuid", "");
  const [nbrBatiments, setNbrBatiments] = useLocalStorage("inspection_nbr_batiments", "");
  const [nbrAcces, setNbrAcces] = useLocalStorage("inspection_nbr_acces", "");
  const [societeGardiennage, setSocieteGardiennage] = useLocalStorage("inspection_societe_gardiennage", "");
  const [nbrAgentsJN, setNbrAgentsJN] = useLocalStorage("inspection_nbr_agents_jn", "");
  const [numerosFlotte, setNumerosFlotte] = useLocalStorage("inspection_numeros_flotte", "");
  const [chefPosteEquipe, setChefPosteEquipe] = useLocalStorage("inspection_chef_poste_equipe", "");
  const [author, setAuthor] = useLocalStorage("inspection_author", "NDEYE NDIAYE)");
  const [conclusions, setConclusions] = useLocalStorage<string[]>("inspection_conclusions", ["", "", "", "", "", ""]);
  const [showSummary, setShowSummary] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isOnline = useOnlineStatus();
  const [searchParams] = useSearchParams();

  // Success state after submission
  const [submittedData, setSubmittedData] = useState<{ id: string; score: number; siteName: string } | null>(null);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);


  // 🚀 PRÉ-REMPLISSAGE DEPUIS LE PLANNING
  useEffect(() => {
    const pSiteId = searchParams.get("siteId");
    const pSiteName = searchParams.get("siteName");
    const pInspecteur = searchParams.get("inspecteur");
    const pDate = searchParams.get("date");
    const pMissionId = searchParams.get("missionId");

    if (pSiteId) setSiteId(pSiteId);
    if (pSiteName) setSiteName(pSiteName);
    if (pInspecteur) setAuthor(pInspecteur);
    if (pMissionId && !sessionUUID) {
      setSessionUUID(`insp-plan-${pMissionId}`);
    }
  }, [searchParams]);

  // 🚀 VÉRIFICATION GPS AU CHARGEMENT
  // Cette étape est CRITIQUE pour garantir l'intégrité de l'audit.
  // On ne laisse pas l'utilisateur accéder au site sans avoir verrouillé une position GPS.
  useEffect(() => {
    const checkGps = async () => {
      if (!navigator.geolocation) {
        setGpsStatus('denied'); // Cas rare : navigateur très ancien
        return;
      }

      // Tentative de récupération GPS "silencieuse" (si permission déjà mémorisée)
      const res = await getCurrentPosition();
      if (res.success) {
        setGpsStatus('granted'); // Débloque l'affichage du questionnaire
      } else if (res.error?.includes('refusée')) {
        setGpsStatus('denied'); // L'utilisateur a explicitement bloqué le GPS précédemment
      } else {
        setGpsStatus('prompt'); // C'est une nouvelle session, on va demander la permission au clic
      }
    };
    checkGps();
  }, []);

  // Déclenchement manuel de la demande de permission via le bouton du "Lock Screen"
  const handleRequestGps = async () => {
    toast.info("Demande d'accès au GPS...");
    const res = await getCurrentPosition();
    if (res.success) {
      setGpsStatus('granted'); // Débloque l'accès
      toast.success("GPS Autorisé");
    } else {
      setGpsStatus('denied'); // L'utilisateur a refusé le prompt
      toast.error("Veuillez autoriser le GPS dans les réglages de votre navigateur.");
    }
  };

  // 🚀 CHARGEMENT DYNAMIQUE DU QUESTIONNAIRE
  useEffect(() => {
    const fetchQuestionnaire = async () => {
      setIsLoadingQuestions(true);
      try {
        const res = await questionService.getRubriques();
        if (res.data) {
          const formattedRubriques = res.data.map((r: any) => ({
            id: r.id || r.nom.toLowerCase().replace(/\s+/g, '-'),
            label: r.nom,
            icon: RUBRIQUE_ICONS[r.nom.toLowerCase()] || RUBRIQUE_ICONS.default,
            color: "text-sonatel-orange"
          }));

          const formattedQuestions: Record<string, any[]> = {};
          res.data.forEach((r: any) => {
            const rid = r.id || r.nom.toLowerCase().replace(/\s+/g, '-');
            formattedQuestions[rid] = r.questions.map((q: any) => ({
              id: q.id,
              text: q.texte,
              criticality: q.ponderation >= 4 ? "Critique" : q.ponderation >= 2 ? "Majeur" : "Mineur",
              helper: q.helper
            }));
          });

          setDbRubriques(formattedRubriques);
          setDbQuestionsData(formattedQuestions);
        }
      } catch (error) {
        console.error("Erreur chargement questionnaire dynamique:", error);
        toast.error("Impossible de charger le questionnaire à jour. Utilisation de la version locale.");
      } finally {
        setIsLoadingQuestions(false);
      }
    };
    fetchQuestionnaire();
  }, []);

  // Données dynamiques exclusivement
  const activeRubriques = dbRubriques;
  const activeQuestionsData = dbQuestionsData;

  // 🚀 PRÉ-REMPLISSAGE AUTOMATIQUE (MISSION DU JOUR)
  useEffect(() => {
    const fetchMissionsToday = async () => {
      // Ne pré-remplir que si aucun site n'est sélectionné et pas de missionId dans l'URL
      if (!siteId && !searchParams.get("missionId") && user && user.role === 'INSPECTEUR') {
        try {
          const missions = await planningService.getPlanningGlobal();
          const todayStr = new Date().toISOString().split('T')[0];
          // Trouver une mission pour cet inspecteur aujourd'hui
          const myMissionsToday = missions.filter(m =>
            m.inspecteurId === user.id &&
            m.dateDeb.startsWith(todayStr) &&
            (m.statut === 'A_FAIRE' || m.statut === 'EN_COURS')
          );

          if (myMissionsToday.length > 0) {
            const mission = myMissionsToday[0];
            handleSiteSelect({
              id: mission.siteId!,
              nom: mission.site?.nom!,
              code: mission.site?.code!,
              type: mission.type || "Technique",
              zone: mission.site?.zone || "Dakar",
              localisation: "" // Non disponible dans l'objet mission partiel
            });
            setAuthor(user.name);
            toast.success(`Planning détecté: ${mission.site?.nom} (Aujourd'hui)`, {
              description: "Le formulaire a été pré-rempli automatiquement."
            });
          }
        } catch (e) {
          console.error("Erreur détection planning auto:", e);
        }
      }
    };
    fetchMissionsToday();
  }, [user]);

  // Synchronisation des sites pour le mode offline
  useEffect(() => {
    siteService.syncLocalSites();
  }, []);

  // Fetch sites based on search
  useEffect(() => {
    const fetchSites = async () => {
      // On peut charger quelques sites au début ou attendre la saisie
      if (debouncedSearchQuery.length < 2 && !siteName) {
        if (debouncedSearchQuery === "") setFetchedSites([]);
        return;
      }

      setIsLoadingSites(true);
      try {
        const response = await siteService.quickSearch(debouncedSearchQuery || siteName);
        if (!response.error && response.data) {
          setFetchedSites(response.data);
        }
      } catch (error) {
        console.error("Erreur lors de la récupération des sites:", error);
      } finally {
        setIsLoadingSites(false);
      }
    };

    fetchSites();
  }, [debouncedSearchQuery]);

  // Fetch available missions when site is selected
  useEffect(() => {
    const fetchMissions = async () => {
      if (!siteId) {
        setAvailableMissions([]);
        return;
      }

      setIsLoadingMissions(true);
      try {
        const missions = await planningService.getMissionsBySite(siteId);
        setAvailableMissions(missions);
      } catch (error) {
        console.error("Erreur chargement missions:", error);
        setAvailableMissions([]);
      } finally {
        setIsLoadingMissions(false);
      }
    };

    fetchMissions();
  }, [siteId]);

  // Centralized site selection
  const handleSiteSelect = async (site: SiteQuickSearch) => {
    console.log("🎯 Site choisi:", site.nom, site.type, site.zone);

    // Show message and get GPS position (non-blocking)
    toast.info("Récupération de la position...");
    const geoResult = await getCurrentPosition();

    // Store GPS data in localStorage for later use when submitting
    if (geoResult.success && geoResult.position) {
      localStorage.setItem('inspection_start_lat', geoResult.position.latitude.toString());
      localStorage.setItem('inspection_start_lng', geoResult.position.longitude.toString());
      localStorage.setItem('inspection_start_date', new Date().toISOString());
      toast.success("Position enregistrée");
    } else {
      // Clear any previous GPS data
      localStorage.removeItem('inspection_start_lat');
      localStorage.removeItem('inspection_start_lng');
      localStorage.removeItem('inspection_start_date');
      toast.info("Position non disponible - l'inspection peut continuer");
    }

    setSiteName(site.nom);
    setSiteId(site.id);
    setSiteType(site.type || "");
    setSiteZone(site.zone || "");
    // Générer un UUID de session pour les photos de cette inspection
    if (!sessionUUID) setSessionUUID(`insp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
    setOpenSiteSelect(false);
  };

  // Handle mission/planning selection
  const handleMissionSelect = async (mission: any) => {
    console.log("🎯 Planning sélectionné:", mission);

    // Store mission ID for later use
    setSelectedMissionId(mission.id);

    // Store the planned date
    localStorage.setItem('inspection_planned_date', mission.dateDeb);

    setOpenMissionSelect(false);

    // Start the inspection via the planning service
    // Capture GPS position before starting
    const geoResult = await getCurrentPosition();
    const gpsData: any = {};
    if (geoResult.success && geoResult.position) {
      gpsData.latitudeStart = geoResult.position.latitude;
      gpsData.longitudeStart = geoResult.position.longitude;
      gpsData.dateStart = new Date().toISOString();
      // Store in localStorage for the inspection create later
      localStorage.setItem('inspection_start_lat', geoResult.position.latitude.toString());
      localStorage.setItem('inspection_start_lng', geoResult.position.longitude.toString());
      localStorage.setItem('inspection_start_date', gpsData.dateStart);
    }

    try {
      toast.info("Démarrage de l'inspection...");
      await planningService.startInspection(mission.id, gpsData);
      toast.success("Inspection démarrée avec succès!");
    } catch (error) {
      console.error("Erreur démarrage inspection:", error);
      toast.error("Erreur lors du démarrage de l'inspection");
    }
  };

  // Handle planning selection from the main dropdown
  const handlePlanningSelect = async (mission: any) => {
    console.log("🎯 Planning sélectionné (main):", mission);

    // Vérifier si l'utilisateur peut modifier cette mission
    if (!mission.isEditable) {
      toast.error("Vous n'avez pas accès à ce planning. Il appartient à une autre entité.");
      return;
    }

    // Store mission ID
    setSelectedMissionId(mission.id);

    // Auto-fill site information from the planning
    if (mission.site) {
      setSiteId(mission.site.id);
      setSiteName(mission.site.nom);
      setSiteZone(mission.site.zone || '');
      setSiteType(mission.site.type || '');
    }

    // Store the planned date
    localStorage.setItem('inspection_planned_date', mission.dateDeb);

    setOpenPlanningSelect(false);

    // Start the inspection via the planning service
    // Capture GPS position before starting
    const geoResult = await getCurrentPosition();
    const gpsData: any = {};
    if (geoResult.success && geoResult.position) {
      gpsData.latitudeStart = geoResult.position.latitude;
      gpsData.longitudeStart = geoResult.position.longitude;
      gpsData.dateStart = new Date().toISOString();
      // Store in localStorage for the inspection create later
      localStorage.setItem('inspection_start_lat', geoResult.position.latitude.toString());
      localStorage.setItem('inspection_start_lng', geoResult.position.longitude.toString());
      localStorage.setItem('inspection_start_date', gpsData.dateStart);
    }

    try {
      toast.info("Démarrage de l'inspection...");
      await planningService.startInspection(mission.id, gpsData);
      toast.success("Inspection démarrée avec succès!");
    } catch (error) {
      console.error("Erreur démarrage inspection:", error);
      toast.error("Erreur lors du démarrage de l'inspection");
    }
  };

  const currentRubrique = activeRubriques[currentRubriqueIdx] || activeRubriques[0] || { id: 'loading', label: 'Chargement...', icon: RefreshCw, color: 'text-gray-300' };
  const questions = activeQuestionsData[currentRubrique?.id] || [];

  const weightMap: Record<Criticality, number> = {
    Critique: 4,
    Majeur: 2,
    Mineur: 1,
  };

  // Stats calculation
  const stats = useMemo(() => {
    let totalScore = 0;
    let maxPossibleScore = 0;
    let answered = 0;
    let totalQuestionsCount = 0;

    Object.entries(activeQuestionsData).forEach(([rid, questions]) => {
      questions.forEach((q, i) => {
        totalQuestionsCount++;
        const ans = answers[`${rid}-${i}`];
        if (ans && ans.status) {
          answered++;
          if (ans.status !== "na") {
            const weight = weightMap[q.criticality];
            maxPossibleScore += weight;
            if (ans.status === "conforme") {
              totalScore += weight;
            }
          }
        }
      });
    });

    const percent = maxPossibleScore > 0 ? Math.round((totalScore / maxPossibleScore) * 100) : 0;
    const completion = totalQuestionsCount > 0 ? Math.round((answered / totalQuestionsCount) * 100) : 0;
    return { percent, completion, answered, total: totalQuestionsCount };
  }, [answers]);

  // Utilitaire pour convertir Base64 de la caméra en Blob pour upload
  const dataURLtoBlob = (dataurl: string) => {
    const arr = dataurl.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) u8arr[n] = bstr.charCodeAt(n);
    return new Blob([u8arr], { type: mime });
  };

  const handlePhotoUpload = async (questionKey: string, currentPhotos: string[]) => {
    // On cherche les nouvelles photos (Base64) qui ne sont pas des URLs Cloudinary
    const newPhotos = [...currentPhotos];
    let hasChanged = false;

    for (let i = 0; i < newPhotos.length; i++) {
      if (newPhotos[i].startsWith('data:image')) {
        // C'est une capture locale, on tente l'upload si on est online
        if (navigator.onLine) {
          const toastId = toast.loading("Upload photo vers Cloudinary...");
          try {
            const blob = dataURLtoBlob(newPhotos[i]);
            // On utilise sessionUUID (local) ou siteId comme dossier
            const folderId = sessionUUID || siteId || "temp-inspection";
            const res = await photoService.upload(blob, folderId, questionKey);

            if (res.data?.url) {
              newPhotos[i] = res.data.url;
              hasChanged = true;
              toast.success("Photo sauvegardée", { id: toastId });
            } else {
              toast.error("Échec upload: " + res.error, { id: toastId });
            }
          } catch (e) {
            console.error("Upload error:", e);
            toast.error("Erreur durant l'upload", { id: toastId });
          }
        }
      }
    }

    if (hasChanged) {
      updateAnswer(questionKey, { photos: newPhotos });
    }
  };

  const updateAnswer = (questionKey: string, updates: Partial<Answer>) => {
    setAnswers((prev) => ({
      ...prev,
      [questionKey]: {
        ...((prev[questionKey] || {
          status: null,
          observation: "",
          recommendation: "",
          assignee: "",
          dueDate: "",
          origine: ORIGINES_ACTION[8],
          avancement: AVANCEMENT_ACTION[3],
          statut_suivi: STATUT_ACTION[3],
          photos: [],
          showActionPlan: false,
          porteurEmail: "",
        }) as Answer),
        ...updates,
      } as Answer,
    }));
  };

  const nonConformites = useMemo(() => {
    return Object.entries(answers)
      .filter(([_, ans]) => (ans as Answer).status === "non-conforme")
      .map(([key, ans]) => {
        const parts = key.split("-");
        const idxStr = parts.pop() || "0";
        const rid = parts.join("-");
        const idx = parseInt(idxStr);
        const question = activeQuestionsData[rid]?.[idx];
        return {
          ...(ans as Answer),
          questionText: question?.text || "Question inconnue",
          rubrique: rid,
          criticality: question?.criticality || "Mineur",
          statut: (ans as Answer).statut_suivi
        };
      });
  }, [answers, activeQuestionsData]);

  const handleFinalize = () => {
    if (!siteName) {
      toast.error("Veuillez saisir le nom du site");
      return;
    }
    setShowSummary(true);
  };

  const resetInspection = () => {
    if (confirm("Voulez-vous vraiment réinitialiser tout le questionnaire ? Cette action est irréversible.")) {
      setAnswers({});
      setSiteName("");
      setSiteId("");
      setSiteType("");
      setSiteZone("");
      setSessionUUID("");
      setNbrBatiments("");
      setNbrAcces("");
      setSocieteGardiennage("");
      setNbrAgentsJN("");
      setNumerosFlotte("");
      setChefPosteEquipe("");
      setConclusions(["", "", "", "", "", ""]);
      setCurrentRubriqueIdx(0);
      toast.success("Questionnaire réinitialisé");
    }
  };

  const submitInspection = async () => {
    if (isSubmitting) return; // Sécurité anti-doublon (si le clic est déjà en cours)

    if (!siteId) {
      toast.error("Veuillez sélectionner un site valide.");
      return;
    }

    setIsSubmitting(true);
    // Récupérer les données GPS de début d'inspection
    const startLat = localStorage.getItem('inspection_start_lat');
    const startLng = localStorage.getItem('inspection_start_lng');
    const startDate = localStorage.getItem('inspection_start_date');

    try {
      // 1. Formater les réponses pour le backend
      const formattedReponses = Object.entries(answers).map(([key, ans]) => {
        const parts = key.split("-");
        const idxStr = parts.pop() || "0";
        const rid = parts.join("-");
        const idx = parseInt(idxStr);

        const rubriqueLabel = activeRubriques.find(r => r.id === rid)?.label || rid;
        const qData = activeQuestionsData[rid]?.[idx];

        return {
          questionId: qData?.id || key,
          rubrique: rubriqueLabel,
          texte: qData?.text || "Inconnu",
          valeur: ans.status === "conforme" ? "CONFORME" : ans.status === "non-conforme" ? "NON_CONFORME" : "NON_APPLICABLE",
          observation: ans.observation,
          recommandation: ans.recommendation,
          porteurEmail: ans.porteurEmail,
          ponderation: qData ? weightMap[qData.criticality] : 1,
          photos: ans.photos || []
        };
      });

      // 2. Créer l'inspection sur le backend
      const inspectionData: any = { siteId };

      // Ajouter les données GPS si disponibles
      if (startLat && startLng) {
        const lat = parseFloat(startLat);
        const lng = parseFloat(startLng);
        inspectionData.latitude = lat;
        inspectionData.longitude = lng;
        inspectionData.latitudeStart = lat;
        inspectionData.longitudeStart = lng;
        if (startDate) {
          inspectionData.dateStart = startDate;
        }
      }

      const createRes = await inspectionService.create(inspectionData);
      if (createRes.error || !createRes.data) {
        throw new Error(createRes.error || "Erreur lors de la création de l'inspection");
      }

      const activeInspectionId = createRes.data.id;

      // 3. Mettre à jour avec les réponses
      const updateRes = await inspectionService.update(activeInspectionId, {
        reponses: formattedReponses
      });

      if (updateRes.error) {
        throw new Error(updateRes.error || "Erreur lors de la sauvegarde des réponses");
      }

      // 4. Capturer GPS position de fin avant soumission finale
      const endGeoResult = await getCurrentPosition();
      const endGpsData: any = {};
      if (endGeoResult.success && endGeoResult.position) {
        endGpsData.latitudeEnd = endGeoResult.position.latitude;
        endGpsData.longitudeEnd = endGeoResult.position.longitude;
        endGpsData.dateEnd = new Date().toISOString();
      }

      // 5. Soumettre définitivement (calcule le score et génère les actions)
      const submitRes = await inspectionService.soumettre(activeInspectionId, endGpsData);

      if (submitRes.error) {
        throw new Error(submitRes.error || "Erreur lors de la soumission finale");
      }

      // 6. Si une mission était sélectionnée, la marquer comme terminée
      if (selectedMissionId) {
        try {
          await planningService.finishInspection(selectedMissionId, undefined, endGpsData);
        } catch (error) {
          console.error("Erreur clôture mission:", error);
          // On continue car l'inspection est déjà soumise avec succès
        }
      }

      toast.success(`Inspection soumise avec succès ! Score: ${submitRes.data?.score}%`);

      // Store success data before clearing
      setSubmittedData({
        id: activeInspectionId,
        score: submitRes.data?.score || 0,
        siteName: siteName
      });
      setShowSuccessDialog(true);

      setShowSummary(false);

      // 5. Nettoyer le cache local
      setAnswers({});
      setSiteName("");
      setSiteId("");
      setSiteType("");
      setSiteZone("");
      setSessionUUID("");
      setNbrBatiments("");
      setNbrAcces("");
      setSocieteGardiennage("");
      setNbrAgentsJN("");
      setNumerosFlotte("");
      setChefPosteEquipe("");
      setConclusions(["", "", "", "", "", ""]);
      setCurrentRubriqueIdx(0);

    } catch (error: any) {
      console.error("Erreur lors de la soumission:", error);

      // 🚀 ROBUSTESSE : Si erreur réseau ou offline, proposer sauvegarde locale
      const errorMessage = error.message || "";
      const isNetworkError = !navigator.onLine || errorMessage.includes("fetch") || errorMessage.includes("Network");

      if (isNetworkError) {
        const queueId = await OfflineQueueService.enqueueInspection(siteId, siteName, {
          answers,
          siteType,
          siteZone,
          nbrBatiments,
          nbrAcces,
          societeGardiennage,
          nbrAgentsJN,
          numerosFlotte,
          chefPosteEquipe,
          conclusions,
          author,
          latitudeStart: startLat ? parseFloat(startLat) : null,
          longitudeStart: startLng ? parseFloat(startLng) : null,
          dateStart: startDate || null,
          missionId: selectedMissionId || null
        });

        toast.warning("Mode Hors-ligne activé", {
          description: "Impossible de joindre le serveur. L'inspection a été sauvegardée localement et sera synchronisée dès le retour de la connexion.",
          duration: 8000,
        });

        setShowSummary(false);
        // Nettoyer pour la prochaine inspection
        clearLocalForm();
        navigate('/dashboard');
      } else {
        toast.error(error.message || "Une erreur est survenue lors de la communication avec le serveur.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const clearLocalForm = () => {
    setAnswers({});
    setSiteName("");
    setSiteId("");
    setSiteType("");
    setSiteZone("");
    setSessionUUID("");
    setNbrBatiments("");
    setNbrAcces("");
    setSocieteGardiennage("");
    setNbrAgentsJN("");
    setNumerosFlotte("");
    setChefPosteEquipe("");
    setConclusions(["", "", "", "", "", ""]);
    setCurrentRubriqueIdx(0);
  };

  const handleDownloadPdf = () => {
    if (!submittedData) return;

    const toastId = toast.loading("Génération du rapport PDF...");

    try {
      const generator = new PdfInspectionGenerator();

      // Get all non-conformities from the current (but already submitted) state
      // This works because we haven't called clearLocalForm yet or we use the local state before it's cleared
      const ncData = Object.entries(answers)
        .filter(([_, ans]) => (ans as Answer).status === "non-conforme")
        .map(([key, ans]) => {
          const parts = key.split("-");
          const idxStr = parts.pop() || "0";
          const rid = parts.join("-");
          const idx = parseInt(idxStr);
          const question = activeQuestionsData[rid]?.[idx];
          return {
            rubrique: rid,
            question: question?.text || "Inconnu",
            criticite: question?.criticality || "Mineur",
            observation: (ans as Answer).observation,
            recommendation: (ans as Answer).recommendation,
            photoUrl: (ans as Answer).photos && (ans as Answer).photos.length > 0 ? (ans as Answer).photos[0] : undefined
          };
        });

      // Prepare scores per rubrique
      const scoresRubriques = activeRubriques.map(r => {
        const qList = activeQuestionsData[r.id] || [];
        const ansList = qList.map((_, idx) => answers[`${r.id}-${idx}`]);
        const conformes = ansList.filter(a => a?.status === 'conforme').length;
        const total = qList.length;
        return {
          nom: r.label,
          score: total > 0 ? Math.round((conformes / total) * 100) : 0,
          totalQuestions: total,
          questionsConformes: conformes
        };
      });

      const pdfData: InspectionReportData = {
        id: submittedData.id,
        site: {
          nom: siteName,
          code: searchParams.get("siteCode") || "N/A",
          zone: siteZone,
          type: siteType,
        },
        inspecteur: {
          name: author,
          email: user?.email || "",
          entite: "DG/SECU"
        },
        metadata: {
          date: new Date().toLocaleDateString('fr-FR'),
          score: submittedData.score,
          statut: "SOUMIS",
        },
        scoresParRubrique: scoresRubriques,
        nonConformites: ncData
      };

      const doc = generator.generateInspectionPDF(pdfData);
      doc.save(`Rapport_Audit_${siteName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);

      toast.success("Rapport téléchargé !", { id: toastId });
    } catch (error) {
      console.error("PDF Error:", error);
      toast.error("Erreur lors de la génération du PDF", { id: toastId });
    }
  };


  const getCriticalityBadge = (level: Criticality) => {
    switch (level) {
      case "Critique":
        return <Badge variant="destructive" className="animate-pulse">Critique</Badge>;
      case "Majeur":
        return <Badge className="bg-orange-500 hover:bg-orange-600">Majeur</Badge>;
      case "Mineur":
        return <Badge className="bg-gray-400 hover:bg-gray-500 uppercase font-black text-[9px] tracking-widest px-3 py-1">Mineur</Badge>;
    }
  };

  // ====================================================================
  // RENDER: GPS CHECK OVERLAY (BLOCAGE AVANT INSPECTION)
  // Tant que le GPS n'est pas autorisé, l'inspecteur ne peut pas voir 
  // le questionnaire ni même choisir un site. Cela évite les fraudes.
  // ====================================================================
  if (gpsStatus === 'checking') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] bg-white rounded-[2rem] border-2 border-dashed border-gray-100 p-12 text-center m-8 shadow-sm">
        <RefreshCw className="w-16 h-16 text-sonatel-orange animate-spin mb-6" />
        <h2 className="text-2xl font-black text-gray-900">Vérification du GPS...</h2>
        <p className="text-sm text-gray-500 font-bold mt-2 uppercase tracking-widest opacity-70">Sécurisation de la session en cours</p>
      </div>
    );
  }

  if (gpsStatus !== 'granted') {
    return (
      <div className="p-4 md:p-12 min-h-[80vh] flex items-center justify-center bg-gray-50/30">
        <div className="flex flex-col items-center justify-center w-full max-w-2xl bg-white rounded-[2.5rem] border border-gray-100 p-12 text-center shadow-2xl relative overflow-hidden group">
          {/* Decorative Circles */}
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-sonatel-orange/5 rounded-full blur-3xl" />
          <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-sonatel-orange/5 rounded-full blur-3xl" />

          <div className="w-24 h-24 bg-gradient-to-br from-sonatel-orange to-orange-400 rounded-[2rem] flex items-center justify-center mb-8 shadow-xl shadow-orange-500/20 rotate-3 group-hover:rotate-0 transition-transform duration-500">
            <MapPin className="w-12 h-12 text-white animate-bounce" />
          </div>

          <h2 className="text-3xl font-black text-gray-900 tracking-tight leading-none mb-4">
            Géolocalisation <span className="text-sonatel-orange">Requise</span>
          </h2>

          <p className="text-gray-500 font-bold mt-2 max-w-sm mx-auto leading-relaxed text-sm uppercase tracking-tighter">
            PROJET DIGITALISATION - CONTRÔLE DES SITES
          </p>

          <div className="my-8 p-6 bg-gray-50 rounded-3xl border border-gray-100 text-left relative z-10">
            <p className="text-gray-700 font-medium text-sm leading-relaxed">
              Pour des raisons de <span className="font-black text-gray-900">sécurité</span> et de <span className="font-black text-gray-900">traçabilité</span>, chaque audit doit être géo-référencé au moment du démarrage.
            </p>
          </div>

          {gpsStatus === 'denied' && (
            <div className="bg-red-50 border border-red-100 p-5 rounded-2xl mb-8 flex items-start gap-4 text-left animate-in shake duration-500">
              <AlertCircle className="w-6 h-6 text-red-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-black text-red-800 uppercase tracking-widest mb-1">Accès Bloqué</p>
                <p className="text-xs text-red-600 font-bold leading-normal">
                  La permission a été refusée. Veuillez activer la localisation dans les paramètres de votre navigateur pour continuer l'inspection.
                </p>
              </div>
            </div>
          )}

          <Button
            onClick={handleRequestGps}
            className="w-full sm:w-auto min-w-[280px] bg-sonatel-orange hover:bg-orange-600 text-white font-black px-10 py-7 rounded-2xl shadow-xl shadow-orange-500/30 transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-3 text-sm uppercase tracking-widest"
          >
            <Zap className="h-5 w-5 fill-current" />
            AUTORISER ET COMMENCER
          </Button>

          <p className="mt-8 text-[10px] font-black text-gray-300 uppercase tracking-widest">
            © SONATEL - DIRECTION DU PATRIMOINE ET DE LA SÉCURITÉ
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFDFD] pb-32 relative font-sans">
      {/* Refined Executive Background */}
      <div className="fixed top-0 left-0 w-full h-[800px] bg-[radial-gradient(circle_at_top_right,rgba(255,102,0,0.02),transparent_70%)] -z-10 pointer-events-none" />
      <div className="fixed top-0 left-0 w-full h-full bg-[linear-gradient(to_bottom,rgba(255,255,255,0)_0%,#FDFDFD_100%)] -z-10 pointer-events-none" />

      {/* Header inspired by SmartOp 360 */}
      <div className="bg-white border-b border-gray-200 px-8 py-8 space-y-8 animate-in fade-in duration-700">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              className="h-10 rounded-xl border-gray-200 hover:bg-gray-50 flex items-center gap-2 font-bold px-4"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="w-4 h-4" /> Retour
            </Button>
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink onClick={() => navigate('/dashboard')} className="cursor-pointer">Tableau de bord</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbLink onClick={() => navigate('/inspection')} className="cursor-pointer capitalize">Inspection</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage className="font-bold text-gray-900">{siteName || "Nouvelle inspection"}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={resetInspection}
              className="h-11 rounded-2xl border-gray-200 text-xs font-black uppercase tracking-wider gap-2 px-6 hover:bg-red-50 hover:text-red-600 hover:border-red-100 transition-all"
            >
              <RotateCcw className="w-4 h-4" /> Réinitialiser
            </Button>
            <Button className="h-11 bg-sonatel-orange hover:bg-orange-600 text-white rounded-2xl font-black uppercase tracking-wider text-xs gap-3 px-8 shadow-lg shadow-orange-500/20">
              <Save className="w-4 h-4" /> Enregistrer brouillon
            </Button>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
          <div className="space-y-3">
            <div className="flex items-center gap-4 flex-wrap">
              <h1 className="text-4xl font-black text-gray-900 tracking-tight leading-none">
                {siteName || "Inspection de site"}
              </h1>
              <Badge className="bg-orange-100 text-orange-600 border-none font-black text-[10px] uppercase tracking-widest px-4 py-1.5 rounded-full">
                En cours
              </Badge>
            </div>
            <p className="text-gray-500 font-medium text-lg max-w-2xl">
              Audit de contrôle des infrastructures critiques et conformité des dispositifs de sécurité.
            </p>
          </div>
          <div className="flex items-end gap-6 bg-gray-50/50 p-6 rounded-[2.5rem] border border-gray-100">
            <div className="text-right space-y-1">
              <div className="text-3xl font-black text-gray-900 tabular-nums leading-none">{stats.percent}%</div>
              <div className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Conformité Globale</div>
            </div>
            <div className="w-14 h-14 relative">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="28" cy="28" r="24" stroke="currentColor" strokeWidth="5" fill="transparent" className="text-gray-200" />
                <circle cx="28" cy="28" r="24" stroke="currentColor" strokeWidth="5" fill="transparent" strokeDasharray={2 * Math.PI * 24} strokeDashoffset={2 * Math.PI * 24 * (1 - stats.percent / 100)} strokeLinecap="round" className="text-sonatel-orange transition-all duration-1000" />
              </svg>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 pt-4 border-t border-gray-100/50">
          {[
            {
              icon: Calendar,
              label: "Date d'audit",
              value: searchParams.get("date")
                ? new Date(searchParams.get("date")!).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
                : new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
            },
            { icon: MapPin, label: "Zone / Localisation", value: siteZone || "Non définie" },
            { icon: Shield, label: "Type d'infrastructure", value: siteType || "A déterminer" },
            { icon: User, label: "Auditeur Responsable", value: author },
          ].map((meta, i) => (
            <div key={i} className="flex items-center gap-4 group">
              <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center group-hover:bg-sonatel-orange/10 group-hover:text-sonatel-orange transition-colors">
                <meta.icon className="w-5 h-5 text-gray-400 group-hover:text-sonatel-orange transition-colors" />
              </div>
              <div className="space-y-1">
                <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{meta.label}</div>
                <div className="text-sm font-bold text-gray-900">{meta.value}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="pt-2 space-y-3">
          <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-gray-400 px-1">
            <span>Progression de l'audit</span>
            <span className="text-sonatel-orange">{stats.completion}%</span>
          </div>
          <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-sonatel-orange to-orange-400 transition-all duration-1000 rounded-full"
              style={{ width: `${stats.completion}%` }}
            />
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-8 mt-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          <TabsList className="bg-white border border-gray-200 p-1 rounded-2xl h-14 flex items-center justify-start gap-2 w-full overflow-x-auto overflow-y-hidden scrollbar-hide">
            <TabsTrigger value="overview" className="rounded-xl px-6 h-11 font-bold flex items-center gap-2 data-[state=active]:bg-sonatel-orange data-[state=active]:text-white transition-all">
              <LayoutDashboard className="w-4 h-4" /> Information générale
            </TabsTrigger>
            <TabsTrigger value="questionnaire" className="rounded-xl px-6 h-11 font-bold flex items-center gap-2 data-[state=active]:bg-sonatel-orange data-[state=active]:text-white transition-all">
              <BookOpen className="w-4 h-4" /> Questionnaire
            </TabsTrigger>
            <TabsTrigger value="actions" className="rounded-xl px-6 h-11 font-bold flex items-center gap-2 data-[state=active]:bg-sonatel-orange data-[state=active]:text-white transition-all text-xs lg:text-sm">
              <CheckSquare className="w-4 h-4" /> Plan d'actions
              {nonConformites.length > 0 && <Badge className="ml-2 bg-red-100 text-red-600 border-none font-black">{nonConformites.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="photos" className="rounded-xl px-6 h-11 font-bold flex items-center gap-2 data-[state=active]:bg-sonatel-orange data-[state=active]:text-white transition-all">
              <FileImage className="w-4 h-4" /> Photos & Preuves
            </TabsTrigger>
            <TabsTrigger value="resumee" className="rounded-xl px-6 h-11 font-bold flex items-center gap-2 data-[state=active]:bg-sonatel-orange data-[state=active]:text-white transition-all">
              <ClipboardCheck className="w-4 h-4" /> Résumé Global
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
            <Card className="relative overflow-hidden bg-white rounded-[3rem] shadow-[0_20px_60px_rgba(0,0,0,0.05)] border-2 border-gray-100">
              <CardContent className="p-10 space-y-12">

                {/* Section: Paramètres du Site */}
                <div className="space-y-6">
                  {/* Bouton principal de sélection de planning */}
                  <div className="flex items-center justify-between bg-gradient-to-r from-sonatel-orange/5 to-sonatel-light-bg rounded-2xl p-4 border-2 border-sonatel-orange/20">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-sonatel-orange flex items-center justify-center">
                        <Calendar className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-gray-900">Sélectionner un Planning</h3>
                        <p className="text-xs text-gray-500">Choisissez une mission planifiée pour votre entité</p>
                      </div>
                    </div>
                    <Button
                      onClick={() => setOpenPlanningSelect(true)}
                      className="bg-sonatel-orange hover:bg-sonatel-orange/90 text-white font-bold px-6 py-3 rounded-xl"
                    >
                      {selectedMissionId ? 'Changer' : 'Sélectionner'}
                      <ChevronRight className="ml-2 w-4 h-4" />
                    </Button>
                  </div>

                  {/* Planning Selection - Utiliser un Popover */}
                  <div className="relative group/field">
                    <label className="block text-xs font-bold text-gray-600 mb-2 flex items-center gap-2 group-focus-within/field:text-sonatel-orange transition-colors">
                      <Calendar className="w-3.5 h-3.5" />
                      Planning sélectionné
                    </label>
                    <div className="relative">
                      <Popover open={openPlanningSelect} onOpenChange={async (open) => {
                        setOpenPlanningSelect(open);
                        if (open && pendingMissions.length === 0) {
                          setIsLoadingPending(true);
                          try {
                            const result = await planningService.getPendingMissions();
                            const missions = 'missions' in result ? result.missions : result;
                            setPendingMissions(missions as any);
                          } catch (error) {
                            console.error("Erreur chargement plannings:", error);
                            toast.error("Erreur lors du chargement des plannings");
                          } finally {
                            setIsLoadingPending(false);
                          }
                        }
                      }}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={openPlanningSelect}
                            className="w-full h-14 bg-gray-50 border-2 border-gray-200 rounded-2xl px-4 text-sm font-bold text-gray-900 justify-between items-center hover:bg-white hover:border-sonatel-orange/50 transition-all duration-200"
                          >
                            {selectedMissionId ? (
                              <span className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-sonatel-orange" />
                                {pendingMissions.find(m => m.id === selectedMissionId)?.site?.nom || 'Site'}
                                <span className="text-xs text-gray-500">
                                  ({pendingMissions.find(m => m.id === selectedMissionId)?.dateDeb})
                                </span>
                              </span>
                            ) : (
                              <span className="text-gray-400">Sélectionner un planning...</span>
                            )}
                            <ChevronRight className="ml-2 h-4 w-4 shrink-0 rotate-90 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 rounded-2xl border-2 border-gray-100 shadow-2xl overflow-hidden mt-2" align="start">
                          <Command className="bg-white" shouldFilter={false}>
                            <CommandInput
                              placeholder="Rechercher un planning..."
                              className="h-12 border-none focus:ring-0 font-bold"
                            />
                            <CommandList>
                              {isLoadingPending && <div className="p-4 text-center text-xs text-gray-400 font-bold">Chargement...</div>}
                              <CommandEmpty>
                                {pendingMissions.length === 0 ?
                                  "Aucun planning disponible pour votre entité." :
                                  "Aucun planning trouvé."}
                              </CommandEmpty>
                              <CommandGroup className="max-h-80 overflow-y-auto p-2">
                                {pendingMissions.map((mission) => (
                                  <CommandItem
                                    key={mission.id}
                                    value={mission.id}
                                    disabled={!mission.isEditable}
                                    onSelect={() => handlePlanningSelect(mission)}
                                    className={`flex items-center gap-3 p-3 rounded-xl transition-colors font-bold text-sm ${mission.isEditable
                                      ? 'cursor-pointer aria-selected:bg-sonatel-light-bg aria-selected:text-sonatel-orange hover:bg-sonatel-light-bg'
                                      : 'cursor-not-allowed opacity-50 bg-gray-50'
                                      }`}
                                  >
                                    <Check
                                      className={`h-4 w-4 ${selectedMissionId === mission.id ? "opacity-100" : "opacity-0"}`}
                                    />
                                    <div className="flex flex-col flex-1">
                                      <span className="font-bold flex items-center gap-2">
                                        {mission.site?.nom || 'Site'}
                                        {!mission.isEditable && <Lock className="w-3 h-3 text-gray-400" />}
                                      </span>
                                      <span className="text-[10px] text-gray-400">
                                        {mission.dateDeb} • {mission.site?.zone || ''} • {mission.site?.code || ''}
                                        {!mission.isEditable && ' • Autre entité'}
                                      </span>
                                    </div>
                                    {mission.statut === 'EN_RETARD' && (
                                      <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full shrink-0">En retard</span>
                                    )}
                                    {mission.statut === 'A_FAIRE' && (
                                      <span className="text-xs bg-green-100 text-green-600 px-2 py-0.5 rounded-full shrink-0">À faire</span>
                                    )}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      <div className="absolute inset-0 rounded-2xl ring-2 ring-sonatel-orange/10 opacity-0 group-focus-within/field:opacity-100 pointer-events-none transition-opacity" />
                    </div>
                  </div>
                </div>

                {/* Section: Paramètres du Site */}
                <div className="space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="w-9 h-9 rounded-xl bg-sonatel-orange/10 flex items-center justify-center shrink-0">
                      <MapPin className="w-5 h-5 text-sonatel-orange" />
                    </div>
                    <span className="text-base font-black text-gray-800 uppercase tracking-wider">Paramètres du Site</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => siteService.syncLocalSites()}
                      className="text-[10px] font-black uppercase text-gray-400 hover:text-sonatel-orange transition-colors"
                    >
                      <RefreshCw className="w-3 h-3 mr-1" /> Re-sync Sites Offline
                    </Button>
                    <div className="h-px flex-1 bg-gray-100" />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                    {[
                      { label: "Identification du Site", value: siteName, setter: setSiteName, icon: MapPin, placeholder: "Ex: Dakar-Plateau", type: "select" },
                      { label: "Typologie Infrastructure", value: siteType, setter: setSiteType, icon: Building2, placeholder: "Auto-rempli", type: "text", readOnly: true },
                      { label: "Zone / Région", value: siteZone, setter: setSiteZone, icon: MapPin, placeholder: "Auto-rempli", type: "text", readOnly: true },
                      { label: "Nombre de Bâtiments", value: nbrBatiments, setter: setNbrBatiments, icon: Building2, placeholder: "0", type: "number" },
                      { label: "Points d'Accès", value: nbrAcces, setter: setNbrAcces, icon: Lock, placeholder: "0", type: "number" },
                    ].map((item) => (
                      <div key={item.label} className="relative group/field">
                        <label className="block text-xs font-bold text-gray-600 mb-2 flex items-center gap-2 group-focus-within/field:text-sonatel-orange transition-colors">
                          <item.icon className="w-3.5 h-3.5" />
                          {item.label}
                        </label>
                        <div className="relative">
                          {item.type === "select" ? (
                            <Popover open={openSiteSelect} onOpenChange={setOpenSiteSelect}>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  role="combobox"
                                  aria-expanded={openSiteSelect}
                                  className="w-full h-14 bg-gray-50 border-2 border-gray-200 rounded-2xl px-4 text-sm font-bold text-gray-900 justify-between items-center hover:bg-white hover:border-sonatel-orange/50 transition-all duration-200"
                                >
                                  {item.value ? item.value : item.placeholder}
                                  <ChevronRight className="ml-2 h-4 w-4 shrink-0 rotate-90 opacity-50" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 rounded-2xl border-2 border-gray-100 shadow-2xl overflow-hidden mt-2" align="start">
                                <Command className="bg-white" shouldFilter={false}>
                                  <CommandInput
                                    placeholder="Rechercher un site..."
                                    className="h-12 border-none focus:ring-0 font-bold"
                                    onValueChange={setSearchQuery}
                                  />
                                  <CommandList>
                                    {isLoadingSites && <div className="p-4 text-center text-xs text-gray-400 font-bold">Chargement...</div>}
                                    <CommandEmpty>Aucun site trouvé.</CommandEmpty>
                                    <CommandGroup className="max-h-60 overflow-y-auto p-2">
                                      {fetchedSites.map((site) => (
                                        <CommandItem
                                          key={site.id}
                                          value={site.id} // Utiliser l'ID unique pour la sélection cmdk
                                          onSelect={() => handleSiteSelect(site)}
                                          className="flex items-center gap-3 p-3 rounded-xl cursor-pointer aria-selected:bg-sonatel-light-bg aria-selected:text-sonatel-orange transition-colors font-bold text-sm"
                                        >
                                          <Check
                                            className={`h-4 w-4 ${siteId === site.id ? "opacity-100" : "opacity-0"
                                              }`}
                                          />
                                          <div className="flex flex-col">
                                            <span>{site.nom}</span>
                                            <span className="text-[10px] text-gray-400 uppercase tracking-tighter">{site.code} - {site.zone}</span>
                                          </div>
                                        </CommandItem>
                                      ))}
                                    </CommandGroup>
                                  </CommandList>
                                </Command>
                              </PopoverContent>
                            </Popover>
                          ) : (
                            <input
                              type={item.type}
                              value={item.value}
                              onChange={(e) => item.setter(e.target.value)}
                              placeholder={item.placeholder}
                              readOnly={(item as any).readOnly}
                              className={`w-full h-14 bg-gray-50 border-2 border-gray-200 rounded-2xl px-4 text-sm font-bold text-gray-900 placeholder:text-gray-400 focus:outline-none transition-all duration-200 hover:border-gray-300 ${(item as any).readOnly ? 'opacity-70 cursor-not-allowed bg-gray-100' : 'focus:border-sonatel-orange/50 focus:bg-white focus:ring-4 focus:ring-sonatel-orange/5'}`}
                            />
                          )}
                          <div className="absolute inset-0 rounded-2xl ring-2 ring-sonatel-orange/10 opacity-0 group-focus-within/field:opacity-100 pointer-events-none transition-opacity" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Section: Dispositif de Gardiennage */}
                <div className="space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="w-9 h-9 rounded-xl bg-sonatel-light-bg flex items-center justify-center shrink-0">
                      <Shield className="w-5 h-5 text-sonatel-orange" />
                    </div>
                    <span className="text-base font-black text-gray-800 uppercase tracking-wider">Dispositif de Gardiennage</span>
                    <div className="h-px flex-1 bg-gray-100" />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    {/* Société */}
                    <div className="relative group/field">
                      <label className="block text-xs font-bold text-gray-600 mb-2 flex items-center gap-2 group-focus-within/field:text-sonatel-orange transition-colors">
                        <Shield className="w-3.5 h-3.5" /> Société de Gardiennage
                      </label>
                      <div className="relative">
                        <input
                          value={societeGardiennage}
                          onChange={(e) => setSocieteGardiennage(e.target.value)}
                          placeholder="Ex: SAGAM, G4S, EPS..."
                          className="w-full h-14 bg-gray-50 border-2 border-gray-200 rounded-2xl px-4 text-sm font-bold text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-sonatel-orange/50 focus:bg-white focus:ring-4 focus:ring-sonatel-orange/5 transition-all duration-200 hover:border-gray-300"
                        />
                      </div>
                    </div>

                    {/* Effectifs */}
                    <div className="relative group/field">
                      <label className="block text-xs font-bold text-gray-600 mb-2 flex items-center gap-2 group-focus-within/field:text-sonatel-orange transition-colors">
                        <Users className="w-3.5 h-3.5" /> Effectifs (Agents J/N)
                      </label>
                      <div className="relative">
                        <input
                          value={nbrAgentsJN}
                          onChange={(e) => setNbrAgentsJN(e.target.value)}
                          placeholder="Ex: 4 Agents Jour / 4 Nuit"
                          className="w-full h-14 bg-gray-50 border-2 border-gray-200 rounded-2xl px-4 text-sm font-bold text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-sonatel-orange/50 focus:bg-white focus:ring-4 focus:ring-sonatel-orange/5 transition-all duration-200 hover:border-gray-300"
                        />
                      </div>
                    </div>

                    {/* Flotte */}
                    <div className="relative group/field">
                      <label className="block text-xs font-bold text-gray-600 mb-2 flex items-center gap-2 group-focus-within/field:text-sonatel-orange transition-colors">
                        <Phone className="w-3.5 h-3.5" /> Contact Flotte / Urgence
                      </label>
                      <div className="relative">
                        <input
                          value={numerosFlotte}
                          onChange={(e) => setNumerosFlotte(e.target.value)}
                          placeholder="Ex: 77 123 45 67, 33 800..."
                          className="w-full h-14 bg-gray-50 border-2 border-gray-200 rounded-2xl px-4 text-sm font-bold text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-sonatel-orange/50 focus:bg-white focus:ring-4 focus:ring-sonatel-orange/5 transition-all duration-200 hover:border-gray-300"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section: Chef de Poste */}
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
                      <UserCheck className="w-5 h-5 text-amber-500" />
                    </div>
                    <span className="text-base font-black text-gray-800 uppercase tracking-wider">Chef de Poste & Équipe</span>
                    <div className="h-px flex-1 bg-gray-100" />
                  </div>

                  <div className="relative group/field rounded-[2rem] border-2 border-sonatel-orange bg-white transition-all duration-200 overflow-hidden focus-within:ring-4 focus-within:ring-sonatel-orange/10">
                    <div className="flex items-start gap-4 p-5">
                      <div className="w-10 h-10 rounded-xl bg-sonatel-orange/10 flex items-center justify-center shrink-0 mt-0.5">
                        <UserCheck className="w-5 h-5 text-sonatel-orange" />
                      </div>
                      <div className="flex-1 space-y-2">
                        <label className="text-xs font-bold text-gray-600">
                          Nom Chef de Poste & Équipe présente sur site
                        </label>
                        <Textarea
                          value={chefPosteEquipe}
                          onChange={(e) => setChefPosteEquipe(e.target.value)}
                          placeholder="Listez ici les noms des agents présents et l'identité du chef de poste pour ce quart de travail..."
                          className="w-full bg-transparent border-none p-0 focus:ring-0 font-medium text-gray-900 text-sm placeholder:text-gray-400 min-h-[70px] resize-none shadow-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="pt-2 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-gray-500">Complétion du formulaire</span>
                    <span className="text-sm font-black text-sonatel-orange">{stats.completion}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-sonatel-orange to-orange-400 transition-all duration-1000 rounded-full"
                      style={{ width: `${stats.completion}%` }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="questionnaire" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {activeRubriques.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-40 gap-6 bg-white/50 backdrop-blur-xl rounded-[3rem] border border-white/50 shadow-xl">
                <div className="w-16 h-16 border-4 border-sonatel-orange border-t-transparent rounded-full animate-spin"></div>
                <div className="text-center space-y-2">
                  <h3 className="text-xl font-black text-gray-900 uppercase tracking-widest">Initialisation du questionnaire</h3>
                  <p className="text-gray-400 font-bold animate-pulse uppercase text-xs tracking-widest">Récupération des rubriques dynamiques...</p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col lg:flex-row gap-12 items-start">

                {/* Left Column: Vertical Timeline Navigation (Sticky) */}
                <div className="lg:w-[320px] shrink-0 sticky top-[4.5rem] self-start space-y-8 max-h-[calc(100vh-5rem)] overflow-y-auto" >
                  <div className="bg-white/80 backdrop-blur-xl border border-gray-100 rounded-[3rem] p-8 shadow-[0_40px_100px_rgba(0,0,0,0.02)] space-y-8">
                    <div className="space-y-1">
                      <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest px-2 group flex items-center gap-2">
                        <ListChecks className="w-5 h-5 text-sonatel-orange" />
                        Progression
                      </h3>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-2">{stats.answered} / {stats.total} points audités</p>
                    </div>

                    <div className="relative space-y-1">
                      {/* Vertical Line Background */}
                      <div className="absolute left-[27px] top-6 bottom-6 w-0.5 bg-gray-100 rounded-full" />

                      {/* Active Progress Line */}
                      <div
                        className="absolute left-[27px] top-6 w-0.5 bg-sonatel-orange rounded-full transition-all duration-1000 origin-top"
                        style={{
                          height: `${(currentRubriqueIdx / (activeRubriques.length - 1)) * 100}%`,
                          maxHeight: 'calc(100% - 48px)'
                        }}
                      />

                      <div className="space-y-3 relative z-10">
                        {activeRubriques.map((r, i) => {
                          const isActive = i === currentRubriqueIdx;
                          const isCompleted = i < currentRubriqueIdx;
                          const qCount = activeQuestionsData[r.id]?.length || 0;
                          const aCount = activeQuestionsData[r.id]?.filter((_, idx) => answers[`${r.id}-${idx}`]?.status).length || 0;
                          const iFinished = aCount === qCount;
                          const prog = (aCount / qCount) * 100;

                          return (
                            <button
                              key={r.id}
                              onClick={() => {
                                setCurrentRubriqueIdx(i);
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                              }}
                              className={`w-full group text-left p-3 rounded-2xl transition-all duration-300 flex items-center gap-4 ${isActive
                                ? "bg-sonatel-orange/5 ring-1 ring-sonatel-orange/20"
                                : "hover:bg-gray-50"
                                }`}
                            >
                              <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-300 shadow-sm shrink-0 border-2 ${isActive
                                ? "bg-sonatel-orange border-sonatel-orange text-white scale-110"
                                : iFinished
                                  ? "bg-emerald-500 border-emerald-500 text-white"
                                  : "bg-white border-gray-100 text-gray-300 group-hover:border-sonatel-orange/30 group-hover:text-sonatel-orange/50"
                                }`}>
                                {iFinished && !isActive ? (
                                  <Check className="w-4 h-4" />
                                ) : (
                                  <r.icon className="w-4 h-4" />
                                )}
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className={`text-[10px] font-black uppercase tracking-widest truncate ${isActive ? "text-sonatel-orange" : iFinished ? "text-emerald-600" : "text-gray-400"
                                  }`}>
                                  {r.label}
                                </div>
                                <div className="mt-1.5 flex items-center gap-2">
                                  <div className="flex-1 h-0.5 bg-gray-100 rounded-full overflow-hidden">
                                    <div
                                      className={`h-full transition-all duration-700 ${iFinished ? "bg-emerald-500" : "bg-sonatel-orange"}`}
                                      style={{ width: `${prog}%` }}
                                    />
                                  </div>
                                  <span className="text-[9px] font-bold tabular-nums text-gray-400">
                                    {aCount}/{qCount}
                                  </span>
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Summary Stats */}
                    <div className="pt-6 border-t border-gray-100 space-y-4">
                      <div className="flex justify-between items-center px-2">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Maturité Site</span>
                        <span className={`text-lg font-black ${stats.percent >= 80 ? 'text-emerald-500' : 'text-sonatel-orange'}`}>{stats.percent}%</span>
                      </div>
                      <Button
                        onClick={() => setShowSummary(true)}
                        className="w-full bg-gray-900 hover:bg-black text-white rounded-2xl py-6 font-black uppercase text-[10px] tracking-[0.2em] shadow-xl shadow-gray-200"
                      >
                        <Save className="w-4 h-4 mr-2" /> Clôturer l'Inspection
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Right Column: Active Content */}
                <div className="flex-1 space-y-12 min-w-0 pb-32" >
                  {/* Current Header - Premium Glass Design */}
                  <div className="bg-white/60 backdrop-blur-2xl p-10 rounded-[3.5rem] border border-white/50 shadow-[0_20px_60px_rgba(0,0,0,0.03)] animate-in fade-in slide-in-from-bottom-6 duration-700 relative overflow-hidden group" >
                    <div className="absolute top-0 right-0 w-64 h-64 bg-sonatel-orange/5 rounded-full blur-3xl -mr-20 -mt-20 group-hover:bg-sonatel-orange/10 transition-colors duration-700" />

                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-10 relative z-10">
                      <div className="flex items-center gap-8">
                        <div className={`p-6 rounded-[2rem] bg-gradient-to-br from-white to-gray-50 shadow-[0_10px_30px_rgba(0,0,0,0.05)] border border-white relative`}>
                          <currentRubrique.icon className={`w-10 h-10 ${currentRubrique.color}`} />
                          <div className="absolute -top-2 -right-2 w-6 h-6 bg-sonatel-orange rounded-full border-2 border-white flex items-center justify-center text-[10px] font-black text-white shadow-lg">
                            {currentRubriqueIdx + 1}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center gap-4">
                            <Badge className="bg-sonatel-orange/10 text-sonatel-orange border-none font-black text-[10px] uppercase px-4 py-1.5 rounded-full tracking-widest">
                              Rubrique {currentRubriqueIdx + 1} sur {activeRubriques.length}
                            </Badge>
                            <div className="h-1 w-8 bg-gray-100 rounded-full" />
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest animate-pulse">Saisie en cours</span>
                          </div>
                          <h2 className="text-4xl font-black text-gray-900 tracking-tight leading-none uppercase">{currentRubrique.label}</h2>
                          <div className="text-sm font-bold text-gray-400 flex items-center gap-2 uppercase tracking-[0.1em]">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                            {questions.length} points de contrôle stratégiques
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-6 bg-white/50 p-6 rounded-[2rem] border border-white shadow-sm ring-1 ring-black/5">
                        <div className="text-right space-y-1">
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">La progression</p>
                          <div className="text-3xl font-black text-gray-900 tabular-nums">
                            {Math.round((questions.filter((_, idx) => answers[`${currentRubrique.id}-${idx}`]?.status).length / questions.length) * 100)}%
                          </div>
                        </div>
                        <div className="w-16 h-16 relative">
                          <svg className="w-16 h-16 transform -rotate-90 drop-shadow-sm">
                            <circle
                              cx="32"
                              cy="32"
                              r="28"
                              stroke="currentColor"
                              strokeWidth="6"
                              fill="transparent"
                              className="text-gray-100"
                            />
                            <circle
                              cx="32"
                              cy="32"
                              r="28"
                              stroke="currentColor"
                              strokeWidth="6"
                              fill="transparent"
                              strokeDasharray={2 * Math.PI * 28}
                              strokeDashoffset={2 * Math.PI * 28 * (1 - (questions.filter((_, idx) => answers[`${currentRubrique.id}-${idx}`]?.status).length / questions.length))}
                              strokeLinecap="round"
                              className="text-sonatel-orange transition-all duration-1000 ease-in-out"
                            />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Questions list with Vertical Path */}
                  <div className="space-y-10 relative pl-12 lg:pl-16" >
                    {/* Internal Path Line */}
                    <div className="absolute left-[20px] lg:left-[27px] top-10 bottom-10 w-1 bg-gray-100/50 rounded-full hidden md:block" />

                    {/* Active Path Filler */}
                    <div
                      className="absolute left-[20px] lg:left-[27px] top-10 w-1 rounded-full bg-sonatel-orange transition-all duration-700 hidden md:block origin-top"
                      style={{ height: `${(questions.filter((_, idx) => answers[`${currentRubrique.id}-${idx}`]?.status).length / questions.length) * 100}%` }
                      }
                    />

                    {isLoadingQuestions ? (
                      <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <div className="w-12 h-12 border-4 border-sonatel-orange border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-gray-400 font-bold animate-pulse">Chargement du questionnaire dynamique...</p>
                      </div>
                    ) : (
                      questions.map((q, i) => {
                        const key = `${currentRubrique.id}-${i}`;
                        const ans = (answers[key] || {}) as Answer;
                        const isAnswered = !!ans.status;

                        return (
                          <div key={key} className={`relative group/q animate-in fade-in slide-in-from-left-4 duration-500`} style={{ animationDelay: `${i * 70}ms` }}>
                            {/* Timeline Node - Positioned on Path */}
                            <div className={`absolute left-[-50px] lg:left-[-59px] top-6 w-11 h-11 rounded-2xl flex items-center justify-center transition-all duration-500 z-20 shadow-xl border-4 border-[#FDFDFD] ${isAnswered
                              ? ans.status === "conforme"
                                ? "bg-emerald-500 text-white"
                                : ans.status === "non-conforme"
                                  ? "bg-destructive text-white"
                                  : "bg-gray-400 text-white"
                              : "bg-white text-gray-300 group-hover/q:bg-sonatel-orange/10 group-hover/q:text-sonatel-orange group-hover/q:scale-110 active:scale-95"
                              }`}>
                              {ans.status === "conforme" ? (
                                <Check className="w-5 h-5 transition-all animate-in zoom-in" />
                              ) : ans.status === "non-conforme" ? (
                                <AlertCircle className="w-5 h-5 transition-all animate-in zoom-in" />
                              ) : (
                                <span className="text-[11px] font-black">{String(i + 1).padStart(2, '0')}</span>
                              )}
                            </div>

                            <Card
                              className={`overflow-hidden border-none transition-all duration-500 group relative ${isAnswered
                                ? ans.status === "conforme"
                                  ? "bg-emerald-50/20 shadow-[0_10px_30px_-10px_rgba(16,185,129,0.1)] ring-1 ring-emerald-100/50"
                                  : ans.status === "non-conforme"
                                    ? "bg-red-50/20 shadow-[0_10px_30px_-10px_rgba(239,68,68,0.1)] ring-1 ring-red-100/50"
                                    : "bg-gray-50/40 shadow-sm ring-1 ring-gray-100"
                                : "bg-white shadow-sm hover:shadow-xl hover:ring-1 hover:ring-sonatel-orange/20"
                                }`}
                            >

                              <CardContent className="p-8">
                                <div className="flex flex-col lg:flex-row gap-10">
                                  {/* Left: Question Header */}
                                  <div className="flex-1 space-y-5">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-3">
                                        <Badge variant="outline" className={`text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full border-none shadow-sm ${q.criticality === "Critique"
                                          ? "bg-destructive text-white animate-pulse"
                                          : q.criticality === "Majeur"
                                            ? "bg-sonatel-orange text-white"
                                            : "bg-gray-400 text-white"
                                          }`}>
                                          {q.criticality}
                                        </Badge>
                                      </div>

                                      {q.helper && (
                                        <TooltipProvider>
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <button className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 hover:bg-sonatel-orange/10 hover:text-sonatel-orange transition-all">
                                                <Info className="w-4 h-4" />
                                              </button>
                                            </TooltipTrigger>
                                            <TooltipContent className="max-w-[250px] p-4 rounded-2xl bg-gray-900 text-white border-none shadow-2xl">
                                              <p className="text-xs font-bold leading-relaxed">{q.helper}</p>
                                            </TooltipContent>
                                          </Tooltip>
                                        </TooltipProvider>
                                      )}
                                    </div>

                                    <div className="space-y-4">
                                      <h3 className="text-xl font-black text-gray-900 leading-[1.4] tracking-tight">
                                        {q.text}
                                      </h3>
                                      {q.helper && (
                                        <div className="flex gap-2 p-4 bg-gray-50/50 rounded-2xl border border-gray-100/50 lg:hidden">
                                          <Info className="w-4 h-4 text-sonatel-orange shrink-0 mt-0.5" />
                                          <p className="text-xs font-bold text-muted-foreground leading-relaxed">{q.helper}</p>
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  {/* Right: Actions & Status Selection */}
                                  <div className="lg:w-[420px] shrink-0 space-y-8">
                                    {/* Choice Buttons */}
                                    <div className="grid grid-cols-3 gap-4 p-2 bg-gray-50 rounded-[2rem] border border-gray-100/50 shadow-inner">
                                      {[
                                        { id: "conforme", label: "OUI", color: "bg-emerald-500", icon: Check },
                                        { id: "non-conforme", label: "NON", color: "bg-destructive", icon: AlertCircle },
                                        { id: "na", label: "N/A", color: "bg-gray-400", icon: Info },
                                      ].map((opt) => (
                                        <button
                                          key={opt.id}
                                          onClick={() => updateAnswer(key, { status: opt.id as any })}
                                          className={`flex flex-col items-center justify-center gap-2 py-5 rounded-[1.5rem] transition-all duration-300 border-2 ${ans.status === opt.id
                                            ? `${opt.color} border-transparent text-white shadow-xl scale-[1.03] z-10`
                                            : "bg-white border-transparent text-gray-400 hover:border-sonatel-orange/20 hover:text-sonatel-orange hover:shadow-md"
                                            }`}
                                        >
                                          <opt.icon className={`w-6 h-6 transition-transform ${ans.status === opt.id ? "scale-110" : "scale-100"}`} />
                                          <span className="text-[10px] font-black tracking-[0.2em]">{opt.label}</span>
                                        </button>
                                      ))}
                                    </div>

                                    {/* Observations Area */}
                                    <div className="space-y-4">
                                      <div className="relative group/obs transition-all duration-300 focus-within:-mx-10 focus-within:px-10">
                                        <Textarea
                                          placeholder="Notes et observations d'audit..."
                                          value={ans.observation}
                                          onChange={(e) => updateAnswer(key, { observation: e.target.value })}
                                          className="w-full min-h-[80px] focus:min-h-[160px] rounded-[1.5rem] border-gray-100 bg-white focus:ring-sonatel-orange/10 focus:border-sonatel-orange transition-all duration-300 placeholder:text-gray-400 font-medium text-sm pt-5 px-6 shadow-sm resize-none"
                                        />
                                        <div className="absolute top-4 right-4 opacity-20 group-focus-within/obs:opacity-0 transition-opacity">
                                          <FileText className="w-5 h-5" />
                                        </div>
                                      </div>

                                      {/* Dynamic Action Plan */}
                                      {(ans.status === "non-conforme" || ans.showActionPlan) && (
                                        <div className="p-6 bg-gradient-to-br from-gray-50/50 to-white border border-sonatel-orange/10 rounded-[2rem] space-y-6 shadow-inner animate-in zoom-in-95 duration-300">
                                          <header className="flex justify-between items-center border-b border-sonatel-orange/5 pb-4">
                                            <span className="text-[10px] font-black text-sonatel-orange uppercase tracking-[0.2em] flex items-center gap-2">
                                              <AlertTriangle className="w-4 h-4" /> Plan d'Action Correctif
                                            </span>
                                            {ans.status === "conforme" && (
                                              <button onClick={() => updateAnswer(key, { showActionPlan: false })} className="text-gray-400 hover:text-sonatel-orange">
                                                <Plus className="w-4 h-4 rotate-45" />
                                              </button>
                                            )}
                                          </header>

                                          <div className="space-y-4">
                                            <div className="space-y-2">
                                              <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest pl-1">Action Recommandée</label>
                                              <Textarea
                                                placeholder="Décrivez l'action à mener..."
                                                value={ans.recommendation}
                                                onChange={(e) => updateAnswer(key, { recommendation: e.target.value })}
                                                className="min-h-[80px] rounded-xl border-gray-100 shadow-sm text-sm"
                                              />
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                              <div className="space-y-2">
                                                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest pl-1">Responsable</label>
                                                <div className="relative">
                                                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                                                  <input
                                                    type="text"
                                                    placeholder="Porteur..."
                                                    value={ans.assignee}
                                                    onChange={(e) => updateAnswer(key, { assignee: e.target.value })}
                                                    className="w-full pl-9 pr-3 h-10 text-xs font-bold rounded-xl border border-gray-100 outline-none focus:ring-2 focus:ring-sonatel-orange/10 transition-all shadow-sm"
                                                  />
                                                </div>
                                              </div>
                                              <div className="space-y-2">
                                                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest pl-1">Email Porteur</label>
                                                <div className="relative">
                                                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                                                  <input
                                                    type="email"
                                                    placeholder="Email..."
                                                    value={ans.porteurEmail}
                                                    onChange={(e) => updateAnswer(key, { porteurEmail: e.target.value })}
                                                    className="w-full pl-9 pr-3 h-10 text-xs font-bold rounded-xl border border-gray-100 outline-none focus:ring-2 focus:ring-sonatel-orange/10 transition-all shadow-sm"
                                                  />
                                                </div>
                                              </div>
                                              <div className="col-span-2 md:col-span-1 space-y-2">
                                                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest pl-1">Echéance</label>
                                                <input
                                                  type="date"
                                                  value={ans.dueDate}
                                                  onChange={(e) => updateAnswer(key, { dueDate: e.target.value })}
                                                  className="w-full px-3 h-10 text-xs font-bold rounded-xl border border-gray-100 outline-none focus:ring-2 focus:ring-sonatel-orange/10 transition-all shadow-sm"
                                                />
                                              </div>
                                            </div>

                                            <div className="space-y-2">
                                              <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest pl-1">Origine de la recommandation</label>
                                              <select
                                                value={ans.origine || ORIGINES_ACTION[8]}
                                                onChange={(e) => updateAnswer(key, { origine: e.target.value })}
                                                className="w-full h-10 px-3 text-xs font-bold rounded-xl border border-gray-100 outline-none focus:ring-2 focus:ring-sonatel-orange/10 transition-all shadow-sm bg-white"
                                              >
                                                {ORIGINES_ACTION.map((o) => (
                                                  <option key={o} value={o}>{o}</option>
                                                ))}
                                              </select>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                              <div className="space-y-2">
                                                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest pl-1">Avancement</label>
                                                <select
                                                  value={ans.avancement || AVANCEMENT_ACTION[3]}
                                                  onChange={(e) => updateAnswer(key, { avancement: e.target.value })}
                                                  className="w-full h-10 px-3 text-xs font-bold rounded-xl border border-gray-100 outline-none focus:ring-2 focus:ring-sonatel-orange/10 transition-all shadow-sm bg-white"
                                                >
                                                  {AVANCEMENT_ACTION.map((a) => (
                                                    <option key={a} value={a}>{a}</option>
                                                  ))}
                                                </select>
                                              </div>
                                              <div className="space-y-2">
                                                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest pl-1">Statut Suivi</label>
                                                <select
                                                  value={ans.statut_suivi || STATUT_ACTION[3]}
                                                  onChange={(e) => updateAnswer(key, { statut_suivi: e.target.value })}
                                                  className="w-full h-10 px-3 text-xs font-bold rounded-xl border border-gray-100 outline-none focus:ring-2 focus:ring-sonatel-orange/10 transition-all shadow-sm bg-white"
                                                >
                                                  {STATUT_ACTION.map((s) => (
                                                    <option key={s} value={s}>{s}</option>
                                                  ))}
                                                </select>
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      )}

                                      {ans.status === "conforme" && !ans.showActionPlan && (
                                        <button
                                          onClick={() => updateAnswer(key, { showActionPlan: true })}
                                          className="w-full py-3 rounded-xl border-2 border-dashed border-gray-100 text-[10px] font-black text-gray-400 uppercase tracking-widest hover:border-sonatel-orange/30 hover:text-sonatel-orange transition-all flex items-center justify-center gap-2 group"
                                        >
                                          <Plus className="w-3.5 h-3.5 transition-transform group-hover:rotate-90" /> Ajouter une recommandation préventive
                                        </button>
                                      )}
                                    </div>

                                    {/* Evidence & Documents */}
                                    <div className="pt-2">
                                      <CameraCapture
                                        photos={ans.photos || []}
                                        onPhotosChange={(photos) => {
                                          updateAnswer(key, { photos });
                                          handlePhotoUpload(key, photos);
                                        }}
                                        onPhotoDelete={(photoUrl) => {
                                          if (photoUrl.startsWith('http') && photoUrl.includes('cloudinary')) {
                                            photoService.deleteByUrl(photoUrl);
                                          }
                                        }}
                                      />
                                    </div>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="actions" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {nonConformites.length > 0 ? nonConformites.map((nc, idx) => (
                <Card key={idx} className="rounded-3xl border-2 border-red-50 shadow-sm overflow-hidden">
                  <div className="bg-red-50/50 p-6 border-b border-red-100">
                    <div className="flex justify-between items-start">
                      <Badge className="bg-destructive text-white uppercase font-black text-[10px] tracking-widest px-3 py-1 rounded-full">{nc.criticality}</Badge>
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{nc.rubrique}</span>
                    </div>
                    <h3 className="text-sm font-black mt-4 text-gray-900 leading-tight">{nc.questionText}</h3>
                  </div>
                  <CardContent className="pt-6 space-y-6">
                    <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                      <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5 flex items-center gap-2">
                        <Info className="w-3 h-3" /> Observation constatée
                      </div>
                      <div className="text-xs font-bold text-gray-700 leading-relaxed">{nc.observation || "Aucune observation détaillée."}</div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-gray-50/50 rounded-2xl border border-gray-100">
                        <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Responsable</div>
                        <div className="text-xs font-black text-gray-900">{nc.assignee || "À définir"}</div>
                      </div>
                      <div className="p-4 bg-gray-50/50 rounded-2xl border border-gray-100">
                        <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Échéance</div>
                        <div className="text-xs font-black text-gray-900">{nc.dueDate || "Indéfini"}</div>
                      </div>
                    </div>

                    <div className="p-5 bg-emerald-50/50 rounded-2xl border border-emerald-100 flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500 text-white flex items-center justify-center shrink-0">
                        <CheckSquare className="w-4 h-4" />
                      </div>
                      <div className="space-y-1">
                        <div className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-1">Action Corrective recommandée</div>
                        <div className="text-xs font-black text-emerald-900 leading-relaxed">{nc.recommendation || "En attente de plan d'action précis."}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )) : (
                <div className="col-span-full py-32 bg-emerald-50/30 rounded-[4rem] border-2 border-dashed border-emerald-100 flex flex-col items-center justify-center text-center space-y-4 animate-in zoom-in-95 duration-700">
                  <div className="w-24 h-24 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-500 shadow-inner ring-8 ring-emerald-50/50">
                    <Check className="w-12 h-12" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-2xl font-black text-gray-900">Zéro Non-Conformité</h3>
                    <p className="text-gray-500 font-bold max-w-sm mx-auto uppercase text-xs tracking-widest">Bravo ! Ce site respecte pour le moment l'ensemble des standards de sécurité Sonatel.</p>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="photos" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white rounded-[3.5rem] border-2 border-gray-100 p-12 shadow-sm min-h-[400px]">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10 border-b border-gray-50 pb-8">
                <div>
                  <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Galerie de Preuves</h3>
                  <p className="text-gray-400 font-bold text-xs uppercase tracking-widest mt-1">Photos capturées durant cette session d'audit</p>
                </div>
                <Badge className="bg-gray-100 text-gray-500 border-none font-black px-4 py-2 rounded-xl">
                  {Object.entries(answers).flatMap(([key, ans]) => ans.photos || []).length} photos au total
                </Badge>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                {Object.entries(answers).flatMap(([key, ans]) => ans.photos || []).length > 0 ? (
                  Object.entries(answers).map(([key, ans]) =>
                    (ans.photos || []).map((photo, pIdx) => (
                      <div key={`${key}-${pIdx}`} className="aspect-square rounded-[2rem] overflow-hidden border-4 border-white shadow-xl relative group ring-1 ring-gray-100">
                        <img src={photo} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt="Preuve d'audit" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-end p-6">
                          <div className="space-y-1">
                            <span className="text-[9px] font-black text-sonatel-orange uppercase tracking-widest">Question {key.split('-')[1]}</span>
                            <span className="text-[10px] font-bold text-white uppercase truncate block leading-tight">
                              {key.split('-')[0].replace(/_/g, ' ')}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  )
                ) : (
                  <div className="col-span-full py-20 flex flex-col items-center justify-center text-center space-y-6 opacity-30">
                    <div className="w-24 h-24 rounded-[2.5rem] bg-gray-50 flex items-center justify-center text-gray-300 ring-8 ring-gray-50/50">
                      <FileImage className="w-12 h-12" />
                    </div>
                    <p className="text-xs font-black text-gray-400 uppercase tracking-[0.3em]">Aucune preuve photo archivée</p>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="resumee" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Card className="p-12 border-2 border-gray-100 bg-white rounded-[3.5rem] shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-sonatel-orange/5 rounded-full blur-3xl -mr-20 -mt-20" />

              <div className="flex items-center gap-6 mb-12 relative z-10">
                <div className="w-16 h-16 rounded-[2rem] bg-sonatel-orange/10 flex items-center justify-center text-sonatel-orange shadow-inner">
                  <ClipboardCheck className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-3xl font-black text-gray-900 uppercase tracking-tighter">
                    Conclusions & Vision Stratégique
                  </h3>
                  <div className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mt-2 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-sonatel-orange" />
                    Synthèse globale pour la Direction de la Sécurité
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 relative z-10">
                {conclusions.map((cl, i) => (
                  <div key={i} className="space-y-4 group">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-3 group-focus-within:text-sonatel-orange ml-2 transition-colors">
                      <span className="w-8 h-8 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center text-xs group-focus-within:bg-sonatel-orange/10 group-focus-within:border-sonatel-orange/20">{i + 1}</span>
                      Recommandation Majeure
                    </label>
                    <div className="relative">
                      <Textarea
                        value={cl}
                        onChange={(e) => {
                          const newCl = [...conclusions];
                          newCl[i] = e.target.value;
                          setConclusions(newCl);
                        }}
                        placeholder="Saisissez une orientation stratégique ou un risque résiduel majeur..."
                        className="min-h-[160px] p-8 rounded-[2.5rem] border-2 border-gray-100 bg-gray-50/30 focus:bg-white focus:border-sonatel-orange focus:ring-4 focus:ring-sonatel-orange/5 shadow-inner transition-all font-bold text-sm leading-relaxed"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Sticky Bottom Bar - Premium Floating */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[60] w-full max-w-[1400px] px-6">
        <div className="bg-white/80 backdrop-blur-2xl border border-white shadow-[0_20px_50px_rgba(0,0,0,0.15)] p-4 rounded-[2.5rem] flex justify-between items-center ring-1 ring-black/5">
          <Button
            variant="ghost"
            onClick={() => {
              setCurrentRubriqueIdx(Math.max(0, currentRubriqueIdx - 1));
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            disabled={currentRubriqueIdx === 0}
            className="rounded-2xl h-14 px-8 gap-3 border-none hover:bg-gray-100 text-gray-600 font-black uppercase text-[10px] tracking-widest"
          >
            <ChevronLeft className="w-5 h-5" /> Précédent
          </Button>

          <Button variant="ghost" className="hidden sm:flex rounded-2xl h-14 px-8 gap-3 text-gray-400 hover:text-sonatel-orange font-black uppercase tracking-widest text-[10px]">
            <Save className="w-5 h-5" /> Sauvegarder
          </Button>

          {currentRubriqueIdx < activeRubriques.length - 1 ? (
            <Button
              onClick={() => {
                setCurrentRubriqueIdx(currentRubriqueIdx + 1);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="rounded-2xl h-14 px-10 gap-3 bg-sonatel-orange hover:bg-orange-600 text-white shadow-lg shadow-orange-500/20 hover:scale-105 transition-all font-black uppercase text-[10px] tracking-widest"
            >
              Suivant <ChevronRight className="w-5 h-5" />
            </Button>
          ) : (
            <Button
              onClick={handleFinalize}
              className="rounded-2xl h-14 px-10 gap-3 bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20 hover:scale-105 transition-all font-black uppercase text-[10px] tracking-widest"
            >
              <Check className="w-5 h-5" /> Clôturer l'Audit
            </Button>
          )}
        </div>
      </div>

      {/* Summary Modal - Highly Professional Design */}
      <Dialog open={showSummary} onOpenChange={setShowSummary}>
        <DialogContent className="max-w-[800px] w-[95vw] rounded-[3rem] border-none shadow-2xl p-0 overflow-hidden bg-white">
          <div className="flex flex-col max-h-[85vh]">
            <DialogHeader className="p-8 border-b border-gray-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 rounded-[1.75rem] bg-sonatel-orange/10 flex items-center justify-center text-sonatel-orange">
                  <ClipboardCheck className="w-7 h-7" />
                </div>
                <div>
                  <DialogTitle className="text-2xl font-black text-gray-900 uppercase tracking-tight leading-none">
                    Résumé de l'Audit Sécurité
                  </DialogTitle>
                  <DialogDescription className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mt-1.5 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-sonatel-orange animate-pulse" />
                    Vérification Finale DG/SECU
                  </DialogDescription>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setShowSummary(false)} className="rounded-full hover:bg-gray-100">
                <RotateCcw className="w-5 h-5 text-gray-400" />
              </Button>
            </DialogHeader>

            {/* Content - Scrollable */}
            <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
              {/* Key Stats Bar */}
              <div className="grid grid-cols-2 gap-5">
                <div className="p-6 bg-gradient-to-br from-gray-50 to-white rounded-[2.5rem] border-2 border-gray-100/50 shadow-inner flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Score Qualité</div>
                    <div className="flex items-baseline gap-1">
                      <span className={`text-4xl font-black tabular-nums transition-all ${stats.percent >= 90 ? "text-emerald-500" : stats.percent >= 60 ? "text-amber-500" : "text-destructive"}`}>
                        {stats.percent}
                      </span>
                      <span className="text-sm font-black text-gray-300">%</span>
                    </div>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-white border border-gray-100 flex items-center justify-center">
                    <Zap className={`w-5 h-5 ${stats.percent >= 60 ? "text-amber-500" : "text-destructive"}`} />
                  </div>
                </div>

                <div className="p-6 bg-gradient-to-br from-gray-50 to-white rounded-[2.5rem] border-2 border-gray-100/50 shadow-inner flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Points d'alerte</div>
                    <div className="text-4xl font-black text-gray-900 tabular-nums">
                      {nonConformites.length}
                    </div>
                  </div>
                  <div className={`w-12 h-12 rounded-2xl ${nonConformites.length > 0 ? "bg-red-50 text-red-500" : "bg-emerald-50 text-emerald-500"} flex items-center justify-center border border-current/10`}>
                    <AlertCircle className="w-5 h-5" />
                  </div>
                </div>
              </div>

              {/* NC List Section */}
              {nonConformites.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between px-2">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Analyse des écarts</h4>
                    <Badge variant="destructive" className="rounded-full px-4 h-6 font-black text-[9px] uppercase tracking-tighter">
                      Action plan requis
                    </Badge>
                  </div>
                  <div className="space-y-3">
                    {nonConformites.map((nc, i) => (
                      <div key={i} className="p-5 border-2 border-gray-50 rounded-[2rem] bg-white group hover:border-sonatel-orange/20 transition-all duration-300">
                        <div className="flex items-start justify-between gap-4 mb-3">
                          <p className="text-sm font-bold text-gray-800 leading-snug group-hover:text-gray-900">{nc.questionText}</p>
                          <Badge variant="outline" className={`shrink-0 text-[8px] font-black uppercase tracking-widest px-2.5 py-0.5 border-none ${nc.criticality === "Critique" ? "bg-red-50 text-red-600" : "bg-orange-50 text-sonatel-orange"}`}>
                            {nc.criticality}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-5 pt-3 border-t border-gray-50">
                          <div className="flex items-center gap-1.5">
                            <User className="w-3 h-3 text-gray-300" />
                            <span className="text-[9px] font-black text-gray-500 uppercase">{nc.assignee || "—"}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3 h-3 text-gray-300" />
                            <span className="text-[9px] font-black text-gray-500 uppercase">{nc.dueDate || "—"}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Disclaimer */}
              <div className="p-6 bg-orange-50/50 border-2 border-dashed border-orange-100 rounded-[2.5rem] flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-sonatel-orange/20 flex items-center justify-center shrink-0">
                  <Info className="w-4 h-4 text-sonatel-orange" />
                </div>
                <p className="text-xs font-bold text-orange-950 leading-relaxed italic">
                  En soumettant cet audit, un rapport PDF officiel sera généré et les plans d'actions seront notifiés aux responsables concernés.
                </p>
              </div>
            </div>

            {/* Footer - Fixed */}
            <div className="p-8 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between gap-4 shrink-0">
              <Button
                variant="ghost"
                onClick={() => setShowSummary(false)}
                disabled={isSubmitting}
                className="h-14 px-10 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-gray-100"
              >
                Retour
              </Button>
              <Button
                onClick={submitInspection}
                disabled={isSubmitting}
                className="h-14 px-12 rounded-2xl bg-sonatel-orange hover:bg-orange-600 text-white shadow-xl shadow-orange-500/20 font-black uppercase text-[10px] tracking-widest min-w-[240px] transition-transform active:scale-95"
              >
                {isSubmitting ? (
                  <div className="flex items-center gap-3">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Traitement...
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <Send className="w-4 h-4 text-white" />
                    Soumettre définitivement
                  </div>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {/* Success Dialog - Post Submission */}
      <Dialog open={showSuccessDialog} onOpenChange={(open) => {
        setShowSuccessDialog(open);
        if (!open) {
          clearLocalForm();
          navigate('/dashboard');
        }
      }}>
        <DialogContent className="max-w-[500px] rounded-[3rem] border-none shadow-2xl p-0 overflow-hidden bg-white">
          <div className="p-10 text-center space-y-8">
            <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-[2rem] flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10">
              <CheckCircle2 className="w-12 h-12" />
            </div>

            <div className="space-y-3">
              <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Soumission réussi !</h2>
              <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">L'audit du site <span className="text-sonatel-orange">{submittedData?.siteName}</span> a été enregistré.</p>
            </div>

            <div className="bg-gray-50 p-6 rounded-[2rem] border border-gray-100">
              <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Score Global obtenu</div>
              <div className="text-4xl font-black text-emerald-600">{submittedData?.score}%</div>
            </div>

            <div className="flex flex-col gap-3">
              <Button
                onClick={handleDownloadPdf}
                className="h-14 rounded-2xl bg-sonatel-orange hover:bg-orange-600 text-white font-black uppercase text-xs tracking-widest shadow-lg shadow-orange-500/20 gap-3"
              >
                <Download className="w-4 h-4" /> Télécharger le rapport PDF
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowSuccessDialog(false);
                  clearLocalForm();
                  navigate('/dashboard');
                }}
                className="h-14 rounded-2xl border-2 border-gray-100 text-gray-400 font-black uppercase text-xs tracking-widest hover:bg-gray-50"
              >
                Retour au tableau de bord
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
