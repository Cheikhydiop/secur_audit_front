import { BaseService, ApiResponse } from './BaseService';
import { User } from './AuthService';

export interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  totalFights: number;
  upcomingFights: number;
  totalBets: number;
  pendingBets: number;
  acceptedBets: number;
  cancelledBets: number;
  totalVolume: number;
  pendingWithdrawals: number;
  todayDeposits: number;
  todayWithdrawals: number;
  totalCommission?: number;
  todayCommission?: number;
}

export interface AuditLog {
  id: string;
  action: string;
  table: string;
  recordId?: string;
  newData?: any;
  ipAddress?: string;
  userAgent?: string;
  userId?: string;
  createdAt: string;
  user?: {
    name: string;
    email: string;
  };
}

export interface UserFilters {
  role?: string;
  isActive?: boolean;
  isBanned?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface CreateFighterPayload {
  name: string;
  nickname?: string;
  stable?: string;
  birthDate?: string;
  birthPlace?: string;
  weight?: number;
  height?: number;
  profileImage?: string;
}

export interface UpdateFighterPayload extends Partial<CreateFighterPayload> {
  status?: string;
  isActive?: boolean;
}

export interface CreateFightPayload {
  title: string;
  description?: string;
  location: string;
  scheduledAt: string;
  fighterAId: string;
  fighterBId: string;
  dayEventId?: string;
  oddsA?: number;
  oddsB?: number;
}

export interface CreateEventPayload {
  title: string;
  slug: string;
  description?: string;
  date: string;
  location: string;
  venue?: string;
  bannerImage?: string;
  minBetAmount?: number;
  maxBetAmount?: number;
}

export interface RecentCommission {
  id: string;
  amount: number;
  deductedAt: string;
  fight: {
    id: string;
    title: string;
    fighterA: string;
    fighterB: string;
  } | null;
}

export interface AnalyticsData {
  deposits: { date: string; total: number }[];
  withdrawals: { date: string; total: number }[];
  commissions: { date: string; total: number }[];
}

// Supprimé ValidateResultPayload d'ici car déplacé vers FightService

class AdminService extends BaseService {
  constructor() {
    super('/admin');
  }

  // Dashboard
  getDashboardStats(): Promise<ApiResponse<DashboardStats>> {
    return this.get<DashboardStats>('/stats');
  }

  // Users Management
  getUsers(filters?: UserFilters): Promise<ApiResponse<User[]>> {
    const params = new URLSearchParams();
    if (filters?.role) params.append('role', filters.role);
    if (filters?.isActive !== undefined) params.append('isActive', filters.isActive.toString());
    if (filters?.search) params.append('search', filters.search);
    if (filters?.limit) params.append('limit', filters.limit.toString());
    if (filters?.offset) params.append('offset', filters.offset.toString());

    const queryString = params.toString();
    return this.get<User[]>(`/users${queryString ? `?${queryString}` : ''}`);
  }

  getUser(userId: string): Promise<ApiResponse<User>> {
    return this.get<User>(`/users/${userId}`);
  }

  // Users Management
  updateUserStatus(userId: string, isActive: boolean): Promise<ApiResponse<any>> {
    return this.patch(`/users/${userId}/status`, { isActive });
  }

  resendInvitation(userId: string): Promise<ApiResponse<any>> {
    return this.post(`/users/${userId}/resend-invitation`, {});
  }

  // Audits Management
  getAuditLogs(page: number = 1, limit: number = 20): Promise<ApiResponse<AuditLog[]>> {
    return this.get<AuditLog[]>(`/audit-logs?page=${page}&limit=${limit}`);
  }

  // Commissions Management
  getRecentCommissions(limit: number = 10): Promise<ApiResponse<RecentCommission[]>> {
    return this.get<RecentCommission[]>(`/commissions/recent?limit=${limit}`);
  }

  // Inspections Management (Admin)
  getInspections(filters?: {
    page?: number;
    limit?: number;
    statut?: string;
    siteId?: string;
    inspecteurId?: string;
    search?: string;
  }): Promise<ApiResponse<any>> {
    const params = new URLSearchParams();
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());
    if (filters?.statut) params.append('statut', filters.statut);
    if (filters?.siteId) params.append('siteId', filters.siteId);
    if (filters?.inspecteurId) params.append('inspecteurId', filters.inspecteurId);
    if (filters?.search) params.append('search', filters.search);

    const queryString = params.toString();
    return this.get(`/inspections${queryString ? `?${queryString}` : ''}`);
  }
}

export const adminService = new AdminService();
