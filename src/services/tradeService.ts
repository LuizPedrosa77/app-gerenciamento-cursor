import { api } from '@/services/api';

export interface PaginatedTrades {
  items: APITrade[];
  total: number;
}

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
  list: async (accountId: string, skip: number = 0, limit: number = 50, year?: number, month?: number): Promise<PaginatedTrades> => {
    const params: any = { account_id: accountId, skip, limit };
    if (year) params.year = year;
    if (month) params.month = month;
    const { data } = await api.get('/api/v1/trades', { params });
    // Backward compatibility just in case
    if (Array.isArray(data)) return { items: data, total: data.length };
    return data;
  },

  create: async (payload: Partial<APITrade>): Promise<APITrade> => {
    const body: any = { ...payload };
    if (body.dir && !body.direction) {
      body.direction = body.dir;
      delete body.dir;
    }
    const { data } = await api.post('/api/v1/trades', body);
    return data;
  },

  update: async (id: string, payload: Partial<APITrade>): Promise<APITrade> => {
    const body: any = { ...payload };
    if (body.dir && !body.direction) {
      body.direction = body.dir;
      delete body.dir;
    }
    const { data } = await api.patch(`/api/v1/trades/${id}`, body);
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
