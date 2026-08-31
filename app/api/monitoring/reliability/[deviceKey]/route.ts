import {
  InvalidMonitoringHistoryWindowError,
  parseMonitoringHistoryHours,
} from "@/lib/monitoring-history-window";
import { getMonitoringReliability } from "@/lib/server/monitoring/get-monitoring-reliability";
import { persistedMonitoringConfiguration, readPersistedMonitoringCapability } from "@/lib/server/monitoring/monitoring-capability";
import { monitoringCapabilityApiError } from "@/lib/monitoring-capability";

export const dynamic = "force-dynamic";

const headers = { "Cache-Control": "no-store" };

export async function GET(
  request: Request,
  context: { params: Promise<{ deviceKey: string }> },
) {
  const configuration = persistedMonitoringConfiguration();
  if (configuration.status !== "enabled") return Response.json(monitoringCapabilityApiError(configuration.status, "reliability"), { status: 503, headers });

  try {
    const hours = parseMonitoringHistoryHours(new URL(request.url).searchParams.get("hours"));
    const { deviceKey } = await context.params;
    const result = await readPersistedMonitoringCapability(() => getMonitoringReliability(deviceKey, hours));
    if (result.status !== "available") return Response.json(monitoringCapabilityApiError("unavailable", "reliability"), { status: 503, headers });
    if (!result.data) {
      return Response.json({ error: "Monitored device not found." }, { status: 404, headers });
    }
    return Response.json(result.data, { headers });
  } catch (error) {
    if (error instanceof InvalidMonitoringHistoryWindowError) {
      return Response.json({ error: error.message }, { status: 400, headers });
    }
    return Response.json(
      { error: "Reliability analytics are temporarily unavailable." },
      { status: 503, headers },
    );
  }
}
