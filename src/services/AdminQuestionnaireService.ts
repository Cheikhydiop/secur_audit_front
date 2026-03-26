import { BaseService, ApiResponse } from './BaseService';

// Types for Rubrique (Category)
export interface Rubrique {
  id: string;
  nom: string;
  description?: string;
  ordre: number;
  actif: boolean;
  createdAt: string;
  updatedAt: string;
  questions?: Question[];
}

export interface CreateRubriqueData {
  nom: string;
  description?: string;
  ordre?: number;
}

export interface UpdateRubriqueData {
  nom?: string;
  description?: string;
  ordre?: number;
  actif?: boolean;
}

// Type de réponse pour les questions dynamiques
export type TypeReponse = 'OUI_NON' | 'MULTIPLE_CHOIX' | 'TEXTE' | 'PHOTO' | 'NOTE' | 'DATE' | 'NOMBRE';

// Types for Question
export interface Question {
  id: string;
  texte: string;
  helper?: string;
  ordre: number;
  ponderation: number;
  criticite: 'CRITIQUE' | 'MAJEUR' | 'MINEUR';
  actif: boolean;
  categorieId?: string;
  templateId?: string;
  createdAt: string;
  updatedAt: string;
  categorie?: Rubrique;
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
}

export interface CreateQuestionData {
  texte: string;
  categorieId: string;
  helper?: string;
  ponderation?: number;
  criticite?: 'CRITIQUE' | 'MAJEUR' | 'MINEUR';
  ordre?: number;
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
  helper?: string;
  ordre?: number;
  ponderation?: number;
  criticite?: 'CRITIQUE' | 'MAJEUR' | 'MINEUR';
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

// Types for Template
export interface QuestionnaireTemplate {
  id: string;
  nom?: string;
  version: number;
  isCurrent: boolean;
  createdAt: string;
  updatedAt: string;
}

class AdminQuestionnaireService extends BaseService {
  constructor() {
    super('/admin/questionnaire');
  }

  // ============ RUBRIQUE ENDPOINTS ============

  /**
   * Get all rubriques with their questions
   */
  async getRubriques(): Promise<ApiResponse<Rubrique[]>> {
    return this.get<Rubrique[]>('/rubriques');
  }

  /**
   * Get a specific categorie by ID
   */
  async getRubriqueById(id: string): Promise<ApiResponse<Rubrique>> {
    return this.get<Rubrique>(`/rubriques/${id}`);
  }

  /**
   * Create a new categorie (rubrique)
   */
  async createRubrique(data: CreateRubriqueData): Promise<ApiResponse<Rubrique>> {
    return this.post<Rubrique>('/rubriques', data);
  }

  /**
   * Update a categorie (rubrique)
   */
  async updateRubrique(id: string, data: UpdateRubriqueData): Promise<ApiResponse<Rubrique>> {
    return this.put<Rubrique>(`/rubriques/${id}`, data);
  }

  /**
   * Soft delete a categorie (set actif = false)
   */
  async deleteRubrique(id: string): Promise<ApiResponse<void>> {
    return this.delete(`/rubriques/${id}`) as Promise<ApiResponse<void>>;
  }

  /**
   * Reorder rubriques
   */
  async reorderRubriques(orderedIds: string[]): Promise<ApiResponse<void>> {
    return this.put<void>('/rubriques/reorder', { orderedIds });
  }

  // ============ QUESTION ENDPOINTS ============

  /**
   * Get all questions with optional filters
   */
  async getQuestions(filters?: { categorieId?: string; actif?: boolean }): Promise<ApiResponse<Question[]>> {
    const params = new URLSearchParams();
    if (filters?.categorieId) params.append('categorieId', filters.categorieId);
    if (filters?.actif !== undefined) params.append('actif', String(filters.actif));
    const queryString = params.toString();
    return this.get<Question[]>(`/questions${queryString ? `?${queryString}` : ''}`);
  }

  /**
   * Get all active questions
   */
  async getActiveQuestions(): Promise<ApiResponse<Question[]>> {
    return this.get<Question[]>('/questions/active');
  }

  /**
   * Get a specific question by ID
   */
  async getQuestionById(id: string): Promise<ApiResponse<Question>> {
    return this.get<Question>(`/questions/${id}`);
  }

  /**
   * Create a new question
   */
  async createQuestion(data: CreateQuestionData): Promise<ApiResponse<Question>> {
    return this.post<Question>('/questions', data);
  }

  /**
   * Update a question
   */
  async updateQuestion(id: string, data: UpdateQuestionData): Promise<ApiResponse<Question>> {
    return this.put<Question>(`/questions/${id}`, data);
  }

  /**
   * Update question ponderation (criticite and poids)
   */
  async updatePonderation(
    id: string, 
    criticite: 'CRITIQUE' | 'MAJEUR' | 'MINEUR', 
    poids: number
  ): Promise<ApiResponse<Question>> {
    return this.put<Question>(`/questions/${id}/ponderation`, { criticite, poids });
  }

  /**
   * Soft delete a question (set actif = false)
   */
  async deleteQuestion(id: string): Promise<ApiResponse<void>> {
    return this.delete(`/questions/${id}`) as Promise<ApiResponse<void>>;
  }

  /**
   * Reorder questions within a category
   */
  async reorderQuestions(categorieId: string, orderedIds: string[]): Promise<ApiResponse<void>> {
    return this.put<void>('/questions/reorder', { categorieId, orderedIds });
  }

  /**
   * Move question to a different category
   */
  async moveQuestion(
    id: string, 
    targetCategorieId: string, 
    newOrdre: number
  ): Promise<ApiResponse<void>> {
    return this.put<void>(`/questions/${id}/move`, { targetCategorieId, newOrdre });
  }

  // ============ UTILITY ENDPOINTS ============

  /**
   * Initialize default rubriques if none exist
   */
  async initialize(): Promise<ApiResponse<void>> {
    return this.post<void>('/initialize', {});
  }

  /**
   * Create a new version of the questionnaire template
   */
  async createSnapshot(): Promise<ApiResponse<QuestionnaireTemplate>> {
    return this.post<QuestionnaireTemplate>('/snapshot', {});
  }

  /**
   * Create initial template if none exists
   */
  async createInitialTemplate(): Promise<ApiResponse<QuestionnaireTemplate>> {
    return this.post<QuestionnaireTemplate>('/create-initial-template', {});
  }
}

export const adminQuestionnaireService = new AdminQuestionnaireService();
