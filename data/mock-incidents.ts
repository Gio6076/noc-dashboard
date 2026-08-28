import type { NetworkIncident } from "@/types/network";
import { DEVICE_IDS } from "@/data/mock-devices";

export const INCIDENT_REFERENCE_TIME = "2026-08-28T08:00:00.000Z";

export const mockNetworkIncidents = [
  {
    id: "inc-bkp-outage",
    title: "Backup server outage",
    severity: "critical",
    status: "active",
    affectedDeviceIds: [DEVICE_IDS.backupServer],
    startedAt: "2026-08-28T07:42:00.000Z",
    summary:
      "The backup server is unreachable by both ICMP and its monitoring agent, interrupting scheduled backup availability.",
    rootCause:
      "Root cause is not yet confirmed; power and hypervisor connectivity checks are pending.",
    relatedAlertIds: ["alert-bkp-offline"],
    assignedTeam: "Infrastructure Operations",
  },
  {
    id: "inc-wireless-loss",
    title: "Wireless packet-loss event",
    severity: "warning",
    status: "investigating",
    affectedDeviceIds: [DEVICE_IDS.accessPoint02],
    startedAt: "2026-08-28T07:49:00.000Z",
    summary:
      "AP-02 is reporting elevated packet loss and retransmissions affecting wireless client quality.",
    rootCause:
      "RF interference or upstream congestion is suspected; channel utilization review is in progress.",
    relatedAlertIds: ["alert-ap-packet-loss", "alert-ap-latency"],
    assignedTeam: "Network Engineering",
  },
  {
    id: "inc-access-capacity",
    title: "Access switch uplink saturation",
    severity: "warning",
    status: "active",
    affectedDeviceIds: [DEVICE_IDS.accessSwitch02],
    startedAt: "2026-08-28T07:36:00.000Z",
    summary:
      "ACCESS-SW-02 uplink utilization has remained above the configured warning threshold.",
    rootCause:
      "Sustained lab and wireless traffic is consuming uplink capacity; traffic-source validation is pending.",
    relatedAlertIds: ["alert-access-bandwidth"],
    assignedTeam: "Network Operations",
  },
  {
    id: "inc-auth-anomaly",
    title: "Firewall authentication anomaly",
    severity: "warning",
    status: "investigating",
    affectedDeviceIds: [DEVICE_IDS.edgeFirewall],
    startedAt: "2026-08-28T07:55:00.000Z",
    summary:
      "Multiple rejected administrator login attempts originated from a workstation VLAN address.",
    rootCause:
      "The source identity and whether the attempts were operator error or unauthorized activity remain under review.",
    relatedAlertIds: ["alert-auth-failures"],
    assignedTeam: "Security Operations",
  },
  {
    id: "inc-interface-instability",
    title: "Distribution interface instability",
    severity: "informational",
    status: "resolved",
    affectedDeviceIds: [DEVICE_IDS.distributionSwitch],
    startedAt: "2026-08-28T07:05:00.000Z",
    resolvedAt: "2026-08-28T07:26:00.000Z",
    summary:
      "DIST-SW-01 interface Gi1/0/24 changed state repeatedly before returning to a stable forwarding state.",
    rootCause:
      "A loose patch lead was reseated and link stability was confirmed through subsequent monitoring samples.",
    relatedAlertIds: ["alert-interface-flap"],
    assignedTeam: "Campus IT Support",
  },
] satisfies readonly NetworkIncident[];
