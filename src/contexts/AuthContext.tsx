/**
 * Contexto de Autenticação
 */
import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { authService, LoginCredentials, RegisterData, AuthResponse } from '../services/authService';

// Estado da autenticação
interface AuthState {
  user: any | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  workspace: any | null;
  error: string | null;
}

// Ações do reducer
type AuthAction =
  | { type: 'LOGIN_START' }
  | { type: 'LOGIN_SUCCESS'; payload: { user: any; token: string } }
  | { type: 'LOGIN_FAILURE'; payload: string }
  | { type: 'LOGOUT' }
  | { type: 'REGISTER_START' }
  | { type: 'REGISTER_SUCCESS'; payload: { user: any; token: string } }
  | { type: 'REGISTER_FAILURE'; payload: string }
  | { type: 'CHECK_AUTH_START' }
  | { type: 'CHECK_AUTH_SUCCESS'; payload: { user: any; token: string } }
  | { type: 'CHECK_AUTH_FAILURE' }
  | { type: 'CLEAR_ERROR' }
  | { type: 'SET_USER'; payload: any }
  | { type: 'SET_WORKSPACE'; payload: any }
  | { type: 'REFRESH_TOKEN_SUCCESS'; payload: string };

// Estado inicial
const initialState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  workspace: null,
  error: null,
};

// Reducer
const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'LOGIN_START':
    case 'REGISTER_START':
    case 'CHECK_AUTH_START':
      return {
        ...state,
        isLoading: true,
        error: null,
      };

    case 'LOGIN_SUCCESS':
    case 'REGISTER_SUCCESS':
    case 'CHECK_AUTH_SUCCESS':
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      };

    case 'LOGIN_FAILURE':
    case 'REGISTER_FAILURE':
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: action.payload,
      };

    case 'CHECK_AUTH_FAILURE':
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      };

    case 'LOGOUT':
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
        workspace: null,
      };

    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null,
      };

    case 'SET_USER':
      return {
        ...state,
        user: action.payload,
      };

    case 'SET_WORKSPACE':
      return {
        ...state,
        workspace: action.payload,
      };

    case 'REFRESH_TOKEN_SUCCESS':
      return {
        ...state,
        token: action.payload,
      };

    default:
      return state;
  }
};

// Contexto
interface AuthContextType {
  state: AuthState;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  refreshToken: () => Promise<void>;
  clearError: () => void;
  setUser: (user: any) => void;
  setWorkspace: (workspace: any) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider
interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Login
  const login = async (credentials: LoginCredentials): Promise<void> => {
    try {
      dispatch({ type: 'LOGIN_START' });
      
      const response: AuthResponse = await authService.login(credentials);
      
      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: {
          user: response.user,
          token: response.access_token,
        },
      });

      // Se houver workspace padrão, definir
      if (response.user.workspaces && response.user.workspaces.length > 0) {
        dispatch({
          type: 'SET_WORKSPACE',
          payload: response.user.workspaces[0],
        });
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || 'Erro ao fazer login';
      dispatch({ type: 'LOGIN_FAILURE', payload: errorMessage });
      throw error;
    }
  };

  // Register
  const register = async (data: RegisterData): Promise<void> => {
    try {
      dispatch({ type: 'REGISTER_START' });
      
      const response: AuthResponse = await authService.register(data);
      
      dispatch({
        type: 'REGISTER_SUCCESS',
        payload: {
          user: response.user,
          token: response.access_token,
        },
      });
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || 'Erro ao criar conta';
      dispatch({ type: 'REGISTER_FAILURE', payload: errorMessage });
      throw error;
    }
  };

  // Logout
  const logout = async (): Promise<void> => {
    try {
      await authService.logout();
      dispatch({ type: 'LOGOUT' });
    } catch (error) {
      console.error('Logout error:', error);
      // Mesmo com erro, fazer logout local
      dispatch({ type: 'LOGOUT' });
    }
  };

  // Verificar autenticação ao iniciar
  const checkAuth = async (): Promise<void> => {
    try {
      dispatch({ type: 'CHECK_AUTH_START' });
      
      const token = authService.getAccessToken();
      
      if (!token) {
        dispatch({ type: 'CHECK_AUTH_FAILURE' });
        return;
      }
      
      // Validar token com o backend
      const user = await authService.getMe();
      
      dispatch({
        type: 'CHECK_AUTH_SUCCESS',
        payload: {
          user,
          token,
        },
      });

      // Se houver workspace padrão, definir
      if (user.workspaces && user.workspaces.length > 0) {
        dispatch({
          type: 'SET_WORKSPACE',
          payload: user.workspaces[0],
        });
      }
    } catch (error) {
      console.error('Check auth error:', error);
      dispatch({ type: 'CHECK_AUTH_FAILURE' });
    }
  };

  // Refresh token
  const refreshToken = async (): Promise<void> => {
    try {
      const response = await authService.refreshToken();
      
      dispatch({
        type: 'REFRESH_TOKEN_SUCCESS',
        payload: response.access_token,
      });
    } catch (error) {
      console.error('Refresh token error:', error);
      // Se refresh falhar, fazer logout
      dispatch({ type: 'LOGOUT' });
    }
  };

  // Limpar erro
  const clearError = (): void => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  // Setar usuário
  const setUser = (user: any): void => {
    dispatch({ type: 'SET_USER', payload: user });
  };

  // Setar workspace
  const setWorkspace = (workspace: any): void => {
    dispatch({ type: 'SET_WORKSPACE', payload: workspace });
  };

  // Verificar autenticação ao montar o componente
  useEffect(() => {
    checkAuth();
  }, []);

  // Configurar refresh automático de token
  useEffect(() => {
    if (!state.isAuthenticated || !state.token) {
      return;
    }

    const checkTokenExpiration = () => {
      if (authService.isTokenExpired()) {
        refreshToken();
      }
    };

    // Verificar a cada 5 minutos
    const interval = setInterval(checkTokenExpiration, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [state.isAuthenticated, state.token]);

  const value: AuthContextType = {
    state,
    login,
    register,
    logout,
    checkAuth,
    refreshToken,
    clearError,
    setUser,
    setWorkspace,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Hook para usar o contexto
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
};

// Hook para verificar se está autenticado
export const useIsAuthenticated = (): boolean => {
  const { state } = useAuth();
  return state.isAuthenticated;
};

// Hook para obter usuário atual
export const useCurrentUser = (): any | null => {
  const { state } = useAuth();
  return state.user;
};

// Hook para obter workspace atual
export const useCurrentWorkspace = (): any | null => {
  const { state } = useAuth();
  return state.workspace;
};

// Hook para obter loading state
export const useAuthLoading = (): boolean => {
  const { state } = useAuth();
  return state.isLoading;
};

// Hook para obter erro de autenticação
export const useAuthError = (): string | null => {
  const { state } = useAuth();
  return state.error;
};

export default AuthContext;
