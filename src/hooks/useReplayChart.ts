/**
 * Hook personalizado para integração do Replay com TradingView
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import replayService, { ReplayCandle, ReplayTick } from '../services/replayService';

interface UseReplayChartOptions {
  symbol?: string;
  onCandle?: (candle: ReplayCandle) => void;
  onTick?: (tick: ReplayTick) => void;
}

interface ChartData {
  candles: ReplayCandle[];
  ticks: ReplayTick[];
  currentPrice: number | null;
  volume: number;
}

interface TradingViewLineHandle {
  setEnd: (point: { time: number; price: number | null }) => void;
  setStart: (point: { time: number; price: number | null }) => void;
  remove?: () => void;
}

interface TradingViewLabelHandle {
  set: (data: { time: number; price: number; text: string }) => void;
}

interface TradingViewDataHandler {
  updateData: (barData: {
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }) => void;
  clearData: () => void;
}

interface TradingViewVisibleRange {
  from: number;
  to: number;
}

interface TradingViewChartInstance {
  createLine: (config: Record<string, unknown>) => TradingViewLineHandle;
  createShape: (config: Record<string, unknown>) => TradingViewLabelHandle;
  dataHandler: () => TradingViewDataHandler;
  getVisibleRange: () => TradingViewVisibleRange;
  currentPriceLine?: TradingViewLineHandle;
}

interface TradingViewWidgetInstance {
  onChartReady: (callback: () => void) => void;
  chart: () => TradingViewChartInstance;
  remove: () => void;
  setSymbol: (symbol: string) => void;
  setTimeframe: (timeframe: string) => void;
}

interface TradingViewGlobal {
  widget: new (config: Record<string, unknown>) => TradingViewWidgetInstance;
}

declare global {
  interface Window {
    TradingView?: TradingViewGlobal;
  }
}

interface DatafeedConfig {
  supported_resolutions: string[];
  supports_marks: boolean;
  supports_time: boolean;
}

interface ResolveSymbolPayload {
  name: string;
  description: string;
  type: string;
  session: string;
  timezone: string;
  ticker: string;
  exchange: string;
  minmov: number;
  pricescale: number;
  has_intraday: boolean;
  has_no_volume: boolean;
  supported_resolutions: string[];
}

interface HistoryMeta {
  noData: boolean;
}

interface TradingViewDatafeed {
  onReady: (callback: (config: DatafeedConfig) => void) => void;
  resolveSymbol: (
    symbolName: string,
    onSymbolResolvedCallback: (payload: ResolveSymbolPayload) => void,
    onResolveErrorCallback: (reason: string) => void
  ) => void;
  getBars: (
    symbolInfo: unknown,
    resolution: string,
    from: number,
    to: number,
    onHistoryCallback: (
      bars: Array<{ time: number; open: number; high: number; low: number; close: number; volume: number }>,
      meta: HistoryMeta
    ) => void,
    onErrorCallback: (error: string) => void,
    firstDataRequest: boolean
  ) => void;
  subscribeBars: () => void;
  unsubscribeBars: () => void;
}

export function useReplayChart(options: UseReplayChartOptions = {}) {
  const [chartData, setChartData] = useState<ChartData>({
    candles: [],
    ticks: [],
    currentPrice: null,
    volume: 0,
  });

  const [isConnected, setIsConnected] = useState(false);
  const [replayTime, setReplayTime] = useState<string | null>(null);
  const chartWidgetRef = useRef<TradingViewWidgetInstance | null>(null);
  const verticalLineRef = useRef<TradingViewLineHandle | null>(null);
  const labelRef = useRef<TradingViewLabelHandle | null>(null);
  const chartDataRef = useRef<ChartData>(chartData);

  useEffect(() => {
    chartDataRef.current = chartData;
  }, [chartData]);

  const createCustomDatafeed = useCallback((): TradingViewDatafeed => {
    return {
      onReady: (callback) => {
        setTimeout(() => {
          callback({
            supported_resolutions: ['1', '5', '15', '30', '60', '240', '1D'],
            supports_marks: false,
            supports_time: true,
          });
        }, 0);
      },
      resolveSymbol: (symbolName, onSymbolResolvedCallback, _onResolveErrorCallback) => {
        setTimeout(() => {
          onSymbolResolvedCallback({
            name: symbolName,
            description: symbolName,
            type: 'forex',
            session: '24x7',
            timezone: 'America/Sao_Paulo',
            ticker: symbolName,
            exchange: 'FX',
            minmov: 1,
            pricescale: 100000,
            has_intraday: true,
            has_no_volume: false,
            supported_resolutions: ['1', '5', '15', '30', '60', '240', '1D'],
          });
        }, 0);
      },
      getBars: (
        _symbolInfo,
        _resolution,
        _from,
        _to,
        onHistoryCallback,
        _onErrorCallback,
        _firstDataRequest
      ) => {
        const candles = chartDataRef.current.candles;
        if (candles.length > 0) {
          const bars = candles.map(candle => ({
            time: new Date(candle.timestamp).getTime() / 1000,
            open: candle.open,
            high: candle.high,
            low: candle.low,
            close: candle.close,
            volume: candle.volume,
          }));
          onHistoryCallback(bars, { noData: false });
        } else {
          onHistoryCallback([], { noData: true });
        }
      },
      subscribeBars: () => {},
      unsubscribeBars: () => {},
    };
  }, []);

  const createReplayLine = useCallback(() => {
    if (!chartWidgetRef.current) return;

    const chart = chartWidgetRef.current.chart();
    verticalLineRef.current = chart.createLine({
      color: '#2196F3',
      width: 2,
      style: 2,
      title: 'Replay Time',
    });

    labelRef.current = chart.createShape({
      shape: 'text',
      text: '',
      color: '#2196F3',
      backgroundColor: '#ffffff',
      borderColor: '#2196F3',
      borderWidth: 1,
      fontsize: 12,
      bold: true,
    });
  }, []);

  // Inicializar TradingView Widget
  useEffect(() => {
    if (typeof window !== 'undefined' && window.TradingView) {
      const widget = new window.TradingView.widget({
        container_id: 'tradingview_chart',
        symbol: options.symbol || 'EUR/USD',
        interval: '1H',
        theme: 'light',
        style: '1',
        locale: 'pt_BR',
        toolbar_bg: '#f1f3f6',
        enable_publishing: false,
        allow_symbol_change: true,
        datafeed: createCustomDatafeed(),
        library_path: 'https://s3.tradingview.com/tv.js/',
        studies_overrides: {},
        overrides: {
          'paneProperties.background': '#ffffff',
          'paneProperties.vertGridProperties.color': '#f1f3f6',
          'paneProperties.horzGridProperties.color': '#f1f3f6',
          'symbolWatermarkProperties.transparency': 90,
          'scalesProperties.textColor': '#666',
          'mainSeriesProperties.candleStyle.wickUpColor': '#26a69a',
          'mainSeriesProperties.candleStyle.wickDownColor': '#ef5350',
        },
      });
      chartWidgetRef.current = widget;
      widget.onChartReady(() => {
        createReplayLine();
      });
      setIsConnected(true);
    }
  }, [options.symbol, createCustomDatafeed, createReplayLine]);

  const updateChartWithCandle = useCallback((candle: ReplayCandle) => {
    if (!chartWidgetRef.current) return;

    const chart = chartWidgetRef.current.chart();
    const barData = {
      time: new Date(candle.timestamp).getTime() / 1000,
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
      volume: candle.volume,
    };

    chart.dataHandler().updateData(barData);
  }, []);

  const updateChartWithTick = useCallback((tick: ReplayTick) => {
    if (!chartWidgetRef.current) return;

    const chart = chartWidgetRef.current.chart();
    const currentPrice = (tick.bid + tick.ask) / 2;

    if (chart.currentPriceLine?.remove) {
      chart.currentPriceLine.remove();
    }

    chart.currentPriceLine = chart.createLine({
      color: '#FF6B6B',
      width: 2,
      price: currentPrice,
      title: `Current: ${currentPrice.toFixed(5)}`,
    });
  }, []);

  const updateReplayLine = useCallback((timestamp: string) => {
    if (!chartWidgetRef.current || !verticalLineRef.current || !labelRef.current) return;

    const chart = chartWidgetRef.current.chart();
    const time = new Date(timestamp).getTime() / 1000;

    verticalLineRef.current.setEnd({ time, price: null });
    verticalLineRef.current.setStart({ time, price: null });

    const formattedTime = new Date(timestamp).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const range = chart.getVisibleRange();
    labelRef.current.set({
      time,
      price: range.from + (range.to - range.from) * 0.8,
      text: formattedTime,
    });
  }, []);

  const cleanup = useCallback(() => {
    if (chartWidgetRef.current) {
      chartWidgetRef.current.remove();
      chartWidgetRef.current = null;
    }

    verticalLineRef.current = null;
    labelRef.current = null;
    setIsConnected(false);
  }, []);

  // Configurar callbacks do replay
  useEffect(() => {
    replayService.onCandle((candle: ReplayCandle) => {
      setChartData(prev => ({
        ...prev,
        candles: [...prev.candles, candle],
        currentPrice: candle.close,
        volume: candle.volume,
      }));

      updateChartWithCandle(candle);
      options.onCandle?.(candle);
    });

    replayService.onTick((tick: ReplayTick) => {
      setChartData(prev => ({
        ...prev,
        ticks: [...prev.ticks, tick],
        currentPrice: (tick.bid + tick.ask) / 2,
        volume: tick.volume,
      }));

      updateChartWithTick(tick);
      options.onTick?.(tick);
    });

    replayService.onStatus((status) => {
      if (status.current_time) {
        setReplayTime(status.current_time);
        updateReplayLine(status.current_time);
      }
    });

    return () => {
      cleanup();
    };
  }, [options, updateChartWithCandle, updateChartWithTick, updateReplayLine, cleanup]);

  const clearData = () => {
    setChartData({
      candles: [],
      ticks: [],
      currentPrice: null,
      volume: 0,
    });

    if (chartWidgetRef.current) {
      chartWidgetRef.current.chart().dataHandler().clearData();
    }
  };

  const setSymbol = (newSymbol: string) => {
    if (chartWidgetRef.current) {
      chartWidgetRef.current.setSymbol(newSymbol);
    }
  };

  const setTimeframe = (timeframe: string) => {
    if (chartWidgetRef.current) {
      chartWidgetRef.current.setTimeframe(timeframe);
    }
  };

  const exportData = () => {
    return {
      candles: chartData.candles,
      ticks: chartData.ticks,
      summary: {
        totalCandles: chartData.candles.length,
        totalTicks: chartData.ticks.length,
        currentPrice: chartData.currentPrice,
        totalVolume: chartData.volume,
        timeRange: {
          start: chartData.candles[0]?.timestamp,
          end: chartData.candles[chartData.candles.length - 1]?.timestamp,
        },
      },
    };
  };

  return {
    chartData,
    isConnected,
    replayTime,
    clearData,
    setSymbol,
    setTimeframe,
    exportData,
    chartWidgetRef,
    verticalLineRef,
    labelRef,
  };
}
