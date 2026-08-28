"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Panel } from "@/components/ui/panel";
import { NETWORK_THRESHOLDS } from "@/lib/constants";
import type { NetworkDevice } from "@/types/network";

interface DeviceUtilizationChartProps {
  devices: readonly NetworkDevice[];
}

function barColor(value: number): string {
  if (value >= NETWORK_THRESHOLDS.bandwidthCriticalPercent) return "#fb7185";
  if (value >= NETWORK_THRESHOLDS.bandwidthWarningPercent) return "#fbbf24";
  return "#38bdf8";
}

export function DeviceUtilizationChart({
  devices,
}: DeviceUtilizationChartProps) {
  const data = devices
    .map((device) => ({
      hostname: device.hostname,
      utilization: device.bandwidthUtilizationPercent,
    }))
    .toSorted((first, second) => second.utilization - first.utilization);
  const description =
    "Ranked bandwidth utilization for every monitored network device.";

  return (
    <Panel title="Device utilization" description={description}>
      <figure aria-label={description}>
        <div
          className="min-w-0"
          style={{ height: Math.max(300, data.length * 32) }}
          role="img"
          aria-label={description}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 4, right: 12, bottom: 0, left: 8 }}
              accessibilityLayer
            >
              <CartesianGrid
                stroke="#202938"
                strokeDasharray="3 5"
                horizontal={false}
              />
              <XAxis
                type="number"
                domain={[0, 100]}
                unit="%"
                tick={{ fill: "#626f80", fontSize: 10 }}
                tickLine={false}
                axisLine={{ stroke: "#202938" }}
              />
              <YAxis
                type="category"
                dataKey="hostname"
                width={94}
                tick={{ fill: "#8c99aa", fontSize: 10 }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                cursor={{ fill: "#19212c", opacity: 0.65 }}
                contentStyle={{
                  background: "#131922",
                  border: "1px solid #303b4d",
                  borderRadius: "8px",
                  color: "#e7edf5",
                  fontSize: "12px",
                }}
                formatter={(value) => [
                  `${Number(value).toFixed(0)}%`,
                  "Utilization",
                ]}
              />
              <Bar dataKey="utilization" radius={[0, 3, 3, 0]} isAnimationActive={false}>
                {data.map((entry) => (
                  <Cell key={entry.hostname} fill={barColor(entry.utilization)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <figcaption className="sr-only">{description}</figcaption>
      </figure>
    </Panel>
  );
}
