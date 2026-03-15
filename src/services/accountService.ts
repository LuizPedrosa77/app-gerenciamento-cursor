import axios from 'axios';

const API_BASE = 'https://api.painelzap.com/api/v1';

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('gpfx_auth_token');
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

function client() {
  return axios.create({
    baseURL: API_BASE,
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
  });
}

export interface APIAccount {
  id: string;
  name: string;
  balance: number;
  notes: string;
  meta?: number;
  monthly_goal?: number;
  withdrawals?: Record<string, number>;
}

const accountService = {
  list: async (): Promise<APIAccount[]> => {
    const { data } = await client().get('/accounts');
    return data;
  },

  create: async (payload: { name: string; balance: number }): Promise<APIAccount> => {
    const { data } = await client().post('/accounts', payload);
    return data;
  },

  update: async (id: string, payload: Partial<APIAccount>): Promise<APIAccount> => {
    const { data } = await client().patch(`/accounts/${id}`, payload);
    return data;
  },

  remove: async (id: string): Promise<void> => {
    await client().delete(`/accounts/${id}`);
  },
};

export default accountService;
