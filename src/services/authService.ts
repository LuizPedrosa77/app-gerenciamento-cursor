/**
 * Serviço de autenticação
 */
import { api } from './api';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  cpf?: string;
  password: string;
  phone?: string;
  birth_date?: string;
  country?: string;
  address?: string;
  city?: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user: {
    id: string;
    email: string;
    full_name: string;
    cpf: string;
    is_active: boolean;
    plan: string;
    has_google: boolean;
    created_at: string;
    workspaces?: Workspace[];
    [key: string]: unknown;
  };
}

export interface Workspace {
  id: string;
  name: string;
  [key: string]: unknown;
}

export type AuthUser = AuthResponse['user'] & {
  workspaces?: Workspace[];
  [key: string]: unknown;
};

export interface RefreshTokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

class AuthService {
  private accessToken: string | null = null;
  private refreshTokenValue: string | null = null;
  private userData: AuthUser | null = null;
  private readonly ACCESS_TOKEN_KEY = 'gpfx_access_token';
  private readonly REFRESH_TOKEN_KEY = 'gpfx_refresh_token';
  private readonly USER_DATA_KEY = 'gpfx_user_data';

  constructor() {
    this.restoreSession();
  }

  private persistSession(): void {
    try {
      if (this.accessToken) {
        localStorage.setItem(this.ACCESS_TOKEN_KEY, this.accessToken);
      } else {
        localStorage.removeItem(this.ACCESS_TOKEN_KEY);
      }

      if (this.refreshTokenValue) {
        localStorage.setItem(this.REFRESH_TOKEN_KEY, this.refreshTokenValue);
      } else {
        localStorage.removeItem(this.REFRESH_TOKEN_KEY);
      }

      if (this.userData) {
        localStorage.setItem(this.USER_DATA_KEY, JSON.stringify(this.userData));
      } else {
        localStorage.removeItem(this.USER_DATA_KEY);
      }
    } catch (error) {
      console.warn('Persist session warning:', error);
    }
  }

  private restoreSession(): void {
    try {
      const accessToken = localStorage.getItem(this.ACCESS_TOKEN_KEY);
      const refreshToken = localStorage.getItem(this.REFRESH_TOKEN_KEY);
      const userDataRaw = localStorage.getItem(this.USER_DATA_KEY);

      this.accessToken = accessToken || null;
      this.refreshTokenValue = refreshToken || null;
      this.userData = userDataRaw ? JSON.parse(userDataRaw) : null;
    } catch (error) {
      console.warn('Restore session warning:', error);
      this.clearSession();
    }
  }

  private clearSession(): void {
    this.accessToken = null;
    this.refreshTokenValue = null;
    this.userData = null;
    this.persistSession();
  }
  /**
   * Realiza login do usuário
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const payload = {
        email: credentials.email,
        password: credentials.password,
      };
      const response = await api.post<AuthResponse>('/api/v1/auth/login', payload);
      this.accessToken = response.data.access_token;
      this.refreshTokenValue = response.data.refresh_token;
      this.userData = response.data.user;
      this.persistSession();
      return response.data;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  /**
   * Realiza registro de novo usuário
   */
  async register(data: RegisterData): Promise<AuthResponse> {
    try {
      const payload = {
        name: data.name,
        email: data.email,
        password: data.password,
        cpf: data.cpf || null,
        phone: data.phone || null,
        birth_date: data.birth_date || null,
        country: data.country || null,
        address: data.address || null,
        city: data.city || null,
      };
      console.log('[AUTH] Register payload:', JSON.stringify(payload));
      const response = await api.post<AuthResponse>('/api/v1/auth/register', payload);
      this.accessToken = response.data.access_token;
      this.refreshTokenValue = response.data.refresh_token;
      this.userData = response.data.user;
      this.persistSession();
      return response.data;
    } catch (error) {
      console.error('Register error:', error);
      throw error;
    }
  }

  /**
   * Faz logout do usuário
   */
  async logout(): Promise<void> {
    try {
      const refreshToken = this.refreshTokenValue;
      
      if (refreshToken) {
        // Chamar endpoint de logout no backend
        await api.post('/api/v1/auth/logout', { refresh_token: refreshToken });
      }
    } catch (error) {
      console.error('Logout error:', error);
      // Mesmo com erro, limpar dados locais
    } finally {
      // Limpar dados locais
      this.clearSession();
      
      // Redirecionar para login
      window.location.href = '/';
    }
  }

  /**
   * Renova o token de acesso usando o refresh token
   */
  async refreshToken(): Promise<RefreshTokenResponse> {
    try {
      const refreshToken = this.refreshTokenValue;
      
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }
      
      const response = await api.post<RefreshTokenResponse>('/api/v1/auth/refresh', {
        refresh_token: refreshToken
      });
      
      // Salvar novos tokens
      this.accessToken = response.data.access_token;
      this.refreshTokenValue = response.data.refresh_token;
      this.persistSession();
      
      return response.data;
    } catch (error) {
      console.error('Token refresh error:', error);
      throw error;
    }
  }

  /**
   * Obtém dados do usuário atual
   */
  async getMe(): Promise<AuthUser> {
    try {
      const response = await api.get<AuthUser>('/api/v1/auth/me');
      
      // Atualizar dados do usuário em memória
      this.userData = response.data;
      this.persistSession();
      
      return response.data;
    } catch (error) {
      console.error('Get me error:', error);
      throw error;
    }
  }

  /**
   * Verifica se o usuário está autenticado
   */
  isAuthenticated(): boolean {
    return !!this.accessToken;
  }

  /**
   * Obtém dados do usuário em memória
   */
  getUserData(): AuthUser | null {
    return this.userData;
  }

  /**
   * Atualiza dados do usuário em memória
   */
  updateUserData(userData: AuthUser): void {
    this.userData = userData;
    this.persistSession();
  }

  /**
   * Obtém o token de acesso
   */
  getAccessToken(): string | null {
    return this.accessToken;
  }

  /**
   * Obtém o refresh token
   */
  getRefreshToken(): string | null {
    return this.refreshTokenValue;
  }

  /**
   * Verifica se o token está expirado
   */
  isTokenExpired(): boolean {
    const token = this.getAccessToken();
    if (!token) return true;

    try {
      const payload = JSON.parse(atob(token.split('.')[1] || ''));
      const exp = payload?.exp ? payload.exp * 1000 : 0;
      if (!exp) return true;
      return Date.now() >= exp;
    } catch {
      return true;
    }
  }

  /**
   * Inicia o processo de recuperação de senha
   */
  async forgotPassword(email: string): Promise<void> {
    try {
      await api.post('/api/v1/auth/forgot-password', { email });
    } catch (error) {
      console.error('Forgot password error:', error);
      throw error;
    }
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    try {
      await api.post('/api/v1/auth/change-password', {
        current_password: currentPassword,
        new_password: newPassword
      });
    } catch (error) {
      console.error('Change password error:', error);
      throw error;
    }
  }
}

// Exportar instância única do serviço
export const authService = new AuthService();

export default authService;
