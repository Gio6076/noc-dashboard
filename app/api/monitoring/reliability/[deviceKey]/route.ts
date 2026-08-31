import {
  InvalidMonitoringHistoryWindowError,
  parseMonitoringHistoryHours,
} from "@/lib/monitoring-history-window";
import { getMonitoringReliability } from "@/lib/server/monitoring/get-monitoring-reliability";

export const dynamic = "force-dynamic";

const headers = { "Cache-Control": "no-store" };

export async function GET(
  request: Request,
  context: { params: Promise<{ deviceKey: string }> },
) {
  try {
    const hours = parseMonitoringHistoryHours(new URL(request.url).searchParams.get("hours"));
    const { deviceKey } = await context.params;
    const reliability = await getMonitoringReliability(deviceKey, hours);
    if (!reliability) {
      return Response.json({ error: "Monitored device not found." }, { status: 404, headers });
    }
    return Response.json(reliability, { headers });
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
