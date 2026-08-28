"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
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

interface PacketLossChartProps {
  data: readonly TimeSeriesDataPoint[];
  description?: string;
  warningThresholdPercent?: number;
  criticalThresholdPercent?: number;
}

export function PacketLossChart({
  data,
  description = "Aggregate packet loss across monitored network paths.",
  warningThresholdPercent = NETWORK_THRESHOLDS.packetLossWarningPercent,
  criticalThresholdPercent = NETWORK_THRESHOLDS.packetLossCriticalPercent,
}: PacketLossChartProps) {
  return (
    <Panel title="Packet loss" description={description}>
      {data.length === 0 ? (
        <EmptyState
          title="No packet-loss samples"
          description="Packet-loss telemetry will appear when samples are available."
          compact
        />
      ) : (
        <figure aria-label={description}>
          <div className="mb-3 flex flex-wrap items-center gap-4 text-[11px] text-foreground-muted">
            <span>Warning {warningThresholdPercent}%</span>
            <span>Critical {criticalThresholdPercent}%</span>
            <span className="ml-auto font-mono text-foreground-subtle">Loss %</span>
          </div>
          <div className="h-56 min-w-0" role="img" aria-label={description}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={data}
                margin={{ top: 8, right: 4, bottom: 0, left: -18 }}
                accessibilityLayer
              >
                <defs>
                  <linearGradient id="packetLossFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#fbbf24" stopOpacity={0.22} />
                    <stop offset="100%" stopColor="#fbbf24" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  stroke="#202938"
                  strokeDasharray="3 5"
                  vertical={false}
                />
                <XAxis
                  dataKey="timestamp"
                  tickFormatter={formatTime}
                  tick={{ fill: "#626f80", fontSize: 10 }}
                  tickLine={false}
                  axisLine={{ stroke: "#202938" }}
                  minTickGap={28}
                />
                <YAxis
                  domain={[0, (dataMax: number) => Math.max(dataMax + 0.5, 4)]}
                  tick={{ fill: "#626f80", fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  width={52}
                  unit="%"
                />
                <ReferenceLine
                  y={warningThresholdPercent}
                  stroke="#fbbf24"
                  strokeDasharray="4 4"
                />
                <ReferenceLine
                  y={criticalThresholdPercent}
                  stroke="#fb7185"
                  strokeDasharray="4 4"
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
                    `${Number(value).toFixed(1)}%`,
                    "Packet loss",
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  fill="url(#packetLossFill)"
                  stroke="#fbbf24"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 3, fill: "#fbbf24", strokeWidth: 0 }}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <figcaption className="sr-only">{description}</figcaption>
        </figure>
      )}
    </Panel>
  );
}
