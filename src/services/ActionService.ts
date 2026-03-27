import { BaseService, ApiResponse } from './BaseService';

// Types for Action Plans
export interface ActionPlan {
  id: string;
  inspectionId: string;
  description: string;
  responsableId?: string;
  dateEcheance: string;
  statut: 'A_FAIRE' | 'EN_COURS' | 'TERMINE' | 'EN_RETARD' | 'A_VALIDER';
  criticite: 'FAIBLE' | 'MOYENNE' | 'ELEVEE';
  notes?: string;
  evidencePhotoUrl?: string;
  evidenceNotes?: string;
  createdAt: string;
  updatedAt: string;
  inspection?: {
    site?: {
      nom: string;
      code: string;
    };
  };
  responsable?: {
    name: string;
  };
}

export interface CreateActionData {
  inspectionId: string;
  description: string;
  dateEcheance?: string;
  criticite?: 'FAIBLE' | 'MOYENNE' | 'ELEVEE';
}

export interface UpdateActionData {
  description?: string;
  dateEcheance?: string;
  criticite?: 'FAIBLE' | 'MOYENNE' | 'ELEVEE';
  notes?: string;
}

export interface AssignerActionData {
  responsableId: string;
  dateEcheance: string;
}

export interface UpdateStatutData {
  statut: 'A_FAIRE' | 'EN_COURS' | 'TERMINE' | 'EN_RETARD' | 'A_VALIDER';
}

export interface ProposeClotureData {
  photoUrl?: string;
  notes?: string;
}

// Type for notification summary
export interface ActionNotificationSummary {
  total: number;
  enRetard: number;
  enCours: number;
  termines: number;
  tauxCompletion: number;
}

export interface ActionComment {
  id: string;
  actionId: string;
  userId: string;
  content: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
  };
}

export interface ReactivityScore {
  siteName: string;
  total: number;
  completed: number;
  completedOnTime: number;
  overdue: number;
  completionRate: number;
  respectRate: number;
  averageClosingDays: number;
  score: number;
}

class ActionService extends BaseService {
  constructor() {
    super('/actions');
  }

  async getAll(filters?: { statut?: string; criticite?: string; siteId?: string }): Promise<ApiResponse<any>> {
    const params = new URLSearchParams();
    if (filters?.statut) params.append('statut', filters.statut);
    if (filters?.criticite) params.append('criticite', filters.criticite);
    if (filters?.siteId) params.append('siteId', filters.siteId);
    const queryString = params.toString();
    return this.get<any>(queryString ? `?${queryString}` : '');
  }

  async getById(id: string): Promise<ApiResponse<ActionPlan>> {
    return this.get<ActionPlan>(`/${id}`);
  }

  async getByInspection(inspectionId: string): Promise<ApiResponse<ActionPlan[]>> {
    return this.get<ActionPlan[]>(`/inspection/${inspectionId}`);
  }

  async create(data: CreateActionData): Promise<ApiResponse<ActionPlan>> {
    return this.post<ActionPlan>('', data);
  }

  async update(id: string, data: UpdateActionData): Promise<ApiResponse<ActionPlan>> {
    return this.put<ActionPlan>(`/${id}`, data);
  }

  async updateStatut(id: string, data: UpdateStatutData): Promise<ApiResponse<ActionPlan>> {
    return this.patch<ActionPlan>(`/${id}/statut`, data);
  }

  async assigner(id: string, data: AssignerActionData): Promise<ApiResponse<ActionPlan>> {
    return this.patch<ActionPlan>(`/${id}/assigner`, data);
  }

  async proposerCloture(id: string, data: ProposeClotureData): Promise<ApiResponse<ActionPlan>> {
    return this.post<ActionPlan>(`/${id}/proposer-cloture`, data);
  }

  async validerCloture(id: string): Promise<ApiResponse<ActionPlan>> {
    return this.post<ActionPlan>(`/${id}/valider-cloture`, {});
  }

  async delete(id: string): Promise<ApiResponse<any>> {
    return this.delete(`/${id}`) as any;
  }

  // Get notification summary for current user
  async getNotificationSummary(): Promise<ApiResponse<ActionNotificationSummary>> {
    return this.get<ActionNotificationSummary>('/notification-summary');
  }

  // Check overdue actions (admin only)
  async checkOverdue(): Promise<ApiResponse<{ processed: number }>> {
    return this.post<{ processed: number }>('/check-overdue', {});
  }

  async getReactivityScores(filters?: { zone?: string; siteId?: string }): Promise<ApiResponse<ReactivityScore[]>> {
    const params = new URLSearchParams();
    if (filters?.zone) params.append('zone', filters.zone);
    if (filters?.siteId) params.append('siteId', filters.siteId);
    const queryString = params.toString();
    return this.get<ReactivityScore[]>(`/reactivity-scores${queryString ? `?${queryString}` : ''}`);
  }

  async getComments(actionId: string): Promise<ApiResponse<ActionComment[]>> {
    return this.get<ActionComment[]>(`/${actionId}/comments`);
  }

  async addComment(actionId: string, content: string): Promise<ApiResponse<ActionComment>> {
    return this.post<ActionComment>(`/${actionId}/comments`, { content });
  }

  async sendUrgentAlert(id: string): Promise<ApiResponse<any>> {
    return this.post<any>(`/${id}/send-urgent-alert`, {});
  }
}

export const actionService = new ActionService();
