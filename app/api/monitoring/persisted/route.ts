import { getPersistedMonitoringState } from "@/lib/server/monitoring/get-persisted-monitoring-state";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return Response.json(await getPersistedMonitoringState(), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return Response.json(
      { error: "Persisted monitoring data is temporarily unavailable." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
