import "server-only";

import { desc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/server/db/client";
import {
  alertInstance,
  collectionRun,
  deviceObservation,
  monitoredDevice,
  networkTelemetrySample,
  serviceDefinition,
  serviceObservation,
  systemTelemetrySample,
} from "@/lib/server/db/schema";

export async function readPersistedMonitoringRows() {
  const [devices, latestObservations, latestSystemSamples, latestNetworkSamples, services, activeAlerts, latestRuns] =
    await Promise.all([
      db.select().from(monitoredDevice).orderBy(monitoredDevice.stableKey, monitoredDevice.id),
      db.selectDistinctOn([deviceObservation.deviceId]).from(deviceObservation)
        .orderBy(deviceObservation.deviceId, desc(deviceObservation.observedAt), desc(deviceObservation.id)),
      db.selectDistinctOn([systemTelemetrySample.deviceId]).from(systemTelemetrySample)
        .orderBy(systemTelemetrySample.deviceId, desc(systemTelemetrySample.observedAt), desc(systemTelemetrySample.id)),
      db.selectDistinctOn([networkTelemetrySample.deviceId]).from(networkTelemetrySample)
        .orderBy(networkTelemetrySample.deviceId, desc(networkTelemetrySample.observedAt), desc(networkTelemetrySample.id)),
      db.selectDistinctOn([serviceDefinition.id], {
        id: serviceDefinition.id,
        deviceId: serviceDefinition.deviceId,
        stableKey: serviceDefinition.stableKey,
        name: serviceDefinition.name,
        type: serviceDefinition.type,
        enabled: serviceDefinition.enabled,
        observedAt: serviceObservation.observedAt,
        status: serviceObservation.status,
        responseTimeMs: serviceObservation.responseTimeMs,
        httpStatusCode: serviceObservation.httpStatusCode,
      }).from(serviceDefinition).leftJoin(serviceObservation, eq(serviceDefinition.id, serviceObservation.serviceId))
        .orderBy(serviceDefinition.id, desc(serviceObservation.observedAt), desc(serviceObservation.id)),
      db.select({
        id: alertInstance.id,
        conditionKey: alertInstance.conditionKey,
        deviceId: alertInstance.deviceId,
        serviceStableKey: serviceDefinition.stableKey,
        category: alertInstance.category,
        severity: alertInstance.severity,
        title: alertInstance.title,
        message: alertInstance.message,
        status: alertInstance.status,
        firstObservedAt: alertInstance.firstObservedAt,
        lastObservedAt: alertInstance.lastObservedAt,
        observationCount: alertInstance.observationCount,
        currentValue: alertInstance.currentValue,
        threshold: alertInstance.threshold,
      }).from(alertInstance).leftJoin(serviceDefinition, eq(alertInstance.serviceId, serviceDefinition.id))
        .where(eq(alertInstance.status, "active"))
        .orderBy(alertInstance.deviceId, desc(alertInstance.lastObservedAt), desc(alertInstance.id)),
      db.select({ completedAt: collectionRun.completedAt }).from(collectionRun)
        .where(inArray(collectionRun.status, ["completed", "partial"]))
        .orderBy(desc(collectionRun.completedAt), desc(collectionRun.id)).limit(1),
    ]);

  return {
    devices,
    latestObservations,
    latestSystemSamples,
    latestNetworkSamples,
    services,
    activeAlerts,
    latestCollectionAt: latestRuns[0]?.completedAt ?? null,
  };
}

export type PersistedMonitoringRows = Awaited<ReturnType<typeof readPersistedMonitoringRows>>;
