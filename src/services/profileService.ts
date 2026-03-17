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
   * Obt??m perfil do usu??rio
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
   * Atualiza perfil do usu??rio
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
   * Obt??m prefer??ncias do usu??rio
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
   * Atualiza prefer??ncias do usu??rio
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
}

export const profileService = new ProfileService();

export default profileService;
