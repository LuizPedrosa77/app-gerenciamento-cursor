import { api } from './api';

export interface Withdrawal {
  id: string;
  amount: number;
  date: string;
  notes?: string;
  account_id: string;
  created_at: string;
}

export interface WithdrawalCreate {
  amount: number;
  date: string;
  notes?: string;
  account_id: string;
}

const withdrawalService = {
  list: async (accountId?: string, year?: number, month?: number): Promise<Withdrawal[]> => {
    const params = new URLSearchParams();
    if (accountId) params.append('account_id', accountId);
    if (year) params.append('year', year.toString());
    if (month) params.append('month', month.toString());
    const { data } = await api.get('/api/v1/withdrawals', { params });
    return data;
  },

  create: async (payload: WithdrawalCreate): Promise<Withdrawal> => {
    const { data } = await api.post('/api/v1/withdrawals', payload);
    return data;
  },

  remove: async (id: string): Promise<void> => {
    await api.delete(`/api/v1/withdrawals/${id}`);
  },
};

export default withdrawalService;
