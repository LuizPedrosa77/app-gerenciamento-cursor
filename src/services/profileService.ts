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
      const response = await api.get<UserProfile>('/api/v1/profile');
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
      const response = await api.patch<UserProfile>('/api/v1/profile', data);
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
    // Retorna vazio silenciosamente — endpoint não implementado ainda
    return {} as any;
  }

  /**
   * Remove o avatar atual
   */
  async removeAvatar(): Promise<void> {
    // Retorna vazio silenciosamente — endpoint não implementado ainda
    return {} as any;
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
    // Retorna vazio silenciosamente — endpoint não implementado ainda
    return {} as any;
  }

  /**
   * Obtém preferências do usuário
   */
  async getPreferences(): Promise<UserPreferences> {
    try {
      const response = await api.get<UserPreferences>('/api/v1/profile/preferences');
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
      const response = await api.patch<UserPreferences>('/api/v1/profile/preferences', data);
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
    // Retorna vazio silenciosamente — endpoint não implementado ainda
    return {} as any;
  }

  /**
   * Obtém histórico de indicações
   */
  async getReferralHistory(): Promise<ReferralHistory[]> {
    // Retorna vazio silenciosamente — endpoint não implementado ainda
    return {} as any;
  }

  /**
   * Obtém descontos disponíveis
   */
  async getDiscounts(): Promise<Discount[]> {
    // Retorna vazio silenciosamente — endpoint não implementado ainda
    return {} as any;
  }

  /**
   * Aplica código de desconto
   */
  async applyDiscount(code: string): Promise<Discount> {
    // Retorna vazio silenciosamente — endpoint não implementado ainda
    return {} as any;
  }

  /**
   * Remove código de desconto
   */
  async removeDiscount(discountId: string): Promise<void> {
    // Retorna vazio silenciosamente — endpoint não implementado ainda
    return {} as any;
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
    // Retorna vazio silenciosamente — endpoint não implementado ainda
    return {} as any;
  }

  /**
   * Exporta dados do perfil
   */
  async exportProfileData(format: 'json' | 'csv' = 'json'): Promise<Blob> {
    // Retorna vazio silenciosamente — endpoint não implementado ainda
    return {} as any;
  }

  /**
   * Solicita exclusão da conta
   */
  async requestAccountDeletion(reason: string, password: string): Promise<void> {
    // Retorna vazio silenciosamente — endpoint não implementado ainda
    return {} as any;
  }

  /**
   * Cancela solicitação de exclusão
   */
  async cancelAccountDeletion(): Promise<void> {
    // Retorna vazio silenciosamente — endpoint não implementado ainda
    return {} as any;
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
    // Retorna vazio silenciosamente — endpoint não implementado ainda
    return {} as any;
  }

  /**
   * Obtém atividades recentes do usuário
   */
  async getRecentActivities(limit: number = 10): Promise<any[]> {
    // Retorna vazio silenciosamente — endpoint não implementado ainda
    return {} as any;
  }

  /**
   * Atualiza notificações
   */
  async updateNotifications(settings: {
    email_notifications?: boolean;
    push_notifications?: boolean;
    notifications_enabled?: boolean;
  }): Promise<UserProfile> {
    // Retorna vazio silenciosamente — endpoint não implementado ainda
    return {} as any;
  }

  /**
   * Testa notificações push
   */
  async testPushNotification(): Promise<{
    success: boolean;
    message: string;
  }> {
    // Retorna vazio silenciosamente — endpoint não implementado ainda
    return {} as any;
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
    // Retorna vazio silenciosamente — endpoint não implementado ainda
    return {} as any;
  }

  /**
   * Revoga sessão específica
   */
  async revokeSession(sessionId: string): Promise<void> {
    // Retorna vazio silenciosamente — endpoint não implementado ainda
    return {} as any;
  }

  /**
   * Revoga todas as outras sessões
   */
  async revokeAllOtherSessions(): Promise<void> {
    // Retorna vazio silenciosamente — endpoint não implementado ainda
    return {} as any;
  }
}

// Exportar instância única do serviço
export const profileService = new ProfileService();

export default profileService;
