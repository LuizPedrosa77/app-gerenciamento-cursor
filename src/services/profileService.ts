/**
 * Serviço para gerenciamento de perfil do usuário
 */
import { api } from './api';

export interface UserProfile {
  id: string;
  user_id: string;
  avatar_url?: string;
  bio?: string;
  phone?: string;
  city?: string;
  state?: string;
  country?: string;
  website?: string;
  linkedin_url?: string;
  instagram_url?: string;
  twitter_url?: string;
  facebook_url?: string;
  trading_experience?: 'beginner' | 'intermediate' | 'advanced' | 'professional';
  preferred_timeframes?: string[];
  preferred_pairs?: string[];
  risk_profile?: 'conservative' | 'moderate' | 'aggressive';
  notifications_enabled: boolean;
  email_notifications: boolean;
  push_notifications: boolean;
  created_at: string;
  updated_at: string;
}

export interface UpdateProfileData {
  avatar_url?: string;
  bio?: string;
  phone?: string;
  city?: string;
  state?: string;
  country?: string;
  website?: string;
  linkedin_url?: string;
  instagram_url?: string;
  twitter_url?: string;
  facebook_url?: string;
  trading_experience?: 'beginner' | 'intermediate' | 'advanced' | 'professional';
  preferred_timeframes?: string[];
  preferred_pairs?: string[];
  risk_profile?: 'conservative' | 'moderate' | 'aggressive';
  notifications_enabled?: boolean;
  email_notifications?: boolean;
  push_notifications?: boolean;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  language: string;
  timezone: string;
  date_format: string;
  time_format: '12h' | '24h';
  currency: string;
  default_timeframe: string;
  auto_save: boolean;
  compact_view: boolean;
  show_tooltips: boolean;
  animations_enabled: boolean;
  chart_type: 'candlestick' | 'line' | 'bar';
  volume_chart: boolean;
  grid_lines: boolean;
  crosshair_style: string;
}

export interface ReferralCode {
  code: string;
  referral_url: string;
  total_referrals: number;
  active_referrals: number;
  total_earned: number;
  created_at: string;
  expires_at?: string;
}

export interface ReferralHistory {
  id: string;
  referred_user_email: string;
  referred_user_name: string;
  status: 'pending' | 'active' | 'completed' | 'expired';
  commission_amount: number;
  commission_percentage: number;
  created_at: string;
  activated_at?: string;
  completed_at?: string;
}

export interface Discount {
  code: string;
  description: string;
  percentage: number;
  max_amount?: number;
  min_amount?: number;
  expires_at?: string;
  usage_count: number;
  max_usage?: number;
  is_active: boolean;
}

class ProfileService {
  /**
   * Obtém perfil do usuário
   */
  async getProfile(): Promise<UserProfile> {
    try {
      const response = await api.get<UserProfile>('/api/v1/profiles/me');
      return response.data;
    } catch (error) {
      console.error('Get profile error:', error);
      throw error;
    }
  }

  /**
   * Atualiza perfil do usuário
   */
  async updateProfile(data: UpdateProfileData): Promise<UserProfile> {
    try {
      const response = await api.put<UserProfile>('/api/v1/profiles/me', data);
      return response.data;
    } catch (error) {
      console.error('Update profile error:', error);
      throw error;
    }
  }

  /**
   * Faz upload do avatar
   */
  async uploadAvatar(file: File): Promise<string> {
    try {
      const response = await api.upload('/api/v1/profiles/me/avatar', file);
      return response.data.avatar_url;
    } catch (error) {
      console.error('Upload avatar error:', error);
      throw error;
    }
  }

  /**
   * Remove o avatar atual
   */
  async removeAvatar(): Promise<void> {
    try {
      await api.delete('/api/v1/profiles/me/avatar');
    } catch (error) {
      console.error('Remove avatar error:', error);
      throw error;
    }
  }

  /**
   * Atualiza links das redes sociais
   */
  async updateSocialLinks(links: {
    website?: string;
    linkedin_url?: string;
    instagram_url?: string;
    twitter_url?: string;
    facebook_url?: string;
  }): Promise<UserProfile> {
    try {
      const response = await api.put<UserProfile>('/api/v1/profiles/me/social-links', links);
      return response.data;
    } catch (error) {
      console.error('Update social links error:', error);
      throw error;
    }
  }

  /**
   * Obtém preferências do usuário
   */
  async getPreferences(): Promise<UserPreferences> {
    try {
      const response = await api.get<UserPreferences>('/api/v1/profiles/preferences');
      return response.data;
    } catch (error) {
      console.error('Get preferences error:', error);
      throw error;
    }
  }

  /**
   * Atualiza preferências do usuário
   */
  async updatePreferences(data: Partial<UserPreferences>): Promise<UserPreferences> {
    try {
      const response = await api.put<UserPreferences>('/api/v1/profiles/preferences', data);
      return response.data;
    } catch (error) {
      console.error('Update preferences error:', error);
      throw error;
    }
  }

  /**
   * Obtém código de indicação
   */
  async getReferralCode(): Promise<ReferralCode> {
    try {
      const response = await api.get<ReferralCode>('/api/v1/profiles/referral-code');
      return response.data;
    } catch (error) {
      console.error('Get referral code error:', error);
      throw error;
    }
  }

  /**
   * Obtém histórico de indicações
   */
  async getReferralHistory(): Promise<ReferralHistory[]> {
    try {
      const response = await api.get<ReferralHistory[]>('/api/v1/profiles/referral-history');
      return response.data;
    } catch (error) {
      console.error('Get referral history error:', error);
      throw error;
    }
  }

  /**
   * Obtém descontos disponíveis
   */
  async getDiscounts(): Promise<Discount[]> {
    try {
      const response = await api.get<Discount[]>('/api/v1/profiles/discounts');
      return response.data;
    } catch (error) {
      console.error('Get discounts error:', error);
      throw error;
    }
  }

  /**
   * Aplica código de desconto
   */
  async applyDiscount(code: string): Promise<Discount> {
    try {
      const response = await api.post<Discount>('/api/v1/profiles/discounts/apply', { code });
      return response.data;
    } catch (error) {
      console.error('Apply discount error:', error);
      throw error;
    }
  }

  /**
   * Remove código de desconto
   */
  async removeDiscount(discountId: string): Promise<void> {
    try {
      await api.delete(`/api/v1/profiles/discounts/${discountId}`);
    } catch (error) {
      console.error('Remove discount error:', error);
      throw error;
    }
  }

  /**
   * Obtém estatísticas do perfil
   */
  async getProfileStats(): Promise<{
    total_trades: number;
    total_pnl: number;
    win_rate: number;
    account_count: number;
    membership_days: number;
    referral_count: number;
    last_login: string;
  }> {
    try {
      const response = await api.get<any>('/api/v1/profiles/stats');
      return response.data;
    } catch (error) {
      console.error('Get profile stats error:', error);
      throw error;
    }
  }

  /**
   * Exporta dados do perfil
   */
  async exportProfileData(format: 'json' | 'csv' = 'json'): Promise<Blob> {
    try {
      const response = await api.get(`/api/v1/profiles/export?format=${format}`, {
        responseType: 'blob'
      });
      
      return response.data;
    } catch (error) {
      console.error('Export profile data error:', error);
      throw error;
    }
  }

  /**
   * Solicita exclusão da conta
   */
  async requestAccountDeletion(reason: string, password: string): Promise<void> {
    try {
      await api.post('/api/v1/profiles/request-deletion', {
        reason,
        password
      });
    } catch (error) {
      console.error('Request account deletion error:', error);
      throw error;
    }
  }

  /**
   * Cancela solicitação de exclusão
   */
  async cancelAccountDeletion(): Promise<void> {
    try {
      await api.post('/api/v1/profiles/cancel-deletion');
    } catch (error) {
      console.error('Cancel account deletion error:', error);
      throw error;
    }
  }

  /**
   * Verifica se há solicitação de exclusão pendente
   */
  async checkDeletionStatus(): Promise<{
    has_pending_request: boolean;
    requested_at?: string;
    deletion_date?: string;
    reason?: string;
  }> {
    try {
      const response = await api.get<any>('/api/v1/profiles/deletion-status');
      return response.data;
    } catch (error) {
      console.error('Check deletion status error:', error);
      throw error;
    }
  }

  /**
   * Obtém atividades recentes do usuário
   */
  async getRecentActivities(limit: number = 10): Promise<any[]> {
    try {
      const response = await api.get<any[]>(`/api/v1/profiles/activities?limit=${limit}`);
      return response.data;
    } catch (error) {
      console.error('Get recent activities error:', error);
      throw error;
    }
  }

  /**
   * Atualiza notificações
   */
  async updateNotifications(settings: {
    email_notifications?: boolean;
    push_notifications?: boolean;
    notifications_enabled?: boolean;
  }): Promise<UserProfile> {
    try {
      const response = await api.put<UserProfile>('/api/v1/profiles/notifications', settings);
      return response.data;
    } catch (error) {
      console.error('Update notifications error:', error);
      throw error;
    }
  }

  /**
   * Testa notificações push
   */
  async testPushNotification(): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      const response = await api.post<any>('/api/v1/profiles/test-push-notification');
      return response.data;
    } catch (error) {
      console.error('Test push notification error:', error);
      throw error;
    }
  }

  /**
   * Obtém configurações de segurança
   */
  async getSecuritySettings(): Promise<{
    two_factor_enabled: boolean;
    last_password_change: string;
    active_sessions: Array<{
      id: string;
      device: string;
      ip_address: string;
      created_at: string;
      is_current: boolean;
    }>;
  }> {
    try {
      const response = await api.get<any>('/api/v1/profiles/security-settings');
      return response.data;
    } catch (error) {
      console.error('Get security settings error:', error);
      throw error;
    }
  }

  /**
   * Revoga sessão específica
   */
  async revokeSession(sessionId: string): Promise<void> {
    try {
      await api.delete(`/api/v1/profiles/sessions/${sessionId}`);
    } catch (error) {
      console.error('Revoke session error:', error);
      throw error;
    }
  }

  /**
   * Revoga todas as outras sessões
   */
  async revokeAllOtherSessions(): Promise<void> {
    try {
      await api.post('/api/v1/profiles/revoke-all-sessions');
    } catch (error) {
      console.error('Revoke all other sessions error:', error);
      throw error;
    }
  }
}

// Exportar instância única do serviço
export const profileService = new ProfileService();

export default profileService;
