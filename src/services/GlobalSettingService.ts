import BaseService from './BaseService';

export interface GlobalSetting {
    id: string;
    key: string;
    value: string;
    description: string | null;
    updatedAt: string;
}

class GlobalSettingService extends BaseService {
    async getAll() {
        return this.get<GlobalSetting[]>('/global-settings');
    }

    async updateMany(settings: { key: string; value: string }[]) {
        return this.post<GlobalSetting[]>('/global-settings/many', { settings });
    }
}

export const globalSettingService = new GlobalSettingService();
export default globalSettingService;
