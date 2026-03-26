import { BaseService, ApiResponse } from './BaseService';

export interface UserSettings {
    // Notifications
    pushNotifications: boolean;
    emailNotifications: boolean;
    smsNotifications: boolean;

    // Préférences
    language: string;
    theme: 'light' | 'dark' | 'system';
    sound: boolean;

    // Sécurité
    twoFactorAuth: boolean;
    biometricAuth: boolean;

    // Info supplémentaires
    avatar?: string;
}

export interface UpdateSettingsData {
    // Notifications
    emailNotifications?: boolean;
    smsNotifications?: boolean;

    // Préférences
    language?: string;
    theme?: 'light' | 'dark' | 'system';
    avatar?: string;
}

class UserSettingsService extends BaseService {
    constructor() {
        super('/user');
    }

    /**
     * Récupérer les paramètres de l'utilisateur connecté
     */
    async getSettings(): Promise<UserSettings> {
        try {
            const response = await this.get<any>('/settings');
            const userData = response.data;
            if (!userData) throw new Error('No data received');

            const profile = userData.profile || {};

            // Mapper les données du backend vers le format frontend
            return {
                // Notifications
                pushNotifications: profile.notificationsEnabled ?? false,
                emailNotifications: profile.emailNotifications ?? false,
                smsNotifications: profile.smsNotifications ?? false,

                // Préférences
                language: profile.language || 'fr',
                theme: (profile.theme || 'dark') as 'light' | 'dark' | 'system',
                sound: true,

                // Sécurité
                twoFactorAuth: userData.twoFactorEnabled ?? false,
                biometricAuth: false,

                // Info supplémentaires
                avatar: profile.avatar || userData.avatar,
            };
        } catch (error: any) {
            console.error('Error fetching settings:', error);
            throw error;
        }
    }

    /**
     * Mettre à jour le profil utilisateur
     */
    async updateProfile(profileData: {
        name?: string;
        email?: string;
        bio?: string;
        city?: string;
        country?: string;
        dateOfBirth?: Date | string;
        favoriteStable?: string;
        avatar?: string;
    }): Promise<void> {
        try {
            await this.patch('/profile', profileData);
        } catch (error: any) {
            console.error('Error updating profile:', error);
            throw error;
        }
    }

    /**
     * Mettre à jour les préférences
     */
    async updatePreferences(settings: UpdateSettingsData): Promise<void> {
        try {
            await this.patch('/preferences', settings);
        } catch (error: any) {
            console.error('Error updating preferences:', error);
            throw error;
        }
    }

    /**
     * Rechercher un utilisateur par téléphone (pour le tagging)
     */
    async searchUserByPhone(phone: string): Promise<{ id: string; name: string; phone: string } | null> {
        try {
            const response = await this.get<any>(`/find-by-phone?phone=${phone}`);
            return response.data;
        } catch (error: any) {
            console.error('Error searching user:', error);
            return null;
        }
    }

    /**
     * Récupérer la liste des parrainages de l'utilisateur
     */
    async getReferrals(): Promise<any[]> {
        try {
            const response = await this.get<any[]>('/referrals');
            return response.data || [];
        } catch (error: any) {
            console.error('Error fetching referrals:', error);
            throw error;
        }
    }
}

export const userSettingsService = new UserSettingsService();
export default userSettingsService;
