import type { TimeSeriesDataPoint } from "@/types/network";

const sampleTimestamps = [
  "2026-08-28T05:00:00.000Z",
  "2026-08-28T05:10:00.000Z",
  "2026-08-28T05:20:00.000Z",
  "2026-08-28T05:30:00.000Z",
  "2026-08-28T05:40:00.000Z",
  "2026-08-28T05:50:00.000Z",
  "2026-08-28T06:00:00.000Z",
  "2026-08-28T06:10:00.000Z",
  "2026-08-28T06:20:00.000Z",
  "2026-08-28T06:30:00.000Z",
  "2026-08-28T06:40:00.000Z",
  "2026-08-28T06:50:00.000Z",
  "2026-08-28T07:00:00.000Z",
  "2026-08-28T07:10:00.000Z",
  "2026-08-28T07:20:00.000Z",
  "2026-08-28T07:30:00.000Z",
  "2026-08-28T07:40:00.000Z",
  "2026-08-28T07:50:00.000Z",
] as const;

function createTimeSeries(values: readonly number[]): readonly TimeSeriesDataPoint[] {
  if (values.length !== sampleTimestamps.length) {
    throw new Error("Time-series values must match the fixed sample window.");
  }

  return sampleTimestamps.map((timestamp, index) => ({
    timestamp,
    value: values[index],
  }));
}

/** Aggregate inbound throughput in Mbps. */
export const inboundTrafficSeries = createTimeSeries([
  182, 176, 191, 205, 224, 238, 271, 295, 318, 342, 389, 421, 467, 512,
  548, 603, 657, 629,
]);

/** Aggregate outbound throughput in Mbps. */
export const outboundTrafficSeries = createTimeSeries([
  96, 91, 103, 116, 121, 134, 148, 162, 174, 183, 208, 231, 254, 278, 301,
  329, 358, 344,
]);

/** Network-wide median latency in milliseconds. */
export const latencySeries = createTimeSeries([
  9, 8, 9, 10, 11, 10, 12, 13, 12, 15, 16, 18, 17, 21, 24, 27, 35, 31,
]);

/** Aggregate packet loss as a percentage. */
export const packetLossSeries = createTimeSeries([
  0.1, 0.1, 0.2, 0.1, 0.2, 0.2, 0.3, 0.2, 0.4, 0.5, 0.7, 0.6, 0.9, 1.2,
  1.6, 2.1, 3.4, 2.7,
]);
