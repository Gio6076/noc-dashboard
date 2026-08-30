import type { LiveMonitoringResponse } from "@/types/live-monitoring";
import type { AgentDeviceSnapshot } from "@/types/monitored-device";
import type { RealMonitoringAlert } from "@/types/monitoring-alert";

export function createLiveMonitoringResponse(
  snapshots: readonly AgentDeviceSnapshot[],
  alerts: readonly RealMonitoringAlert[],
  fetchedAt = new Date().toISOString(),
): LiveMonitoringResponse {
  return {
    snapshots: snapshots.map((snapshot) => {
      const sourceDevice = snapshot.device;
      const device = {
        id: sourceDevice.id,
        displayName: sourceDevice.displayName,
        monitoringType: sourceDevice.monitoringType,
        operationalState: sourceDevice.operationalState,
        environment: sourceDevice.environment,
        expectedHostname: sourceDevice.expectedHostname,
        description: sourceDevice.description,
      };
      const services = snapshot.services
        ? {
            ...snapshot.services,
            services: snapshot.services.services.map((service) => ({
              name: service.name,
              type: service.type,
              status: service.status,
              responseTimeMs: service.responseTimeMs,
              checkedAt: service.checkedAt,
              ...(service.type === "tcp"
                ? {}
                : { httpStatusCode: service.httpStatusCode }),
            })),
          }
        : undefined;

      return { ...snapshot, device, services };
    }),
    alerts: [...alerts],
    fetchedAt,
  };
}

export interface LiveMonitoringState {
  data: LiveMonitoringResponse;
  refreshError: boolean;
}

export function retainLastGoodMonitoringData(
  state: LiveMonitoringState,
  result: LiveMonitoringResponse | null,
): LiveMonitoringState {
  return result
    ? { data: result, refreshError: false }
    : { data: state.data, refreshError: true };
}
