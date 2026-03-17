/**
 * Serviço completo de Replay de Mercado
 * Gerencia WebSocket e comunicação com backend
 */
import { authService } from './authService';

const API_BASE = import.meta.env.VITE_API_URL || window.location.origin;

export interface ReplayConfig {
  account_id: string;
  symbol: string;
  timeframe: string;
  start_date: string;
  end_date: string;
  speed: number;
  mode: 'candle' | 'tick';
}

export interface ReplaySession {
  id: string;
  workspace_id: string;
  user_id: string;
  symbol_id: string;
  timeframe: string;
  mode: string;
  status: 'idle' | 'running' | 'paused' | 'completed' | 'error';
  start_time: string;
  end_time: string;
  current_time: string | null;
  speed: number;
  auto_step: boolean;
  step_interval: number;
  total_ticks: number;
  processed_ticks: number;
  error_message: string | null;
  created_at: string;
  updated_at: string;
  started_at: string | null;
  completed_at: string | null;
}

export interface ReplayTick {
  timestamp: string;
  bid: number;
  ask: number;
  volume: number;
  symbol_id: string;
}

export interface ReplayCandle {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  symbol_id: string;
}

export interface ReplayProgress {
  progress: number;
  processed_ticks: number;
  total_ticks: number;
  current_time: string;
}

export interface ReplayStatus {
  status: string;
  current_time?: string;
  speed?: number;
  progress?: number;
  action?: string;
}

export type ReplayEvent = 
  | { type: 'tick'; data: ReplayTick }
  | { type: 'candle'; data: ReplayCandle }
  | { type: 'progress'; data: ReplayProgress }
  | { type: 'status'; data: ReplayStatus }
  | { type: 'finished' }
  | { type: 'error'; message: string };

export type ReplayCommand = 
  | { type: 'play' }
  | { type: 'pause' }
  | { type: 'stop' }
  | { type: 'seek'; timestamp: string }
  | { type: 'set_speed'; speed: number };

class ReplayService {
  private ws: WebSocket | null = null;
  private sessionId: string | null = null;
  private token: string | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 2000;
  private isDestroyed = false;

  // Event callbacks
  private onCandleCallback: ((data: ReplayCandle) => void) | null = null;
  private onTickCallback: ((data: ReplayTick) => void) | null = null;
  private onProgressCallback: ((data: ReplayProgress) => void) | null = null;
  private onStatusCallback: ((data: ReplayStatus) => void) | null = null;
  private onFinishedCallback: (() => void) | null = null;
  private onErrorCallback: ((message: string) => void) | null = null;

  constructor() {
    this.token = authService.getAccessToken();
  }

  /**
   * Cria nova sessão de replay
   */
  async createSession(config: ReplayConfig): Promise<string> {
    try {
      this.token = this.token || authService.getAccessToken();
      const params = new URLSearchParams();
      params.append('account_id', config.account_id);
      params.append('pair', config.symbol);
      params.append('date', config.start_date);

      const response = await fetch(`${API_BASE}/api/v1/replay/sessions?${params.toString()}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to create replay session');
      }

      const session: any = await response.json();
      const sessionId = session.id || session.session_id;
      this.sessionId = sessionId;
      return sessionId;
    } catch (error) {
      console.error('Error creating replay session:', error);
      throw error;
    }
  }

  /**
   * Conecta ao WebSocket da sessão
   */
  connect(sessionId: string, token?: string): void {
    if (this.isDestroyed) {
      console.warn('ReplayService is destroyed, cannot connect');
      return;
    }

    if (token) {
      this.token = token;
    }

    this.sessionId = sessionId;

    const wsUrl = `${this.getWebSocketUrl()}/api/v1/replay/ws/${sessionId}?token=${this.token}`;
    
    try {
      this.ws = new WebSocket(wsUrl);
      this.setupWebSocketHandlers();
    } catch (error) {
      console.error('Error creating WebSocket connection:', error);
      this.handleReconnect();
    }
  }

  /**
   * Desconecta do WebSocket
   */
  disconnect(): void {
    this.isDestroyed = true;
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    this.sessionId = null;
    this.reconnectAttempts = 0;
  }

  /**
   * Envia comando para o servidor
   */
  private sendCommand(command: ReplayCommand): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('WebSocket is not connected, cannot send command:', command);
      return;
    }

    try {
      let payload: any = null;
      switch (command.type) {
        case 'play':
          payload = { action: 'start', speed: 1.0 };
          break;
        case 'pause':
          payload = { action: 'pause' };
          break;
        case 'stop':
          payload = { action: 'stop' };
          break;
        case 'seek':
          // Backend não suporta seek; envia next como fallback
          payload = { action: 'next' };
          break;
        case 'set_speed':
          payload = { action: 'resume', speed: command.speed };
          break;
        default:
          payload = command;
      }

      this.ws.send(JSON.stringify(payload));
    } catch (error) {
      console.error('Error sending command:', error);
    }
  }

  /**
   * Inicia reprodução
   */
  play(): void {
    this.sendCommand({ type: 'play' });
  }

  /**
   * Pausa reprodução
   */
  pause(): void {
    this.sendCommand({ type: 'pause' });
  }

  /**
   * Para reprodução
   */
  stop(): void {
    this.sendCommand({ type: 'stop' });
  }

  /**
   * Avança para timestamp específico
   */
  seek(timestamp: string): void {
    this.sendCommand({ type: 'seek', timestamp });
  }

  /**
   * Ajusta velocidade de reprodução
   */
  setSpeed(multiplier: number): void {
    this.sendCommand({ type: 'set_speed', speed: multiplier });
  }

  /**
   * Configura callbacks de eventos
   */
  onCandle(callback: (data: ReplayCandle) => void): void {
    this.onCandleCallback = callback;
  }

  onTick(callback: (data: ReplayTick) => void): void {
    this.onTickCallback = callback;
  }

  onProgress(callback: (data: ReplayProgress) => void): void {
    this.onProgressCallback = callback;
  }

  onStatus(callback: (data: ReplayStatus) => void): void {
    this.onStatusCallback = callback;
  }

  onFinished(callback: () => void): void {
    this.onFinishedCallback = callback;
  }

  onError(callback: (message: string) => void): void {
    this.onErrorCallback = callback;
  }

  /**
   * Lista sessões do workspace
   */
  async listSessions(): Promise<ReplaySession[]> {
    try {
      this.token = this.token || authService.getAccessToken();
      const response = await fetch(`${API_BASE}/api/v1/replay/sessions`, {
        headers: {
          'Authorization': `Bearer ${this.token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to list replay sessions');
      }

      const data = await response.json();
      return data.sessions || data;
    } catch (error) {
      console.error('Error listing replay sessions:', error);
      throw error;
    }
  }

  /**
   * Obtém detalhes de uma sessão
   */
  async getSession(sessionId: string): Promise<ReplaySession> {
    try {
      this.token = this.token || authService.getAccessToken();
      const response = await fetch(`${API_BASE}/api/v1/replay/sessions/${sessionId}`, {
        headers: {
          'Authorization': `Bearer ${this.token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to get replay session');
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting replay session:', error);
      throw error;
    }
  }

  /**
   * Exclui uma sessão
   */
  async deleteSession(sessionId: string): Promise<void> {
    try {
      this.token = this.token || authService.getAccessToken();
      const response = await fetch(`${API_BASE}/api/v1/replay/sessions/${sessionId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete replay session');
      }
    } catch (error) {
      console.error('Error deleting replay session:', error);
      throw error;
    }
  }

  /**
   * Configura handlers do WebSocket
   */
  private setupWebSocketHandlers(): void {
    if (!this.ws) return;

    this.ws.onopen = () => {
      console.log('Replay WebSocket connected');
      this.reconnectAttempts = 0;
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.handleMessage(data);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    this.ws.onclose = (event) => {
      console.log('Replay WebSocket disconnected:', event.code, event.reason);
      
      if (!this.isDestroyed && this.reconnectAttempts < this.maxReconnectAttempts) {
        this.handleReconnect();
      }
    };

    this.ws.onerror = (error) => {
      console.error('Replay WebSocket error:', error);
      
      if (this.onErrorCallback) {
        this.onErrorCallback('WebSocket connection error');
      }
    };
  }

  /**
   * Processa mensagens recebidas
   */
  private handleMessage(data: any): void {
    switch (data.type) {
      case 'replay_tick':
        if (this.onTickCallback) {
          this.onTickCallback(data);
        }
        break;

      case 'candle':
      case 'replay_candle':
        if (this.onCandleCallback) {
          this.onCandleCallback(data.candle || data);
        }
        if (this.onProgressCallback && data.progress !== undefined) {
          this.onProgressCallback({
            progress: data.progress,
            processed_ticks: data.current || 0,
            total_ticks: data.total || 0,
            current_time: data.candle?.time || '',
          });
        }
        break;

      case 'replay_progress':
        if (this.onProgressCallback) {
          this.onProgressCallback(data);
        }
        break;

      case 'replay_status':
        if (this.onStatusCallback) {
          this.onStatusCallback(data);
        }
        break;

      case 'finished':
        if (this.onFinishedCallback) {
          this.onFinishedCallback();
        }
        break;

      case 'error':
        if (this.onErrorCallback) {
          this.onErrorCallback(data.message);
        }
        break;

      default:
        console.warn('Unknown replay message type:', data.type);
    }
  }

  /**
   * Tenta reconectar WebSocket
   */
  private handleReconnect(): void {
    if (this.isDestroyed || !this.sessionId) return;

    this.reconnectAttempts++;
    
    console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);

    setTimeout(() => {
      this.connect(this.sessionId!);
    }, this.reconnectDelay * this.reconnectAttempts);
  }

  /**
   * Obtém URL do WebSocket
   */
  private getWebSocketUrl(): string {
    const base = API_BASE;
    return base.replace(/^http/, 'ws');
  }

  /**
   * Verifica se está conectado
   */
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  /**
   * Obtém status da conexão
   */
  getConnectionStatus(): 'connecting' | 'connected' | 'disconnected' | 'error' {
    if (!this.ws) return 'disconnected';
    
    switch (this.ws.readyState) {
      case WebSocket.CONNECTING:
        return 'connecting';
      case WebSocket.OPEN:
        return 'connected';
      case WebSocket.CLOSING:
      case WebSocket.CLOSED:
        return 'disconnected';
      default:
        return 'error';
    }
  }

  /**
   * Limpa recursos
   */
  destroy(): void {
    this.disconnect();
    
    // Limpar callbacks
    this.onCandleCallback = null;
    this.onTickCallback = null;
    this.onProgressCallback = null;
    this.onStatusCallback = null;
    this.onFinishedCallback = null;
    this.onErrorCallback = null;
  }
}

// Instância global do serviço
export const replayService = new ReplayService();

export default replayService;
