import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  doublePrecision,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const monitoringTypeEnum = pgEnum("monitoring_type", ["agent"]);
export const operationalStateEnum = pgEnum("operational_state", [
  "monitored",
  "maintenance",
  "disabled",
]);
export const availabilityEnum = pgEnum("availability", [
  "online",
  "partial",
  "unreachable",
  "not-fetched",
]);
export const serviceTypeEnum = pgEnum("service_type", ["tcp", "http", "https"]);
export const serviceStatusEnum = pgEnum("service_status", ["up", "down"]);
export const alertCategoryEnum = pgEnum("alert_category", [
  "agent",
  "endpoint",
  "service",
  "system",
]);
export const alertSeverityEnum = pgEnum("alert_severity", ["warning", "critical"]);
export const alertStatusEnum = pgEnum("alert_status", ["active", "recovered"]);
export const collectionRunStatusEnum = pgEnum("collection_run_status", [
  "running",
  "completed",
  "partial",
  "failed",
]);

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
};

export const monitoredDevice = pgTable("monitored_device", {
  id: uuid("id").primaryKey().defaultRandom(),
  stableKey: text("stable_key").notNull().unique(),
  displayName: text("display_name").notNull(),
  monitoringType: monitoringTypeEnum("monitoring_type").notNull(),
  operationalState: operationalStateEnum("operational_state").notNull(),
  expectedHostname: text("expected_hostname"),
  environment: text("environment"),
  ...timestamps,
});

export const deviceInventory = pgTable("device_inventory", {
  deviceId: uuid("device_id").notNull().references(() => monitoredDevice.id, { onDelete: "cascade" }),
  hostname: text("hostname").notNull(),
  platform: text("platform").notNull(),
  platformRelease: text("platform_release"),
  architecture: text("architecture").notNull(),
  logicalCpuCount: integer("logical_cpu_count"),
  firstObservedAt: timestamp("first_observed_at", { withTimezone: true }).notNull(),
  lastObservedAt: timestamp("last_observed_at", { withTimezone: true }).notNull(),
}, (table) => [primaryKey({ columns: [table.deviceId] })]);

export const serviceDefinition = pgTable("service_definition", {
  id: uuid("id").primaryKey().defaultRandom(),
  deviceId: uuid("device_id").notNull().references(() => monitoredDevice.id, { onDelete: "cascade" }),
  stableKey: text("stable_key").notNull(),
  name: text("name").notNull(),
  type: serviceTypeEnum("type").notNull(),
  enabled: boolean("enabled").notNull().default(true),
  host: text("host"),
  port: integer("port"),
  url: text("url"),
  ...timestamps,
}, (table) => [
  uniqueIndex("service_definition_device_stable_key_uq").on(table.deviceId, table.stableKey),
  check("service_definition_target_ck", sql`(
    (${table.type} = 'tcp' AND ${table.host} IS NOT NULL AND ${table.port} BETWEEN 1 AND 65535 AND ${table.url} IS NULL)
    OR
    (${table.type} IN ('http', 'https') AND ${table.url} IS NOT NULL AND ${table.host} IS NULL AND ${table.port} IS NULL)
  )`),
]);

export const collectionRun = pgTable("collection_run", {
  id: uuid("id").primaryKey().defaultRandom(),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  status: collectionRunStatusEnum("status").notNull(),
  durationMs: integer("duration_ms"),
  devicesAttempted: integer("devices_attempted").notNull().default(0),
  devicesSucceeded: integer("devices_succeeded").notNull().default(0),
  failureSummary: text("failure_summary"),
});

export const deviceObservation = pgTable("device_observation", {
  id: uuid("id").primaryKey().defaultRandom(),
  collectionRunId: uuid("collection_run_id").references(() => collectionRun.id, { onDelete: "set null" }),
  deviceId: uuid("device_id").notNull().references(() => monitoredDevice.id, { onDelete: "cascade" }),
  observedAt: timestamp("observed_at", { withTimezone: true }).notNull(),
  availability: availabilityEnum("availability").notNull(),
  operationalState: operationalStateEnum("operational_state").notNull(),
  unavailableEndpoints: jsonb("unavailable_endpoints").$type<string[]>().notNull().default([]),
}, (table) => [index("device_observation_device_time_idx").on(table.deviceId, table.observedAt.desc())]);

export const systemTelemetrySample = pgTable("system_telemetry_sample", {
  id: uuid("id").primaryKey().defaultRandom(),
  collectionRunId: uuid("collection_run_id").references(() => collectionRun.id, { onDelete: "set null" }),
  deviceId: uuid("device_id").notNull().references(() => monitoredDevice.id, { onDelete: "cascade" }),
  observedAt: timestamp("observed_at", { withTimezone: true }).notNull(),
  cpuUsagePercent: numeric("cpu_usage_percent", { precision: 6, scale: 3 }).notNull(),
  memoryUsagePercent: numeric("memory_usage_percent", { precision: 6, scale: 3 }).notNull(),
  memoryUsedBytes: bigint("memory_used_bytes", { mode: "bigint" }),
  memoryTotalBytes: bigint("memory_total_bytes", { mode: "bigint" }),
  diskUsagePercent: numeric("disk_usage_percent", { precision: 6, scale: 3 }).notNull(),
  diskUsedBytes: bigint("disk_used_bytes", { mode: "bigint" }),
  diskTotalBytes: bigint("disk_total_bytes", { mode: "bigint" }),
  uptimeSeconds: bigint("uptime_seconds", { mode: "bigint" }).notNull(),
}, (table) => [index("system_telemetry_device_time_idx").on(table.deviceId, table.observedAt.desc())]);

export const networkTelemetrySample = pgTable("network_telemetry_sample", {
  id: uuid("id").primaryKey().defaultRandom(),
  collectionRunId: uuid("collection_run_id").references(() => collectionRun.id, { onDelete: "set null" }),
  deviceId: uuid("device_id").notNull().references(() => monitoredDevice.id, { onDelete: "cascade" }),
  observedAt: timestamp("observed_at", { withTimezone: true }).notNull(),
  inboundBytesPerSecond: doublePrecision("inbound_bytes_per_second"),
  outboundBytesPerSecond: doublePrecision("outbound_bytes_per_second"),
  bytesReceived: bigint("bytes_received", { mode: "bigint" }).notNull(),
  bytesSent: bigint("bytes_sent", { mode: "bigint" }).notNull(),
}, (table) => [index("network_telemetry_device_time_idx").on(table.deviceId, table.observedAt.desc())]);

export const serviceObservation = pgTable("service_observation", {
  id: uuid("id").primaryKey().defaultRandom(),
  collectionRunId: uuid("collection_run_id").references(() => collectionRun.id, { onDelete: "set null" }),
  serviceId: uuid("service_id").notNull().references(() => serviceDefinition.id, { onDelete: "cascade" }),
  observedAt: timestamp("observed_at", { withTimezone: true }).notNull(),
  status: serviceStatusEnum("status").notNull(),
  responseTimeMs: doublePrecision("response_time_ms"),
  httpStatusCode: integer("http_status_code"),
}, (table) => [index("service_observation_service_time_idx").on(table.serviceId, table.observedAt.desc())]);

export const alertInstance = pgTable("alert_instance", {
  id: uuid("id").primaryKey().defaultRandom(),
  conditionKey: text("condition_key").notNull(),
  deviceId: uuid("device_id").notNull().references(() => monitoredDevice.id, { onDelete: "cascade" }),
  serviceId: uuid("service_id").references(() => serviceDefinition.id, { onDelete: "set null" }),
  category: alertCategoryEnum("category").notNull(),
  severity: alertSeverityEnum("severity").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  status: alertStatusEnum("status").notNull(),
  firstObservedAt: timestamp("first_observed_at", { withTimezone: true }).notNull(),
  lastObservedAt: timestamp("last_observed_at", { withTimezone: true }).notNull(),
  recoveredAt: timestamp("recovered_at", { withTimezone: true }),
  observationCount: integer("observation_count").notNull().default(1),
  currentValue: doublePrecision("current_value"),
  threshold: doublePrecision("threshold"),
  ...timestamps,
}, (table) => [
  uniqueIndex("alert_instance_one_active_condition_uq").on(table.conditionKey).where(sql`${table.status} = 'active'`),
  index("alert_instance_status_last_observed_idx").on(table.status, table.lastObservedAt.desc()),
  index("alert_instance_device_first_observed_idx").on(table.deviceId, table.firstObservedAt.desc()),
  index("alert_instance_condition_first_observed_idx").on(table.conditionKey, table.firstObservedAt.desc()),
]);

export const alertStateTransition = pgTable("alert_state_transition", {
  id: uuid("id").primaryKey().defaultRandom(),
  alertInstanceId: uuid("alert_instance_id").notNull().references(() => alertInstance.id, { onDelete: "cascade" }),
  collectionRunId: uuid("collection_run_id").references(() => collectionRun.id, { onDelete: "set null" }),
  fromStatus: alertStatusEnum("from_status"),
  toStatus: alertStatusEnum("to_status").notNull(),
  observedAt: timestamp("observed_at", { withTimezone: true }).notNull(),
  reason: text("reason"),
}, (table) => [index("alert_transition_instance_time_idx").on(table.alertInstanceId, table.observedAt)]);
