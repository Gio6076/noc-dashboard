"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { EmptyState } from "@/components/ui/empty-state";
import { Panel } from "@/components/ui/panel";
import { NETWORK_THRESHOLDS } from "@/lib/constants";
import { formatTime } from "@/lib/formatters";
import type { TimeSeriesDataPoint } from "@/types/network";

interface LatencyChartProps {
  data: readonly TimeSeriesDataPoint[];
  description?: string;
  warningThresholdMs?: number;
}

const axisColor = "#626f80";
const gridColor = "#202938";

export function LatencyChart({
  data,
  description = "Network-wide latency trend with the configured warning threshold.",
  warningThresholdMs = NETWORK_THRESHOLDS.latencyWarningMs,
}: LatencyChartProps) {
  return (
    <Panel title="Network latency" description={description}>
      {data.length === 0 ? (
        <EmptyState
          title="No latency samples"
          description="Latency telemetry will appear when samples are available."
          compact
        />
      ) : (
        <figure aria-label={description}>
          <div className="mb-3 flex flex-wrap items-center gap-4 text-[11px] text-foreground-muted">
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden="true" className="size-2 rounded-full bg-informational" />
              Observed latency
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden="true" className="h-px w-3 border-t border-dashed border-warning" />
              Warning at {warningThresholdMs} ms
            </span>
          </div>
          <div className="h-64 min-w-0" role="img" aria-label={description}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={data}
                margin={{ top: 8, right: 4, bottom: 0, left: -18 }}
                accessibilityLayer
              >
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
                  domain={[0, (dataMax: number) => Math.max(dataMax + 10, warningThresholdMs + 10)]}
                  tick={{ fill: axisColor, fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  width={52}
                  unit=" ms"
                />
                <ReferenceLine
                  y={warningThresholdMs}
                  stroke="#fbbf24"
                  strokeDasharray="4 4"
                  ifOverflow="extendDomain"
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
                  formatter={(value) => [
                    `${Number(value).toFixed(1)} ms`,
                    "Latency",
                  ]}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#38bdf8"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 3, fill: "#38bdf8", strokeWidth: 0 }}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <figcaption className="sr-only">{description}</figcaption>
        </figure>
      )}
    </Panel>
  );
}
