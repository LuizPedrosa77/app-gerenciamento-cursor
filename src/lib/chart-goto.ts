type ChartGoto = {
  symbol: string;
  date: string;
  tradeId: string;
} | null;

let chartGoto: ChartGoto = null;

export function setChartGoto(payload: ChartGoto) {
  chartGoto = payload;
}

export function getChartGoto(): ChartGoto {
  return chartGoto;
}

export function clearChartGoto() {
  chartGoto = null;
}
