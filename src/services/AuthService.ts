import { BaseService, ApiResponse } from './BaseService';

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  avatar?: string;
  entite?: string; // CPS, SUR, SEC
  referralCode?: string;
  mustChangePassword?: boolean;
  wallet?: {
    balance: number;
    lockedBalance: number;
    bonusBalance: number;
  };
}

export interface LoginResponse {
  token: string;
  refreshToken: string;
  user: User;
  requiresDeviceVerification?: boolean;
  sessionId?: string;
  deviceInfo?: any;
  existingSessions?: any[];
  message?: string;
}

export interface RegisterResponse {
  user: User;
  message: string;
}

class AuthService extends BaseService {
  constructor() {
    super('/auth');
  }

  async login(email: string, password: string): Promise<ApiResponse<LoginResponse>> {
    return this.post<LoginResponse>('/login', { email, password });
  }

  async register(
    name: string,
    email: string,
    password: string,
    phone: string,
    referralCode?: string
  ): Promise<ApiResponse<RegisterResponse>> {
    return this.post<RegisterResponse>('/register', { name, email, password, phone, referralCode });
  }

  async logout(): Promise<ApiResponse<void>> {
    return this.post<void>('/logout');
  }

  async getProfile(): Promise<ApiResponse<User>> {
    return this.get<User>('/profile');
  }

  async updateProfile(data: Partial<User>): Promise<ApiResponse<User>> {
    return this.put<User>('/profile', data);
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<ApiResponse<void>> {
    return this.post<void>('/change-password', { currentPassword, newPassword });
  }

  async requestPasswordChangeOTP(): Promise<ApiResponse<void>> {
    return this.post<void>('/request-password-change-otp');
  }

  async changePasswordWithOTP(otpCode: string, newPassword: string): Promise<ApiResponse<void>> {
    return this.post<void>('/change-password-otp', { otpCode, newPassword });
  }

  async verifyOTPOnly(otpCode: string): Promise<ApiResponse<void>> {
    return this.post<void>('/verify-otp-only', { otpCode });
  }



  async forgotPassword(email: string): Promise<ApiResponse<void>> {
    return this.post<void>('/forgot-password', { email });
  }

  async invite(email: string, name: string, role: string, entite?: string): Promise<ApiResponse<void>> {
    return this.post<void>('/invite', { email, name, role, entite });
  }

  async activateAccount(token: string, name: string, password: string): Promise<ApiResponse<any>> {
    return this.post<any>('/activate', { token, name, password });
  }

  async resetPassword(token: string, newPassword: string): Promise<ApiResponse<void>> {
    return this.post<void>('/reset-password', { token, newPassword });
  }

  async refreshSession(refreshToken: string): Promise<ApiResponse<{ token: string; refreshToken: string }>> {
    return this.post<{ token: string; refreshToken: string }>('/refresh', { refreshToken });
  }

  async verifyDevice(sessionId: string, otpCode: string): Promise<ApiResponse<LoginResponse>> {
    return this.post<LoginResponse>('/verify-device', { sessionId, otpCode });
  }

  async resendDeviceOTP(sessionId: string): Promise<ApiResponse<void>> {
    return this.post<void>('/resend-device-otp', { sessionId });
  }

  getAccessToken(): string | null {
    return localStorage.getItem('auth_token');
  }

  setToken(token: string | null): void {
    if (token) {
      localStorage.setItem('auth_token', token);
    } else {
      localStorage.removeItem('auth_token');
    }
  }

  async getSessions(): Promise<ApiResponse<any[]>> {
    return this.get<any[]>('/sessions');
  }

  async revokeSession(sessionId: string): Promise<ApiResponse<void>> {
    return this.delete<void>(`/sessions/${sessionId}`);
  }
}

export const authService = new AuthService();
export default authService;