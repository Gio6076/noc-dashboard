import { getPersistedMonitoringCapability } from "@/lib/server/monitoring/get-persisted-monitoring-state";
import { monitoringCapabilityApiError } from "@/lib/monitoring-capability";

export const dynamic = "force-dynamic";

export async function GET() {
  const result = await getPersistedMonitoringCapability();
  if (result.status === "available") {
    return Response.json(result.data, {
      headers: { "Cache-Control": "no-store" },
    });
  }
  return Response.json(monitoringCapabilityApiError(result.status, "current"), { status: 503, headers: { "Cache-Control": "no-store" } });
}
