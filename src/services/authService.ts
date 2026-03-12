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
  };
}

export interface RefreshTokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

class AuthService {
  /**
   * Realiza login do usuário
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const response = await api.post<AuthResponse>('/api/v1/auth/login', credentials);
      
      // Salvar tokens e dados do usuário
      localStorage.setItem('access_token', response.data.access_token);
      localStorage.setItem('refresh_token', response.data.refresh_token);
      localStorage.setItem('user_data', JSON.stringify(response.data.user));
      
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
      const response = await api.post<AuthResponse>('/api/v1/auth/register', data);
      
      // Salvar tokens e dados do usuário
      localStorage.setItem('access_token', response.data.access_token);
      localStorage.setItem('refresh_token', response.data.refresh_token);
      localStorage.setItem('user_data', JSON.stringify(response.data.user));
      
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
      const refreshToken = localStorage.getItem('refresh_token');
      
      if (refreshToken) {
        // Chamar endpoint de logout no backend
        await api.post('/api/v1/auth/logout', { refresh_token: refreshToken });
      }
    } catch (error) {
      console.error('Logout error:', error);
      // Mesmo com erro, limpar dados locais
    } finally {
      // Limpar dados locais
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user_data');
      
      // Redirecionar para login
      window.location.href = '/login';
    }
  }

  /**
   * Renova o token de acesso usando o refresh token
   */
  async refreshToken(): Promise<RefreshTokenResponse> {
    try {
      const refreshToken = localStorage.getItem('refresh_token');
      
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }
      
      const response = await api.post<RefreshTokenResponse>('/api/v1/auth/refresh', {
        refresh_token: refreshToken
      });
      
      // Salvar novos tokens
      localStorage.setItem('access_token', response.data.access_token);
      localStorage.setItem('refresh_token', response.data.refresh_token);
      
      return response.data;
    } catch (error) {
      console.error('Token refresh error:', error);
      throw error;
    }
  }

  /**
   * Obtém dados do usuário atual
   */
  async getMe(): Promise<any> {
    try {
      const response = await api.get('/api/v1/auth/me');
      
      // Atualizar dados do usuário no localStorage
      localStorage.setItem('user_data', JSON.stringify(response.data));
      
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
    const token = localStorage.getItem('access_token');
    const userData = localStorage.getItem('user_data');
    
    return !!(token && userData);
  }

  /**
   * Obtém dados do usuário do localStorage
   */
  getUserData(): any | null {
    const userData = localStorage.getItem('user_data');
    
    if (userData) {
      try {
        return JSON.parse(userData);
      } catch (error) {
        console.error('Error parsing user data:', error);
        return null;
      }
    }
    
    return null;
  }

  /**
   * Atualiza dados do usuário no localStorage
   */
  updateUserData(userData: any): void {
    localStorage.setItem('user_data', JSON.stringify(userData));
  }

  /**
   * Obtém o token de acesso
   */
  getAccessToken(): string | null {
    return localStorage.getItem('access_token');
  }

  /**
   * Obtém o refresh token
   */
  getRefreshToken(): string | null {
    return localStorage.getItem('refresh_token');
  }

  /**
   * Verifica se o token está expirado
   */
  isTokenExpired(): boolean {
    const userData = this.getUserData();
    
    if (!userData || !userData.token_expires_at) {
      return true;
    }
    
    const expirationTime = new Date(userData.token_expires_at).getTime();
    const currentTime = new Date().getTime();
    
    return currentTime >= expirationTime;
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

  /**
   * Redefine a senha com o token recebido
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    try {
      await api.post('/api/v1/auth/reset-password', {
        token,
        new_password: newPassword
      });
    } catch (error) {
      console.error('Reset password error:', error);
      throw error;
    }
  }

  /**
   * Altera a senha do usuário logado
   */
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
