import { BaseService, ApiResponse } from './BaseService';

// Types for Sites - matching the backend schema
export interface Batiment {
  id: string;
  nom_batiment: string;
  site_id: string;
}

export interface Region {
  id: number;
  nom_region: string;
}

export interface Site {
  id: string;
  nom: string;
  nom_site?: string; // backward compatibility
  code: string;
  type?: string;
  zone?: string;
  localisation?: string;
  prestataire?: string;
  status?: string;
  region_id?: number;
  region?: Region;
  batiments?: Batiment[];
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateSiteData {
  nom: string;
  code: string;
  type: string;
  zone: string;
  localisation?: string;
  status?: string;
}

export interface UpdateSiteData {
  nom?: string;
  code?: string;
  type?: string;
  zone?: string;
  localisation?: string;
  status?: string;
}

// Pagination response type matching backend
export interface PaginatedSitesResponse {
  data: Site[];
  total: number;
  page: number;
  lastPage: number;
  perPage: number;
}

// Quick search result (lighter payload for autocomplete)
export interface SiteQuickSearch {
  id: string;
  nom: string;
  code: string;
  type: string;
  zone: string;
  localisation: string;
}

class SiteService extends BaseService {
  constructor() {
    super('/sites');
  }

  /**
   * Get all sites with pagination and filters
   * Matches the component's API: siteService.getAllSites(page, perPage, filters)
   */
  async getAllSites(
    page: number = 1,
    perPage: number = 8,
    filters?: {
      nom_site?: string;
      nom_region?: string;
      status?: string;
    }
  ): Promise<ApiResponse<PaginatedSitesResponse>> {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('limit', perPage.toString());

    if (filters?.nom_site) params.append('search', filters.nom_site);
    if (filters?.nom_region) params.append('region', filters.nom_region);
    if (filters?.status) params.append('status', filters.status);

    return this.get<PaginatedSitesResponse>(`?${params.toString()}`);
  }

  /**
   * Get a single site by ID
   */
  async getSiteById(id: string | number): Promise<ApiResponse<Site>> {
    return this.get<Site>(`/${id}`);
  }

  /**
   * Create a new site
   */
  async createSite(data: CreateSiteData): Promise<ApiResponse<Site>> {
    return this.post<Site>('', data);
  }

  /**
   * Update an existing site
   */
  async updateSite(id: string, data: UpdateSiteData): Promise<ApiResponse<Site>> {
    return this.put<Site>(`/${id}`, data);
  }

  /**
   * Delete a site
   */
  async deleteSite(id: string): Promise<ApiResponse<any>> {
    return super.delete(`/${id}`) as any;
  }

  /**
   * Get site details with buildings and agents
   */
  async getDetailSites(siteId: string): Promise<ApiResponse<any>> {
    return this.get<any>(`/${siteId}/details`);
  }

  /**
   * Get QR Code URL for a site
   */
  getSiteQrCodeUrl(siteId: string | undefined): string {
    if (!siteId) return '';
    return `${this.baseURL}/sites/${siteId}/qrcode`;
  }

  /**
   * Initialise la connexion à IndexedDB pour le cache des sites
   */
  private static async getSitesDB(): Promise<IDBDatabase> {
    const DB_NAME = 'smartinspect_sites_db';
    const STORE_NAME = 'sites_cache';

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = (e: any) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };
      request.onsuccess = (e: any) => resolve(e.target.result);
      request.onerror = (e: any) => reject(e.target.error);
    });
  }

  /**
   * Synchronise la liste des sites en local pour le mode offline
   */
  async syncLocalSites(): Promise<void> {
    try {
      const response = await this.getAllSites(1, 1000); // Augmenté à 1000 pour tout avoir
      if (response.data && response.data.data) {
        const db = await SiteService.getSitesDB();
        const transaction = db.transaction(['sites_cache'], 'readwrite');
        const store = transaction.objectStore('sites_cache');

        // Nettoyer l'ancien cache
        store.clear();

        // Ajouter les nouveaux sites
        for (const site of response.data.data) {
          store.add(site);
        }

        console.log(`✅ ${response.data.data.length} sites synchronisés dans IndexedDB.`);
      }
    } catch (error) {
      console.error('Erreur lors de la synchronisation des sites:', error);
    }
  }

  /**
   * Recherche locale dans IndexedDB (mode offline)
   */
  private async searchLocal(query: string, limit: number): Promise<SiteQuickSearch[]> {
    try {
      const db = await SiteService.getSitesDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(['sites_cache'], 'readonly');
        const store = transaction.objectStore('sites_cache');
        const request = store.getAll();

        request.onsuccess = () => {
          const sites: Site[] = request.result || [];
          const q = query.toLowerCase();

          const results = sites
            .filter(s =>
              (s.nom_site || s.nom || '').toLowerCase().includes(q) ||
              (s.code || '').toLowerCase().includes(q) ||
              (s.localisation || '').toLowerCase().includes(q)
            )
            .slice(0, limit)
            .map(s => ({
              id: s.id,
              nom: s.nom_site || s.nom || '',
              code: s.code || '',
              type: s.type || '',
              zone: s.zone || '',
              localisation: s.localisation || ''
            }));
          resolve(results);
        };
        request.onerror = () => reject(request.error);
      });
    } catch (e) {
      return [];
    }
  }

  async quickSearch(query: string, limit: number = 10): Promise<ApiResponse<SiteQuickSearch[]>> {
    if (!navigator.onLine) {
      console.log('📶 Mode Offline activé pour la recherche (IndexedDB)');
      const localResults = await this.searchLocal(query, limit);
      return { data: localResults };
    }

    try {
      const params = new URLSearchParams({ q: query, limit: limit.toString(), _t: Date.now().toString() });
      const response = await this.get<SiteQuickSearch[]>(`/search?${params.toString()}`);

      if (response.error) {
        const localResults = await this.searchLocal(query, limit);
        return { data: localResults };
      }

      return response;
    } catch (error) {
      const localResults = await this.searchLocal(query, limit);
      return { data: localResults };
    }
  }

  /**
   * Get all sites (legacy method for backward compatibility)
   */
  async getAll(filters?: {
    search?: string;
    zone?: string;
    type?: string;
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<PaginatedSitesResponse>> {
    const params = new URLSearchParams();
    if (filters?.search) params.append('search', filters.search);
    if (filters?.zone) params.append('zone', filters.zone);
    if (filters?.type) params.append('type', filters.type);
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());
    const queryString = params.toString();
    return this.get<PaginatedSitesResponse>(queryString ? `?${queryString}` : '');
  }
}

export const siteService = new SiteService();
