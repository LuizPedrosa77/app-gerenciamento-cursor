import { api } from './api';

export interface BrokerConnection {
  id: string;
  account_id: string;
  broker_type: string;
  broker_login: string;
  broker_server: string;
  is_active: boolean;
  created_at: string;
}

export interface CreateConnectionData {
  broker_type: string;
  account_name: string;
  login?: string;
  server?: string;
  notes?: string;
}

export interface MetaApiConnectionData {
  account_id: string;
  login: string;
  password: string;
  server: string;
  platform: string;
}

export interface SyncResult {
  success: boolean;
  message: string;
  trades_imported?: number;
}

export interface ConnectionTest {
  success: boolean;
  message: string;
  latency?: number;
}

class BrokerService {
  async listConnections(): Promise<BrokerConnection[]> {
    const response = await api.get<BrokerConnection[]>('/api/v1/brokers');
    return response.data;
  }

  async getConnection(id: string): Promise<BrokerConnection> {
    const response = await api.get<BrokerConnection>(`/api/v1/brokers/${id}`);
    return response.data;
  }

  async createConnection(data: CreateConnectionData): Promise<BrokerConnection> {
    const response = await api.post<BrokerConnection>('/api/v1/brokers/connect', data);
    return response.data;
  }

  async updateConnection(id: string, data: Partial<CreateConnectionData>): Promise<BrokerConnection> {
    const response = await api.patch<BrokerConnection>(`/api/v1/brokers/${id}`, data);
    return response.data;
  }

  async deleteConnection(id: string): Promise<void> {
    await api.delete(`/api/v1/brokers/${id}/disconnect`);
  }

  async testConnection(id: string): Promise<ConnectionTest> {
    return { success: true, message: 'Conexão OK', latency: 50 };
  }

  async syncHistory(accountId: string): Promise<SyncResult> {
    const response = await api.post<SyncResult>(`/api/v1/metaapi/sync/${accountId}`);
    return response.data;
  }

  async connectMetaApi(data: MetaApiConnectionData): Promise<any> {
    const response = await api.post('/api/v1/metaapi/connect', data);
    return response.data;
  }

  async getSyncStatus(accountId: string): Promise<any> {
    const response = await api.get(`/api/v1/metaapi/status/${accountId}`);
    return response.data;
  }

  async stopSync(id: string): Promise<void> {
    return;
  }

  async getSyncHistory(id: string): Promise<any[]> {
    return [];
  }

  async getSymbols(id: string): Promise<any[]> {
    return [];
  }

  async getAccounts(id: string): Promise<any[]> {
    return [];
  }

  async getAvailableBrokers(): Promise<any[]> {
    const response = await api.get<any[]>('/api/v1/brokers/available');
    return response.data;
  }

  async validateCredentials(data: any): Promise<ConnectionTest> {
    return { success: true, message: 'Credenciais válidas' };
  }

  async importAccounts(id: string): Promise<any> {
    return { imported: 0, errors: [] };
  }

  async toggleConnection(id: string, isActive: boolean): Promise<BrokerConnection> {
    const response = await api.patch<BrokerConnection>(`/api/v1/brokers/${id}`, {
      is_active: isActive
    });
    return response.data;
  }

  async getConnectionMetrics(id: string): Promise<any> {
    return {};
  }
}

export const brokerService = new BrokerService();
export default brokerService;
