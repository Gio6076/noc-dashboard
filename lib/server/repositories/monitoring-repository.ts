import "server-only";

import { and, eq, sql } from "drizzle-orm";
import { getDatabase, type Database } from "@/lib/server/db/client";
import {
  alertInstance,
  alertStateTransition,
  collectionRun,
  deviceInventory,
  deviceObservation,
  monitoredDevice,
  networkTelemetrySample,
  serviceDefinition,
  serviceObservation,
  systemTelemetrySample,
} from "@/lib/server/db/schema";
import type { MonitoredDevice } from "@/types/monitored-device";
import type { ActiveAlertState, AlertLifecyclePlan } from "@/lib/persistence/alert-lifecycle";
import type { mapSnapshotForPersistence } from "@/lib/persistence/mapping";

export type MonitoringTransaction = Parameters<Parameters<Database["transaction"]>[0]>[0];
type SnapshotMapping = ReturnType<typeof mapSnapshotForPersistence>;

export async function createCollectionRun(startedAt: Date) {
  const db = getDatabase();
  const [run] = await db.insert(collectionRun).values({
    startedAt,
    status: "running",
    devicesAttempted: 0,
    devicesSucceeded: 0,
  }).returning();
  return run;
}

export async function failCollectionRun(runId: string, startedAt: Date) {
  const db = getDatabase();
  const completedAt = new Date();
  await db.update(collectionRun).set({
    status: "failed",
    completedAt,
    durationMs: completedAt.getTime() - startedAt.getTime(),
    failureSummary: "Persisted monitoring cycle failed",
  }).where(eq(collectionRun.id, runId));
}

export async function upsertMonitoredDevice(tx: MonitoringTransaction, device: MonitoredDevice) {
  const [row] = await tx.insert(monitoredDevice).values({
    stableKey: device.id,
    displayName: device.displayName,
    monitoringType: device.monitoringType,
    operationalState: device.operationalState,
    expectedHostname: device.expectedHostname ?? null,
    environment: device.environment ?? null,
  }).onConflictDoUpdate({
    target: monitoredDevice.stableKey,
    set: {
      displayName: device.displayName,
      monitoringType: device.monitoringType,
      operationalState: device.operationalState,
      expectedHostname: device.expectedHostname ?? null,
      environment: device.environment ?? null,
      updatedAt: new Date(),
    },
  }).returning({ id: monitoredDevice.id });
  return row.id;
}

export async function upsertDeviceInventory(
  tx: MonitoringTransaction,
  deviceId: string,
  inventory: NonNullable<SnapshotMapping["inventory"]>,
) {
  await tx.insert(deviceInventory).values({
    deviceId,
    hostname: inventory.hostname,
    platform: inventory.platform,
    platformRelease: inventory.platformRelease,
    architecture: inventory.architecture,
    logicalCpuCount: inventory.logicalCpuCount,
    firstObservedAt: inventory.observedAt,
    lastObservedAt: inventory.observedAt,
  }).onConflictDoUpdate({
    target: deviceInventory.deviceId,
    set: {
      hostname: inventory.hostname,
      platform: inventory.platform,
      platformRelease: inventory.platformRelease,
      architecture: inventory.architecture,
      logicalCpuCount: inventory.logicalCpuCount,
      lastObservedAt: inventory.observedAt,
    },
  });
}

export async function insertDeviceObservation(
  tx: MonitoringTransaction,
  runId: string,
  deviceId: string,
  value: SnapshotMapping["observation"],
) {
  await tx.insert(deviceObservation).values({ collectionRunId: runId, deviceId, ...value });
}

export async function insertSystemTelemetrySample(
  tx: MonitoringTransaction,
  runId: string,
  deviceId: string,
  value: NonNullable<SnapshotMapping["system"]>,
) {
  await tx.insert(systemTelemetrySample).values({ collectionRunId: runId, deviceId, ...value });
}

export async function insertNetworkTelemetrySample(
  tx: MonitoringTransaction,
  runId: string,
  deviceId: string,
  value: NonNullable<SnapshotMapping["network"]>,
) {
  await tx.insert(networkTelemetrySample).values({ collectionRunId: runId, deviceId, ...value });
}

export async function upsertServiceDefinitions(
  tx: MonitoringTransaction,
  runId: string,
  deviceId: string,
  services: SnapshotMapping["services"],
) {
  const ids = new Map<string, string>();
  for (const service of services) {
    const [definition] = await tx.insert(serviceDefinition).values({
      deviceId,
      ...service.definition,
    }).onConflictDoUpdate({
      target: [serviceDefinition.deviceId, serviceDefinition.stableKey],
      set: { ...service.definition, updatedAt: new Date() },
    }).returning({ id: serviceDefinition.id, stableKey: serviceDefinition.stableKey });
    ids.set(definition.stableKey, definition.id);
    await tx.insert(serviceObservation).values({
      collectionRunId: runId,
      serviceId: definition.id,
      ...service.observation,
    });
  }
  return ids;
}

export async function listActiveAlertStates(tx: MonitoringTransaction): Promise<ActiveAlertState[]> {
  return tx.select({
    id: alertInstance.id,
    conditionKey: alertInstance.conditionKey,
    deviceStableKey: monitoredDevice.stableKey,
  }).from(alertInstance).innerJoin(monitoredDevice, eq(alertInstance.deviceId, monitoredDevice.id))
    .where(eq(alertInstance.status, "active"));
}

export async function applyAlertLifecyclePlan(
  tx: MonitoringTransaction,
  runId: string,
  plan: AlertLifecyclePlan,
  deviceIds: ReadonlyMap<string, string>,
  serviceIdsByCondition: ReadonlyMap<string, string>,
  observedAt: Date,
) {
  for (const { active, alert } of plan.update) {
    await tx.update(alertInstance).set({
      lastObservedAt: new Date(alert.observedAt),
      observationCount: sql`${alertInstance.observationCount} + 1`,
      message: alert.message,
      currentValue: alert.currentValue ?? null,
      threshold: alert.threshold ?? null,
      updatedAt: observedAt,
    }).where(and(eq(alertInstance.id, active.id), eq(alertInstance.status, "active")));
  }

  for (const alert of plan.open) {
    const deviceId = deviceIds.get(alert.deviceId);
    if (!deviceId) throw new Error("Alert references an unknown monitored device");
    const alertObservedAt = new Date(alert.observedAt);
    const [created] = await tx.insert(alertInstance).values({
      conditionKey: alert.id,
      deviceId,
      serviceId: serviceIdsByCondition.get(alert.id) ?? null,
      category: alert.category,
      severity: alert.severity,
      title: alert.title,
      message: alert.message,
      status: "active",
      firstObservedAt: alertObservedAt,
      lastObservedAt: alertObservedAt,
      observationCount: 1,
      currentValue: alert.currentValue ?? null,
      threshold: alert.threshold ?? null,
      updatedAt: observedAt,
    }).onConflictDoNothing().returning({ id: alertInstance.id });

    if (created) {
      await tx.insert(alertStateTransition).values({
        alertInstanceId: created.id,
        collectionRunId: runId,
        fromStatus: null,
        toStatus: "active",
        observedAt: alertObservedAt,
        reason: "condition-observed",
      });
    } else {
      await tx.update(alertInstance).set({
        lastObservedAt: alertObservedAt,
        observationCount: sql`${alertInstance.observationCount} + 1`,
        message: alert.message,
        currentValue: alert.currentValue ?? null,
        threshold: alert.threshold ?? null,
        updatedAt: observedAt,
      }).where(and(eq(alertInstance.conditionKey, alert.id), eq(alertInstance.status, "active")));
    }
  }

  for (const active of plan.recover) {
    const [recovered] = await tx.update(alertInstance).set({
      status: "recovered",
      recoveredAt: observedAt,
      updatedAt: observedAt,
    }).where(and(eq(alertInstance.id, active.id), eq(alertInstance.status, "active")))
      .returning({ id: alertInstance.id });
    if (recovered) {
      await tx.insert(alertStateTransition).values({
        alertInstanceId: recovered.id,
        collectionRunId: runId,
        fromStatus: "active",
        toStatus: "recovered",
        observedAt,
        reason: "successful-clear-observation",
      });
    }
  }
}

export async function completeCollectionRun(
  tx: MonitoringTransaction,
  runId: string,
  startedAt: Date,
  devicesAttempted: number,
  devicesSucceeded: number,
): Promise<{ status: "completed" | "partial" }> {
  const completedAt = new Date();
  const [completedRun] = await tx.update(collectionRun).set({
    completedAt,
    status: devicesSucceeded === devicesAttempted ? "completed" : "partial",
    durationMs: completedAt.getTime() - startedAt.getTime(),
    devicesAttempted,
    devicesSucceeded,
  }).where(eq(collectionRun.id, runId)).returning({ status: collectionRun.status });
  if (!completedRun) throw new Error("Collection run does not exist");
  if (completedRun.status !== "completed" && completedRun.status !== "partial") {
    throw new Error("Collection run has an invalid completion status");
  }
  return { status: completedRun.status };
}
