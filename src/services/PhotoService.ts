import { BaseService, ApiResponse } from './BaseService';

export interface PhotoUploadResponse {
    url: string;
    publicId: string;
    width: number;
    height: number;
    format: string;
    size: number;
}

class PhotoService extends BaseService {
    constructor() {
        super('/photos');
    }

    /**
     * Upload une photo vers Cloudinary via le backend
     */
    async upload(
        file: Blob | File,
        inspectionId: string,
        questionId: string,
        existingCount: number = 0
    ): Promise<ApiResponse<PhotoUploadResponse>> {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('inspectionId', inspectionId);
        formData.append('questionId', questionId);
        formData.append('existingCount', existingCount.toString());

        // On utilise fetch directement car BaseService.request force le JSON
        const url = `${this.baseURL}${this.basePath}/upload`;
        const token = localStorage.getItem('auth_token') || localStorage.getItem('token');

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    // NE PAS mettre 'Content-Type': 'multipart/form-data' 
                    // fetch le fait automatiquement avec le boundary correct
                },
                body: formData,
            });

            const data = await response.json();
            if (!response.ok) {
                return { data: null, error: data.message || "Erreur d'upload" };
            }

            return { data: data.data };
        } catch (error: any) {
            console.error('❌ Erreur upload photo:', error);
            return { data: null, error: error.message || "Erreur réseau" };
        }
    }

    /**
     * Supprimer une photo de Cloudinary par son publicId
     */
    async deletePhoto(publicId: string): Promise<ApiResponse<any>> {
        return this.delete(`/${encodeURIComponent(publicId)}`) as any;
    }

    /**
     * Supprimer une photo de Cloudinary par son URL
     */
    async deleteByUrl(url: string): Promise<ApiResponse<any>> {
        return this.delete(`/?url=${encodeURIComponent(url)}`) as any;
    }
}

export const photoService = new PhotoService();
