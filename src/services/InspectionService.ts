import { BaseService, ApiResponse } from './BaseService';

// Types for Inspections
export interface Inspection {
  id: string;
  siteId: string;
  inspecteurId: string;
  date: string;
  statut: 'EN_COURS' | 'VALIDEE' | 'REJETEE';
  score?: number;
  reponses?: Record<string, any>;
  latitude?: number;
  longitude?: number;
  gpsAccuracy?: number;
  createdAt: string;
  updatedAt: string;
  site?: {
    id: string;
    nom: string;
    code?: string;
    adresse?: string;
  };
  inspecteur?: {
    name: string;
    email: string;
  };
  inspectionQuestions?: InspectionQuestion[];
  actions?: ActionPlan[];
  rapports?: Rapport[];
}

export interface Rapport {
  id: string;
  inspectionId: string;
  titre: string;
  urlPdf: string;
  urlExcel: string | null;
  createdAt: string;
}

export interface InspectionQuestion {
  id: string;
  inspectionId: string;
  questionIdOriginal: string;
  questionTextSnapshot: string;
  categorieSnapshot: string;
  ordreSnapshot: number;
  ponderationSnapshot: number;
  criticiteSnapshot: string;
  helperSnapshot?: string;
  reponse?: string | null;
  observation?: string | null;
  recommendation?: string | null;
  photoUrl?: string | null;
  porteurEmail?: string | null;
  question?: {
    id: string;
    texte: string;
    helper?: string;
    ponderation: number;
    criticite: string;
    categorie?: {
      id: string;
      nom: string;
      ordre: number;
    };
  };
}

export interface ActionPlan {
  id: string;
  inspectionId: string;
  description: string;
  notes?: string;
  responsableId: string;
  dateEcheance?: string;
  statut: string;
  criticite: string;
  porteurEmail?: string | null;
  responsable?: {
    name: string;
    email: string;
  };
}

export interface CreateInspectionData {
  siteId: string;
  latitude?: number;
  longitude?: number;
  latitudeStart?: number;
  longitudeStart?: number;
  dateStart?: string;
  missionId?: string;
  gpsAccuracy?: number;
}

export interface UpdateInspectionData {
  reponses?: Record<string, any>;
  score?: number;
  statut?: 'EN_COURS' | 'VALIDEE' | 'REJETEE';
}

// Progress tracking
export interface InspectionProgress {
  inspectionId: string;
  totalQuestions: number;
  answeredQuestions: number;
  unansweredQuestions: number;
  conformes: number;
  nonConformes: number;
  nonApplicables: number;
  progressPercentage: number;
}

// Dynamic question response
export interface QuestionResponseData {
  reponse?: string;
  observation?: string;
  recommendation?: string;
  photoUrl?: string;
  porteurEmail?: string;
}

class InspectionService extends BaseService {
  constructor() {
    super('/inspections');
  }

  async getAll(filters?: { statut?: string; siteId?: string; startDate?: string; endDate?: string; page?: number; limit?: number }): Promise<ApiResponse<{ inspections: Inspection[]; total: number }>> {
    const params = new URLSearchParams();
    if (filters?.statut) params.append('statut', filters.statut);
    if (filters?.siteId) params.append('siteId', filters.siteId);
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());

    const queryString = params.toString();
    return this.get<{ inspections: Inspection[]; total: number }>(queryString ? `?${queryString}` : '');
  }

  async getEnCours(): Promise<ApiResponse<Inspection[]>> {
    return this.get<Inspection[]>('/en-cours');
  }

  async getById(id: string): Promise<ApiResponse<Inspection>> {
    return this.get<Inspection>(`/${id}`);
  }

  async create(data: CreateInspectionData): Promise<ApiResponse<Inspection>> {
    return this.post<Inspection>('', data);
  }

  async update(id: string, data: UpdateInspectionData): Promise<ApiResponse<Inspection>> {
    return this.put<Inspection>(`/${id}`, data);
  }

  async soumettre(id: string, gpsData?: any): Promise<ApiResponse<Inspection>> {
    return this.post<ApiResponse<any>>(`/${id}/soumettre`, { gpsData }) as any;
  }

  async valider(id: string): Promise<ApiResponse<Inspection>> {
    return this.update(id, { statut: 'VALIDEE' });
  }

  async rejeter(id: string): Promise<ApiResponse<Inspection>> {
    return this.update(id, { statut: 'REJETEE' });
  }

  async delete(id: string): Promise<ApiResponse<any>> {
    return this.delete(`/${id}`) as any;
  }

  // ============ Dynamic Questionnaire Methods ============

  /**
   * Get inspection progress - number of answered questions
   */
  async getProgress(inspectionId: string): Promise<ApiResponse<InspectionProgress>> {
    return this.get<InspectionProgress>(`/${inspectionId}/progress`);
  }

  /**
   * Auto-save a single question response (for real-time saving)
   */
  async autoSaveResponse(
    inspectionId: string,
    questionIdOriginal: string,
    data: QuestionResponseData
  ): Promise<ApiResponse<any>> {
    return this.put<any>(`/${inspectionId}/auto-save`, { questionIdOriginal, ...data });
  }

  /**
   * Get questions with dynamic visibility based on answers
   */
  async getDynamicQuestions(inspectionId: string): Promise<ApiResponse<any>> {
    return this.get<any>(`/${inspectionId}/dynamic-questions`);
  }
}

export const inspectionService = new InspectionService();
