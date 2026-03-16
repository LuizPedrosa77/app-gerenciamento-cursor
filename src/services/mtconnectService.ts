import api from './api';

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
    const response = await api.post('/metaapi/connect', data);
    return response.data;
  },

  sync: async (accountId: string): Promise<MTSyncResponse> => {
    const response = await api.post(`/metaapi/sync/${accountId}`);
    return response.data;
  },

  status: async (accountId: string): Promise<MTStatusResponse> => {
    const response = await api.get(`/metaapi/status/${accountId}`);
    return response.data;
  },

  disconnect: async (accountId: string): Promise<void> => {
    await api.delete(`/metaapi/disconnect/${accountId}`);
  },
};

export default mtconnectService;
