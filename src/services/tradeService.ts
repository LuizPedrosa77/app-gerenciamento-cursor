import { api } from '@/services/api';

export interface APITrade {
  id: string;
  account_id: string;
  year: number;
  month: number;
  date: string;
  pair: string;
  dir: string;
  direction?: string; // campo do backend EA
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
    const { data } = await api.get('/api/v1/trades', {
      params: { account_id: accountId },
    });
    return data;
  },

  create: async (payload: Partial<APITrade>): Promise<APITrade> => {
    const { data } = await api.post('/api/v1/trades', payload);
    return data;
  },

  update: async (id: string, payload: Partial<APITrade>): Promise<APITrade> => {
    const { data } = await api.patch(`/api/v1/trades/${id}`, payload);
    return data;
  },

  remove: async (id: string): Promise<void> => {
    await api.delete(`/api/v1/trades/${id}`);
  },

  bulkDelete: async (accountId: string): Promise<void> => {
    await api.delete(`/api/v1/trades/bulk`, {
      params: { account_id: accountId },
    });
  },
};

export default tradeService;
