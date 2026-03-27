import { BaseService, ApiResponse } from './BaseService';

// ========== Types ==========

export interface DashboardKpis {
  tauxConformiteGlobal: number;
  nbInspectionsMois: number;
  nbTotalSites: number;
  nbSitesAudites: number;
  nbSitesConformes: number;
  nbSitesRisque: number;
  nbNonConformitesCritiques: number;
  nbPlanActionsTotal: number;
  nbPlanActionsOuverts: number;
  nbPlanActionsEnRetard: number;
  tauxClotureActions: number;
  nbPlanActionsAValider: number;
  trends?: {
    tauxConformiteGlobal: number;
    sitesRisque: number;
  };
}

export interface SiteCompliance {
  siteId: string;
  siteNom: string;
  zone: string;
  type: string;
  prestataire: string;
  score: number;
  nbNonConformites: number;
  nbActions: number;
  statut: string;
  dernierAudit: string | null;
  horsperiode?: boolean;
}

export interface RegionCompliance {
  zone: string;
  nbSites: number;
  nbSitesAudites: number;
  scoreMoyen: number;
  sitesConformes: number;
  sitesRisque: number;
  sites: { siteId: string; siteNom: string; score: number }[];
}

export interface PrestataireStats {
  prestataire: string;
  nbSites: number;
  nbSitesAudites: number;
  scoreMoyen: number;
  nbNonConformitesCritiques: number;
}

export interface CriticalNonConformite {
  id: string;
  siteId: string;
  siteNom: string;
  zone: string;
  description: string;
  criticite: string;
  dateDetection: string;
  dateEcheance: string;
  statut: string;
  responsable: string;
  inspectionId: string;
  idPlanAction?: string | null;
  notes?: string;
  evidencePhotoUrl?: string;
}

export interface ActionPlanSummary {
  id: string;
  siteId: string;
  siteNom: string;
  zone: string;
  description: string;
  responsableNom: string;
  dateEcheance: string;
  criticite: string;
  statut: string;
  progression: number;
  notes?: string;
}

export interface ActionsStats {
  aFaire: number;
  enCours: number;
  termine: number;
  enRetard: number;
  aValider: number;
  total: number;
}

export interface DetailedSiteData {
  siteId: string;
  siteNom: string;
  region: string;
  type: string;
  prestataire: string;
  tauxConformite: number;
  nbNonConformites: number;
  nbPlanActions: number;
  statutGlobal: string;
  dernierAudit: string | null;
  horsperiode?: boolean;
}

export interface EvolutionData {
  global: { mois: string; moisCourt: string; score: number; hasData: boolean }[];
  parRegion: any[];
  insight?: string;
}

export interface AvailableFilters {
  regions: string[];
  prestataires: string[];
  typesSites: { id: string; name: string }[];
  inspecteurs: { id: string; name: string }[];
  sites: { id: string; nom: string; zone: string; prestataire: string; type: string }[];
}

export interface RubriqueStats {
  name: string;
  score: number;
  conforme: number;
  nonConforme: number;
  tauxConformite: number;
  tauxNonConformite: number;
  couleur: 'red' | 'orange' | 'green' | 'amber' | 'emerald';
}

export interface GlobalStats {
  score: number;
  conforme: number;
  nonConforme: number;
  tauxConformite: number;
  tauxNonConformite: number;
  couleur: 'red' | 'orange' | 'green' | 'amber' | 'emerald';
}

export interface MonthlyRubriqueStats {
  month: string;
  rubricStats: Record<string, { total: number; count: number; conformes: number; nonConformes: number }>;
  globalScore: number;
  totalQuestions: number;
  totalConformes: number;
  totalNonConformes: number;
}

export interface SiteRubriqueStats {
  rubriques: RubriqueStats[];
  global: GlobalStats;
  visitsLast3Months: number;
  monthlyStats: MonthlyRubriqueStats[];
  totalInspections: number;
  lastInspectionDate: string | null;
}

// ========== Dashboard Service ==========

class DashboardService extends BaseService {
  constructor() {
    super('/dashboard');
  }

  /**
   * Get enhanced KPIs with all required metrics
   */
  async getEnhancedKpis(filters?: {
    periode?: string;
    region?: string;
    site?: string;
    inspecteurId?: string;
    prestataire?: string;
    typeSite?: string;
  }): Promise<ApiResponse<DashboardKpis>> {
    const params = new URLSearchParams();
    if (filters?.periode) params.append('periode', filters.periode);
    if (filters?.region) params.append('region', filters.region);
    if (filters?.site) params.append('site', filters.site);
    if (filters?.prestataire) params.append('prestataire', filters.prestataire);
    if (filters?.typeSite) params.append('typeSite', filters.typeSite);

    const queryString = params.toString();
    return this.get<DashboardKpis>(`/kpis${queryString ? `?${queryString}` : ''}`);
  }

  /**
   * Get compliance data by site (bar chart)
   */
  async getConformiteParSite(filters?: {
    region?: string;
    prestataire?: string;
    typeSite?: string;
    periode?: string;
    tri?: 'score_asc' | 'score_desc' | 'nom';
  }): Promise<ApiResponse<SiteCompliance[]>> {
    const params = new URLSearchParams();
    if (filters?.region) params.append('region', filters.region);
    if (filters?.prestataire) params.append('prestataire', filters.prestataire);
    if (filters?.typeSite) params.append('typeSite', filters.typeSite);
    if (filters?.periode) params.append('periode', filters.periode);
    if (filters?.tri) params.append('tri', filters.tri);

    const queryString = params.toString();
    return this.get<SiteCompliance[]>(`/conformite-par-site${queryString ? `?${queryString}` : ''}`);
  }

  /**
   * Get compliance data by region/zone
   */
  async getConformiteParRegion(filters?: {
    periode?: string;
    prestataire?: string;
    typeSite?: string;
  }): Promise<ApiResponse<RegionCompliance[]>> {
    const params = new URLSearchParams();
    if (filters?.periode) params.append('periode', filters.periode);
    if (filters?.prestataire) params.append('prestataire', filters.prestataire);
    if (filters?.typeSite) params.append('typeSite', filters.typeSite);

    const queryString = params.toString();
    return this.get<RegionCompliance[]>(`/conformite-par-region${queryString ? `?${queryString}` : ''}`);
  }

  /**
   * Get compliance data by security company (prestataire)
   */
  async getConformiteParPrestataire(filters?: {
    region?: string;
    typeSite?: string;
    periode?: string;
  }): Promise<ApiResponse<PrestataireStats[]>> {
    const params = new URLSearchParams();
    if (filters?.region) params.append('region', filters.region);
    if (filters?.typeSite) params.append('typeSite', filters.typeSite);
    if (filters?.periode) params.append('periode', filters.periode);

    const queryString = params.toString();
    return this.get<PrestataireStats[]>(`/conformite-par-prestataire${queryString ? `?${queryString}` : ''}`);
  }

  /**
   * Get critical non-conformities list
   */
  async getNonConformitesCritiques(filters?: {
    region?: string;
    prestataire?: string;
    typeSite?: string;
    criticite?: string;
    statut?: string;
  }): Promise<ApiResponse<CriticalNonConformite[]>> {
    const params = new URLSearchParams();
    if (filters?.region) params.append('region', filters.region);
    if (filters?.prestataire) params.append('prestataire', filters.prestataire);
    if (filters?.typeSite) params.append('typeSite', filters.typeSite);
    if (filters?.criticite) params.append('criticite', filters.criticite);
    if (filters?.statut) params.append('statut', filters.statut);

    const queryString = params.toString();
    return this.get<CriticalNonConformite[]>(`/non-conformites-critiques${queryString ? `?${queryString}` : ''}`);
  }

  /**
   * Get action plans list
   */
  async getPlansActions(filters?: {
    region?: string;
    prestataire?: string;
    typeSite?: string;
    statut?: string;
    criticite?: string;
  }): Promise<ApiResponse<ActionPlanSummary[]>> {
    const params = new URLSearchParams();
    if (filters?.region) params.append('region', filters.region);
    if (filters?.prestataire) params.append('prestataire', filters.prestataire);
    if (filters?.typeSite) params.append('typeSite', filters.typeSite);
    if (filters?.statut) params.append('statut', filters.statut);
    if (filters?.criticite) params.append('criticite', filters.criticite);

    const queryString = params.toString();
    return this.get<ActionPlanSummary[]>(`/plans-actions${queryString ? `?${queryString}` : ''}`);
  }

  /**
   * Get action plans statistics (for donut chart)
   */
  async getActionsStats(): Promise<ApiResponse<ActionsStats>> {
    return this.get<ActionsStats>('/actions-stats');
  }

  /**
   * Get detailed site comparison table
   */
  async getTableauSites(filters?: {
    region?: string;
    prestataire?: string;
    typeSite?: string;
    periode?: string;
    tri?: 'score_asc' | 'score_desc' | 'nom' | 'region';
  }): Promise<ApiResponse<DetailedSiteData[]>> {
    const params = new URLSearchParams();
    if (filters?.region) params.append('region', filters.region);
    if (filters?.prestataire) params.append('prestataire', filters.prestataire);
    if (filters?.typeSite) params.append('typeSite', filters.typeSite);
    if (filters?.periode) params.append('periode', filters.periode);
    if (filters?.tri) params.append('tri', filters.tri);

    const queryString = params.toString();
    return this.get<DetailedSiteData[]>(`/tableau-sites${queryString ? `?${queryString}` : ''}`);
  }

  /**
   * Get available filter options
   */
  async getAvailableFilters(): Promise<ApiResponse<AvailableFilters>> {
    return this.get<AvailableFilters>('/filters');
  }

  /**
   * Get compliance evolution over time
   */
  async getEvolution(filters?: {
    siteId?: string;
    periode?: string;
    region?: string;
    prestataire?: string;
    typeSite?: string;
  }): Promise<ApiResponse<EvolutionData>> {
    const params = new URLSearchParams();
    if (filters?.siteId && filters.siteId !== 'all') params.append('siteId', filters.siteId);
    if (filters?.periode) params.append('periode', filters.periode);
    if (filters?.region && filters.region !== 'all') params.append('region', filters.region);
    if (filters?.prestataire && filters.prestataire !== 'all') params.append('prestataire', filters.prestataire);
    if (filters?.typeSite && filters.typeSite !== 'all') params.append('typeSite', filters.typeSite);

    const queryString = params.toString();
    return this.get<EvolutionData>(`/evolution${queryString ? `?${queryString}` : ''}`);
  }

  // ========== Legacy methods for backward compatibility ==========

  async getKpis(filters?: { periode?: string; region?: string }): Promise<ApiResponse<any>> {
    return this.getEnhancedKpis(filters);
  }

  async getConformite(filters?: { siteId?: string; rubrike?: string; periode?: string }): Promise<ApiResponse<any>> {
    const params = new URLSearchParams();
    if (filters?.siteId) params.append('siteId', filters.siteId);
    if (filters?.rubrike) params.append('rubrique', filters.rubrike);
    if (filters?.periode) params.append('periode', filters.periode);
    const queryString = params.toString();
    return this.get<any>(`/conformite${queryString ? `?${queryString}` : ''}`);
  }

  async getActionsStatsLegacy(): Promise<ApiResponse<ActionsStats>> {
    return this.get<ActionsStats>('/actions');
  }

  async getEvolutionLegacy(siteId?: string): Promise<ApiResponse<any>> {
    const params = new URLSearchParams();
    if (siteId) params.append('siteId', siteId);
    const queryString = params.toString();
    return this.get<any>(`/evolution${queryString ? `?${queryString}` : ''}`);
  }


  /**
   * Export Dashboard report (PDF/Excel)
   */
  async exportDashboard(filters: any): Promise<ApiResponse<{ id: string; urlPdf: string; urlExcel: string }>> {
    const params = new URLSearchParams();
    if (filters.site && filters.site !== 'all') params.append('site', filters.site);
    if (filters.periode) params.append('periode', filters.periode);
    if (filters.region && filters.region !== 'all') params.append('region', filters.region);
    if (filters.prestataire && filters.prestataire !== 'all') params.append('prestataire', filters.prestataire);
    if (filters.typeSite && filters.typeSite !== 'all') params.append('typeSite', filters.typeSite);

    const queryString = params.toString();
    return this.get<{ id: string; urlPdf: string; urlExcel: string }>(`/export${queryString ? `?${queryString}` : ''}`);
  }

  /**
   * Get rubric statistics for a specific site
   */
  async getSiteRubriqueStats(siteId: string, periode: string = '6months', startDate?: string, endDate?: string, inspectionId?: string): Promise<ApiResponse<SiteRubriqueStats>> {
    const params = new URLSearchParams();
    params.append('periode', periode);
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (inspectionId) params.append('inspectionId', inspectionId);
    return this.get<SiteRubriqueStats>(`/site-rubriques/${siteId}?${params.toString()}`);
  }
}

export const dashboardService = new DashboardService();
