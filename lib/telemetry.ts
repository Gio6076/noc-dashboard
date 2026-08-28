import type { TimeSeriesDataPoint } from "@/types/network";

export interface TimeSeriesSummary {
  average: number;
  latest: number;
  peak: number;
  sampleCount: number;
}

function roundToOneDecimal(value: number): number {
  return Math.round(value * 10) / 10;
}

export function summarizeTimeSeries(
  data: readonly TimeSeriesDataPoint[],
): TimeSeriesSummary {
  if (data.length === 0) {
    return { average: 0, latest: 0, peak: 0, sampleCount: 0 };
  }

  const total = data.reduce((sum, point) => sum + point.value, 0);

  return {
    average: roundToOneDecimal(total / data.length),
    latest: data.at(-1)?.value ?? 0,
    peak: Math.max(...data.map((point) => point.value)),
    sampleCount: data.length,
  };
}
