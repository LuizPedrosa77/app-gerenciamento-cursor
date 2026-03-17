/**
 * Serviço para dados do dashboard
 */
import { api } from './api';

export interface DashboardSummary {
  total_balance: number;
  total_pnl: number;
  total_trades: number;
  win_rate: number;
  monthly_data: any[];
  avg_monthly: number;
  pnl_variation: number;
  pair_data: any[];
  dow_data: any[];
  best_dow: any;
  week_data: any[];
  distribution: any[];
  balance_evo_sampled: any[];
  heatmap_data: any[];
  top5_best: any[];
  top5_worst: any[];
  account_summary: any[];
  week_trades: any[];
  week_pnl_total: number;
  wr_spark: number[];
  monthly_pnls: number[];
}

export interface DashboardFilters {
  account_ids?: string[];
  start_date?: string;
  end_date?: string;
  symbol?: string;
}

export interface MonthlyData {
  month: number;
  year: number;
  pnl: number;
  trades_count: number;
  win_rate: number;
}

export interface AccountEvolution {
  date: string;
  balance: number;
  pnl: number;
  trades_count: number;
}

export interface WeeklyReport {
  week_number: number;
  year: number;
  start_date: string;
  end_date: string;
  week_pnl: number;
  prev_pnl: number;
  week_win_rate: number;
  diff_pnl: number;
  highlights: any;
  chart_data: any[];
  history: any[];
  week_trades_count: number;
}

class DashboardService {
  /**
   * Obtém resumo completo do dashboard
   */
  async getSummary(filters?: DashboardFilters): Promise<DashboardSummary> {
    try {
      const params = new URLSearchParams();
      
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            if (Array.isArray(value)) {
              if (key === 'account_ids') {
                if (value.length > 0) {
                  params.append('account_id', value[0].toString());
                }
              } else {
                value.forEach(v => params.append(key, v.toString()));
              }
            } else {
              params.append(key, value.toString());
            }
          }
        });
      }

      const response = await api.get<DashboardSummary>(`/api/v1/dashboard/stats?${params}`);
      return response.data;
    } catch (error) {
      console.error('Get dashboard summary error:', error);
      throw error;
    }
  }

  /**
   * Obtém dados mensais
   */
  async getMonthly(year: number, filters?: DashboardFilters): Promise<MonthlyData[]> {
    try {
      const params = new URLSearchParams();
      params.append('year', year.toString());
      const accountId = filters?.account_ids?.[0];
      if (accountId) {
        params.append('account_id', accountId);
      }

      const response = await api.get<MonthlyData[]>(`/api/v1/dashboard/monthly?${params}`);
      return response.data;
    } catch (error) {
      console.error('Get monthly data error:', error);
      throw error;
    }
  }

  /**
   * Obtém dados por par
   */
  async getByPair(filters?: DashboardFilters): Promise<any[]> {
    try {
      const params = new URLSearchParams();
      
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            if (key === 'account_ids' && Array.isArray(value) && value.length > 0) {
              params.append('account_id', value[0].toString());
              return;
            }
            params.append(key, value.toString());
          }
        });
      }

      const response = await api.get<any[]>(`/api/v1/dashboard/by-pair?${params}`);
      return response.data;
    } catch (error) {
      console.error('Get by pair error:', error);
      throw error;
    }
  }

  /**
   * Obtém dados por dia da semana
   */
  async getByWeekday(filters?: DashboardFilters): Promise<any[]> {
    try {
      const params = new URLSearchParams();
      
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            if (key === 'account_ids' && Array.isArray(value) && value.length > 0) {
              params.append('account_id', value[0].toString());
              return;
            }
            params.append(key, value.toString());
          }
        });
      }

      const response = await api.get<any[]>(`/api/v1/dashboard/by-weekday?${params}`);
      return response.data;
    } catch (error) {
      console.error('Get by weekday error:', error);
      throw error;
    }
  }

  /**
   * Obtém dados por direção (buy/sell)
   */
  async getByDirection(filters?: DashboardFilters): Promise<any[]> {
    try {
      const params = new URLSearchParams();
      
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            if (key === 'account_ids' && Array.isArray(value) && value.length > 0) {
              params.append('account_id', value[0].toString());
              return;
            }
            params.append(key, value.toString());
          }
        });
      }

      const response = await api.get<any[]>(`/api/v1/dashboard/by-direction?${params}`);
      return response.data;
    } catch (error) {
      console.error('Get by direction error:', error);
      throw error;
    }
  }

  /**
   * Obtém os melhores trades
   */
  async getTopTrades(limit: number = 5, filters?: DashboardFilters): Promise<any[]> {
    try {
      const params = new URLSearchParams();
      params.append('limit', limit.toString());
      
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            if (key === 'account_ids' && Array.isArray(value) && value.length > 0) {
              params.append('account_id', value[0].toString());
              return;
            }
            params.append(key, value.toString());
          }
        });
      }

      const response = await api.get<any[]>(`/api/v1/dashboard/top-trades?${params}`);
      return response.data;
    } catch (error) {
      console.error('Get top trades error:', error);
      throw error;
    }
  }

  /**
   * Obtém evolução das contas
   */
  async getAccountEvolution(year: number, filters?: DashboardFilters): Promise<AccountEvolution[]> {
    try {
      const params = new URLSearchParams();
      params.append('year', year.toString());
      const accountId = filters?.account_ids?.[0];
      if (accountId) {
        params.append('account_id', accountId);
      }
      if (filters?.start_date) {
        params.append('start_date', filters.start_date);
      }
      if (filters?.end_date) {
        params.append('end_date', filters.end_date);
      }

      const response = await api.get<AccountEvolution[]>(`/api/v1/dashboard/account-evolution?${params}`);
      return response.data;
    } catch (error) {
      console.error('Get account evolution error:', error);
      throw error;
    }
  }

  /**
   * Obtém relatório semanal
   */
  async getWeeklyReport(year: number, week: number, filters?: DashboardFilters): Promise<WeeklyReport> {
    try {
      const params = new URLSearchParams();
      params.append('year', year.toString());
      params.append('week', week.toString());
      const accountId = filters?.account_ids?.[0];
      if (accountId) {
        params.append('account_id', accountId);
      }

      const response = await api.get<WeeklyReport>(`/api/v1/reports/weekly?${params}`);
      return response.data;
    } catch (error) {
      console.error('Get weekly report error:', error);
      throw error;
    }
  }

  /**
   * Obtém saldo total consolidado
   */
  async getTotalBalance(filters?: DashboardFilters): Promise<any> {
    try {
      const params = new URLSearchParams();

      const response = await api.get<any>(`/api/v1/accounts/total-balance?${params}`);
      return response.data;
    } catch (error) {
      console.error('Get total balance error:', error);
      throw error;
    }
  }

  /**
   * Obtém GP Score
   */
  async getGPScore(filters?: DashboardFilters): Promise<any> {
    try {
      const params = new URLSearchParams();
      
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            if (key === 'account_ids' && Array.isArray(value) && value.length > 0) {
              params.append('account_id', value[0].toString());
              return;
            }
            params.append(key, value.toString());
          }
        });
      }

      const response = await api.get<any>(`/api/v1/reports/gp-score?${params}`);
      return response.data;
    } catch (error) {
      console.error('Get GP Score error:', error);
      throw error;
    }
  }

  /**
   * Obtém histórico de GP Score
   */
  async getGPScoreHistory(period: string = 'monthly', months: number = 12, filters?: DashboardFilters): Promise<any[]> {
    try {
      const params = new URLSearchParams();
      params.append('period', period);
      params.append('months', months.toString());
      const accountId = filters?.account_ids?.[0];
      if (accountId) {
        params.append('account_id', accountId);
      }

      const response = await api.get<any[]>(`/api/v1/reports/gp-score/history?${params}`);
      return response.data;
    } catch (error) {
      console.error('Get GP Score history error:', error);
      throw error;
    }
  }

  /**
   * Obtém sequências de win/loss
   */
  async getStreaks(filters?: DashboardFilters): Promise<any> {
    try {
      const params = new URLSearchParams();
      
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            if (key === 'account_ids' && Array.isArray(value) && value.length > 0) {
              params.append('account_id', value[0].toString());
              return;
            }
            params.append(key, value.toString());
          }
        });
      }

      const response = await api.get<any>(`/api/v1/reports/streaks?${params}`);
      return response.data;
    } catch (error) {
      console.error('Get streaks error:', error);
      throw error;
    }
  }

  /**
   * Obtém o melhor dia da semana para operar
   */
  async getBestDay(filters?: DashboardFilters): Promise<any> {
    try {
      const params = new URLSearchParams();
      
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            if (key === 'account_ids' && Array.isArray(value) && value.length > 0) {
              params.append('account_id', value[0].toString());
              return;
            }
            params.append(key, value.toString());
          }
        });
      }

      const response = await api.get<any>(`/api/v1/reports/best-day?${params}`);
      return response.data;
    } catch (error) {
      console.error('Get best day error:', error);
      throw error;
    }
  }

  /**
   * Obtém resumo mensal para o calendário
   */
  async getMonthlySummary(year: number, month: number, filters?: DashboardFilters): Promise<any> {
    try {
      const params = new URLSearchParams();
      params.append('year', year.toString());
      params.append('month', month.toString());
      const accountId = filters?.account_ids?.[0];
      if (accountId) {
        params.append('account_id', accountId);
      }

      const response = await api.get<any>(`/api/v1/reports/monthly-summary?${params}`);
      return response.data;
    } catch (error) {
      console.error('Get monthly summary error:', error);
      throw error;
    }
  }

  /**
   * Obtém notificações de metas
   */
  async getGoalNotifications(filters?: DashboardFilters): Promise<any[]> {
    try {
      const params = new URLSearchParams();
      const accountId = filters?.account_ids?.[0];
      if (accountId) {
        params.append('account_id', accountId);
      }

      const response = await api.get<any[]>(`/api/v1/reports/notifications/goals?${params}`);
      return response.data;
    } catch (error) {
      console.error('Get goal notifications error:', error);
      throw error;
    }
  }

  /**
   * Descarta notificação de meta
   */
  async dismissGoalNotification(goalId: string): Promise<void> {
    try {
      await api.post(`/api/v1/reports/notifications/goals/${goalId}/dismiss`);
    } catch (error) {
      console.error('Dismiss goal notification error:', error);
      throw error;
    }
  }

  /**
   * Obtém dados para o calendário
   */
  async getCalendarData(year: number, filters?: DashboardFilters): Promise<any> {
    try {
      const params = new URLSearchParams();
      params.append('year', year.toString());
      const accountId = filters?.account_ids?.[0];
      if (accountId) {
        params.append('account_id', accountId);
      }

      const response = await api.get<any>(`/api/v1/calendar/heatmap?${params}`);
      return response.data?.heatmap || response.data;
    } catch (error) {
      console.error('Get calendar data error:', error);
      throw error;
    }
  }

  async getRiskMetrics(filters?: DashboardFilters): Promise<any> {
    try {
      const params = new URLSearchParams();
      
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            if (key === 'account_ids' && Array.isArray(value) && value.length > 0) {
              params.append('account_id', value[0].toString());
              return;
            }
            params.append(key, value.toString());
          }
        });
      }

      const response = await api.get<any>(`/api/v1/reports/risk-metrics?${params}`);
      return response.data;
    } catch (error) {
      console.error('Get risk metrics error:', error);
      throw error;
    }
  }
}

// Exportar instância única do serviço
export const dashboardService = new DashboardService();

export default dashboardService;
