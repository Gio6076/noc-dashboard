import "server-only";

import { and, asc, eq, gte, isNull, lte, or } from "drizzle-orm";
import type { ReliabilityRows } from "@/lib/reliability-analytics";
import { MAXIMUM_RELIABILITY_EVIDENCE_GAP_MS } from "@/lib/reliability-analytics";
import { getDatabase } from "@/lib/server/db/client";
import {
  alertInstance,
  deviceObservation,
  monitoredDevice,
  serviceDefinition,
  serviceObservation,
} from "@/lib/server/db/schema";

/**
 * The lower bound includes exactly the only pre-window observations that can
 * still provide boundary evidence. All stream reads are set based; configured
 * services are loaded once and services without telemetry remain present.
 */
export async function readMonitoringReliabilityRows(
  deviceKey: string,
  window: { from: Date; to: Date },
): Promise<ReliabilityRows> {
  const db = getDatabase();
  const [device] = await db.select({
    id: monitoredDevice.id,
    stableKey: monitoredDevice.stableKey,
    displayName: monitoredDevice.displayName,
    monitoringType: monitoredDevice.monitoringType,
    operationalState: monitoredDevice.operationalState,
  }).from(monitoredDevice).where(eq(monitoredDevice.stableKey, deviceKey)).limit(1);

  if (!device) return {
    device: null,
    deviceObservations: [],
    services: [],
    serviceObservations: [],
    serviceAlerts: [],
  };

  const evidenceFrom = new Date(window.from.getTime() - MAXIMUM_RELIABILITY_EVIDENCE_GAP_MS);
  const [deviceObservations, services, serviceObservations, serviceAlerts] = await Promise.all([
    db.select({
      id: deviceObservation.id,
      observedAt: deviceObservation.observedAt,
      availability: deviceObservation.availability,
    }).from(deviceObservation).where(and(
      eq(deviceObservation.deviceId, device.id),
      gte(deviceObservation.observedAt, evidenceFrom),
      lte(deviceObservation.observedAt, window.to),
    )).orderBy(asc(deviceObservation.observedAt), asc(deviceObservation.id)),
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
    }).from(serviceObservation).innerJoin(
      serviceDefinition,
      eq(serviceObservation.serviceId, serviceDefinition.id),
    ).where(and(
      eq(serviceDefinition.deviceId, device.id),
      gte(serviceObservation.observedAt, evidenceFrom),
      lte(serviceObservation.observedAt, window.to),
    )).orderBy(asc(serviceObservation.observedAt), asc(serviceObservation.id)),
    db.select({
      id: alertInstance.id,
      serviceId: alertInstance.serviceId,
      status: alertInstance.status,
      firstObservedAt: alertInstance.firstObservedAt,
      recoveredAt: alertInstance.recoveredAt,
    }).from(alertInstance).where(and(
      eq(alertInstance.deviceId, device.id),
      eq(alertInstance.category, "service"),
      lte(alertInstance.firstObservedAt, window.to),
      or(isNull(alertInstance.recoveredAt), gte(alertInstance.recoveredAt, window.from)),
    )).orderBy(asc(alertInstance.firstObservedAt), asc(alertInstance.id)),
  ]);

  return {
    device,
    deviceObservations,
    services,
    serviceObservations,
    serviceAlerts,
  };
}
