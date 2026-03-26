import { BaseService, ApiResponse } from './BaseService';

export interface Rapport {
    id: string;
    inspectionId: string;
    titre: string;
    urlPdf: string;
    urlExcel: string | null;
    createdAt: string;
}

class RapportService extends BaseService {
    constructor() {
        super('/rapports');
    }

    async getAll(): Promise<ApiResponse<Rapport[]>> {
        return this.get<Rapport[]>('');
    }

    async getById(id: string): Promise<ApiResponse<Rapport>> {
        return this.get<Rapport>(`/${id}`);
    }

    /**
     * Télécharger le fichier via le proxy backend
     */
    async download(id: string): Promise<Blob> {
        const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
        const apiURL = import.meta.env.VITE_API_URL || 'https://thundering-laura-ndigueul-80527457.koyeb.app/api';
        const cleanBase = apiURL.endsWith('/api') ? apiURL : `${apiURL}/api`;

        const response = await fetch(`${cleanBase}/rapports/telecharger/${id}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || "Échec du téléchargement");
        }

        return response.blob();
    }
}

export const rapportsService = new RapportService();
export default rapportsService;
