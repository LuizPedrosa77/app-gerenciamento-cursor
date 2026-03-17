import { api } from '@/services/api';

export interface AnnualMonthSummary {
  month: number;
  pnl: number;
  trades: number;
}

export interface AnnualSummaryResponse {
  year: number;
  months: AnnualMonthSummary[];
}

const reportService = {
  getAnnualSummary: async (params: { year: number; account_id?: string }): Promise<AnnualSummaryResponse> => {
    const { data } = await api.get('/api/v1/reports/annual-summary', { params });
    return data;
  },
};

export default reportService;
