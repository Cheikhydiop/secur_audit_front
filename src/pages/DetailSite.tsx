import React, { useState, useEffect } from 'react';
import { useOnlineStatus } from '@/hooks/use-online-status';
import {
  MapPin, Building2, Users, Calendar, FileText, Download,
  AlertTriangle, CheckCircle, XCircle, Clock, TrendingUp,
  ChevronLeft, Plus, Settings, Eye, AlertCircle, BarChart3, Camera, History,
  ChevronDown, ChevronUp, ImageIcon, ClipboardList, Shield, Printer, Loader2
} from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { PhotoLightbox } from '@/components/PhotoLightbox';
import { RubriqueHistogram } from '@/components/RubriqueHistogram';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { inspectionService } from '@/services/InspectionService';
import { siteService, Site } from '@/services/SiteService';
import { actionService, ActionPlan } from '@/services/ActionService';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

// Senegal locations coordinates
const senegalLocations: { [key: string]: [number, number] } = {
  'DAKAR': [14.7167, -17.4677],
  'THIES': [14.7833, -16.9167],
  'DIOURBEL': [14.7300, -16.2500],
  'FATICK': [14.3390, -16.4110],
  'KAOLACK': [14.1652, -16.0757],
  'ZIGUINCHOR': [12.5600, -16.2900],
  'LOUGA': [15.6100, -16.2500],
  'TAMBACOUNDA': [13.7700, -13.6800],
  'KOLDA': [12.9100, -14.9500],
  'MATAM': [15.6500, -13.2600],
  'KAFFRINE': [14.1000, -15.5500],
  'KEDOUGOU': [12.5600, -12.1800],
  'SEDHIOU': [12.7000, -15.5500],
  'SAINT-LOUIS': [16.0326, -16.5012],
  'SAINT LOUIS': [16.0326, -16.5012],
  'RICHARD TOLL': [16.4500, -15.7000],
  'PODOR': [16.6500, -14.9500],
};

// SiteMapContent component - displays map for a site
const SiteMapContent: React.FC<{ site: Site }> = ({ site }) => {
  const regionName = site.region?.nom_region?.toUpperCase() || site.zone?.toUpperCase() || 'DAKAR';
  const coordinates = senegalLocations[regionName] || senegalLocations['DAKAR'];

  return (
    <div className="w-full h-[500px] rounded-2xl overflow-hidden shadow-lg">
      <MapContainer
        center={coordinates}
        zoom={12}
        scrollWheelZoom={true}
        className="w-full h-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={coordinates}>
          <Popup>
            <div className="p-2 min-w-[200px]">
              <h4 className="font-black text-orange-500 text-lg mb-1 uppercase tracking-tight">{site.nom_site || site.nom}</h4>
              <div className="flex items-center gap-2 text-gray-400 text-[10px] font-bold uppercase tracking-widest mb-3">
                <MapPin size={10} />
                {site.zone || 'Sénégal'}
              </div>
              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between text-xs font-bold text-gray-600">
                  <span>Code</span>
                  <span className="text-gray-900">{site.code}</span>
                </div>
                <div className="flex items-center justify-between text-xs font-bold text-gray-600">
                  <span>Type</span>
                  <span className="text-gray-900">{site.type}</span>
                </div>
                <div className="flex items-center justify-between text-xs font-bold text-gray-600">
                  <span>Localisation</span>
                  <span className="text-gray-900">{site.localisation}</span>
                </div>
              </div>
            </div>
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  );
};

// Types simplifiés
interface SiteInfo {
  id: string;
  nom: string;
  nom_site: string;
  code: string;
  type: string;
  zone: string;
  localisation: string;
  prestataire: string;
  status: string;
  region_id: number;
  region?: any;
}

interface InspectionData {
  id: string;
  date: string;
  score: number;
  statut: string;
  inspecteur: string;
}

interface ActionData {
  id: string;
  description: string;
  responsable: string;
  echeance: string;
  criticite: string;
  statut: string;
}

// Type pour les questions du questionnaire
interface QuestionData {
  id: string;
  inspectionId: string;
  categorie: string;
  question: string;
  reponse: 'Conforme' | 'Observation' | 'Non conforme' | 'N/A';
  observation: string;
  recommendation: string;
  preuve?: string;
}

// Type pour les non-conformités
interface NonConformiteData {
  id: string;
  description: string;
  criticite: 'Haute' | 'Moyenne' | 'Basse';
  recommendation: string;
  inspectionId: string;
  statut: string;
}

// Fallback demo site
const demoSite: SiteInfo = {
  id: '0',
  nom: '---',
  nom_site: '---',
  code: '---',
  type: '---',
  zone: '---',
  localisation: '---',
  prestataire: '---',
  status: 'offline',
  region_id: 1
};

const SectionLoader: React.FC<{ message?: string }> = ({ message = "Récupération des données..." }) => (
  <div className="w-full py-20 flex flex-col items-center justify-center bg-white/50 backdrop-blur-sm rounded-[2.5rem] border-2 border-dashed border-gray-100 animate-in fade-in duration-700 mt-4">
    <div className="relative mb-6">
      <div className="w-16 h-16 rounded-full border-4 border-gray-100 border-t-sonatel-orange animate-spin" />
      <Loader2 className="w-6 h-6 text-sonatel-orange absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
    </div>
    <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">{message}</p>
  </div>
);

const DetailSite: React.FC = () => {
  const { siteId } = useParams<{ siteId: string }>();
  const navigate = useNavigate();
  const { isOnline, isReachable } = useOnlineStatus();
  const isMounted = React.useRef(true);
  const [currentPage, setCurrentPage] = useState(1);


  // Loading states for different sections
  const [loadingSite, setLoadingSite] = useState(true);
  const [loadingInspections, setLoadingInspections] = useState(false);
  const [loadingActions, setLoadingActions] = useState(false);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [loadingPhotos, setLoadingPhotos] = useState(false);

  // Data states
  const [site, setSite] = useState<SiteInfo | null>(null);
  const [inspections, setInspections] = useState<InspectionData[]>([]);
  const [actions, setActions] = useState<ActionData[]>([]);
  const [questions, setQuestions] = useState<QuestionData[]>([]);
  const [nonConformites, setNonConformites] = useState<NonConformiteData[]>([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [showNewInspectionDialog, setShowNewInspectionDialog] = useState(false);

  // State for selected inspection
  const [selectedInspectionId, setSelectedInspectionId] = useState<string>('');
  const [selectedInspection, setSelectedInspection] = useState<InspectionData | null>(null);

  // State for expandable rows
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [loadingDetails, setLoadingDetails] = useState<Set<string>>(new Set());
  const [inspectionDetails, setInspectionDetails] = useState<Record<string, { questions: any[], actions: any[] }>>({});

  // State for showing all questions
  const [showAllQuestions, setShowAllQuestions] = useState(false);

  // State for map
  const [mapLoaded, setMapLoaded] = useState(false);
  const [showMap, setShowMap] = useState(false);

  // Update selectedInspection when ID changes
  useEffect(() => {
    const inspection = inspections.find(i => i.id === selectedInspectionId);
    if (inspection) {
      setSelectedInspection(inspection);
    }
  }, [selectedInspectionId, inspections]);

  // Reset showAllQuestions when selected inspection changes
  useEffect(() => {
    setShowAllQuestions(false);
  }, [selectedInspectionId]);

  // Handle map loading when map tab is selected
  useEffect(() => {
    if (activeTab === 'map') {
      const timer = setTimeout(() => {
        setMapLoaded(true);
        setTimeout(() => setShowMap(true), 100);
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setMapLoaded(false);
      setShowMap(false);
    }
  }, [activeTab]);

  // State for proof viewer
  const [proofViewerOpen, setProofViewerOpen] = useState(false);
  const [proofPhotos, setProofPhotos] = useState<string[]>([]);
  const [proofIndex, setProofIndex] = useState(0);

  // State for real proof photos from backend
  const [realProofPhotos, setRealProofPhotos] = useState<string[]>([]);

  // Function to view proof
  const viewProof = (proofUrl: string, index: number = 0) => {
    setProofPhotos([proofUrl]);
    setProofIndex(index);
    setProofViewerOpen(true);
  };

  // Function to view multiple proofs
  const viewProofs = (proofUrls: string[], index: number = 0) => {
    setProofPhotos(proofUrls);
    setProofIndex(index);
    setProofViewerOpen(true);
  };

  // Toggle expanded row
  const toggleExpand = async (inspectionId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(inspectionId)) {
      newExpanded.delete(inspectionId);
    } else {
      newExpanded.add(inspectionId);
      // Fetch inspection details if not already fetched
      if (!inspectionDetails[inspectionId]) {
        try {
          setLoadingDetails(prev => new Set(prev).add(inspectionId));
          const detailRes = await inspectionService.getById(inspectionId);
          if (detailRes.data) {
            const detail = detailRes.data as any;
            const questions = detail.reponses || detail.inspectionQuestions || [];
            setInspectionDetails(prev => ({
              ...prev,
              [inspectionId]: {
                questions: questions,
                actions: detail.actionPlans || [],
                photos: detail.photos || []
              }
            }));
          }
        } catch (error) {
          console.error('Error fetching inspection details:', error);
        } finally {
          setLoadingDetails(prev => {
            const next = new Set(prev);
            next.delete(inspectionId);
            return next;
          });
        }
      }
    }
    setExpandedRows(newExpanded);
  };

  // 1. Fetch BASIC Site Info (Always on mount)
  useEffect(() => {
    const fetchSiteInfo = async () => {
      if (!siteId) return;

      const cachedSite = siteService.getCachedResponse<any>(`/${siteId}`);
      if (cachedSite) {
        setSite({
          id: cachedSite.id,
          nom: cachedSite.nom_site || cachedSite.nom || '',
          nom_site: cachedSite.nom_site || cachedSite.nom || '',
          code: cachedSite.code || '',
          type: cachedSite.type || 'Commercial',
          zone: cachedSite.region?.nom_region || cachedSite.zone || '',
          localisation: cachedSite.localisation || '',
          prestataire: cachedSite.prestataire || '',
          status: cachedSite.status || 'actif',
          region_id: cachedSite.region_id || 1,
          region: cachedSite.region
        });
        setLoadingSite(false);
      } else {
        setLoadingSite(true);
      }

      try {
        const siteRes = await siteService.getSiteById(siteId as any);
        if (siteRes.data) {
          const s = siteRes.data;
          setSite({
            id: s.id,
            nom: s.nom_site || s.nom || '',
            nom_site: s.nom_site || s.nom || '',
            code: s.code || '',
            type: s.type || 'Commercial',
            zone: s.region?.nom_region || s.zone || '',
            localisation: s.localisation || '',
            prestataire: s.prestataire || '',
            status: s.status || 'actif',
            region_id: s.region_id || 1,
            region: s.region
          });
        }
      } catch (error) {
        console.error('Error fetching site:', error);
      } finally {
        setLoadingSite(false);
      }
    };
    fetchSiteInfo();
  }, [siteId]);

  // 2. Fetch Inspections (Overview or Inspections tab)
  useEffect(() => {
    const fetchInspections = async () => {
      if (!siteId) return;
      if (activeTab !== 'overview' && activeTab !== 'inspections' && activeTab !== 'questionnaire') return;

      const cached = inspectionService.getCachedResponse<any>(`?siteId=${siteId}&limit=20`);
      if (cached?.inspections) {
        const mapped = cached.inspections.map((insp: any) => ({
          id: insp.id,
          date: new Date(insp.date || insp.createdAt).toLocaleDateString('fr-FR'),
          score: insp.score || 0,
          statut: insp.statut || 'EN_COURS',
          inspecteur: insp.inspecteur?.name || 'N/A'
        }));
        setInspections(mapped);
        setLoadingInspections(false);
        if (mapped.length > 0 && !selectedInspectionId) {
          setSelectedInspectionId(mapped[0].id);
          setSelectedInspection(mapped[0]);
        }
      } else {
        setLoadingInspections(true);
      }

      try {
        const inspectionsRes = await inspectionService.getAll({ siteId, limit: 20 });
        if (inspectionsRes.data?.inspections) {
          const mapped = inspectionsRes.data.inspections.map((insp: any) => ({
            id: insp.id,
            date: new Date(insp.date || insp.createdAt).toLocaleDateString('fr-FR'),
            score: insp.score || 0,
            statut: insp.statut || 'EN_COURS',
            inspecteur: insp.inspecteur?.name || 'N/A'
          }));
          setInspections(mapped);

          if (mapped.length > 0 && !selectedInspectionId) {
            setSelectedInspectionId(mapped[0].id);
            setSelectedInspection(mapped[0]);
          }
        }
      } catch (err) {
        console.error('Error fetching inspections:', err);
      } finally {
        setLoadingInspections(false);
      }
    };
    fetchInspections();
  }, [siteId, activeTab]);

  // 3. Fetch Actions (Overview or Actions tab)
  useEffect(() => {
    const fetchActions = async () => {
      if (!siteId) return;
      if (activeTab !== 'overview' && activeTab !== 'actions') return;

      const cached = actionService.getCachedResponse<any>(`?siteId=${siteId}`);
      if (cached) {
        let actionsData: any[] = Array.isArray(cached) ? cached : (cached.actions || []);
        const mappedActions = actionsData.map((a: any) => ({
          id: a.id,
          description: a.description,
          responsable: a.responsable?.name || 'Non assigné',
          echeance: a.dateEcheance ? new Date(a.dateEcheance).toLocaleDateString('fr-FR') : 'N/A',
          criticite: a.criticite === 'ELEVEE' ? 'Haute' : a.criticite === 'MOYENNE' ? 'Moyenne' : 'Basse',
          statut: a.statut
        }));
        setActions(mappedActions);
        setLoadingActions(false);
      } else {
        setLoadingActions(true);
      }

      try {
        const actionsRes = await actionService.getAll({ siteId });
        let actionsData: any[] = [];
        if (Array.isArray(actionsRes.data)) actionsData = actionsRes.data;
        else if (actionsRes.data?.actions) actionsData = actionsRes.data.actions;

        const mappedActions = actionsData.map((a: any) => ({
          id: a.id,
          description: a.description,
          responsable: a.responsable?.name || 'Non assigné',
          echeance: a.dateEcheance ? new Date(a.dateEcheance).toLocaleDateString('fr-FR') : 'N/A',
          criticite: a.criticite === 'ELEVEE' ? 'Haute' : a.criticite === 'MOYENNE' ? 'Moyenne' : 'Basse',
          statut: a.statut
        }));
        setActions(mappedActions);
      } catch (err) {
        console.error('Error fetching actions:', err);
      } finally {
        setLoadingActions(false);
      }
    };
    fetchActions();
  }, [siteId, activeTab]);

  // 4. Fetch Questions / Responses for SELECTED inspection (Questionnaire or non-conformites tab)
  useEffect(() => {
    const fetchQuestions = async () => {
      if (!selectedInspectionId) return;
      // Fetch only if tab is specific or if not already loaded for THIS inspection
      if (activeTab !== 'questionnaire' && activeTab !== 'nonconformites') return;
      if (questions.length > 0 && questions[0].inspectionId === selectedInspectionId) return;

      setLoadingQuestions(true);
      try {
        const detailRes = await inspectionService.getById(selectedInspectionId);
        if (detailRes.data) {
          const questionsData = detailRes.data.reponses || detailRes.data.inspectionQuestions || [];
          const mapped = questionsData.map((q: any) => {
            let reponse: any = 'N/A';
            if (q.valeur === 'CONFORME' || q.reponse === 'CONFORME' || q.valeur === 'Conforme') reponse = 'Conforme';
            else if (q.valeur === 'NON_CONFORME' || q.reponse === 'NON_CONFORME' || q.valeur === 'Non conforme') reponse = 'Non conforme';
            else if (q.valeur === 'NON_APPLICABLE' || q.reponse === 'NON_APPLICABLE' || q.valeur === 'N/A') reponse = 'N/A';
            else if (q.valeur || q.reponse) reponse = 'Observation';

            return {
              id: q.id,
              inspectionId: selectedInspectionId,
              categorie: q.rubrique || q.categorieSnapshot || 'Autre',
              question: q.texte || q.questionTextSnapshot || '',
              reponse,
              observation: q.observation || '',
              recommendation: q.recommandation || q.recommendation || '',
              preuve: q.photoUrl || (q.photos?.[0])
            };
          });
          setQuestions(mapped);
          setNonConformites(mapped.filter(q => q.reponse === 'Non conforme').map(q => ({
            id: q.id,
            description: q.question,
            criticite: 'Moyenne',
            recommendation: q.recommendation,
            inspectionId: selectedInspectionId,
            statut: 'Ouverte'
          })));
        }
      } catch (err) {
        console.error('Error fetching questions:', err);
      } finally {
        setLoadingQuestions(false);
      }
    };
    fetchQuestions();
  }, [selectedInspectionId, activeTab]);

  // 5. Fetch Proof Photos (Proofs tab)
  useEffect(() => {
    const fetchPhotos = async () => {
      if (!siteId) return;
      if (activeTab !== 'proofs') return;

      const cacheKey = `_site_photos_${siteId}`;
      const cached = siteService.getLocalCache<string[]>(cacheKey);
      if (cached && Array.isArray(cached)) {
        setRealProofPhotos(cached);
        setLoadingPhotos(false);
      } else {
        setLoadingPhotos(true);
      }

      try {
        const resp = await inspectionService.getAll({ siteId, limit: 10 });
        if (resp.data?.inspections) {
          const inspectionsToFetch = resp.data.inspections.slice(0, 5);
          const detailPromises = inspectionsToFetch.map(insp => inspectionService.getById(insp.id));
          const detailResults = await Promise.all(detailPromises);

          const photos: string[] = [];
          detailResults.forEach(detailRes => {
            if (detailRes.data) {
              const qData = detailRes.data.reponses || detailRes.data.inspectionQuestions || [];
              qData.forEach((q: any) => {
                if (q.photoUrl) photos.push(q.photoUrl);
                else if (q.photos?.length) photos.push(...q.photos.filter(Boolean));
              });
            }
          });

          setRealProofPhotos(photos);
          // Save to cache (BaseService setLocalCache)
          (siteService as any).setLocalCache(cacheKey, photos);
        }
      } catch (err) {
        console.error('Error fetching photos:', err);
      } finally {
        setLoadingPhotos(false);
      }
    };
    fetchPhotos();
  }, [siteId, activeTab]);

  // Stats calculées
  const totalInspections = inspections.length;
  const averageScore = totalInspections > 0 ? Math.round(inspections.reduce((acc, i) => acc + i.score, 0) / totalInspections) : 0;
  const lastInspection = inspections[0]?.date || 'Aucune';
  const actionsTerminees = actions.filter(a => a.statut === 'TERMINE').length;
  const actionsEnCours = actions.filter(a => a.statut === 'EN_COURS').length;
  const actionsAFaire = actions.filter(a => a.statut === 'A_FAIRE').length;

  // Filter questions by selected inspection
  const filteredQuestions = questions.filter(q => q.inspectionId === selectedInspectionId);

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-emerald-600';
    if (score >= 61) return 'text-amber-600';
    return 'text-red-600';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'VALIDEE': return <Badge className="bg-green-100 text-green-700">Validée</Badge>;
      case 'EN_COURS': return <Badge className="bg-orange-50 text-orange-600 border-orange-100">En cours</Badge>;
      case 'REJETEE': return <Badge className="bg-red-100 text-red-700">Rejetée</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  const getActionStatusBadge = (status: string) => {
    switch (status) {
      case 'TERMINE': return <Badge className="bg-green-100 text-green-700">Terminé</Badge>;
      case 'EN_COURS': return <Badge className="bg-orange-50 text-orange-600 border-orange-100">En cours</Badge>;
      default: return <Badge className="bg-gray-100 text-gray-700">À faire</Badge>;
    }
  };

  const getCriticiteBadge = (criticite: string) => {
    switch (criticite) {
      case 'CRITIQUE': return <Badge className="bg-red-600 text-white">Critique</Badge>;
      case 'MAJEUR': return <Badge className="bg-orange-500 text-white">Majeur</Badge>;
      case 'MINEUR': return <Badge className="bg-yellow-500 text-white">Mineur</Badge>;
      default: return <Badge>{criticite}</Badge>;
    }
  };

  // Badge pour les réponses du questionnaire
  const getReponseBadge = (reponse: string) => {
    switch (reponse) {
      case 'Conforme': return <Badge className="bg-emerald-100 text-emerald-700">Conforme</Badge>;
      case 'Observation': return <Badge className="bg-amber-100 text-amber-700">Observation</Badge>;
      case 'Non conforme': return <Badge className="bg-red-100 text-red-700">Non conforme</Badge>;
      case 'N/A': return <Badge className="bg-gray-100 text-gray-500">N/A</Badge>;
      default: return <Badge>{reponse}</Badge>;
    }
  };

  // Badge pour la criticité des non-conformités
  const getNonConformiteCriticiteBadge = (criticite: string) => {
    switch (criticite) {
      case 'Haute': return <Badge className="bg-red-100 text-red-700">Haute</Badge>;
      case 'Moyenne': return <Badge className="bg-amber-100 text-amber-700">Moyenne</Badge>;
      case 'Basse': return <Badge className="bg-slate-100 text-slate-700 border-slate-200">Basse</Badge>;
      default: return <Badge>{criticite}</Badge>;
    }
  };

  // Badge pour le statut des non-conformités
  const getNonConformiteStatutBadge = (statut: string) => {
    switch (statut) {
      case 'Ouverte': return <Badge className="bg-red-100 text-red-700">Ouverte</Badge>;
      case 'En cours': return <Badge className="bg-orange-50 text-orange-600 border-orange-100">En cours</Badge>;
      case 'Résolue': return <Badge className="bg-green-100 text-green-700">Résolue</Badge>;
      default: return <Badge>{statut}</Badge>;
    }
  };

  // Global loading state check
  const isLoading = loadingSite && !site;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-100 border-t-orange-500"></div>
            <Loader2 className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 text-orange-500 animate-pulse" />
          </div>
          <p className="text-sm font-black text-gray-400 uppercase tracking-widest">Récupération des données du site...</p>
        </div>
      </div>
    );
  }

  // Si on n'a pas de site (ni cache, ni réseau) après le loading
  if (!site) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Building2 className="w-16 h-16 text-gray-200 mx-auto" />
          <p className="text-gray-500 font-bold">Site introuvable ou erreur de chargement</p>
          <Button onClick={() => navigate('/sites')} variant="outline">Retour à la liste</Button>
        </div>
      </div>
    );
  }

  // Fallback site data when API doesn't return (uses demo data as default)
  const currentSite = site || demoSite;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4 md:px-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3 md:gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/sites')} className="shrink-0 h-9 w-9">
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div className="min-w-0">
              <h1 className="text-xl md:text-3xl font-black text-gray-900 leading-tight truncate">{currentSite.nom}</h1>
              <div className="flex flex-wrap items-center gap-2 md:gap-4 text-xs md:text-base text-gray-500 mt-1 md:mt-2">
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />{currentSite.zone}
                </span>
                <span className="hidden md:inline">•</span>
                <span className="font-bold">{currentSite.code}</span>
                <Badge variant="outline" className="text-[10px] md:text-xs">{currentSite.type}</Badge>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto mt-2 md:mt-0">
            <Button variant="outline" onClick={() => setShowNewInspectionDialog(true)} className="flex-1 md:flex-none h-9 md:h-11 rounded-xl text-[10px] font-black uppercase tracking-widest px-3">
              <Plus className="h-4 w-4 mr-1.5" />
              Inspection
            </Button>
            <Button variant="outline" className="flex-1 md:flex-none h-9 md:h-11 rounded-xl text-[10px] font-black uppercase tracking-widest px-3">
              <Download className="h-4 w-4 mr-1.5" />
              Export
            </Button>
          </div>
        </div>
      </div>

      <div className="p-4 md:p-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-4 md:mb-8">
          <Card className="rounded-2xl border-2 border-gray-50 shadow-sm">
            <CardContent className="p-3 md:p-4">
              <div className="flex items-center justify-between group">
                <div>
                  <p className="text-[9px] md:text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Score moyen</p>
                  <p className={`text-2xl md:text-4xl font-black ${getScoreColor(averageScore)}`}>{averageScore}%</p>
                </div>
                <TrendingUp className="h-6 w-6 md:h-8 md:w-8 text-gray-300 group-hover:text-sonatel-orange transition-colors" />
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-2 border-gray-50 shadow-sm">
            <CardContent className="p-3 md:p-4">
              <div className="flex items-center justify-between group">
                <div>
                  <p className="text-[9px] md:text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Inspections</p>
                  <p className="text-2xl md:text-4xl font-black text-gray-900">{totalInspections}</p>
                </div>
                <FileText className="h-6 w-6 md:h-8 md:w-8 text-gray-300 group-hover:text-sonatel-orange transition-colors" />
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-2 border-gray-50 shadow-sm">
            <CardContent className="p-3 md:p-4">
              <div className="flex items-center justify-between group">
                <div>
                  <p className="text-[9px] md:text-xs font-black text-gray-400 uppercase tracking-widest mb-1">NC Ouvertes</p>
                  <p className="text-2xl md:text-4xl font-black text-red-600">{nonConformites.length}</p>
                </div>
                <AlertTriangle className="h-6 w-6 md:h-8 md:w-8 text-red-300 group-hover:text-red-500 transition-colors" />
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-2 border-gray-50 shadow-sm">
            <CardContent className="p-3 md:p-4">
              <div className="flex items-center justify-between group">
                <div>
                  <p className="text-[9px] md:text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Actions</p>
                  <p className="text-2xl md:text-4xl font-black text-gray-900">{actionsTerminees}/{actions.length}</p>
                </div>
                <Clock className="h-6 w-6 md:h-8 md:w-8 text-gray-300 group-hover:text-sonatel-orange transition-colors" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Score de conformité */}
        <Card className="mb-8">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-orange-500" />
              Score de conformité
            </CardTitle>
          </CardHeader>
          <CardContent className="py-6">
            <div className="flex items-center gap-8">
              <div className="flex-1">
                <Progress value={averageScore} className="h-6 rounded-full" />
              </div>
              <span className={`text-5xl font-black ${getScoreColor(averageScore)}`}>{averageScore}%</span>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="bg-white p-1 rounded-2xl shadow-sm border-2 border-gray-50 mb-6 overflow-x-auto overflow-y-hidden custom-scrollbar">
            <TabsList className="bg-transparent h-auto p-0 flex flex-nowrap min-w-max">
              <TabsTrigger value="overview" className="rounded-xl px-5 py-2.5 data-[state=active]:bg-sonatel-orange data-[state=active]:text-white font-black text-[11px] uppercase tracking-wider transition-all whitespace-nowrap">Aperçu</TabsTrigger>
              <TabsTrigger value="map" className="rounded-xl px-5 py-2.5 data-[state=active]:bg-sonatel-orange data-[state=active]:text-white font-black text-[11px] uppercase tracking-wider transition-all whitespace-nowrap">Carte</TabsTrigger>
              <TabsTrigger value="inspections" className="rounded-xl px-5 py-2.5 data-[state=active]:bg-sonatel-orange data-[state=active]:text-white font-black text-[11px] uppercase tracking-wider transition-all whitespace-nowrap">Historique</TabsTrigger>
              <TabsTrigger value="questionnaire" className="rounded-xl px-5 py-2.5 data-[state=active]:bg-sonatel-orange data-[state=active]:text-white font-black text-[11px] uppercase tracking-wider transition-all whitespace-nowrap">Rapport</TabsTrigger>
              <TabsTrigger value="nonconformites" className="rounded-xl px-5 py-2.5 data-[state=active]:bg-sonatel-orange data-[state=active]:text-white font-black text-[11px] uppercase tracking-wider transition-all whitespace-nowrap">Non-conf.</TabsTrigger>
              <TabsTrigger value="actions" className="rounded-xl px-5 py-2.5 data-[state=active]:bg-sonatel-orange data-[state=active]:text-white font-black text-[11px] uppercase tracking-wider transition-all whitespace-nowrap">Actions</TabsTrigger>
              <TabsTrigger value="proofs" className="rounded-xl px-5 py-2.5 data-[state=active]:bg-sonatel-orange data-[state=active]:text-white font-black text-[11px] uppercase tracking-wider transition-all whitespace-nowrap">Preuves</TabsTrigger>
              <TabsTrigger value="analysis" className="rounded-xl px-5 py-2.5 data-[state=active]:bg-sonatel-orange data-[state=active]:text-white font-black text-[11px] uppercase tracking-wider transition-all whitespace-nowrap">Analyse</TabsTrigger>
            </TabsList>
          </div>

          {/* Overview Tab */}
          <TabsContent value="overview">
            {loadingInspections || loadingActions ? <SectionLoader /> : (
              <div className="grid md:grid-cols-2 gap-6">
                <Card className="rounded-[2.5rem] border-2 border-gray-100 overflow-hidden shadow-sm">
                  <CardHeader className="bg-gray-50/50 border-b border-gray-100 p-8">
                    <CardTitle className="flex items-center gap-4 text-xl font-black uppercase tracking-tight">
                      <div className="p-3 rounded-2xl bg-white shadow-sm ring-1 ring-gray-100">
                        <Building2 className="h-6 w-6 text-sonatel-orange" />
                      </div>
                      Informations du site
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-5 md:p-8">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 md:gap-x-8 gap-y-6 md:gap-y-8">
                      <div><p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1.5">Nom du site</p><p className="font-bold text-gray-900 text-base md:text-lg leading-tight">{currentSite.nom}</p></div>
                      <div><p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1.5">Code Identification</p><p className="font-bold text-gray-900 text-base md:text-lg">{currentSite.code}</p></div>
                      <div><p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1.5">Typologie</p><p className="font-bold text-gray-900 text-base md:text-lg">{currentSite.type}</p></div>
                      <div><p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1.5">Zone Opérationnelle</p><p className="font-bold text-gray-900 text-base md:text-lg">{currentSite.zone}</p></div>
                      <div><p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1.5">Localisation GPS</p><p className="font-bold text-gray-900 text-base md:text-lg">{currentSite.localisation}</p></div>
                      <div><p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1.5">Entité Responsable</p><p className="font-bold text-gray-900 text-base md:text-lg">{currentSite.prestataire}</p></div>
                      <div className="col-span-1 sm:col-span-2 pt-4 border-t border-gray-50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div>
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Statut Site</p>
                          <Badge className={`px-5 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest ${currentSite.status === 'actif' ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-400'}`}>{currentSite.status}</Badge>
                        </div>
                        <div className="sm:text-right">
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Dernier passage</p>
                          <p className="font-black text-gray-900">{lastInspection}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-[2.5rem] border-2 border-gray-100 overflow-hidden shadow-sm">
                  <CardHeader className="bg-gray-50/50 border-b border-gray-100 p-8">
                    <CardTitle className="flex items-center gap-4 text-xl font-black uppercase tracking-tight">
                      <div className="p-3 rounded-2xl bg-white shadow-sm ring-1 ring-gray-100">
                        <BarChart3 className="h-6 w-6 text-sonatel-orange" />
                      </div>
                      Résumé des actions
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-8">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-6 bg-emerald-50/50 rounded-3xl border border-emerald-100 transition-all hover:bg-emerald-50">
                        <div className="flex items-center gap-5">
                          <div className="w-12 h-12 rounded-2xl bg-white shadow-sm ring-1 ring-emerald-100 flex items-center justify-center text-emerald-500"><CheckCircle className="h-6 w-6" /></div>
                          <span className="text-sm font-black text-gray-700 uppercase tracking-widest">Résolues</span>
                        </div>
                        <span className="text-3xl font-black text-emerald-600 tabular-nums">{actionsTerminees}</span>
                      </div>
                      <div className="flex items-center justify-between p-6 bg-amber-50/50 rounded-3xl border border-amber-100 transition-all hover:bg-amber-50">
                        <div className="flex items-center gap-5">
                          <div className="w-12 h-12 rounded-2xl bg-white shadow-sm ring-1 ring-amber-100 flex items-center justify-center text-amber-500"><Clock className="h-6 w-6" /></div>
                          <span className="text-sm font-black text-gray-700 uppercase tracking-widest">En cours</span>
                        </div>
                        <span className="text-3xl font-black text-amber-600 tabular-nums">{actionsEnCours}</span>
                      </div>
                      <div className="flex items-center justify-between p-6 bg-red-50/50 rounded-3xl border border-red-100 transition-all hover:bg-red-50">
                        <div className="flex items-center gap-5">
                          <div className="w-12 h-12 rounded-2xl bg-white shadow-sm ring-1 ring-red-100 flex items-center justify-center text-red-500"><AlertCircle className="h-6 w-6" /></div>
                          <span className="text-sm font-black text-gray-700 uppercase tracking-widest">À planifier</span>
                        </div>
                        <span className="text-3xl font-black text-red-600 tabular-nums">{actionsAFaire}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          {/* Map Tab */}
          <TabsContent value="map">
            {(!mapLoaded || !showMap) ? (
              <div className="w-full h-[500px] flex flex-col bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden animate-pulse">
                <div className="p-6 border-b border-gray-50 flex justify-between items-center">
                  <div className="h-6 bg-gray-100 rounded-lg w-48"></div>
                </div>
                <div className="flex-1 bg-gray-50 flex items-center justify-center relative">
                  <div className="flex flex-col items-center gap-4">
                    <div className="h-10 w-10 rounded-full border-4 border-orange-500 border-t-transparent animate-spin"></div>
                    <span className="text-sm font-black text-gray-400 uppercase tracking-widest">Initialisation de la carte...</span>
                  </div>
                </div>
              </div>
            ) : (
              <SiteMapContent site={currentSite} />
            )}
          </TabsContent>

          {/* Inspections Tab */}
          <TabsContent value="inspections">
            {loadingInspections ? <SectionLoader /> : (
              <div className="space-y-4">
                {/* Header - Desktop */}
                <div className="hidden lg:grid grid-cols-12 gap-4 px-8 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
                  <div className="col-span-1"></div>
                  <div className="col-span-2"><span>Référence</span></div>
                  <div className="col-span-3"><span>Date</span></div>
                  <div className="col-span-2"><span>Inspecteur</span></div>
                  <div className="col-span-2 text-center"><span>Score Maturité</span></div>
                  <div className="col-span-2 text-right"><span>Statut</span></div>
                </div>

                {inspections.map((inspection, i) => {
                  const isExpanded = expandedRows.has(inspection.id);
                  const details = inspectionDetails[inspection.id];
                  const questions = details?.questions || [];
                  const actions = details?.actions || [];
                  const nonConformes = questions.filter((q: any) => q.valeur === 'NON_CONFORME' || q.valeur === 'Non conforme');
                  // Get ALL photos from questions - each question can have multiple photos in the 'photos' array
                  const allPhotos: string[] = [];
                  questions.forEach((q: any) => {
                    if (q.photos && Array.isArray(q.photos)) {
                      q.photos.forEach((photo: string) => {
                        if (photo) allPhotos.push(photo);
                      });
                    }
                  });

                  return (
                    <div key={inspection.id} className="space-y-2">
                      <Card className={`border-2 ${isExpanded ? 'border-orange-500/50 shadow-lg' : 'border-gray-200'} bg-white hover:border-orange-500/30 hover:shadow-md transition-all rounded-2xl overflow-hidden`}>
                        <CardContent className="p-0">
                          <div className="lg:grid lg:grid-cols-12 lg:gap-4 lg:items-center p-4 lg:px-6">
                            {/* Expand Button */}
                            <div className="col-span-1 flex items-center justify-start lg:justify-center">
                              <button
                                onClick={() => toggleExpand(inspection.id)}
                                className={`h-10 w-10 rounded-xl flex items-center justify-center transition-all ${isExpanded ? 'bg-orange-500 text-white rotate-180' : 'bg-gray-100 text-gray-500 hover:bg-orange-100 hover:text-orange-500'}`}
                              >
                                <ChevronDown className="w-5 h-5" />
                              </button>
                            </div>

                            {/* ID */}
                            <div className="col-span-2 mb-2 lg:mb-0">
                              <span className="text-[11px] font-black text-sonatel-orange bg-orange-50 px-3 py-1.5 rounded-lg uppercase tracking-wider">
                                <span>{inspection.id.substring(0, 8)}...</span>
                              </span>
                            </div>

                            {/* Date */}
                            <div className="col-span-3 mb-2 lg:mb-0">
                              <div className="flex items-center gap-2 text-sm font-bold text-gray-700">
                                <Calendar className="w-4 h-4 text-sonatel-orange" />
                                <span>{inspection.date}</span>
                              </div>
                            </div>

                            {/* Inspector */}
                            <div className="col-span-2 mb-2 lg:mb-0">
                              <div className="flex items-center gap-2 text-sm font-bold text-gray-700">
                                <div className="w-8 h-8 rounded-full bg-orange-50 text-sonatel-orange flex items-center justify-center text-[10px] font-black">
                                  <span>{inspection.inspecteur && inspection.inspecteur.length > 0 ? inspection.inspecteur.split(' ').map((n: string) => n[0]).join('').substring(0, 2) : '?'}</span>
                                </div>
                                <span>{inspection.inspecteur}</span>
                              </div>
                            </div>

                            {/* Score */}
                            <div className="col-span-2 flex flex-col items-center justify-center mb-2 lg:mb-0">
                              <div className="flex items-center gap-2">
                                <span className={`px-4 py-1.5 rounded-xl text-lg font-black bg-white border-2 ${getScoreColor(inspection.score)} shadow-sm`}>
                                  <span>{inspection.score}</span><span>%</span>
                                </span>
                                {i < inspections.length - 1 && (
                                  <div className={`flex items-center ${inspection.score >= inspections[i + 1].score ? 'text-emerald-500' : 'text-destructive'}`}>
                                    {inspection.score >= inspections[i + 1].score ? <TrendingUp className="w-4 h-4" /> : <TrendingUp className="w-4 h-4 rotate-180" />}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Status */}
                            <div className="col-span-2 flex justify-end gap-2">
                              <div className="hidden xl:flex gap-1.5 mr-2">
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-gray-400 hover:text-sonatel-orange hover:bg-orange-50" title="Imprimer">
                                  <Printer className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-gray-400 hover:text-sonatel-orange hover:bg-orange-50" title="Télécharger PDF">
                                  <Download className="h-4 w-4" />
                                </Button>
                              </div>
                              {getStatusBadge(inspection.statut)}
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Expanded Content */}
                      {isExpanded && (
                        <Card className="border-2 border-orange-200 bg-gradient-to-br from-gray-50 to-white rounded-2xl overflow-hidden min-h-[100px] flex flex-col items-center justify-center">
                          {loadingDetails.has(inspection.id) ? (
                            <div className="py-12 flex flex-col items-center gap-3">
                              <Loader2 className="w-8 h-8 text-sonatel-orange animate-spin" />
                              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Chargement des détails...</p>
                            </div>
                          ) : (
                            <CardContent className="p-4 lg:p-6 w-full">
                              <Accordion type="multiple" defaultValue={['general', 'questionnaire', 'nonconformites', 'gallery']} className="space-y-4">
                                {/* Section 1: Informations générales */}
                                <AccordionItem value="general" className="border-2 border-gray-200 rounded-xl px-4">
                                  <AccordionTrigger className="hover:no-underline">
                                    <div className="flex items-center gap-3">
                                      <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center">
                                        <Shield className="w-4 h-4 text-orange-600" />
                                      </div>
                                      <div className="text-left">
                                        <h4 className="font-black text-base uppercase tracking-wider text-gray-900">Informations générales</h4>
                                        <p className="text-xs font-medium text-gray-500">Détails de l'inspection</p>
                                      </div>
                                    </div>
                                  </AccordionTrigger>
                                  <AccordionContent>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
                                      <div className="space-y-1">
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Date</p>
                                        <p className="font-bold text-gray-900">{inspection.date}</p>
                                      </div>
                                      <div className="space-y-1">
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Inspecteur</p>
                                        <p className="font-bold text-gray-900">{inspection.inspecteur}</p>
                                      </div>
                                      <div className="space-y-1">
                                        <p className="text-xs font-black text-gray-400 uppercase tracking-wider">Site</p>
                                        <p className="font-bold text-gray-900">{currentSite.nom}</p>
                                      </div>
                                      <div className="space-y-1">
                                        <p className="text-xs font-black text-gray-400 uppercase tracking-wider">Statut</p>
                                        {getStatusBadge(inspection.statut)}
                                      </div>
                                    </div>
                                  </AccordionContent>
                                </AccordionItem>

                                {/* Section 2: Réponses au questionnaire */}
                                <AccordionItem value="questionnaire" className="border-2 border-gray-200 rounded-xl px-4">
                                  <AccordionTrigger className="hover:no-underline">
                                    <div className="flex items-center gap-3">
                                      <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center">
                                        <ClipboardList className="w-4 h-4 text-sonatel-orange" />
                                      </div>
                                      <div className="text-left">
                                        <h4 className="font-black text-base uppercase tracking-wider text-gray-900">Réponses au questionnaire</h4>
                                        <p className="text-xs font-medium text-gray-500">{questions.length} questions évaluées</p>
                                      </div>
                                    </div>
                                  </AccordionTrigger>
                                  <AccordionContent>
                                    <div className="pt-2 space-y-2 max-h-80 overflow-y-auto">
                                      {questions.length === 0 ? (
                                        <p className="text-sm text-gray-500 text-center py-4">Aucune réponse enregistrée</p>
                                      ) : (
                                        (showAllQuestions ? questions : questions.slice(0, 10)).map((q: any, idx: number) => (
                                          <div key={idx} className="flex items-start gap-3 p-3 bg-white rounded-xl border border-gray-100 shadow-sm">
                                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-black ${q.valeur === 'CONFORME' || q.valeur === 'Conforme' ? 'bg-green-100 text-green-600' : q.valeur === 'NON_CONFORME' || q.valeur === 'Non conforme' ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'}`}>
                                              {idx + 1}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                              <p className="text-sm font-bold text-gray-900 line-clamp-2">{q.texte || 'Question'}</p>
                                              <p className="text-[11px] text-gray-400 uppercase tracking-wider mt-0.5">{q.rubrique || ''}</p>
                                              {q.observation && (
                                                <p className="text-xs text-gray-500 mt-1 italic">Observation: {q.observation}</p>
                                              )}
                                            </div>
                                            <div className="flex flex-col items-end gap-1">
                                              <Badge variant={q.valeur === 'CONFORME' || q.valeur === 'Conforme' ? 'default' : q.valeur === 'NON_CONFORME' || q.valeur === 'Non conforme' ? 'destructive' : 'secondary'} className="text-[10px] font-black uppercase">
                                                {q.valeur === 'CONFORME' || q.valeur === 'Conforme' ? 'Conforme' : q.valeur === 'NON_CONFORME' || q.valeur === 'Non conforme' ? 'Non conforme' : q.valeur === 'NON_APPLICABLE' || q.valeur === 'N/A' ? 'N/A' : 'Observation'}
                                              </Badge>
                                              {q.photos && q.photos.length > 0 && (
                                                <button onClick={() => viewProof(q.photos[0])} className="p-1 rounded bg-gray-50 hover:bg-gray-100">
                                                  <ImageIcon className="w-3 h-3 text-gray-400" />
                                                </button>
                                              )}
                                            </div>
                                          </div>
                                        ))
                                      )}
                                      {questions.length > 10 && (
                                        <button
                                          onClick={() => setShowAllQuestions(!showAllQuestions)}
                                          className="text-center text-[10px] text-sonatel-orange font-medium py-2 hover:underline w-full"
                                        >
                                          {showAllQuestions ? '- Masquer les questions supplémentaires' : `+ ${questions.length - 10} autres questions...`}
                                        </button>
                                      )}
                                    </div>
                                  </AccordionContent>
                                </AccordionItem>

                                {/* Section 3: Non-conformités */}
                                <AccordionItem value="nonconformites" className="border-2 border-gray-200 rounded-xl px-4">
                                  <AccordionTrigger className="hover:no-underline">
                                    <div className="flex items-center gap-3">
                                      <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
                                        <AlertCircle className="w-4 h-4 text-red-600" />
                                      </div>
                                      <div className="text-left">
                                        <h4 className="font-black text-sm uppercase tracking-wider text-gray-900">Non-conformités</h4>
                                        <p className="text-[10px] font-medium text-gray-500">{nonConformes.length} non-conformités identifiées</p>
                                      </div>
                                    </div>
                                  </AccordionTrigger>
                                  <AccordionContent>
                                    <div className="pt-2 space-y-2 max-h-64 overflow-y-auto">
                                      {nonConformes.length === 0 ? (
                                        <div className="text-center py-4">
                                          <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-1" />
                                          <p className="text-sm font-bold text-gray-900">Aucune non-conformité</p>
                                          <p className="text-[10px] text-gray-500">Toutes les questions sont conformes</p>
                                        </div>
                                      ) : (
                                        nonConformes.map((nc: any, idx: number) => (
                                          <div key={idx} className="p-3 bg-red-50 rounded-xl border border-red-100 space-y-2">
                                            <div className="flex items-start justify-between gap-2">
                                              <div className="flex-1">
                                                <Badge variant="outline" className={`text-[8px] font-black uppercase tracking-wider mb-1 ${nc.ponderation >= 4 ? 'border-red-500 text-red-600 bg-red-50' : 'border-amber-500 text-amber-600 bg-amber-50'}`}>
                                                  {nc.ponderation >= 4 ? 'Critique' : nc.ponderation >= 2 ? 'Majeur' : 'Mineur'}
                                                </Badge>
                                                <p className="text-xs font-bold text-gray-900">{nc.texte || 'Non-conformité'}</p>
                                              </div>
                                              {nc.photos && nc.photos.length > 0 && (
                                                <button onClick={() => viewProof(nc.photos[0])} className="w-12 h-12 rounded-lg overflow-hidden border border-gray-200">
                                                  <img src={nc.photos[0]} alt="Preuve" className="w-full h-full object-cover" />
                                                </button>
                                              )}
                                            </div>
                                            {nc.observation && (
                                              <p className="text-[10px]"><span className="font-black text-gray-500 uppercase">Observation: </span><span className="text-gray-700 italic">"{nc.observation}"</span></p>
                                            )}
                                            {nc.recommandation && (
                                              <p className="text-[10px]"><span className="font-black text-green-600 uppercase">Recommandation: </span><span className="text-gray-700">{nc.recommandation}</span></p>
                                            )}
                                          </div>
                                        ))
                                      )}
                                    </div>
                                  </AccordionContent>
                                </AccordionItem>

                                {/* Section 4: Galerie photos */}
                                <AccordionItem value="gallery" className="border-2 border-gray-200 rounded-xl px-4">
                                  <AccordionTrigger className="hover:no-underline">
                                    <div className="flex items-center gap-3">
                                      <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center">
                                        <Camera className="w-4 h-4 text-sonatel-orange" />
                                      </div>
                                      <div className="text-left">
                                        <h4 className="font-black text-sm uppercase tracking-wider text-gray-900">Galerie de preuves</h4>
                                        <p className="text-[10px] font-medium text-gray-500">{allPhotos.length} photos collectées</p>
                                      </div>
                                    </div>
                                  </AccordionTrigger>
                                  <AccordionContent>
                                    <div className="pt-2">
                                      {allPhotos.length === 0 ? (
                                        <div className="text-center py-4">
                                          <ImageIcon className="w-8 h-8 text-gray-300 mx-auto mb-1" />
                                          <p className="text-sm font-bold text-gray-900">Aucune photo</p>
                                          <p className="text-[10px] text-gray-500">Aucune preuve photographique enregistrée</p>
                                        </div>
                                      ) : (
                                        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                                          {allPhotos.map((photo: string, idx: number) => (
                                            <button
                                              key={idx}
                                              onClick={() => viewProofs(allPhotos as string[], idx)}
                                              className="aspect-square rounded-xl overflow-hidden border-2 border-gray-100 hover:border-orange-400 hover:shadow-md transition-all"
                                            >
                                              <img src={photo} alt={`Preuve ${idx + 1}`} className="w-full h-full object-cover" />
                                            </button>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  </AccordionContent>
                                </AccordionItem>
                              </Accordion>
                            </CardContent>
                          )}
                        </Card>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Questionnaire Tab */}
          <TabsContent value="questionnaire">
            {loadingQuestions ? <SectionLoader /> : (
              <div className="space-y-6">
                {/* Rubrique Histogram - Shows compliance rates per rubric */}
                {site?.id && (
                  <div className="mb-6">
                    <RubriqueHistogram siteId={site.id} inspections={inspections} />
                  </div>
                )}

                <Card className="rounded-[2.5rem] border-2 border-gray-100 overflow-hidden shadow-sm">
                  <CardHeader className="bg-gray-50/50 border-b border-gray-100 p-8">
                    <CardTitle className="flex items-center justify-between flex-wrap gap-4 text-xl font-black uppercase tracking-tight">
                      <div className="flex items-center gap-4">
                        <div className="p-3 rounded-2xl bg-white shadow-sm ring-1 ring-gray-100">
                          <ClipboardList className="h-6 w-6 text-sonatel-orange" />
                        </div>
                        <span>Questionnaire d'audit</span>
                      </div>
                      {/* Selector for inspection */}
                      <select
                        className="px-6 py-3 border-2 border-gray-100 rounded-2xl text-sm bg-white font-bold text-gray-700 focus:border-sonatel-orange transition-all outline-none"
                        value={selectedInspectionId}
                        onChange={(e) => setSelectedInspectionId(e.target.value)}
                      >
                        <option value="">Choisir une inspection...</option>
                        {inspections.map(insp => (
                          <option key={insp.id} value={insp.id}>
                            Audit du {insp.date} • {insp.score}%
                          </option>
                        ))}
                      </select>
                    </CardTitle>
                    <div className="flex gap-3 mt-6 flex-wrap">
                      <Badge className="bg-emerald-500 text-white border-0 px-4 py-1.5 rounded-xl font-black text-[10px] uppercase tracking-wider">
                        {filteredQuestions.filter(q => q.reponse === 'Conforme').length} Conformes
                      </Badge>
                      <Badge className="bg-amber-500 text-white border-0 px-4 py-1.5 rounded-xl font-black text-[10px] uppercase tracking-wider">
                        {filteredQuestions.filter(q => q.reponse === 'Observation').length} Observations
                      </Badge>
                      <Badge className="bg-red-500 text-white border-0 px-4 py-1.5 rounded-xl font-black text-[10px] uppercase tracking-wider">
                        {filteredQuestions.filter(q => q.reponse === 'Non conforme').length} Non conformes
                      </Badge>
                      {filteredQuestions.some(q => q.preuve) && (
                        <Badge className="bg-sonatel-orange text-white border-0 px-4 py-1.5 rounded-xl font-black text-[10px] uppercase tracking-wider">
                          <Camera className="w-3 h-3 mr-2" />
                          {filteredQuestions.filter(q => q.preuve).length} Photos
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="p-8">
                    {selectedInspectionId === '' ? (
                      <div className="text-center py-20 flex flex-col items-center gap-4 bg-gray-50/50 rounded-[2rem] border-2 border-dashed border-gray-200">
                        <div className="w-16 h-16 rounded-3xl bg-white shadow-sm flex items-center justify-center text-gray-300">
                          <History className="w-8 h-8" />
                        </div>
                        <p className="text-sm font-black text-gray-400 uppercase tracking-widest">Sélectionnez une inspection pour voir la grille d'audit</p>
                      </div>
                    ) : filteredQuestions.length === 0 ? (
                      <div className="text-center py-20 flex flex-col items-center gap-4 bg-gray-50/50 rounded-[2rem] border-2 border-dashed border-gray-200">
                        <AlertCircle className="w-12 h-12 text-gray-300" />
                        <p className="text-sm font-black text-gray-400 uppercase tracking-widest">Aucune donnée trouvée pour cet audit</p>
                      </div>
                    ) : (
                      <>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
                          <div className="p-6 bg-white rounded-3xl border-2 border-gray-50 shadow-sm flex flex-col items-center gap-2">
                            <span className="text-4xl font-black text-emerald-500">{filteredQuestions.filter(q => q.reponse === 'Conforme').length}</span>
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Conformes</span>
                          </div>
                          <div className="p-6 bg-white rounded-3xl border-2 border-gray-50 shadow-sm flex flex-col items-center gap-2">
                            <span className="text-4xl font-black text-amber-500">{filteredQuestions.filter(q => q.reponse === 'Observation').length}</span>
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Observations</span>
                          </div>
                          <div className="p-6 bg-white rounded-3xl border-2 border-gray-50 shadow-sm flex flex-col items-center gap-2">
                            <span className="text-4xl font-black text-red-500">{filteredQuestions.filter(q => q.reponse === 'Non conforme').length}</span>
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Défauts</span>
                          </div>
                          <div className="p-6 bg-white rounded-3xl border-2 border-gray-50 shadow-sm flex flex-col items-center gap-2">
                            <span className="text-4xl font-black text-sonatel-orange">{filteredQuestions.filter(q => q.preuve).length}</span>
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Preuves</span>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Détail des réponses</p>
                          {filteredQuestions.map((q, idx) => (
                            <div key={idx} className="flex items-start gap-4 p-5 bg-white rounded-3xl border-2 border-gray-50 shadow-sm hover:border-orange-200 transition-all group">
                              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-sm font-black shrink-0 ${q.reponse === 'Conforme' ? 'bg-emerald-50 text-emerald-600' : q.reponse === 'Non conforme' ? 'bg-red-50 text-red-600' : 'bg-gray-50 text-gray-500'}`}>
                                {idx + 1}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-4 mb-2">
                                  <div>
                                    <h5 className="text-base font-bold text-gray-900 leading-tight mb-1">{q.question}</h5>
                                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">{q.categorie}</p>
                                  </div>
                                  <div className="flex flex-col items-end gap-2 shrink-0">
                                    {getReponseBadge(q.reponse)}
                                    {q.preuve && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 px-2 rounded-xl text-sonatel-orange bg-orange-50 hover:bg-orange-100 flex items-center gap-2"
                                        onClick={() => viewProof(q.preuve as string)}
                                      >
                                        <Camera className="w-3.5 h-3.5" />
                                        <span className="text-[10px] font-black uppercase">Voir preuve</span>
                                      </Button>
                                    )}
                                  </div>
                                </div>

                                {(q.observation || q.recommendation) && (
                                  <div className="mt-4 grid md:grid-cols-2 gap-4">
                                    {q.observation && (
                                      <div className="p-3 bg-gray-50 rounded-2xl border border-gray-100">
                                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Observation</p>
                                        <p className="text-xs text-gray-600 italic leading-relaxed">"{q.observation}"</p>
                                      </div>
                                    )}
                                    {q.recommendation && (
                                      <div className="p-3 bg-emerald-50/50 rounded-2xl border border-emerald-100">
                                        <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-1">Recommandation</p>
                                        <p className="text-xs text-gray-700 leading-relaxed font-medium">{q.recommendation}</p>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          {/* Non-conformities Tab */}
          <TabsContent value="nonconformites">
            {loadingQuestions ? <SectionLoader /> : (
              <Card className="rounded-[2.5rem] border-2 border-gray-100 overflow-hidden shadow-sm">
                <CardHeader className="bg-gray-50/50 border-b border-gray-100 p-8">
                  <CardTitle className="flex items-center justify-between text-xl font-black uppercase tracking-tight">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-2xl bg-white shadow-sm ring-1 ring-gray-100">
                        <AlertTriangle className="h-6 w-6 text-red-500" />
                      </div>
                      <span>Gestion des non-conformités</span>
                    </div>
                    <Button className="bg-orange-500 hover:bg-orange-600 rounded-2xl px-6 py-6 font-black uppercase tracking-widest text-[10px]">
                      <Plus className="h-4 w-4 mr-2" />
                      Nouveau signalement
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="hidden md:block">
                    <Table>
                      <TableHeader className="bg-gray-50/30">
                        <TableRow className="border-b-2 border-gray-50 hover:bg-transparent">
                          <TableHead className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400">Description</TableHead>
                          <TableHead className="py-5 text-[10px] font-black uppercase tracking-widest text-gray-400">Criticité</TableHead>
                          <TableHead className="py-5 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {nonConformites.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={3} className="py-20 text-center font-black text-gray-300 uppercase tracking-[0.2em]">Aucun défaut détecté</TableCell>
                          </TableRow>
                        ) : nonConformites.map((nc) => (
                          <TableRow key={nc.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-all">
                            <TableCell className="px-8 py-6 font-bold text-gray-900 max-w-md leading-relaxed">{nc.description}</TableCell>
                            <TableCell className="py-6">{getNonConformiteCriticiteBadge(nc.criticite)}</TableCell>
                            <TableCell className="px-8 py-6 text-right">
                              <div className="flex justify-end gap-2">
                                <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl text-gray-400 hover:text-sonatel-orange transition-colors"><Eye className="h-4 w-4" /></Button>
                                <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl text-gray-400 hover:text-sonatel-orange transition-colors"><Download className="h-4 w-4" /></Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Mobile NC View */}
                  <div className="md:hidden divide-y divide-gray-100">
                    {nonConformites.length === 0 ? (
                      <div className="p-12 text-center text-gray-300 font-black uppercase text-[10px] tracking-widest">Aucun défaut</div>
                    ) : nonConformites.map((nc) => (
                      <div key={`mob-nc-${nc.id}`} className="p-5 space-y-3">
                        <div className="flex justify-between items-start gap-3">
                          <p className="font-bold text-sm text-gray-900 leading-tight flex-1">{nc.description}</p>
                          {getNonConformiteCriticiteBadge(nc.criticite)}
                        </div>
                        <div className="flex items-center justify-between pt-2">
                          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{nc.statut}</span>
                          <div className="flex gap-1">
                            <Button variant="outline" size="sm" className="h-8 rounded-lg text-[10px] border-gray-100">Détails</Button>
                            <Button variant="outline" size="sm" className="h-8 rounded-lg text-[10px] border-gray-100"><Download className="h-3 w-3" /></Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Actions Tab */}
          <TabsContent value="actions">
            {loadingActions ? <SectionLoader /> : (
              <Card className="rounded-[2.5rem] border-2 border-gray-100 overflow-hidden shadow-sm">
                <CardHeader className="bg-gray-50/50 border-b border-gray-100 p-8">
                  <CardTitle className="flex items-center justify-between text-xl font-black uppercase tracking-tight">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-2xl bg-white shadow-sm ring-1 ring-gray-100">
                        <TrendingUp className="h-6 w-6 text-emerald-500" />
                      </div>
                      <span>Plan d'action correctif</span>
                    </div>
                    <Button className="bg-emerald-500 hover:bg-emerald-600 rounded-2xl px-6 py-6 font-black uppercase tracking-widest text-[10px]">
                      <Plus className="h-4 w-4 mr-2" />
                      Nouvelle action
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="hidden lg:block overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-gray-50/30">
                        <TableRow className="border-b-2 border-gray-50 hover:bg-transparent">
                          <TableHead className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400">Description</TableHead>
                          <TableHead className="py-5 text-[10px] font-black uppercase tracking-widest text-gray-400">Responsable</TableHead>
                          <TableHead className="py-5 text-[10px] font-black uppercase tracking-widest text-gray-400">Échéance</TableHead>
                          <TableHead className="py-5 text-[10px] font-black uppercase tracking-widest text-gray-400">Priorité</TableHead>
                          <TableHead className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">Statut</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {actions.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="py-20 text-center font-black text-gray-300 uppercase tracking-[0.2em]">Aucun plan d'action requis</TableCell>
                          </TableRow>
                        ) : actions.map((action) => (
                          <TableRow key={action.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-all">
                            <TableCell className="px-8 py-6 font-bold text-gray-900 max-w-md leading-relaxed">{action.description}</TableCell>
                            <TableCell className="py-6">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center font-black text-[10px] text-gray-500">
                                  {action.responsable.substring(0, 2).toUpperCase()}
                                </div>
                                <span className="font-bold text-gray-700">{action.responsable}</span>
                              </div>
                            </TableCell>
                            <TableCell className="py-6">
                              <div className="flex items-center gap-2 text-gray-500 font-bold">
                                <Calendar className="w-3 h-3" />
                                <span>{action.echeance}</span>
                              </div>
                            </TableCell>
                            <TableCell className="py-6">{getCriticiteBadge(action.criticite)}</TableCell>
                            <TableCell className="px-8 py-6 text-right">{getActionStatusBadge(action.statut)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Mobile Actions View */}
                  <div className="lg:hidden divide-y divide-gray-100">
                    {actions.length === 0 ? (
                      <div className="p-12 text-center text-gray-300 font-black uppercase text-[10px] tracking-widest font-bold">Aucune action requise</div>
                    ) : actions.map((action) => (
                      <div key={`mob-act-${action.id}`} className="p-5 space-y-4">
                        <p className="font-bold text-sm text-gray-900 leading-tight">{action.description}</p>
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center font-black text-[8px] text-gray-500">
                              {action.responsable.substring(0, 2).toUpperCase()}
                            </div>
                            <span className="text-[10px] font-bold text-gray-500">{action.responsable}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400">
                            <Calendar className="w-3 h-3" />
                            <span>{action.echeance}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {getCriticiteBadge(action.criticite)}
                          {getActionStatusBadge(action.statut)}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Preuves Tab */}
          <TabsContent value="proofs">
            {loadingPhotos ? <SectionLoader message="Récupération des preuves..." /> : (
              <Card className="rounded-[2.5rem] border-2 border-gray-100 overflow-hidden shadow-sm">
                <CardHeader className="bg-gray-50/50 border-b border-gray-100 p-8">
                  <CardTitle className="flex items-center justify-between text-xl font-black uppercase tracking-tight">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-2xl bg-white shadow-sm ring-1 ring-gray-100">
                        <Camera className="h-6 w-6 text-sonatel-orange" />
                      </div>
                      <span>Archives de Preuves</span>
                    </div>
                    <Button className="bg-sonatel-orange hover:bg-orange-600 rounded-2xl px-6 py-6 font-black uppercase tracking-widest text-[10px]">
                      <Plus className="h-4 w-4 mr-2" />
                      Ajouter une preuve
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {realProofPhotos.map((photo, idx) => (
                      <div key={idx} className="group relative aspect-square rounded-[2rem] overflow-hidden border-4 border-white shadow-md transition-all hover:shadow-xl hover:-translate-y-1">
                        <img src={photo} alt={`Preuve ${idx + 1}`} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-6">
                          <Button variant="secondary" size="sm" className="w-full rounded-xl font-black text-[10px] uppercase tracking-widest" onClick={() => viewProof(photo)}>Visualiser</Button>
                        </div>
                      </div>
                    ))}
                    {realProofPhotos.length === 0 && (
                      <div className="col-span-full py-20 text-center font-black text-gray-300 uppercase tracking-[0.2em] bg-gray-50/50 rounded-[2rem] border-2 border-dashed border-gray-200">
                        Aucun fichier multimédia archivé
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Analysis Tab */}
          <TabsContent value="analysis">
            {loadingInspections ? <SectionLoader /> : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Évolution du score - Courbe */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-orange-500" />
                      Courbe d'évolution du score
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {/* SVG Line Chart */}
                    <div className="relative h-64 w-full">
                      <svg className="w-full h-full" viewBox="0 0 400 200" preserveAspectRatio="none">
                        {/* Grid lines */}
                        {[0, 25, 50, 75, 100].map((val) => (
                          <g key={val}>
                            <line
                              x1="40"
                              y1={200 - val * 1.8}
                              x2="380"
                              y2={200 - val * 1.8}
                              stroke="#e5e7eb"
                              strokeWidth="1"
                              strokeDasharray="4"
                            />
                            <text x="35" y={200 - val * 1.8 + 4} textAnchor="end" className="text-xs fill-gray-400">
                              {val}%
                            </text>
                          </g>
                        ))}

                        {/* Line connecting points */}
                        <polyline
                          fill="none"
                          stroke="#f97316"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          points={inspections
                            .slice()
                            .reverse()
                            .map((insp, i) => {
                              const x = 60 + i * 80;
                              const y = 200 - insp.score * 1.8;
                              return `${x},${y}`;
                            })
                            .join(' ')}
                        />

                        {/* Area under curve */}
                        <polygon
                          fill="url(#gradient)"
                          points={`60,200 ${inspections
                            .slice()
                            .reverse()
                            .map((insp, i) => {
                              const x = 60 + i * 80;
                              const y = 200 - insp.score * 1.8;
                              return `${x},${y}`;
                            })
                            .join(' ')} 380,200`}
                        />

                        {/* Gradient definition */}
                        <defs>
                          <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="#f97316" stopOpacity="0.3" />
                            <stop offset="100%" stopColor="#f97316" stopOpacity="0.05" />
                          </linearGradient>
                        </defs>

                        {/* Data points */}
                        {inspections
                          .slice()
                          .reverse()
                          .map((insp, i) => {
                            const x = 60 + i * 80;
                            const y = 200 - insp.score * 1.8;
                            return (
                              <g key={insp.id}>
                                <circle
                                  cx={x}
                                  cy={y}
                                  r="6"
                                  fill="white"
                                  stroke="#f97316"
                                  strokeWidth="3"
                                />
                                <text
                                  x={x}
                                  y={y - 12}
                                  textAnchor="middle"
                                  className="text-xs font-bold fill-orange-600"
                                >
                                  {insp.score}%
                                </text>
                              </g>
                            );
                          })}
                      </svg>

                      {/* X-axis labels */}
                      <div className="absolute bottom-0 left-0 right-0 flex justify-between px-8">
                        {inspections
                          .slice()
                          .reverse()
                          .map((insp) => (
                            <span key={insp.id} className="text-xs text-gray-500">
                              {insp.date}
                            </span>
                          ))}
                      </div>
                    </div>

                    {/* Legend */}
                    <div className="flex items-center justify-center gap-4 mt-4 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                        <span>≥ 80% Conforme</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                        <span>60-79% Partiel</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500"></div>
                        <span>&lt; 60% Non conforme</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Statistiques */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5 text-orange-500" />
                      Statistiques
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <span className="text-gray-600">Score moyen</span>
                        <span className="text-2xl font-bold text-orange-600">
                          {totalInspections > 0 ? averageScore : 0}%
                        </span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <span className="text-gray-600">Nombre d'inspections</span>
                        <span className="text-2xl font-bold text-sonatel-orange">{inspections.length}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <span className="text-gray-600">Dernière inspection</span>
                        <span className="text-lg font-semibold">{inspections[0]?.date || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <span className="text-gray-600">Évolution</span>
                        <span className={`text-lg font-bold ${inspections.length > 1 ? (inspections[0]?.score >= inspections[1]?.score ? 'text-green-600' : 'text-red-600') : 'text-gray-600'} flex items-center gap-1`}>
                          {inspections.length > 1 ? (inspections[0]?.score >= inspections[1]?.score ? '↑' : '↓') : '-'}
                          {inspections.length > 1 ? Math.abs(inspections[0]?.score - inspections[1]?.score) : 0}%
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Répartition des non-conformités */}
                <Card className="md:col-span-2">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertCircle className="h-5 w-5 text-orange-500" />
                      Répartition des non-conformités
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center p-4 bg-red-50 rounded-lg">
                        <div className="text-3xl font-bold text-red-600">{actions.filter(a => a.criticite === 'Haute' || a.criticite === 'CRITIQUE').length}</div>
                        <div className="text-sm text-red-700">Criticité Haute</div>
                      </div>
                      <div className="text-center p-4 bg-yellow-50 rounded-lg">
                        <div className="text-3xl font-bold text-yellow-600">{actions.filter(a => a.criticite === 'Moyenne' || a.criticite === 'MAJEUR').length}</div>
                        <div className="text-sm text-yellow-700">Criticité Moyenne</div>
                      </div>
                      <div className="text-center p-4 bg-orange-50 rounded-lg">
                        <div className="text-3xl font-bold text-sonatel-orange">{actions.filter(a => a.criticite === 'Basse' || a.criticite === 'MINEUR').length}</div>
                        <div className="text-sm text-orange-700">Criticité Basse</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* New Inspection Dialog */}
      <Dialog open={showNewInspectionDialog} onOpenChange={setShowNewInspectionDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nouvelle inspection</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-gray-600">
              Lancer une nouvelle inspection sur le site <strong>{currentSite.nom}</strong>.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewInspectionDialog(false)}>Annuler</Button>
            <Button className="bg-orange-500 hover:bg-orange-600">Lancer l'inspection</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Photo Lightbox for proof viewing */}
      <PhotoLightbox
        photos={proofPhotos}
        initialIndex={proofIndex}
        isOpen={proofViewerOpen}
        onClose={() => setProofViewerOpen(false)}
      />
      {/* Bottom Offline banner */}
      {!isReachable && (
        <div className="fixed bottom-0 left-0 right-0 bg-red-600 text-white p-3 z-[100] flex items-center justify-center gap-4 animate-in slide-in-from-bottom duration-300">
          <div className="flex items-center gap-2">
            <XCircle className="w-5 h-5 animate-pulse" />
            <span className="font-black text-xs uppercase tracking-widest text-white">Le serveur est injoignable — Données locales utilisées</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default DetailSite;
