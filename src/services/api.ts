import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { authService } from './authService';

const ENV_API_BASE = import.meta.env.VITE_API_URL?.trim();
const FALLBACK_API_BASE = typeof window !== 'undefined' ? window.location.origin : '';
const API_BASE = (ENV_API_BASE || FALLBACK_API_BASE).replace(/\/+$/, '');

if (!ENV_API_BASE && typeof window !== 'undefined') {
  if (import.meta.env.PROD) {
    console.error('[API] VITE_API_URL não configurada em produção. Usando fallback:', API_BASE);
  } else {
    console.warn('[API] VITE_API_URL não configurada. Usando fallback:', API_BASE);
  }
}

type ApiClient = AxiosInstance & {
  upload: (url: string, file: File) => Promise<AxiosResponse<any>>;
};

type RetriableRequestConfig = {
  _retry?: boolean;
};

let refreshPromise: Promise<{ access_token: string }> | null = null;
let logoutTriggered = false;

export const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
}) as ApiClient;

// Injeta o token automaticamente em todas as requisições
api.interceptors.request.use((config) => {
  const token = authService.getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error?.response?.status;
    const originalConfig = (error?.config || {}) as RetriableRequestConfig & {
      url?: string;
      headers?: any;
    };
    const url = originalConfig?.url || '';

    const isAuthRoute =
      url.includes('/api/v1/auth/login') ||
      url.includes('/api/v1/auth/refresh') ||
      url.includes('/api/v1/auth/logout');

    // Já tentou uma vez ou é rota de auth: não reprocessa.
    if (status !== 401 || originalConfig._retry || isAuthRoute) {
      return Promise.reject(error);
    }

    originalConfig._retry = true;

    try {
      if (!refreshPromise) {
        refreshPromise = authService.refreshToken().finally(() => {
          refreshPromise = null;
        });
      }

      const refreshed = await refreshPromise;
      if (originalConfig.headers) {
        originalConfig.headers.Authorization = `Bearer ${refreshed.access_token}`;
      } else {
        originalConfig.headers = { Authorization: `Bearer ${refreshed.access_token}` };
      }

      return api(originalConfig as any);
    } catch (refreshError) {
      // Sessão inválida/expirada: volta para landing de forma controlada.
      if (!logoutTriggered) {
        logoutTriggered = true;
        try {
          await authService.logout();
        } catch {
          if (typeof window !== 'undefined') {
            window.location.href = '/';
          }
        }
      }
      return Promise.reject(refreshError);
    }
  }
);

// Upload helper (multipart/form-data)
api.upload = (url: string, file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  return api.post(url, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export default api;
