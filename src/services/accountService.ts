import { api } from '@/services/api';

export interface APIAccount {
  id: string;
  name: string;
  balance: number;
  initial_balance?: number; // saldo inicial da conta
  notes: string;
  meta?: number;
  monthly_goal?: number;
  withdrawals?: Record<string, number>;
}

const accountService = {
  list: async (): Promise<APIAccount[]> => {
    const { data } = await api.get('/api/v1/accounts');
    return data;
  },
  listAccounts: async (): Promise<APIAccount[]> => {
    const { data } = await api.get('/api/v1/accounts');
    return data;
  },

  create: async (payload: { name: string; balance: number }): Promise<APIAccount> => {
    const { data } = await api.post('/api/v1/accounts', {
      name: payload.name,
      initial_balance: payload.balance,
    });
    return data;
  },

  update: async (id: string, payload: Partial<APIAccount>): Promise<APIAccount> => {
    const { withdrawals, ...rest } = payload;
    const { data } = await api.patch(`/api/v1/accounts/${id}`, rest);
    return data;
  },

  remove: async (id: string): Promise<void> => {
    await api.delete(`/api/v1/accounts/${id}`);
  },
};

export default accountService;
