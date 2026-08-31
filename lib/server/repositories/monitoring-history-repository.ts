import "server-only";

import { and, asc, eq, gte, isNull, lte, or } from "drizzle-orm";
import { getDatabase } from "@/lib/server/db/client";
import {
  alertInstance,
  monitoredDevice,
  networkTelemetrySample,
  serviceDefinition,
  serviceObservation,
  systemTelemetrySample,
} from "@/lib/server/db/schema";

export async function readMonitoringHistoryRows(
  deviceKey: string,
  window: { from: Date; to: Date },
) {
  const db = getDatabase();
  const [device] = await db.select({
    id: monitoredDevice.id,
    stableKey: monitoredDevice.stableKey,
    displayName: monitoredDevice.displayName,
    monitoringType: monitoredDevice.monitoringType,
    operationalState: monitoredDevice.operationalState,
  }).from(monitoredDevice).where(eq(monitoredDevice.stableKey, deviceKey)).limit(1);

  if (!device) {
    return { device: null, systemSamples: [], networkSamples: [], services: [], serviceObservations: [], alerts: [] };
  }

  const [systemSamples, networkSamples, services, serviceObservations, alerts] = await Promise.all([
    db.select({
      id: systemTelemetrySample.id,
      observedAt: systemTelemetrySample.observedAt,
      cpuUsagePercent: systemTelemetrySample.cpuUsagePercent,
      memoryUsagePercent: systemTelemetrySample.memoryUsagePercent,
      diskUsagePercent: systemTelemetrySample.diskUsagePercent,
      uptimeSeconds: systemTelemetrySample.uptimeSeconds,
    }).from(systemTelemetrySample).where(and(
      eq(systemTelemetrySample.deviceId, device.id),
      gte(systemTelemetrySample.observedAt, window.from),
      lte(systemTelemetrySample.observedAt, window.to),
    )).orderBy(asc(systemTelemetrySample.observedAt), asc(systemTelemetrySample.id)),
    db.select({
      id: networkTelemetrySample.id,
      observedAt: networkTelemetrySample.observedAt,
      inboundBytesPerSecond: networkTelemetrySample.inboundBytesPerSecond,
      outboundBytesPerSecond: networkTelemetrySample.outboundBytesPerSecond,
      bytesReceived: networkTelemetrySample.bytesReceived,
      bytesSent: networkTelemetrySample.bytesSent,
    }).from(networkTelemetrySample).where(and(
      eq(networkTelemetrySample.deviceId, device.id),
      gte(networkTelemetrySample.observedAt, window.from),
      lte(networkTelemetrySample.observedAt, window.to),
    )).orderBy(asc(networkTelemetrySample.observedAt), asc(networkTelemetrySample.id)),
    db.select({
      id: serviceDefinition.id,
      stableKey: serviceDefinition.stableKey,
      name: serviceDefinition.name,
      type: serviceDefinition.type,
    }).from(serviceDefinition).where(eq(serviceDefinition.deviceId, device.id))
      .orderBy(asc(serviceDefinition.stableKey), asc(serviceDefinition.id)),
    db.select({
      id: serviceObservation.id,
      serviceId: serviceObservation.serviceId,
      observedAt: serviceObservation.observedAt,
      status: serviceObservation.status,
      responseTimeMs: serviceObservation.responseTimeMs,
      httpStatusCode: serviceObservation.httpStatusCode,
    }).from(serviceObservation).innerJoin(serviceDefinition, eq(serviceObservation.serviceId, serviceDefinition.id))
      .where(and(
        eq(serviceDefinition.deviceId, device.id),
        gte(serviceObservation.observedAt, window.from),
        lte(serviceObservation.observedAt, window.to),
      )).orderBy(asc(serviceObservation.observedAt), asc(serviceObservation.id)),
    db.select({
      id: alertInstance.id,
      conditionKey: alertInstance.conditionKey,
      category: alertInstance.category,
      severity: alertInstance.severity,
      title: alertInstance.title,
      message: alertInstance.message,
      status: alertInstance.status,
      firstObservedAt: alertInstance.firstObservedAt,
      lastObservedAt: alertInstance.lastObservedAt,
      recoveredAt: alertInstance.recoveredAt,
      observationCount: alertInstance.observationCount,
    }).from(alertInstance).where(and(
      eq(alertInstance.deviceId, device.id),
      lte(alertInstance.firstObservedAt, window.to),
      or(isNull(alertInstance.recoveredAt), gte(alertInstance.recoveredAt, window.from)),
    )).orderBy(asc(alertInstance.firstObservedAt), asc(alertInstance.id)),
  ]);

  return { device, systemSamples, networkSamples, services, serviceObservations, alerts };
}

export type MonitoringHistoryRows = Awaited<ReturnType<typeof readMonitoringHistoryRows>>;
