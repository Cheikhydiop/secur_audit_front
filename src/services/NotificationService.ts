import { BaseService, ApiResponse } from './BaseService';

export type NotificationType =
  | 'INFO'
  | 'WARNING'
  | 'SUCCESS'
  | 'ERROR'
  | 'INSPECTION_SUBMITTED'
  | 'ACTION_ASSIGNED'
  | 'ACTION_DUE_SOON'
  | 'ACTION_OVERDUE'
  | 'INVITATION';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: any;
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationFilters {
  isRead?: boolean;
  type?: NotificationType;
  limit?: number;
  offset?: number;
}

class NotificationService extends BaseService {
  constructor() {
    super('/notifications');
  }

  // Get all notifications
  getNotifications(filters?: NotificationFilters): Promise<ApiResponse<Notification[]>> {
    const params = new URLSearchParams();
    if (filters?.limit) params.append('limit', filters.limit.toString());
    if (filters?.offset) params.append('offset', filters.offset.toString());

    return this.get<Notification[]>(`?${params.toString()}`);
  }

  // Get unread notifications
  getUnreadNotifications(): Promise<ApiResponse<Notification[]>> {
    return this.get('/unread');
  }

  // Get unread count
  getUnreadCount(): Promise<ApiResponse<{ count: number }>> {
    return this.get('/unread/count');
  }

  // Mark as read
  markAsRead(notificationId: string): Promise<ApiResponse<Notification>> {
    return this.patch<Notification>(`/${notificationId}/read`);
  }

  // Mark all as read
  markAllAsRead(): Promise<ApiResponse<{ count: number }>> {
    return this.patch('/read-all', {});
  }

  // Delete notification
  deleteNotification(notificationId: string): Promise<ApiResponse<void>> {
    return this.delete(`/${notificationId}`);
  }

  // Admin: Send notification
  sendAdminNotification(data: {
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    data?: any;
  }): Promise<ApiResponse<Notification>> {
    return this.post('/admin/send', data);
  }

  // Admin: Broadcast
  broadcastAdminNotification(data: {
    type: NotificationType;
    title: string;
    message: string;
    data?: any;
  }): Promise<ApiResponse<{ sent: number }>> {
    return this.post('/admin/broadcast', data);
  }
}

export const notificationService = new NotificationService();

