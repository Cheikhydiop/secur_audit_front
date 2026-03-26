import { BaseService, ApiResponse } from './BaseService';

// Types for Guard/Vigile Transfer
export interface Transfer {
  id: string;
  agent_id: string;
  ancien_site_id: number;
  nouveau_site_id: number;
  date_transfert: string;
  motif?: string;
  created_at?: string;
}

export interface CreateTransferData {
  agent_id: string;
  ancien_site_id: number;
  nouveau_site_id: number;
  date_transfert: string;
  motif?: string;
}

export interface TransferHistory {
  transfers: Transfer[];
  total: number;
}

class TransferVigileService extends BaseService {
  constructor() {
    super('/transfers');
  }

  /**
   * Create a new transfer for a guard/agent
   */
  async createTransfer(data: CreateTransferData): Promise<ApiResponse<Transfer>> {
    return this.post<Transfer>('', data);
  }

  /**
   * Get transfer history for a specific agent
   */
  async getAgentTransferHistory(agentId: string): Promise<ApiResponse<TransferHistory>> {
    return this.get<TransferHistory>(`/agent/${agentId}`);
  }

  /**
   * Get all transfers (paginated)
   */
  async getAllTransfers(page: number = 1, limit: number = 20): Promise<ApiResponse<TransferHistory>> {
    return this.get<TransferHistory>(`?page=${page}&limit=${limit}`);
  }

  /**
   * Get transfers for a specific site
   */
  async getSiteTransfers(siteId: number): Promise<ApiResponse<Transfer[]>> {
    return this.get<Transfer[]>(`/site/${siteId}`);
  }

  /**
   * Cancel a pending transfer
   */
  async cancelTransfer(transferId: string): Promise<ApiResponse<any>> {
    return this.delete(`/${transferId}`);
  }

  /**
   * Get pending transfers
   */
  async getPendingTransfers(): Promise<ApiResponse<Transfer[]>> {
    return this.get<Transfer[]>('/pending');
  }

  /**
   * Approve a transfer (admin)
   */
  async approveTransfer(transferId: string): Promise<ApiResponse<Transfer>> {
    return this.post<Transfer>(`/${transferId}/approve`, {});
  }

  /**
   * Reject a transfer (admin)
   */
  async rejectTransfer(transferId: string, motif: string): Promise<ApiResponse<Transfer>> {
    return this.post<Transfer>(`/${transferId}/reject`, { motif });
  }
}

export const transferVigileService = new TransferVigileService();
