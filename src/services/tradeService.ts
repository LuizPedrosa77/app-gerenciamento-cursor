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

export interface APITrade {
  id: string;
  account_id: string;
  year: number;
  month: number;
  date: string;
  pair: string;
  dir: string;
  lots?: number;
  result: string;
  pnl: number;
  has_vm: boolean;
  vm_lots?: number;
  vm_result: string;
  vm_pnl: number;
  screenshot?: { data: string; caption: string };
}

const tradeService = {
  list: async (accountId: string): Promise<APITrade[]> => {
    const { data } = await client().get(`/trades`, { params: { account_id: accountId } });
    return data;
  },

  create: async (payload: Partial<APITrade>): Promise<APITrade> => {
    const { data } = await client().post('/trades', payload);
    return data;
  },

  update: async (id: string, payload: Partial<APITrade>): Promise<APITrade> => {
    const { data } = await client().patch(`/trades/${id}`, payload);
    return data;
  },

  remove: async (id: string): Promise<void> => {
    await client().delete(`/trades/${id}`);
  },

  bulkDelete: async (accountId: string): Promise<void> => {
    await client().delete(`/trades`, { params: { account_id: accountId } });
  },
};

export default tradeService;
