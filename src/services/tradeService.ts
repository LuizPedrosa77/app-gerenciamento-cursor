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
  screenshot_url?: string;
  screenshots?: Array<{ id?: string; url?: string; filename?: string; created_at?: string }>;
  symbol_raw?: string;
  symbol_normalized?: string;
  ticket?: string;
  open_time?: string;
  close_time?: string;
  open_price?: number;
  close_price?: number;
}

const tradeService = {
  list: async (
    accountId: string,
    skip: number = 0,
    limit: number = 50,
    year?: number,
    month?: number,
    start_date?: string,
    end_date?: string
  ): Promise<PaginatedTrades> => {
    const params: any = { account_id: accountId, skip, limit };
    if (year) params.year = year;
    if (month) params.month = month;
    if (start_date) params.start_date = start_date;
    if (end_date) params.end_date = end_date;
    const { data } = await api.get('/api/v1/trades', { params });
    // Backward compatibility just in case
    if (Array.isArray(data)) return { items: data, total: data.length };
    return data;
  },

  chartData: async (
    accountId?: string,
    pair?: string,
    start_date?: string,
    end_date?: string,
    limit: number = 3000
  ): Promise<PaginatedTrades> => {
    const params: any = { limit };
    if (accountId && accountId !== 'all') params.account_id = accountId;
    if (pair) params.pair = pair;
    if (start_date) params.start_date = start_date;
    if (end_date) params.end_date = end_date;
    const { data } = await api.get('/api/v1/trades/chart-data', { params });
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
