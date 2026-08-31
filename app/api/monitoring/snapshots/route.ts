import { getMonitoredDeviceSnapshots } from "@/lib/agent-api";
import { createLiveMonitoringResponse } from "@/lib/live-monitoring";
import { evaluateMonitoringAlerts } from "@/lib/monitoring-alerts";
import { persistedMonitoringConfiguration } from "@/lib/server/monitoring/monitoring-capability";

export const dynamic = "force-dynamic";

export async function GET() {
  if (persistedMonitoringConfiguration().status !== "enabled") {
    return Response.json(
      { error: "Direct monitoring diagnostics are not enabled for this deployment." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
  try {
    const snapshots = await getMonitoredDeviceSnapshots();
    const alerts = evaluateMonitoringAlerts(snapshots);

    return Response.json(createLiveMonitoringResponse(snapshots, alerts), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return Response.json(
      { error: "Monitoring data is temporarily unavailable." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
