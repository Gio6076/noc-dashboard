import {
  InvalidMonitoringHistoryWindowError,
  parseMonitoringHistoryHours,
} from "@/lib/monitoring-history-window";
import { getMonitoringHistory } from "@/lib/server/monitoring/get-monitoring-history";

export const dynamic = "force-dynamic";

const headers = { "Cache-Control": "no-store" };

export async function GET(
  request: Request,
  context: { params: Promise<{ deviceKey: string }> },
) {
  try {
    const hours = parseMonitoringHistoryHours(new URL(request.url).searchParams.get("hours"));
    const { deviceKey } = await context.params;
    const history = await getMonitoringHistory(deviceKey, hours);
    if (!history) return Response.json({ error: "Monitored device not found." }, { status: 404, headers });
    return Response.json(history, { headers });
  } catch (error) {
    if (error instanceof InvalidMonitoringHistoryWindowError) {
      return Response.json({ error: error.message }, { status: 400, headers });
    }
    return Response.json(
      { error: "Historical monitoring data is temporarily unavailable." },
      { status: 503, headers },
    );
  }
}
