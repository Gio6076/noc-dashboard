import type { NetworkActivity } from "@/types/network";
import { DEVICE_IDS } from "@/data/mock-devices";

export const mockNetworkActivity = [
  {
    id: "activity-auth-failure",
    description: "Firewall recorded failed administrator authentication from VLAN 50.",
    occurredAt: "2026-08-28T07:57:12.000Z",
    deviceId: DEVICE_IDS.edgeFirewall,
    actor: "10.10.50.117",
  },
  {
    id: "activity-packet-loss-threshold",
    description: "Wireless packet-loss threshold crossed for AP-02.",
    occurredAt: "2026-08-28T07:54:03.000Z",
    deviceId: DEVICE_IDS.accessPoint02,
    actor: "Monitoring engine",
  },
  {
    id: "activity-switch-threshold",
    description: "ACCESS-SW-02 uplink utilization crossed the 80% warning threshold.",
    occurredAt: "2026-08-28T07:48:08.000Z",
    deviceId: DEVICE_IDS.accessSwitch02,
    actor: "Monitoring engine",
  },
  {
    id: "activity-backup-offline",
    description: "BKP-SRV-01 changed state from online to offline.",
    occurredAt: "2026-08-28T07:42:16.000Z",
    deviceId: DEVICE_IDS.backupServer,
    actor: "Monitoring engine",
  },
  {
    id: "activity-db-alert-ack",
    description: "Database CPU pressure alert acknowledged and assigned for investigation.",
    occurredAt: "2026-08-28T07:36:40.000Z",
    deviceId: DEVICE_IDS.databaseServer,
    actor: "M. Santos",
  },
  {
    id: "activity-config-update",
    description: "Approved access-list configuration deployed to the edge firewall.",
    occurredAt: "2026-08-28T07:14:22.000Z",
    deviceId: DEVICE_IDS.edgeFirewall,
    actor: "J. Reyes",
  },
  {
    id: "activity-interface-up",
    description: "DIST-SW-01 interface Gi1/0/24 returned to forwarding state.",
    occurredAt: "2026-08-28T07:09:51.000Z",
    deviceId: DEVICE_IDS.distributionSwitch,
    actor: "Monitoring engine",
  },
  {
    id: "activity-backup-complete",
    description: "Nightly database backup completed and checksum verification passed.",
    occurredAt: "2026-08-28T06:45:07.000Z",
    deviceId: DEVICE_IDS.databaseServer,
    actor: "Backup service",
  },
  {
    id: "activity-maintenance",
    description: "Scheduled wireless controller maintenance window created for Saturday 22:00.",
    occurredAt: "2026-08-28T06:20:00.000Z",
    actor: "NOC Scheduler",
  },
  {
    id: "activity-ap-online",
    description: "AP-01 completed a firmware restart and returned online.",
    occurredAt: "2026-08-28T05:58:34.000Z",
    deviceId: DEVICE_IDS.accessPoint01,
    actor: "Wireless controller",
  },
] satisfies readonly NetworkActivity[];
