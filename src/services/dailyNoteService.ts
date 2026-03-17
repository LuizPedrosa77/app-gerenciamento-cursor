import { api } from './api';

export interface DailyNote {
  id: string;
  date: string;
  note: string;
  account_id: string;
  created_at: string;
  updated_at: string;
}

export interface DailyNoteCreate {
  date: string;
  note: string;
  account_id: string;
}

const dailyNoteService = {
  list: async (accountId?: string, year?: number, month?: number): Promise<DailyNote[]> => {
    const params = new URLSearchParams();
    if (accountId) params.append('account_id', accountId);
    if (year) params.append('year', year.toString());
    if (month) params.append('month', month.toString());
    const { data } = await api.get('/api/v1/daily-notes', { params });
    return data;
  },

  upsert: async (payload: DailyNoteCreate): Promise<DailyNote> => {
    const { data } = await api.post('/api/v1/daily-notes', payload);
    return data;
  },

  remove: async (id: string): Promise<void> => {
    await api.delete(`/api/v1/daily-notes/${id}`);
  },
};

export default dailyNoteService;
