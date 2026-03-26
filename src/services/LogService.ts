/**
 * LogService - SmartAudit DG-SECU/Sonatel
 * Service for fetching activity logs from the backend
 */
import { BaseService, ApiResponse } from './BaseService';

export interface LogEntry {
  id: string;
  userId?: string;
  user?: string;
  userEmail?: string;
  userRole?: string;
  action: string;
  target?: string;
  entity?: string;
  entityId?: string;
  entityType?: string;
  details?: string;
  oldData?: any;
  newData?: any;
  timestamp: string;
  category: "create" | "update" | "delete" | "system";
  ipAddress?: string;
  userAgent?: string;
}

export interface LogFilters {
  userId?: string;
  action?: string;
  entity?: string;
  dateDebut?: string;
  dateFin?: string;
  page?: number;
  limit?: number;
}

export interface LogsResponse {
  logs: LogEntry[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface LogStats {
  totalLogs: number;
  logsByAction: Array<{ action: string; count: number }>;
  logsByUser: Array<{ userId: string; _count: { userId: number } }>;
  recentActivity: Array<{ day: string; count: number }>;
}

class LogService extends BaseService {
  constructor() {
    super('/logs');
  }

  /**
   * Get all logs (admin)
   * GET /api/logs
   */
  async getAllLogs(filters?: LogFilters): Promise<ApiResponse<LogsResponse>> {
    const params = new URLSearchParams();

    if (filters) {
      if (filters.userId) params.append('userId', filters.userId);
      if (filters.action) params.append('action', filters.action);
      if (filters.entity) params.append('entity', filters.entity);
      if (filters.dateDebut) params.append('dateDebut', filters.dateDebut);
      if (filters.dateFin) params.append('dateFin', filters.dateFin);
      if (filters.page) params.append('page', filters.page.toString());
      if (filters.limit) params.append('limit', filters.limit.toString());
    }

    const queryString = params.toString();
    const endpoint = queryString ? `?${queryString}` : '';

    return this.get<LogsResponse>(endpoint);
  }

  /**
   * Get my logs (current user)
   * GET /api/logs/moi
   */
  async getMyLogs(): Promise<ApiResponse<LogEntry[]>> {
    return this.get<LogEntry[]>('/moi');
  }

  /**
   * Get logs by entity
   * GET /api/logs/entity/:entityType/:entityId
   */
  async getLogsByEntity(entityType: string, entityId: string): Promise<ApiResponse<LogEntry[]>> {
    return this.get<LogEntry[]>(`/entity/${entityType}/${entityId}`);
  }

  /**
   * Get log statistics
   * GET /api/logs/stats
   */
  async getStats(days: number = 30): Promise<ApiResponse<LogStats>> {
    return this.get<LogStats>(`/stats?days=${days}`);
  }
}

export const logService = new LogService();
export default logService;
