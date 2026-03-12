/**
 * Cliente HTTP com interceptors para autenticação e tratamento de erros
 */
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

// Configuração base da API
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.hubnexusai.com';
const WS_URL = import.meta.env.VITE_WS_URL || 'wss://api.hubnexusai.com';

// Interface para resposta de erro da API
export interface ApiError {
  detail: string;
  status_code?: number;
  error_code?: string;
}

// Interface para refresh token
export interface RefreshTokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

// Interface para resposta da API
export interface ApiResponse<T = any> {
  data: T;
  message?: string;
  status?: string;
}

// Criar instância do Axios
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 segundos
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor de REQUEST - Adicionar token de autenticação
apiClient.interceptors.request.use(
  (config: AxiosRequestConfig) => {
    const token = localStorage.getItem('access_token');
    
    if (token) {
      config.headers = {
        ...config.headers,
        Authorization: `Bearer ${token}`,
      };
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor de RESPONSE - Tratamento de erros e refresh de token
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    // Erro de rede ou timeout
    if (!error.response) {
      if (error.code === 'ECONNABORTED') {
        showToast('Timeout na requisição. Tente novamente.', 'error');
      } else {
        showToast('Erro de conexão. Verifique sua internet.', 'error');
      }
      return Promise.reject(error);
    }
    
    const { status, data } = error.response;
    const apiError: ApiError = data;
    
    // Tratar diferentes códigos de status
    switch (status) {
      case 401:
        // Token expirado ou inválido
        return handleUnauthorizedError(originalRequest);
      
      case 403:
        showToast('Sem permissão para acessar este recurso.', 'error');
        break;
      
      case 404:
        showToast('Recurso não encontrado.', 'error');
        break;
      
      case 422:
        // Erro de validação
        if (apiError.detail && typeof apiError.detail === 'object') {
          // Multiple validation errors
          Object.values(apiError.detail).forEach((errorMessage: any) => {
            showToast(errorMessage, 'error');
          });
        } else {
          showToast(apiError.detail || 'Dados inválidos.', 'error');
        }
        break;
      
      case 429:
        showToast('Muitas requisições. Aguarde um momento.', 'warning');
        break;
      
      case 500:
        showToast('Erro interno do servidor. Tente novamente mais tarde.', 'error');
        break;
      
      case 502:
      case 503:
        showToast('Serviço temporariamente indisponível.', 'warning');
        break;
      
      default:
        showToast(`Erro ${status}: ${apiError.detail || 'Ocorreu um erro inesperado.'}`, 'error');
    }
    
    return Promise.reject(error);
  }
);

// Função para tratar erro 401 (não autorizado)
async function handleUnauthorizedError(originalRequest: AxiosRequestConfig): Promise<any> {
  const refreshToken = localStorage.getItem('refresh_token');
  
  if (!refreshToken) {
    // Não há refresh token, fazer logout
    handleLogout();
    return Promise.reject(new Error('No refresh token available'));
  }
  
  try {
    // Tentar fazer refresh do token
    const response = await axios.post<RefreshTokenResponse>(
      `${API_BASE_URL}/api/v1/auth/refresh`,
      { refresh_token: refreshToken },
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );
    
    const { access_token, refresh_token: newRefreshToken } = response.data;
    
    // Salvar novos tokens
    localStorage.setItem('access_token', access_token);
    localStorage.setItem('refresh_token', newRefreshToken);
    
    // Refazer a requisição original com o novo token
    if (originalRequest.headers) {
      originalRequest.headers.Authorization = `Bearer ${access_token}`;
    }
    
    return apiClient(originalRequest);
    
  } catch (refreshError) {
    // Refresh falhou, fazer logout
    console.error('Token refresh failed:', refreshError);
    handleLogout();
    return Promise.reject(refreshError);
  }
}

// Função para fazer logout
function handleLogout() {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('user_data');
  
  // Redirecionar para login
  if (window.location.pathname !== '/login') {
    window.location.href = '/login';
  }
}

// Sistema de toast simples (substituir por lib real como react-hot-toast)
function showToast(message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') {
  // Criar elemento toast
  const toast = document.createElement('div');
  toast.className = `fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg transform transition-all duration-300 translate-x-full opacity-0`;
  
  // Estilos baseados no tipo
  const styles = {
    success: 'bg-green-500 text-white',
    error: 'bg-red-500 text-white',
    warning: 'bg-yellow-500 text-white',
    info: 'bg-blue-500 text-white',
  };
  
  toast.className += ` ${styles[type]}`;
  toast.innerHTML = `
    <div class="flex items-center">
      <div class="mr-2">
        ${type === 'success' ? '✓' : type === 'error' ? '✗' : type === 'warning' ? '⚠' : 'ℹ'}
      </div>
      <div>${message}</div>
    </div>
  `;
  
  document.body.appendChild(toast);
  
  // Animar entrada
  setTimeout(() => {
    toast.classList.remove('translate-x-full', 'opacity-0');
  }, 100);
  
  // Remover após 5 segundos
  setTimeout(() => {
    toast.classList.add('translate-x-full', 'opacity-0');
    setTimeout(() => {
      document.body.removeChild(toast);
    }, 300);
  }, 5000);
}

// Exportar instância configurada e utilitários
export { apiClient, API_BASE_URL, WS_URL };

// Exportar funções de API tipadas
export const api = {
  // GET request
  get: <T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> => {
    return apiClient.get(url, config);
  },
  
  // POST request
  post: <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> => {
    return apiClient.post(url, data, config);
  },
  
  // PUT request
  put: <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> => {
    return apiClient.put(url, data, config);
  },
  
  // PATCH request
  patch: <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> => {
    return apiClient.patch(url, data, config);
  },
  
  // DELETE request
  delete: <T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> => {
    return apiClient.delete(url, config);
  },
  
  // Upload de arquivo
  upload: <T = any>(url: string, file: File, onProgress?: (progress: number) => void): Promise<AxiosResponse<T>> => {
    const formData = new FormData();
    formData.append('file', file);
    
    return apiClient.post(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      },
    });
  },
};

// Exportar utilitários
export const authUtils = {
  getToken: () => localStorage.getItem('access_token'),
  getRefreshToken: () => localStorage.getItem('refresh_token'),
  setTokens: (accessToken: string, refreshToken: string) => {
    localStorage.setItem('access_token', accessToken);
    localStorage.setItem('refresh_token', refreshToken);
  },
  clearTokens: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  },
  isAuthenticated: () => !!localStorage.getItem('access_token'),
};

export default api;
