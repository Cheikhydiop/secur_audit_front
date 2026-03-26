import { BaseService, ApiResponse } from './BaseService';

// Types for User/Agent management
export interface User {
  id: string;
  nom: string;
  prenom: string;
  email?: string;
  telephone?: string;
  role?: string;
  status?: string;
  societe_gardinage_id?: string;
  user?: {
    id: string;
    nom: string;
    prenom: string;
  };
  affectations_batiments?: Affectation[];
}

export interface Affectation {
  id: string;
  agent_id: string;
  batiment_id: string;
  planning?: any;
}

export interface CreateUserData {
  nom: string;
  prenom: string;
  email?: string;
  telephone: string;
  password?: string;
  role?: string;
}

export interface UpdateUserData {
  nom?: string;
  prenom?: string;
  email?: string;
  telephone?: string;
  role?: string;
  status?: string;
}

class UserService extends BaseService {
  constructor() {
    super('/users');
  }

  /**
   * Get all available agents (not assigned to any site)
   */
  async getAvailableAgents(): Promise<ApiResponse<User[]>> {
    return this.get<User[]>('/available');
  }

  /**
   * Get agents for a specific site
   */
  async getSiteAgents(siteId: string): Promise<ApiResponse<User[]>> {
    return this.get<User[]>(`/site/${siteId}`);
  }

  /**
   * Assign an agent to a site
   */
  async assignToSite(agentId: string, siteId: number): Promise<ApiResponse<any>> {
    return this.post<any>('/assign-site', { agent_id: agentId, site_id: siteId });
  }

  /**
   * Release/unassign an agent from a site
   */
  async libererAgent(agentId: string): Promise<ApiResponse<any>> {
    return this.post<any>(`/${agentId}/liberer`, {});
  }

  /**
   * Get all users (paginated)
   */
  async getAllUsers(page: number = 1, limit: number = 20): Promise<ApiResponse<User[]>> {
    return this.get<User[]>(`?page=${page}&limit=${limit}`);
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<ApiResponse<User>> {
    return this.get<User>(`/${userId}`);
  }

  /**
   * Create a new user/agent
   */
  async createUser(data: CreateUserData): Promise<ApiResponse<User>> {
    return this.post<User>('', data);
  }

  /**
   * Update a user
   */
  async updateUser(userId: string, data: UpdateUserData): Promise<ApiResponse<User>> {
    return this.put<User>(`/${userId}`, data);
  }

  /**
   * Delete a user
   */
  async deleteUser(userId: string): Promise<ApiResponse<any>> {
    return this.delete(`/${userId}`);
  }

  /**
   * Get users by role
   */
  async getUsersByRole(role: string): Promise<ApiResponse<User[]>> {
    return this.get<User[]>(`/role/${role}`);
  }
}

export const userService = new UserService();
