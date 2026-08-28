"use client";

import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { EmptyState } from "@/components/ui/empty-state";
import { Panel } from "@/components/ui/panel";
import { formatTime } from "@/lib/formatters";
import type { TimeSeriesDataPoint } from "@/types/network";

interface TrafficChartProps {
  inbound: readonly TimeSeriesDataPoint[];
  outbound: readonly TimeSeriesDataPoint[];
  description?: string;
}

interface TrafficChartPoint {
  timestamp: string;
  inboundMbps: number;
  outboundMbps: number;
}

const axisColor = "#626f80";
const gridColor = "#202938";

function mergeTrafficSeries(
  inbound: readonly TimeSeriesDataPoint[],
  outbound: readonly TimeSeriesDataPoint[],
): TrafficChartPoint[] {
  const outboundByTimestamp = new Map(
    outbound.map((point) => [point.timestamp, point.value]),
  );

  return inbound.map((point) => ({
    timestamp: point.timestamp,
    inboundMbps: point.value,
    outboundMbps: outboundByTimestamp.get(point.timestamp) ?? 0,
  }));
}

export function TrafficChart({
  inbound,
  outbound,
  description = "Aggregate inbound and outbound throughput over the selected monitoring window.",
}: TrafficChartProps) {
  const data = mergeTrafficSeries(inbound, outbound);

  return (
    <Panel title="Network traffic" description={description}>
      {data.length === 0 ? (
        <EmptyState
          title="No traffic samples"
          description="Traffic telemetry will appear when samples are available."
          compact
        />
      ) : (
        <figure aria-label={description}>
          <div className="mb-3 flex flex-wrap items-center gap-4 text-[11px] text-foreground-muted">
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden="true" className="size-2 rounded-full bg-informational" />
              Inbound
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden="true" className="size-2 rounded-full bg-healthy" />
              Outbound
            </span>
            <span className="ml-auto font-mono text-foreground-subtle">Mbps</span>
          </div>
          <div className="h-64 min-w-0" role="img" aria-label={description}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={data}
                margin={{ top: 8, right: 4, bottom: 0, left: -18 }}
                accessibilityLayer
              >
                <defs>
                  <linearGradient id="trafficInboundFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.22} />
                    <stop offset="100%" stopColor="#38bdf8" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  stroke={gridColor}
                  strokeDasharray="3 5"
                  vertical={false}
                />
                <XAxis
                  dataKey="timestamp"
                  tickFormatter={formatTime}
                  tick={{ fill: axisColor, fontSize: 10 }}
                  tickLine={false}
                  axisLine={{ stroke: gridColor }}
                  minTickGap={28}
                />
                <YAxis
                  tick={{ fill: axisColor, fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  width={52}
                  unit=""
                />
                <Tooltip
                  cursor={{ stroke: "#303b4d", strokeDasharray: "3 3" }}
                  contentStyle={{
                    background: "#131922",
                    border: "1px solid #303b4d",
                    borderRadius: "8px",
                    color: "#e7edf5",
                    fontSize: "12px",
                  }}
                  labelStyle={{ color: "#8c99aa", marginBottom: "6px" }}
                  labelFormatter={(label) => formatTime(String(label))}
                  formatter={(value, name) => [
                    `${Number(value).toFixed(1)} Mbps`,
                    name === "inboundMbps" ? "Inbound" : "Outbound",
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="inboundMbps"
                  fill="url(#trafficInboundFill)"
                  stroke="none"
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="inboundMbps"
                  stroke="#38bdf8"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 3, fill: "#38bdf8", strokeWidth: 0 }}
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="outboundMbps"
                  stroke="#34d399"
                  strokeWidth={1.75}
                  dot={false}
                  activeDot={{ r: 3, fill: "#34d399", strokeWidth: 0 }}
                  isAnimationActive={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <figcaption className="sr-only">{description}</figcaption>
        </figure>
      )}
    </Panel>
  );
}
