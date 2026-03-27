import React, { useState, useEffect, useMemo } from "react";
import {
  Search, Plus, Filter, Building, MapPin, ChevronRight,
  MoreHorizontal, Trash, Edit, LayoutGrid, Map as MapIcon, Navigation, List, Calendar
} from "lucide-react";
import { siteService, Site, Region } from "@/services/SiteService";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Correction pour les icônes Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

// Senegal Regions - matching database values
const REGIONS: Region[] = [
  { id: 1, nom_region: "Dakar" },
  { id: 2, nom_region: "Thies" },
  { id: 3, nom_region: "Diourbel" },
  { id: 4, nom_region: "Fatick" },
  { id: 5, nom_region: "Kaolack" },
  { id: 6, nom_region: "Kédougou" },
  { id: 7, nom_region: "Kolda" },
  { id: 8, nom_region: "Louga" },
  { id: 9, nom_region: "Matam" },
  { id: 10, nom_region: "Saint Louis" },
  { id: 11, nom_region: "Tambacounda" },
  { id: 12, nom_region: "Ziguinchor" },
  { id: 13, nom_region: "Sédhiou" },
  { id: 14, nom_region: "Kaffrine" },
  { id: 15, nom_region: "Podor" },
  { id: 16, nom_region: "Richard Toll" }
];

// Coordonnées réelles des régions au Sénégal
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

// Types for the component
interface SiteWithRegion extends Site {
  regionName?: string;
  batimentCount?: number;
}

const SitesPage: React.FC = () => {
  const navigate = useNavigate();
  const [sites, setSites] = useState<SiteWithRegion[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [page, setPage] = useState<number>(1);
  const [perPage] = useState<number>(12);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalItems, setTotalItems] = useState<number>(0);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [regionFilter, setRegionFilter] = useState<string>("");
  const [periodFilter, setPeriodFilter] = useState<string>("");

  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [currentSite, setCurrentSite] = useState<SiteWithRegion | null>(null);
  const [formData, setFormData] = useState({
    nom: "",
    code: "",
    zone: "Dakar",
    type: "Technique",
    status: "actif",
    localisation: ""
  });

  const [viewMode, setViewMode] = useState<"grid" | "map" | "list">("grid");
  const [initialLoading, setInitialLoading] = useState<boolean>(true);
  const [mapMounted, setMapMounted] = useState(false);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Handle map mounting - mount only once when map view is visited
  useEffect(() => {
    if (viewMode === "map" && !mapMounted) {
      setMapMounted(true);
    }
  }, [viewMode, mapMounted]);

  // Fetch sites
  useEffect(() => {
    const fetchSites = async () => {
      // Don't show loading if we have cache
      const filters: any = {};
      if (searchTerm) filters.nom_site = searchTerm;
      if (regionFilter && regionFilter !== "all") filters.nom_region = regionFilter;
      if (statusFilter && statusFilter !== "all") filters.status = statusFilter;

      const cacheKey = `?page=${page}&limit=${perPage}${regionFilter !== 'all' ? `&regionId=${regionFilter}` : ''}&tri=desc&search=${searchTerm}`;
      const cached = siteService.getCachedResponse<any>(cacheKey);

      if (cached?.data) {
        const sitesWithRegion: SiteWithRegion[] = (cached.data || []).map((site: any) => ({
          ...site,
          regionName: site.zone || (site as any).nom_region || "Sans région",
          batimentCount: site.batiments?.length || 0
        }));
        setSites(sitesWithRegion);
        setTotalPages(cached.pagination?.pages || 1);
        setTotalItems(cached.pagination?.total || 0);
        setLoading(false);
        setInitialLoading(false);
      } else {
        setLoading(true);
      }

      try {
        const response = await siteService.getAllSites(page, perPage, filters);
        if (response.data) {
          // Add region info to each site
          const sitesWithRegion: SiteWithRegion[] = (response.data.data || []).map(site => ({
            ...site,
            regionName: site.zone || (site as any).nom_region || "Sans région",
            batimentCount: site.batiments?.length || 0
          }));
          setSites(sitesWithRegion);
          setTotalPages(response.data.lastPage || 1);
          setTotalItems(response.data.total || 0);
        }
      } catch (error) {
        console.error("Erreur lors de la récupération des sites", error);
        if (!cached) toast.error("Erreur lors du chargement des sites");
      } finally {
        setLoading(false);
        setInitialLoading(false);
      }
    };
    fetchSites();
  }, [page, perPage, searchTerm, regionFilter, statusFilter, periodFilter, refreshTrigger]);

  // Refresh the sites list
  const refreshList = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  // Group sites by region
  const groupedSites: Record<string, SiteWithRegion[]> = useMemo(() => {
    return sites.reduce((acc, site) => {
      const regionName = site.regionName || "Sans région";
      if (!acc[regionName]) acc[regionName] = [];
      acc[regionName].push(site);
      return acc;
    }, {} as Record<string, SiteWithRegion[]>);
  }, [sites]);

  // Load more
  const handleLoadMore = async () => {
    if (page < totalPages) {
      setLoading(true);
      try {
        const nextPage = page + 1;
        const filters: any = {};
        if (searchTerm) filters.nom_site = searchTerm;
        if (regionFilter && regionFilter !== "all") filters.nom_region = regionFilter;
        if (statusFilter && statusFilter !== "all") filters.status = statusFilter;

        const response = await siteService.getAllSites(nextPage, perPage, filters);
        if (response.data?.data) {
          const newSites: SiteWithRegion[] = response.data.data.map(site => ({
            ...site,
            regionName: site.zone || (site as any).nom_region || "Sans région",
            batimentCount: site.batiments?.length || 0
          }));
          setSites(prev => [...prev, ...newSites]);
          setPage(nextPage);
        }
      } catch (error) {
        console.error("Erreur LoadMore", error);
      } finally {
        setLoading(false);
      }
    }
  };

  // Modal handlers
  const openCreateModal = () => {
    setFormData({
      nom: "",
      code: "",
      zone: "Dakar",
      type: "Technique",
      status: "actif",
      localisation: ""
    });
    setModalMode("create");
    setIsModalOpen(true);
  };

  const openEditModal = async (site: SiteWithRegion) => {
    setCurrentSite(site);
    setFormData({
      nom: site.nom || site.nom_site || "",
      code: site.code || "",
      zone: site.zone || site.region?.nom_region || "Dakar",
      type: site.type || "Technique",
      status: site.status || "actif",
      localisation: site.localisation || ""
    });
    setModalMode("edit");
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (modalMode === "create") {
        await siteService.createSite(formData);
        toast.success("Site créé avec succès");
      } else if (modalMode === "edit" && currentSite) {
        await siteService.updateSite(currentSite.id, formData);
        toast.success("Site mis à jour avec succès");
      }
      refreshList();
      setIsModalOpen(false);
    } catch (error) {
      console.error(error);
      toast.error("Erreur lors de l'opération");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSite = async (siteId: string) => {
    if (window.confirm("Supprimer ce site ?")) {
      try {
        setLoading(true);
        await siteService.deleteSite(siteId);
        toast.success("Site supprimé avec succès");
        refreshList();
      } catch (error) {
        console.error(error);
        toast.error("Erreur lors de la suppression");
      } finally {
        setLoading(false);
      }
    }
  };

  const navigateToSiteDetail = (siteId: string) => {
    navigate(`/sites/${siteId}`);
  };

  // Render skeleton
  const renderSkeletons = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {Array.from({ length: 8 }).map((_, index) => (
        <Card key={index} className="overflow-hidden">
          <CardHeader className="pb-2">
            <Skeleton className="h-6 w-3/4" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-4 w-1/2 mb-2" />
            <Skeleton className="h-4 w-2/3" />
          </CardContent>
        </Card>
      ))}
    </div>
  );

  return (
    <div className="h-full flex flex-col space-y-6 p-4 md:p-6 bg-gray-50/30 overflow-hidden">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-4xl font-black tracking-tight text-gray-900 flex items-center gap-3 leading-tight">
            <span className="w-1.5 md:w-2 h-6 md:h-8 bg-orange-500 rounded-full shrink-0"></span>
            Gestion des Sites
          </h1>
          <p className="text-sm md:text-base text-gray-500 mt-1 md:ml-5 font-bold">
            Gérez et surveillez vos installations
          </p>
        </div>

        <Button
          onClick={openCreateModal}
          className="w-full md:w-auto bg-orange-500 hover:bg-orange-600 text-white font-black uppercase text-xs tracking-widest h-11 md:h-10 rounded-xl"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nouveau Site
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-3 md:p-4 flex items-center justify-between gap-3 md:gap-4 flex-wrap shadow-sm">
        <div className="flex items-center gap-3 md:gap-4 flex-1 flex-wrap w-full">
          {/* Search */}
          <div className="relative w-full md:flex-1 md:min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Rechercher par nom..."
              className="pl-10 h-10 md:h-9 border-2 border-gray-100 rounded-xl font-bold"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Region Filter */}
          <Select value={regionFilter || "all"} onValueChange={(value) => setRegionFilter(value === "all" ? "" : value)}>
            <SelectTrigger className="w-full md:w-[200px]">
              <MapPin className="h-4 w-4 mr-2 text-gray-400" />
              <SelectValue placeholder="Toutes les régions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les régions</SelectItem>
              {REGIONS.map(r => (
                <SelectItem key={r.id} value={r.nom_region}>{r.nom_region}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Status Filter */}
          <Select value={statusFilter || "all"} onValueChange={(value) => setStatusFilter(value === "all" ? "" : value)}>
            <SelectTrigger className="w-full md:w-[180px]">
              <Filter className="h-4 w-4 mr-2 text-gray-400" />
              <SelectValue placeholder="Tous les statuts" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              <SelectItem value="actif">Actif</SelectItem>
              <SelectItem value="inactif">Inactif</SelectItem>
            </SelectContent>
          </Select>

          {/* Period Filter */}
          <Select value={periodFilter || "all"} onValueChange={(value) => setPeriodFilter(value === "all" ? "" : value)}>
            <SelectTrigger className="w-full md:w-[180px]">
              <Calendar className="h-4 w-4 mr-2 text-gray-400" />
              <SelectValue placeholder="Période" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les périodes</SelectItem>
              <SelectItem value="month">Ce mois</SelectItem>
              <SelectItem value="quarter">Ce trimestre</SelectItem>
              <SelectItem value="year">Cette année</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center bg-gray-100 p-1 rounded-lg">
          <Button
            variant={viewMode === "grid" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("grid")}
            className={viewMode === "grid" ? "bg-orange-500" : ""}
          >
            <LayoutGrid className="h-4 w-4 mr-1" />
            Grille
          </Button>
          <Button
            variant={viewMode === "list" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("list")}
            className={viewMode === "list" ? "bg-orange-500" : ""}
          >
            <List className="h-4 w-4 mr-1" />
            Liste
          </Button>
          <Button
            variant={viewMode === "map" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("map")}
            className={viewMode === "map" ? "bg-orange-500" : ""}
          >
            <MapIcon className="h-4 w-4 mr-1" />
            Carte
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="flex flex-wrap gap-2 md:gap-4 text-xs md:text-base text-gray-500 font-bold px-1">
        <Badge variant="outline" className="border-gray-200 text-gray-400 font-black">{totalItems} site{totalItems !== 1 ? 's' : ''}</Badge>
        {regionFilter && regionFilter !== "all" && <Badge className="bg-orange-50 text-sonatel-orange border-sonatel-orange/20 font-black uppercase text-[10px]">{regionFilter}</Badge>}
        {statusFilter && statusFilter !== "all" && <Badge className="bg-emerald-50 text-emerald-600 border-emerald-100 font-black uppercase text-[10px]">{statusFilter}</Badge>}
      </div>

      {/* Sites List */}
      <div className={`flex-1 overflow-y-auto px-1 pb-24 md:pb-16 ${viewMode === 'map' ? 'overflow-hidden' : ''}`}>

        {/* ═══ GRID VIEW ═══ */}
        <div style={{ display: viewMode === 'grid' ? 'block' : 'none' }}>
          {initialLoading ? (
            renderSkeletons()
          ) : Object.entries(groupedSites).length > 0 ? (
            Object.entries(groupedSites).map(([regionName, regionSites]) => (
              <div key={regionName} className="mb-6 md:mb-8">
                {/* Region Header */}
                <div className="flex items-center gap-3 mb-3 md:mb-4">
                  <h2 className="text-lg md:text-2xl font-black text-gray-900">{regionName}</h2>
                  <Badge variant="secondary" className="bg-orange-50 text-orange-600 text-[10px] px-2 py-0.5 font-black">
                    {regionSites.length}
                  </Badge>
                  <div className="flex-1 h-px bg-gray-200" />
                </div>

                {/* ── Mobile: Liste compacte ── */}
                <div className="md:hidden bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden divide-y divide-gray-50">
                  {regionSites.map((site) => (
                    <div
                      key={site.id}
                      onClick={() => navigateToSiteDetail(site.id)}
                      className="flex items-center gap-3 px-4 py-3.5 active:bg-orange-50/60 cursor-pointer transition-colors"
                    >
                      <div className="bg-orange-50 p-2 rounded-xl shrink-0">
                        <Building className="h-4 w-4 text-orange-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-black text-gray-900 truncate leading-tight">{site.nom_site || site.nom}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <div className={`h-1.5 w-1.5 rounded-full shrink-0 ${site.status === 'actif' ? 'bg-green-500' : 'bg-red-500'}`} />
                          <span className="text-[10px] font-bold text-gray-400 uppercase truncate">{site.regionName}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          className="p-2 rounded-xl text-gray-300 active:text-orange-500 touch-target"
                          onClick={(e) => { e.stopPropagation(); openEditModal(site); }}
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </button>
                        <button
                          className="p-2 rounded-xl text-gray-300 active:text-red-500 touch-target"
                          onClick={(e) => { e.stopPropagation(); handleDeleteSite(site.id); }}
                        >
                          <Trash className="h-3.5 w-3.5" />
                        </button>
                        <ChevronRight className="h-4 w-4 text-gray-300" />
                      </div>
                    </div>
                  ))}
                </div>

                {/* ── Desktop: Cards ── */}
                <div className="hidden md:grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {regionSites.map((site) => (
                    <Card
                      key={site.id}
                      className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                      onClick={() => navigateToSiteDetail(site.id)}
                    >
                      <CardHeader className="pb-2 flex flex-row items-start justify-between space-y-0">
                        <div className="bg-orange-50 p-2 rounded-lg">
                          <Building className="h-5 w-5 text-orange-500" />
                        </div>
                        <div className="flex">
                          <Button variant="ghost" size="icon" className="h-8 w-8"
                            onClick={(e) => { e.stopPropagation(); openEditModal(site); }}>
                            <Edit className="h-4 w-4 text-gray-400" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8"
                            onClick={(e) => { e.stopPropagation(); handleDeleteSite(site.id); }}>
                            <Trash className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <CardTitle className="text-xl font-black truncate mb-1">{site.nom_site || site.nom}</CardTitle>
                        <div className="flex items-center gap-1 text-sm text-gray-500 mb-3">
                          <MapPin className="h-3 w-3" />
                          {site.regionName}
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className={`h-2 w-2 rounded-full ${site.status === 'actif' ? 'bg-green-500' : 'bg-red-500'}`} />
                            <span className="text-[11px] font-medium text-gray-400 uppercase">{site.status || 'actif'}</span>
                          </div>
                          <Button variant="ghost" size="sm" className="text-orange-500 hover:text-orange-600 h-auto p-0"
                            onClick={(e) => { e.stopPropagation(); navigateToSiteDetail(site.id); }}>
                            Détails <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <Search className="h-16 w-16 mb-4 opacity-20" />
              <p className="text-xl md:text-2xl font-semibold">Aucun résultat</p>
              <p className="text-sm md:text-base">Essayez avec d'autres critères de recherche</p>
            </div>
          )}
        </div>

        {/* ═══ LIST VIEW ═══ */}
        <div style={{ display: viewMode === 'list' ? 'block' : 'none' }}>
          {initialLoading ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-4">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-16 w-full mb-2" />)}</div>
            </div>
          ) : sites.length > 0 ? (
            <>
              {/* ── Mobile: Cards compactes ── */}
              <div className="md:hidden bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden divide-y divide-gray-50">
                {sites.map((site) => (
                  <div
                    key={site.id}
                    onClick={() => navigateToSiteDetail(site.id)}
                    className="flex items-center gap-3 px-4 py-3.5 active:bg-orange-50/60 cursor-pointer transition-colors"
                  >
                    <div className="bg-orange-50 p-2 rounded-xl shrink-0">
                      <Building className="h-4 w-4 text-orange-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-black text-gray-900 truncate leading-tight">{site.nom_site || site.nom}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <div className={`h-1.5 w-1.5 rounded-full shrink-0 ${site.status === 'actif' ? 'bg-green-500' : 'bg-red-500'}`} />
                        <span className="text-[10px] font-bold text-gray-400 uppercase truncate">{site.regionName}</span>
                        {site.code && <span className="text-[10px] font-black text-gray-300 tabular-nums">{site.code}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button className="p-2 rounded-xl text-gray-300 active:text-orange-500"
                        onClick={(e) => { e.stopPropagation(); openEditModal(site); }}>
                        <Edit className="h-3.5 w-3.5" />
                      </button>
                      <button className="p-2 rounded-xl text-gray-300 active:text-red-500"
                        onClick={(e) => { e.stopPropagation(); handleDeleteSite(site.id); }}>
                        <Trash className="h-3.5 w-3.5" />
                      </button>
                      <ChevronRight className="h-4 w-4 text-gray-300" />
                    </div>
                  </div>
                ))}
              </div>

              {/* ── Desktop: Table ── */}
              <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        <th className="text-left px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Site</th>
                        <th className="text-left px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Code</th>
                        <th className="text-left px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Région</th>
                        <th className="text-left px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Bâtiments</th>
                        <th className="text-left px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Statut</th>
                        <th className="text-right px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {sites.map((site) => (
                        <tr key={site.id} className="hover:bg-orange-50/50 cursor-pointer transition-colors"
                          onClick={() => navigateToSiteDetail(site.id)}>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="bg-orange-50 p-2 rounded-lg"><Building className="h-5 w-5 text-orange-500" /></div>
                              <span className="font-black text-base text-gray-900 leading-tight">{site.nom_site || site.nom}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4"><span className="text-sm font-medium text-gray-600">{site.code || '-'}</span></td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2 text-gray-600">
                              <MapPin className="h-4 w-4 text-gray-400" />
                              <span className="text-sm">{site.regionName}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4"><span className="text-sm text-gray-600">{site.batiments?.length || 0}</span></td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <div className={`h-2.5 w-2.5 rounded-full ${site.status === 'actif' ? 'bg-green-500' : 'bg-red-500'}`} />
                              <span className={`text-[11px] font-black uppercase ${site.status === 'actif' ? 'text-green-600' : 'text-red-600'}`}>
                                {site.status || 'actif'}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-gray-400 hover:text-sonatel-orange"
                                onClick={(e) => { e.stopPropagation(); openEditModal(site); }}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-gray-400 hover:text-red-500"
                                onClick={(e) => { e.stopPropagation(); handleDeleteSite(site.id); }}>
                                <Trash className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" className="text-orange-500 hover:text-orange-600 h-auto p-2"
                                onClick={(e) => { e.stopPropagation(); navigateToSiteDetail(site.id); }}>
                                Détails <ChevronRight className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <Search className="h-16 w-16 mb-4 opacity-20" />
              <p className="text-xl font-semibold">Aucun résultat</p>
              <p className="text-sm">Essayez avec d'autres critères de recherche</p>
            </div>
          )}
        </div>

        {/* Map View - mounted once, hidden via CSS when not active */}
        <div style={{ display: viewMode === 'map' ? 'block' : 'none' }}>
          {mapMounted ? (
            <div className="h-[calc(100vh-280px)] min-h-[500px] bg-white rounded-[1.5rem] overflow-hidden shadow-sm border border-gray-100 flex flex-col">
              {/* Surveillance Header */}
              <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-orange-500 to-orange-600">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/20 rounded-xl text-white backdrop-blur">
                      <Navigation className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-white tracking-tight">Surveillance Géographique</h3>
                      <p className="text-orange-100 text-xs font-medium">Monitoring en temps réel des sites</p>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-3 flex-wrap justify-end">
                    <div className="text-center">
                      <p className="text-xl md:text-2xl font-black text-white">{sites.length}</p>
                      <p className="text-[10px] font-bold text-orange-100 uppercase tracking-widest">Sites</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xl md:text-2xl font-black text-green-300">{sites.filter(s => s.status === 'actif').length}</p>
                      <p className="text-[10px] font-bold text-green-100 uppercase tracking-widest">Actifs</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xl md:text-2xl font-black text-red-300">{sites.filter(s => s.status !== 'actif').length}</p>
                      <p className="text-[10px] font-bold text-red-100 uppercase tracking-widest">Inactifs</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Legend */}
              <div className="px-4 py-2 bg-gray-50 border-b border-gray-100 flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]"></div>
                  <span className="text-[11px] font-bold text-gray-600 uppercase">Site Actif</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]"></div>
                  <span className="text-[11px] font-bold text-gray-600 uppercase">Site Inactif</span>
                </div>
              </div>

              <div className="flex-1">
                <MapContainer
                  center={[14.45, -14.45]}
                  zoom={7}
                  scrollWheelZoom={true}
                  className="w-full h-full"
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  {sites.map((site) => {
                    const regionName = site.zone?.toUpperCase() || 'DAKAR';
                    let coords = senegalLocations[regionName] || senegalLocations['DAKAR'];
                    coords = [
                      coords[0] + (Math.random() * 0.1 - 0.05),
                      coords[1] + (Math.random() * 0.1 - 0.05)
                    ] as [number, number];

                    const markerColor = site.status === 'actif' ? 'green' : 'red';
                    const icon = new L.Icon({
                      iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${markerColor}.png`,
                      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                      iconSize: [25, 41],
                      iconAnchor: [12, 41],
                      popupAnchor: [1, -34],
                      shadowSize: [41, 41]
                    });

                    return (
                      <Marker
                        key={site.id}
                        position={coords}
                        icon={icon}
                      >
                        <Popup>
                          <div className="p-2 min-w-[200px]">
                            <h4 className="font-black text-orange-500 text-xl mb-1 uppercase tracking-tight">{site.nom_site || site.nom}</h4>
                            <div className="flex items-center gap-2 text-gray-400 text-[11px] font-bold uppercase tracking-widest mb-3">
                              <MapPin size={11} />
                              {site.zone || 'Sénégal'}
                            </div>
                            <div className="space-y-2 mb-4">
                              <div className="flex items-center justify-between text-xs font-bold text-gray-600">
                                <span>Code</span>
                                <span className="text-gray-900">{site.code}</span>
                              </div>
                              <div className="flex items-center justify-between text-xs font-bold text-gray-600">
                                <span>Bâtiments</span>
                                <span className="text-gray-900">{site.batiments?.length || 0}</span>
                              </div>
                            </div>
                            <Button
                              onClick={() => navigate(`/sites/${site.id}`)}
                              className="w-full py-2 bg-orange-500 text-white rounded-lg text-[11px] font-black uppercase tracking-widest hover:bg-orange-600 transition-colors flex items-center justify-center gap-2"
                            >
                              Voir Détails
                              <ChevronRight size={12} />
                            </Button>
                          </div>
                        </Popup>
                      </Marker>
                    );
                  })}
                </MapContainer>
              </div>
            </div>
          ) : (
            <div className="h-full min-h-[500px] bg-white rounded-xl p-4 animate-pulse">
              <div className="flex items-center justify-center h-full">
                <div className="flex flex-col items-center gap-4">
                  <div className="h-10 w-10 rounded-full border-4 border-orange-500 border-t-transparent animate-spin"></div>
                  <p className="text-sm font-black text-gray-400 uppercase tracking-widest">Initialisation de la carte...</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Load More */}
        {page < totalPages && (
          <div className="mt-8 flex justify-center">
            <Button
              variant="outline"
              onClick={handleLoadMore}
              disabled={loading}
              className="border-orange-500 text-orange-500 hover:bg-orange-50"
            >
              {loading ? "Chargement..." : "Charger plus de sites"}
            </Button>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {modalMode === "create" ? "Nouveau Site" : "Modifier le site"}
            </DialogTitle>
            <DialogDescription>
              {modalMode === "create"
                ? "Ajoutez une nouvelle installation"
                : "Modifiez les informations du site"}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nom">Nom du site</Label>
                  <Input
                    id="nom"
                    value={formData.nom}
                    onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                    placeholder="Ex: CAMPUS SONATEL"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="code">Code</Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="Ex: DK-PLT-001"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="type">Type de site</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) => setFormData({ ...formData, type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choisir un type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Technique">Technique</SelectItem>
                      <SelectItem value="Commercial">Commercial</SelectItem>
                      <SelectItem value="Administratif">Administratif</SelectItem>
                      <SelectItem value="Social">Social</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="zone">Région / Zone</Label>
                  <Select
                    value={formData.zone}
                    onValueChange={(value) => setFormData({ ...formData, zone: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner une zone" />
                    </SelectTrigger>
                    <SelectContent>
                      {REGIONS.map(r => (
                        <SelectItem key={r.id} value={r.nom_region}>{r.nom_region}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="localisation">Localisation précise</Label>
                <Input
                  id="localisation"
                  value={formData.localisation}
                  onChange={(e) => setFormData({ ...formData, localisation: e.target.value })}
                  placeholder="Ex: Boulevard de la République, Dakar"
                />
              </div>

              <div className="space-y-2">
                <Label>Statut</Label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      value="actif"
                      checked={formData.status === "actif"}
                      onChange={() => setFormData({ ...formData, status: "actif" })}
                      className="accent-orange-500"
                    />
                    <span className="text-sm">Actif</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      value="inactif"
                      checked={formData.status === "inactif"}
                      onChange={() => setFormData({ ...formData, status: "inactif" })}
                      className="accent-orange-500"
                    />
                    <span className="text-sm">Inactif</span>
                  </label>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={loading} className="bg-orange-500 hover:bg-orange-600">
                {loading ? "En cours..." : (modalMode === "create" ? "Créer" : "Enregistrer")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SitesPage;
