import { api } from '@/services/api';

export interface MTConnectRequest {
  login: string;
  investor_password: string;
  server: string;
  platform: string;
  account_name: string;
}

export interface MTConnectResponse {
  success: boolean;
  message: string;
  account_id: string;
}

export interface MTSyncResponse {
  success: boolean;
  message: string;
  trades_imported: number;
}

export interface MTStatusResponse {
  connected: boolean;
  status: string;
  login?: string;
  server?: string;
  platform?: string;
}

const mtconnectService = {
  connect: async (data: MTConnectRequest): Promise<MTConnectResponse> => {
    const { data: result } = await api.post('/api/v1/metaapi/connect', data);
    return result;
  },

  sync: async (accountId: string): Promise<MTSyncResponse> => {
    const { data: result } = await api.post(`/api/v1/metaapi/sync/${accountId}`);
    return result;
  },

  status: async (accountId: string): Promise<MTStatusResponse> => {
    const { data: result } = await api.get(`/api/v1/metaapi/status/${accountId}`);
    return result;
  },

  disconnect: async (accountId: string): Promise<void> => {
    await api.delete(`/api/v1/metaapi/disconnect/${accountId}`);
  },
};

export default mtconnectService;
