export interface ApiResponse<T> {
    data: T | null;
    error?: string;
    pagination?: {
        total: number;
        page?: number;
        limit?: number;
        pages?: number;
    };
}

/** Timeout par défaut pour les requêtes API (15 secondes) */
const DEFAULT_TIMEOUT_MS = 60_000;

/** Cache des headers pour éviter de recréer l'objet à chaque requête */
const BASE_HEADERS: Record<string, string> = {
    'Content-Type': 'application/json',
};

export class BaseService {
    protected baseURL: string;
    protected basePath: string;
    private static cachePrefix = 'smart_audit_cache_';

    constructor(basePath: string = '') {
        const base = import.meta.env.VITE_API_URL || 'http://localhost:3000';
        this.baseURL = base.endsWith('/api') ? base : `${base}/api`;
        this.basePath = basePath;
    }

    private getFullURL(endpoint: string): string {
        if (endpoint.startsWith('http')) return endpoint;

        const cleanBase = this.baseURL.endsWith('/')
            ? this.baseURL.slice(0, -1)
            : this.baseURL;
        const cleanPath = this.basePath.startsWith('/')
            ? this.basePath
            : `/${this.basePath}`;
        const cleanEndpoint = endpoint.startsWith('/')
            ? endpoint
            : endpoint
                ? `/${endpoint}`
                : '';

        return `${cleanBase}${cleanPath}${cleanEndpoint}`;
    }

    private getToken(): string | null {
        return localStorage.getItem('auth_token') || localStorage.getItem('token');
    }

    private static refreshingPromise: Promise<string | null> | null = null;
    private static isRefreshing = false;

    private async refreshToken(): Promise<string | null> {
        // Si un rafraîchissement est déjà en cours, retourner la promesse existante
        if (BaseService.isRefreshing && BaseService.refreshingPromise) {
            return BaseService.refreshingPromise;
        }

        BaseService.isRefreshing = true;
        const refreshToken = localStorage.getItem('refresh_token');
        if (!refreshToken) {
            BaseService.isRefreshing = false;
            return null;
        }

        BaseService.refreshingPromise = (async () => {
            try {
                const cleanBase = this.baseURL.endsWith('/')
                    ? this.baseURL.slice(0, -1)
                    : this.baseURL;

                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 10_000); // Augmenté à 10s

                const response = await fetch(`${cleanBase}/auth/refresh`, {
                    method: 'POST',
                    headers: BASE_HEADERS,
                    body: JSON.stringify({ refreshToken }),
                    signal: controller.signal,
                });

                clearTimeout(timeoutId);

                if (!response.ok) {
                    throw new Error('Impossible de rafraîchir le token');
                }

                const resObj = await response.json();
                const data = resObj.data || resObj;

                if (data.token) {
                    localStorage.setItem('auth_token', data.token);
                    if (data.refreshToken) {
                        localStorage.setItem('refresh_token', data.refreshToken);
                    }
                    return data.token;
                }

                return null;
            } catch (error) {
                // Nettoyer les tokens invalides
                localStorage.removeItem('auth_token');
                localStorage.removeItem('refresh_token');
                localStorage.removeItem('user_data');
                localStorage.removeItem('wallet_data');
                return null;
            } finally {
                BaseService.isRefreshing = false;
                BaseService.refreshingPromise = null;
            }
        })();

        return BaseService.refreshingPromise;
    }

    public getLocalCache<T>(key: string): T | null {
        try {
            const cached = localStorage.getItem(BaseService.cachePrefix + key);
            if (!cached) return null;
            const parsed = JSON.parse(cached);

            // Handle both old format (direct data) and new format ({data, expiry})
            const data = parsed.data !== undefined ? parsed.data : parsed;
            const expiry = parsed.expiry;

            if (expiry && Date.now() > expiry) {
                localStorage.removeItem(BaseService.cachePrefix + key);
                return null;
            }
            return data;
        } catch (e) {
            return null;
        }
    }

    /**
     * Get cached response for a specific endpoint of THIS service
     */
    public getCachedResponse<T>(endpoint: string): T | null {
        const cacheKey = `${this.basePath}_${endpoint}`;
        return this.getLocalCache<T>(cacheKey);
    }

    protected setLocalCache<T>(key: string, data: T, ttlMs: number = 3600000): void {
        try {
            const cacheItem = {
                data,
                expiry: Date.now() + ttlMs,
                timestamp: Date.now()
            };
            localStorage.setItem(BaseService.cachePrefix + key, JSON.stringify(cacheItem));
        } catch (e) {
            console.warn('Cache write failed:', e);
        }
    }

    protected async request<T>(
        endpoint: string,
        options: RequestInit = {},
        timeoutMs: number = DEFAULT_TIMEOUT_MS
    ): Promise<ApiResponse<T>> {
        const url = this.getFullURL(endpoint);
        const token = this.getToken();

        const isFormData = options.body instanceof FormData;
        const headers: Record<string, string> = { ...BASE_HEADERS, ...(options.headers as Record<string, string> || {}) };

        if (isFormData) {
            delete headers['Content-Type'];
        }

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        // AbortController pour le timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        try {
            let response = await fetch(url, {
                ...options,
                headers,
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            // Token expiré (401) → tenter de le rafraîchir
            if (response.status === 401 && token) {
                const newToken = await this.refreshToken();

                if (newToken) {
                    const newHeaders = { ...headers };
                    newHeaders['Authorization'] = `Bearer ${newToken}`;
                    response = await fetch(url, { ...options, headers: newHeaders });
                } else {
                    if (!window.location.pathname.startsWith('/login')) {
                        window.location.href = '/login';
                    }
                    return {
                        data: null,
                        error: 'Session expirée, veuillez vous reconnecter',
                    };
                }
            }

            // Erreurs HTTP
            if (!response.ok) {
                let errorMessage = 'Une erreur est survenue';
                try {
                    const errorData = await response.json();

                    // Priorité 1: Message d'erreur explicite renvoyé par le backend
                    if (errorData.error && typeof errorData.error === 'object' && errorData.error.message) {
                        errorMessage = errorData.error.message;
                    } else if (typeof errorData.error === 'string') {
                        errorMessage = errorData.error;
                    } else if (errorData.message) {
                        errorMessage = errorData.message;
                    }
                    // Priorité 2: Mapping des codes d'erreur standards
                    else {
                        errorMessage = this.mapHttpStatusToMessage(response.status, response.statusText);
                    }
                } catch {
                    // Si le JSON ne peut pas être lu, on utilise le mapping standard
                    errorMessage = this.mapHttpStatusToMessage(response.status, response.statusText);
                }
                return { data: null, error: errorMessage };
            }

            // Pas de contenu (204)
            if (response.status === 204) {
                return { data: null };
            }

            const resObj = await response.json();

            if (resObj.success === false) {
                return {
                    data: null,
                    error: resObj.message || 'Une erreur est survenue',
                };
            }

            return {
                data: resObj.data !== undefined ? resObj.data : resObj,
                pagination: resObj.pagination,
            };
        } catch (error: any) {
            clearTimeout(timeoutId);

            // Erreur de timeout
            if (error?.name === 'AbortError') {
                return {
                    data: null,
                    error: 'Délai dépassé — vérifiez votre connexion réseau',
                };
            }

            return {
                data: null,
                error: this.formatNetworkError(error),
            };
        }
    }

    private mapHttpStatusToMessage(status: number, statusText: string): string {
        switch (status) {
            case 400: return "La requête est invalide. Vérifiez vos informations.";
            case 401: return "Identifiants incorrects ou session expirée. Veuillez réessayer.";
            case 403: return "Vous n'avez pas les droits nécessaires pour accéder à ce contenu.";
            case 404: return "Le service ou la ressource demandée est introuvable.";
            case 429: return "Trop de tentatives. Veuillez patienter un moment avant de réessayer.";
            case 500: return "Une erreur interne est survenue sur nos serveurs. Nos équipes sont informées.";
            case 502: case 503: case 504: return "Le serveur est temporairement inaccessible. Vérifiez votre connexion.";
            default: return `Erreur ${status}: ${statusText || 'Veuillez réessayer'}`;
        }
    }

    private formatNetworkError(error: any): string {
        if (error?.message?.includes('Failed to fetch')) {
            return 'Connexion impossible au serveur. Vérifiez votre connexion internet ou le statut de nos services.';
        }
        return error.message || 'Une erreur de réseau est survenue';
    }

    protected async get<T>(endpoint: string, options: { useCache?: boolean; ttl?: number } = {}): Promise<ApiResponse<T>> {
        const cacheKey = `${this.basePath}_${endpoint}`;

        // Si l'utilisateur veut du cache immédiat (mode SWR ou Fallback)
        // Note: Ici on retourne toujours la vraie promesse, mais on peut exposer le cache séparément
        const response = await this.request<T>(endpoint, { method: 'GET' });

        if (response.data && !response.error) {
            this.setLocalCache(cacheKey, response.data, options.ttl);
        }

        return response;
    }

    protected async post<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
        return this.request<T>(endpoint, {
            method: 'POST',
            body: data instanceof FormData ? data : (data ? JSON.stringify(data) : undefined),
        });
    }

    protected async put<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
        return this.request<T>(endpoint, {
            method: 'PUT',
            body: data instanceof FormData ? data : (data ? JSON.stringify(data) : undefined),
        });
    }

    protected async patch<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
        return this.request<T>(endpoint, {
            method: 'PATCH',
            body: data instanceof FormData ? data : (data ? JSON.stringify(data) : undefined),
        });
    }

    protected async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
        return this.request<T>(endpoint, { method: 'DELETE' });
    }
}