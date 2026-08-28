"use client";

import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Panel } from "@/components/ui/panel";

interface HealthDistributionChartProps {
  online: number;
  degraded: number;
  offline: number;
}

export function HealthDistributionChart({
  online,
  degraded,
  offline,
}: HealthDistributionChartProps) {
  const data = [{ name: "Fleet", online, degraded, offline }];
  const description = `${online} online, ${degraded} degraded, and ${offline} offline devices.`;

  return (
    <Panel title="Device health distribution" description={description}>
      <figure aria-label={description}>
        <div className="mb-4 flex flex-wrap gap-4 text-[11px] text-foreground-muted">
          <span>Online {online}</span>
          <span>Degraded {degraded}</span>
          <span>Offline {offline}</span>
        </div>
        <div className="h-28 min-w-0" role="img" aria-label={description}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" accessibilityLayer>
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="name" hide />
              <Tooltip
                cursor={false}
                contentStyle={{
                  background: "#131922",
                  border: "1px solid #303b4d",
                  borderRadius: "8px",
                  color: "#e7edf5",
                  fontSize: "12px",
                }}
              />
              <Bar dataKey="online" stackId="health" fill="#34d399" name="Online" isAnimationActive={false} />
              <Bar dataKey="degraded" stackId="health" fill="#fbbf24" name="Degraded" isAnimationActive={false} />
              <Bar dataKey="offline" stackId="health" fill="#fb7185" name="Offline" radius={[0, 4, 4, 0]} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <figcaption className="sr-only">{description}</figcaption>
      </figure>
    </Panel>
  );
}
