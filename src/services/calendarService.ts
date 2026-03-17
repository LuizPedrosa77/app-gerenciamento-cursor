/**
 * Serviço para dados do calendário
 */
import { api } from './api';

export interface CalendarDay {
  date: string;
  day: number;
  month: number;
  year: number;
  weekday: number;
  trades: any[];
  pnl: number;
  win_rate: number;
  notes?: string;
  is_goal_achieved?: boolean;
  is_holiday?: boolean;
}

export interface MonthData {
  year: number;
  month: number;
  days: CalendarDay[];
  total_pnl: number;
  total_trades: number;
  win_rate: number;
  best_day: CalendarDay;
  worst_day: CalendarDay;
  goals: {
    monthly_goal: number;
    current_amount: number;
    percentage: number;
    achieved: boolean;
  };
}

export interface StreakData {
  current_win_streak: number;
  current_loss_streak: number;
  max_win_streak: number;
  max_loss_streak: number;
  longest_win_streak_this_month: number;
  longest_loss_streak_this_month: number;
}

export interface BestWeekday {
  weekday: number;
  weekday_name: string;
  avg_pnl: number;
  total_trades: number;
  win_rate: number;
  profit_factor: number;
}

export interface Goal {
  type: 'monthly' | 'biweekly';
  amount: number;
  current_amount: number;
  percentage: number;
  achieved: boolean;
  remaining_days?: number;
  created_at: string;
}

class CalendarService {
  /**
   * Obtém dados do mês para o calendário
   */
  async getMonthData(year: number, month: number, accountId?: string): Promise<MonthData> {
    try {
      const params = new URLSearchParams();
      params.append('year', year.toString());
      params.append('month', month.toString());
      
      if (accountId) {
        params.append('account_id', accountId);
      }

      const response = await api.get<any>(`/api/v1/calendar/data?${params}`);
      return (response.data?.data || response.data) as MonthData;
    } catch (error) {
      console.error('Get month data error:', error);
      throw error;
    }
  }

  /**
   * Obtém resumo do mês
   */
  async getMonthSummary(year: number, month: number, accountId?: string): Promise<any> {
    try {
      const params = new URLSearchParams();
      params.append('year', year.toString());
      params.append('month', month.toString());
      
      if (accountId) {
        params.append('account_id', accountId);
      }

      const response = await api.get<any>(`/api/v1/calendar/summary?${params}`);
      return response.data;
    } catch (error) {
      console.error('Get month summary error:', error);
      throw error;
    }
  }

  /**
   * Obtém sequências de win/loss
   */
  async getStreaks(year: number, month: number, accountId?: string): Promise<StreakData> {
    try {
      const params = new URLSearchParams();
      params.append('year', year.toString());
      params.append('month', month.toString());
      
      if (accountId) {
        params.append('account_id', accountId);
      }

      const response = await api.get<StreakData>(`/api/v1/calendar/streaks?${params}`);
      return response.data;
    } catch (error) {
      console.error('Get streaks error:', error);
      throw error;
    }
  }

  /**
   * Obtém o melhor dia da semana para operar
   */
  async getBestWeekday(year: number, month: number, accountId?: string): Promise<BestWeekday> {
    try {
      const params = new URLSearchParams();
      params.append('year', year.toString());
      params.append('month', month.toString());
      
      if (accountId) {
        params.append('account_id', accountId);
      }

      const response = await api.get<BestWeekday>(`/api/v1/calendar/best-day?${params}`);
      return response.data;
    } catch (error) {
      console.error('Get best weekday error:', error);
      throw error;
    }
  }

  /**
   * Define meta quinzenal
   */
  async setQuinzenalGoal(amount: number, accountId?: string): Promise<void> {
    try {
      const data: any = { amount, type: 'biweekly' };
      
      if (accountId) {
        data.account_id = accountId;
      }

      await api.post('/api/v1/calendar/goals', data);
    } catch (error) {
      console.error('Set quinzenal goal error:', error);
      throw error;
    }
  }

  /**
   * Define meta mensal
   */
  async setMonthlyGoal(amount: number, accountId?: string): Promise<void> {
    try {
      const data: any = { amount, type: 'monthly' };
      
      if (accountId) {
        data.account_id = accountId;
      }

      await api.post('/api/v1/calendar/goals', data);
    } catch (error) {
      console.error('Set monthly goal error:', error);
      throw error;
    }
  }

  /**
   * Obtém metas definidas
   */
  async getGoals(accountId?: string): Promise<Goal[]> {
    try {
      const params = accountId ? `?account_id=${accountId}` : '';
      
      const response = await api.get<any>(`/api/v1/calendar/goals${params}`);
      return response.data?.goals || response.data || [];
    } catch (error) {
      console.error('Get goals error:', error);
      throw error;
    }
  }

  /**
   * Verifica se meta foi alcançada
   */
  async checkGoalReached(year: number, month: number, accountId?: string): Promise<{
    monthly: Goal;
    biweekly: Goal;
  }> {
    try {
      const params = new URLSearchParams();
      params.append('year', year.toString());
      params.append('month', month.toString());
      
      if (accountId) {
        params.append('account_id', accountId);
      }

      const response = await api.get<any>(`/api/v1/calendar/goals/check?${params}`);
      return response.data;
    } catch (error) {
      console.error('Check goal reached error:', error);
      throw error;
    }
  }

  /**
   * Obtém eventos especiais do calendário
   */
  async getCalendarEvents(year: number, month: number, accountId?: string): Promise<any[]> {
    try {
      const params = new URLSearchParams();
      params.append('year', year.toString());
      params.append('month', month.toString());
      
      if (accountId) {
        params.append('account_id', accountId);
      }

      const response = await api.get<any[]>(`/api/v1/calendar/events?${params}`);
      return response.data;
    } catch (error) {
      console.error('Get calendar events error:', error);
      throw error;
    }
  }

  /**
   * Adiciona evento ao calendário
   */
  async addCalendarEvent(event: {
    title: string;
    date: string;
    type: string;
    description?: string;
    account_id?: string;
  }): Promise<any> {
    try {
      const response = await api.post<any>('/api/v1/calendar/events', event);
      return response.data;
    } catch (error) {
      console.error('Add calendar event error:', error);
      throw error;
    }
  }

  /**
   * Remove evento do calendário
   */
  async removeCalendarEvent(eventId: string): Promise<void> {
    try {
      await api.delete(`/api/v1/calendar/events/${eventId}`);
    } catch (error) {
      console.error('Remove calendar event error:', error);
      throw error;
    }
  }

  /**
   * Obtém feriados do período
   */
  async getHolidays(year: number, country: string = 'BR'): Promise<any[]> {
    try {
      const response = await api.get<any[]>(`/api/v1/calendar/holidays?year=${year}&country=${country}`);
      return response.data;
    } catch (error) {
      console.error('Get holidays error:', error);
      throw error;
    }
  }

  /**
   * Obtém dias com trades para heatmap
   */
  async getHeatmapData(year: number, accountId?: string): Promise<any[]> {
    try {
      const params = new URLSearchParams();
      params.append('year', year.toString());
      
      if (accountId) {
        params.append('account_id', accountId);
      }

      const response = await api.get<any>(`/api/v1/calendar/heatmap?${params}`);
      return response.data?.heatmap || response.data || [];
    } catch (error) {
      console.error('Get heatmap data error:', error);
      throw error;
    }
  }

  /**
   * Exporta dados do calendário
   */
  async exportCalendarData(year: number, format: 'json' | 'csv' = 'json', accountId?: string): Promise<Blob> {
    try {
      const params = new URLSearchParams();
      params.append('year', year.toString());
      params.append('format', format);
      
      if (accountId) {
        params.append('account_id', accountId);
      }

      const response = await api.get(`/api/v1/calendar/export?${params}`, {
        responseType: 'blob'
      });
      
      return response.data;
    } catch (error) {
      console.error('Export calendar data error:', error);
      throw error;
    }
  }
}

// Exportar instância única do serviço
export const calendarService = new CalendarService();

export default calendarService;
