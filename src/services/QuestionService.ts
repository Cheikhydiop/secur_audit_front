import { BaseService, ApiResponse } from './BaseService';

// Types for Questions
// Type de réponse pour les questions dynamiques
export type TypeReponse = 'OUI_NON' | 'MULTIPLE_CHOIX' | 'TEXTE' | 'PHOTO' | 'NOTE' | 'DATE' | 'NOMBRE';

export interface Question {
  id: string;
  texte: string;
  rubrique: string;
  ponderation: number;
  criticite: 'MINEUR' | 'MAJEUR' | 'CRITIQUE';
  actif: boolean;
  helper?: string;
  templateId?: string;
  // Dynamic questionnaire features
  typeReponse?: TypeReponse;
  optionsReponse?: string[];
  estConditionnelle?: boolean;
  conditionQuestionId?: string;
  conditionReponse?: string;
  requiredResponseOptions?: string;
  pointSaut?: number;
  estObligatoire?: boolean;
  placeholder?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Rubrique {
  id: string;
  nom: string;
  description?: string;
  ordre: number;
  actif: boolean;
  questions: Question[];
}

export interface CreateRubriqueData {
  nom: string;
  description?: string;
  ordre?: number;
}

export interface QuestionnaireTemplate {
  id: string;
  nom: string;
  version: number;
  isCurrent: boolean;
  createdAt: string;
  updatedAt: string;
  questions?: Question[];
}

export interface CreateQuestionData {
  texte: string;
  categorieId: string;
  helper?: string;
  ponderation?: number;
  criticite?: 'MINEUR' | 'MAJEUR' | 'CRITIQUE';
  actif?: boolean;
  // Dynamic questionnaire fields
  typeReponse?: TypeReponse;
  optionsReponse?: string[];
  estConditionnelle?: boolean;
  conditionQuestionId?: string;
  conditionReponse?: string;
  requiredResponseOptions?: string;
  pointSaut?: number;
  estObligatoire?: boolean;
  placeholder?: string;
}

export interface UpdateQuestionData {
  texte?: string;
  categorieId?: string;
  helper?: string;
  ponderation?: number;
  actif?: boolean;
  // Dynamic questionnaire fields
  typeReponse?: TypeReponse;
  optionsReponse?: string[];
  estConditionnelle?: boolean;
  conditionQuestionId?: string;
  conditionReponse?: string;
  requiredResponseOptions?: string;
  pointSaut?: number;
  estObligatoire?: boolean;
  placeholder?: string;
}

class QuestionService extends BaseService {
  constructor() {
    super('/questions');
  }

  async getAll(filters?: { actif?: boolean; rubrique?: string }): Promise<ApiResponse<Question[]>> {
    const params = new URLSearchParams();
    if (filters?.actif !== undefined) params.append('actif', String(filters.actif));
    if (filters?.rubrique) params.append('rubrique', filters.rubrique);
    const queryString = params.toString();
    return this.get<Question[]>(queryString ? `?${queryString}` : '');
  }

  async getRubriques(): Promise<ApiResponse<Rubrique[]>> {
    return this.get<Rubrique[]>('/rubriques');
  }

  async getById(id: string): Promise<ApiResponse<Question>> {
    return this.get<Question>(`/${id}`);
  }

  async create(data: CreateQuestionData): Promise<ApiResponse<Question>> {
    return this.post<Question>('', data);
  }

  async update(id: string, data: UpdateQuestionData): Promise<ApiResponse<Question>> {
    return this.put<Question>(`/${id}`, data);
  }

  async updatePonderation(id: string, ponderation: number): Promise<ApiResponse<Question>> {
    return this.put<Question>(`/${id}/ponderation`, { ponderation });
  }

  async delete(id: string): Promise<ApiResponse<any>> {
    return this.delete(`/${id}`) as any;
  }

  // --- Rubrique Methods ---

  async updateRubrique(id: string, data: Partial<CreateRubriqueData>): Promise<ApiResponse<Rubrique>> {
    return this.put<Rubrique>(`/rubriques/${id}`, data);
  }

  async deleteRubrique(id: string): Promise<ApiResponse<any>> {
    return this.delete(`/rubriques/${id}`) as any;
  }

  // --- Versioning / Template Methods ---

  async getCurrentTemplate(): Promise<ApiResponse<QuestionnaireTemplate>> {
    return this.get<QuestionnaireTemplate>('/template/current');
  }

  async snapshotTemplate(): Promise<ApiResponse<QuestionnaireTemplate>> {
    return this.post<QuestionnaireTemplate>('/template/snapshot', {});
  }

  async createRubrique(data: CreateRubriqueData): Promise<ApiResponse<Rubrique>> {
    // Note: This endpoint is actually in QuestionnaireAdminController in the backend
    // but we can map it here for convenience if we route it correctly or 
    // ideally use adminQuestionnaireService if available.
    // Let's use the current pattern.
    return this.post<Rubrique>('/rubriques', data);
  }
}

export const questionService = new QuestionService();
