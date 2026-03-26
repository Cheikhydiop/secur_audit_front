/**
 * InvitationService - SmartAudit DG-SECU/Sonatel
 * PB-015: Système d'invitation par email
 */
import { BaseService, ApiResponse } from './BaseService';

export interface InvitePayload {
  email: string;
  name: string;
  role: string;
}

export interface ActivateAccountPayload {
  token: string;
  name: string;
  password: string;
}

export interface InvitationResponse {
  message: string;
  user?: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
}

class InvitationService extends BaseService {
  constructor() {
    super('/auth');
  }

  /**
   * Invite a new user by email
   * POST /api/auth/invite
   * Requires: SUPER_ADMIN or ADMIN role
   */
  async inviteUser(payload: InvitePayload): Promise<ApiResponse<void>> {
    console.log('📧 Invitation de:', payload.email, 'avec le rôle:', payload.role);

    const result = await this.post<void>('/invite', payload);

    if (result.error) {
      console.error('❌ Erreur lors de l\'invitation:', result.error);
    } else {
      console.log('✅ Invitation envoyée avec succès');
    }

    return result;
  }

  /**
   * Activate account from invitation link
   * POST /api/auth/activate
   */
  async activateAccount(payload: ActivateAccountPayload): Promise<ApiResponse<InvitationResponse>> {
    console.log('🔄 Activation du compte...');

    const result = await this.post<InvitationResponse>('/activate', {
      token: payload.token,
      name: payload.name,
      password: payload.password
    });

    if (result.data) {
      console.log('✅ Compte activé avec succès');
    } else if (result.error) {
      console.error('❌ Erreur activation compte:', result.error);
    }

    return result;
  }
}

export const invitationService = new InvitationService();
