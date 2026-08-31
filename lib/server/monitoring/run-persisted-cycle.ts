import "server-only";

import { monitoredDevices } from "@/data/monitored-devices";
import { fetchRegisteredMonitoredDeviceSnapshots } from "@/lib/agent-api";
import { evaluateMonitoringAlerts } from "@/lib/monitoring-alerts";
import { planAlertLifecycle } from "@/lib/persistence/alert-lifecycle";
import {
  assertDeviceStableKey,
  serviceAlertConditionKey,
  serviceStableKey,
} from "@/lib/persistence/identity";
import { mapSnapshotForPersistence } from "@/lib/persistence/mapping";
import { getDatabase } from "@/lib/server/db/client";
import {
  applyAlertLifecyclePlan,
  completeCollectionRun,
  createCollectionRun,
  failCollectionRun,
  insertDeviceObservation,
  insertNetworkTelemetrySample,
  insertSystemTelemetrySample,
  listActiveAlertStates,
  upsertDeviceInventory,
  upsertMonitoredDevice,
  upsertServiceDefinitions,
} from "@/lib/server/repositories/monitoring-repository";

export interface PersistedMonitoringCycleResult {
  collectionRunId: string;
  status: "completed" | "partial";
  devicesAttempted: number;
  devicesSucceeded: number;
  alertsDetected: number;
}

export async function runPersistedMonitoringCycle(): Promise<PersistedMonitoringCycleResult> {
  const db = getDatabase();
  const startedAt = new Date();
  const run = await createCollectionRun(startedAt);

  try {
    for (const device of monitoredDevices) assertDeviceStableKey(device.id);
    const snapshots = await fetchRegisteredMonitoredDeviceSnapshots();
    const alerts = evaluateMonitoringAlerts(snapshots);
    const attemptedSnapshots = snapshots.filter(
      (snapshot) => snapshot.device.operationalState !== "disabled",
    );
    const devicesSucceeded = attemptedSnapshots.filter(
      (snapshot) => snapshot.availability === "online" || snapshot.availability === "partial",
    ).length;

    const completedRun = await db.transaction(async (tx) => {
      const deviceIds = new Map<string, string>();
      for (const device of monitoredDevices) {
        deviceIds.set(device.id, await upsertMonitoredDevice(tx, device));
      }

      const serviceIdsByCondition = new Map<string, string>();
      for (const snapshot of snapshots) {
        if (snapshot.availability === "not-fetched") continue;
        const deviceId = deviceIds.get(snapshot.device.id);
        if (!deviceId) throw new Error("Snapshot references an unknown monitored device");
        const mapped = mapSnapshotForPersistence(snapshot);
        await insertDeviceObservation(tx, run.id, deviceId, mapped.observation);
        if (mapped.inventory) await upsertDeviceInventory(tx, deviceId, mapped.inventory);
        if (mapped.system) await insertSystemTelemetrySample(tx, run.id, deviceId, mapped.system);
        if (mapped.network) await insertNetworkTelemetrySample(tx, run.id, deviceId, mapped.network);
        const serviceIds = await upsertServiceDefinitions(tx, run.id, deviceId, mapped.services);
        for (const service of snapshot.services?.services ?? []) {
          const serviceId = serviceIds.get(serviceStableKey(service));
          if (serviceId) serviceIdsByCondition.set(
            serviceAlertConditionKey(snapshot.device.id, service),
            serviceId,
          );
        }
      }

      const activeAlerts = await listActiveAlertStates(tx);
      const lifecyclePlan = planAlertLifecycle(activeAlerts, alerts, snapshots);
      await applyAlertLifecyclePlan(
        tx,
        run.id,
        lifecyclePlan,
        deviceIds,
        serviceIdsByCondition,
        new Date(),
      );
      return completeCollectionRun(
        tx,
        run.id,
        startedAt,
        attemptedSnapshots.length,
        devicesSucceeded,
      );
    });

    return {
      collectionRunId: run.id,
      status: completedRun.status,
      devicesAttempted: attemptedSnapshots.length,
      devicesSucceeded,
      alertsDetected: alerts.length,
    };
  } catch (error) {
    await failCollectionRun(run.id, startedAt);
    throw error;
  }
}
