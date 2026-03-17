/**
 * Servico para IA do Trade (alinhado aos endpoints existentes)
 */
import { api } from './api';

export interface AIAnalysisRequest {
  analysis_type: 'trade' | 'account' | 'predict' | 'general';
  trade_id?: string;
  account_id?: string;
  question?: string;
}

export interface AIAnalysisResponse {
  analysis: string;
  suggestions: string[];
  score: number | null;
  created_at: string;
}

class AIService {
  /**
   * Analisa trades/contas conforme o backend
   */
  async analyze(data: AIAnalysisRequest): Promise<AIAnalysisResponse> {
    try {
      const response = await api.post<AIAnalysisResponse>('/api/v1/ai/analyze', data);
      return response.data;
    } catch (error) {
      console.error('AI analyze error:', error);
      throw error;
    }
  }

  /**
   * Retorna insights gerais (ultimos trades)
   */
  async getInsights(accountId?: string): Promise<AIAnalysisResponse> {
    try {
      const params = new URLSearchParams();
      if (accountId) params.append('account_id', accountId);
      const response = await api.get<AIAnalysisResponse>(`/api/v1/ai/insights?${params}`);
      return response.data;
    } catch (error) {
      console.error('AI insights error:', error);
      throw error;
    }
  }

  /**
   * Previsao baseada em trade
   */
  async predict(data: AIAnalysisRequest): Promise<AIAnalysisResponse> {
    try {
      const response = await api.post<AIAnalysisResponse>('/api/v1/ai/predict', data);
      return response.data;
    } catch (error) {
      console.error('AI predict error:', error);
      throw error;
    }
  }
}

export const aiService = new AIService();

export default aiService;
