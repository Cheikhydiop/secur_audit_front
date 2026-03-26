import { BaseService } from './BaseService';

export enum StatusAction {
    A_FAIRE = 'A_FAIRE',
    EN_COURS = 'EN_COURS',
    TERMINE = 'TERMINE',
    EN_RETARD = 'EN_RETARD',
    ANTICIPE = 'ANTICIPE',
    A_VALIDER = 'A_VALIDER',
    BLOQUE = 'BLOQUE',
    ANNULE = 'ANNULE',
    ARCHIVE = 'ARCHIVE'
}

export interface Mission {
    id: string;
    titre: string;
    description?: string;
    type?: string;
    dateDeb: string;
    dateFin: string;
    dateRealisation?: string;
    statut: StatusAction;
    siteId: string;
    inspecteurId?: string;
    entite?: string;
    site?: {
        id: string;
        nom: string;
        code: string;
        zone?: string;
    };
    inspecteur?: {
        id: string;
        name: string;
        email: string;
        entite?: string;
    };
}

export type MissionType = Mission;

export interface InspectionStats {
    total: number;
    planifies: number;
    enCours: number;
    termines: number;
    anticipes: number;
    enRetard: number;
    annules: number;
    archives: number;
    realisees: number;
}

export class PlanningService extends BaseService {
    constructor() {
        super('planning');
    }

    async getMyPlanning(mois?: number, annee?: number): Promise<Mission[]> {
        const params = new URLSearchParams();
        if (mois !== undefined) params.append('mois', mois.toString());
        if (annee !== undefined) params.append('annee', annee.toString());

        const res = await this.get<Mission[]>(`/?${params.toString()}`);
        if (res.error) throw new Error(res.error);
        return res.data || [];
    }

    async getPlanningGlobal(mois?: number, annee?: number): Promise<Mission[]> {
        const params = new URLSearchParams();
        if (mois !== undefined) params.append('mois', mois.toString());
        if (annee !== undefined) params.append('annee', annee.toString());

        const res = await this.get<Mission[]>(`global?${params.toString()}`);
        if (res.error) throw new Error(res.error);
        return res.data || [];
    }

    async getStats(): Promise<InspectionStats> {
        const res = await this.get<InspectionStats>('stats');
        if (res.error) throw new Error(res.error);
        return res.data!;
    }

    async getById(id: string): Promise<Mission> {
        const res = await this.get<Mission>(`/${id}`);
        if (res.error) throw new Error(res.error);
        return res.data!;
    }

    async createMission(data: Partial<Mission>): Promise<Mission> {
        const res = await this.post<Mission>('/', data);
        if (res.error) throw new Error(res.error);
        return res.data!;
    }

    async updateMission(id: string, data: Partial<Mission>): Promise<Mission> {
        const res = await this.put<Mission>(`/${id}`, data);
        if (res.error) throw new Error(res.error);
        return res.data!;
    }

    async updateStatus(id: string, statut: string): Promise<Mission> {
        const res = await this.patch<Mission>(`/${id}/status`, { statut });
        if (res.error) throw new Error(res.error);
        return res.data!;
    }

    /** Alias for compatibility */
    async updateMissionStatus(id: string, statut: string): Promise<Mission> {
        return this.updateStatus(id, statut);
    }

    async deleteMission(id: string): Promise<void> {
        const res = await this.delete<void>(`/${id}`);
        if (res.error) throw new Error(res.error);
    }

    async getMissionsBySite(siteId: string): Promise<Mission[]> {
        const res = await this.get<Mission[]>(`/site/${siteId}`);
        if (res.error) throw new Error(res.error);
        return res.data || [];
    }

    async getPendingMissions(onlyMine: boolean = false): Promise<Mission[]> {
        const res = await this.get<Mission[]>(`/pending${onlyMine ? '?mine=true' : ''}`);
        if (res.error) throw new Error(res.error);
        return res.data || [];
    }

    async startInspection(id: string, gpsData?: any): Promise<Mission> {
        const res = await this.post<Mission>(`/${id}/start`, gpsData || {});
        if (res.error) throw new Error(res.error);
        return res.data!;
    }

    async finishInspection(id: string, dateRealisation?: string, gpsData?: any): Promise<{ mission: Mission; message: string }> {
        const res = await this.post<{ mission: Mission; message: string }>(`/${id}/finish`, { dateRealisation, gpsData });
        if (res.error) throw new Error(res.error);
        return res.data!;
    }

    async importRoadmap(file: File, year: number): Promise<{ success: boolean; count: number; errors?: string[] }> {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('year', year.toString());

        const res = await this.post<any>('/import', formData);
        if (res.error) throw new Error(res.error);
        return res.data;
    }

    async renewYearPlanning(sourceYear: number, targetYear: number): Promise<{ success: boolean; count: number }> {
        const res = await this.post<any>('/renew-year', { sourceYear, targetYear });
        if (res.error) throw new Error(res.error);
        return res.data;
    }
}

export const planningService = new PlanningService();
export default planningService;
