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
import type { AlertSeverity } from "@/types/network";

interface AlertDistributionChartProps {
  counts: Record<AlertSeverity, number>;
}

const colors: Record<AlertSeverity, string> = {
  critical: "#fb7185",
  warning: "#fbbf24",
  informational: "#38bdf8",
};

export function AlertDistributionChart({
  counts,
}: AlertDistributionChartProps) {
  const data = (["critical", "warning", "informational"] as const).map(
    (severity) => ({
      severity,
      label:
        severity.charAt(0).toUpperCase() + severity.slice(1),
      count: counts[severity],
    }),
  );
  const description = `${counts.critical} critical, ${counts.warning} warning, and ${counts.informational} informational alerts.`;

  return (
    <Panel title="Alert distribution" description={description}>
      <figure aria-label={description}>
        <div className="h-64 min-w-0" role="img" aria-label={description}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: -18 }} accessibilityLayer>
              <CartesianGrid stroke="#202938" strokeDasharray="3 5" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: "#8c99aa", fontSize: 10 }} tickLine={false} axisLine={{ stroke: "#202938" }} />
              <YAxis allowDecimals={false} tick={{ fill: "#626f80", fontSize: 10 }} tickLine={false} axisLine={false} />
              <Tooltip
                cursor={{ fill: "#19212c", opacity: 0.65 }}
                contentStyle={{
                  background: "#131922",
                  border: "1px solid #303b4d",
                  borderRadius: "8px",
                  color: "#e7edf5",
                  fontSize: "12px",
                }}
                formatter={(value) => [Number(value), "Alerts"]}
              />
              <Bar dataKey="count" radius={[3, 3, 0, 0]} isAnimationActive={false}>
                {data.map((entry) => (
                  <Cell key={entry.severity} fill={colors[entry.severity]} />
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
