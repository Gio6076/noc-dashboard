CREATE TYPE "public"."alert_category" AS ENUM('agent', 'endpoint', 'service', 'system');--> statement-breakpoint
CREATE TYPE "public"."alert_severity" AS ENUM('warning', 'critical');--> statement-breakpoint
CREATE TYPE "public"."alert_status" AS ENUM('active', 'recovered');--> statement-breakpoint
CREATE TYPE "public"."availability" AS ENUM('online', 'partial', 'unreachable', 'not-fetched');--> statement-breakpoint
CREATE TYPE "public"."collection_run_status" AS ENUM('running', 'completed', 'partial', 'failed');--> statement-breakpoint
CREATE TYPE "public"."monitoring_type" AS ENUM('agent');--> statement-breakpoint
CREATE TYPE "public"."operational_state" AS ENUM('monitored', 'maintenance', 'disabled');--> statement-breakpoint
CREATE TYPE "public"."service_status" AS ENUM('up', 'down');--> statement-breakpoint
CREATE TYPE "public"."service_type" AS ENUM('tcp', 'http', 'https');--> statement-breakpoint
CREATE TABLE "alert_instance" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"condition_key" text NOT NULL,
	"device_id" uuid NOT NULL,
	"service_id" uuid,
	"category" "alert_category" NOT NULL,
	"severity" "alert_severity" NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"status" "alert_status" NOT NULL,
	"first_observed_at" timestamp with time zone NOT NULL,
	"last_observed_at" timestamp with time zone NOT NULL,
	"recovered_at" timestamp with time zone,
	"observation_count" integer DEFAULT 1 NOT NULL,
	"current_value" double precision,
	"threshold" double precision,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "alert_state_transition" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"alert_instance_id" uuid NOT NULL,
	"collection_run_id" uuid,
	"from_status" "alert_status",
	"to_status" "alert_status" NOT NULL,
	"observed_at" timestamp with time zone NOT NULL,
	"reason" text
);
--> statement-breakpoint
CREATE TABLE "collection_run" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"completed_at" timestamp with time zone,
	"status" "collection_run_status" NOT NULL,
	"duration_ms" integer,
	"devices_attempted" integer DEFAULT 0 NOT NULL,
	"devices_succeeded" integer DEFAULT 0 NOT NULL,
	"failure_summary" text
);
--> statement-breakpoint
CREATE TABLE "device_inventory" (
	"device_id" uuid NOT NULL,
	"hostname" text NOT NULL,
	"platform" text NOT NULL,
	"platform_release" text,
	"architecture" text NOT NULL,
	"logical_cpu_count" integer,
	"first_observed_at" timestamp with time zone NOT NULL,
	"last_observed_at" timestamp with time zone NOT NULL,
	CONSTRAINT "device_inventory_device_id_pk" PRIMARY KEY("device_id")
);
--> statement-breakpoint
CREATE TABLE "device_observation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"collection_run_id" uuid,
	"device_id" uuid NOT NULL,
	"observed_at" timestamp with time zone NOT NULL,
	"availability" "availability" NOT NULL,
	"operational_state" "operational_state" NOT NULL,
	"unavailable_endpoints" jsonb DEFAULT '[]'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "monitored_device" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"stable_key" text NOT NULL,
	"display_name" text NOT NULL,
	"monitoring_type" "monitoring_type" NOT NULL,
	"operational_state" "operational_state" NOT NULL,
	"expected_hostname" text,
	"environment" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "monitored_device_stable_key_unique" UNIQUE("stable_key")
);
--> statement-breakpoint
CREATE TABLE "network_telemetry_sample" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"collection_run_id" uuid,
	"device_id" uuid NOT NULL,
	"observed_at" timestamp with time zone NOT NULL,
	"inbound_bytes_per_second" double precision,
	"outbound_bytes_per_second" double precision,
	"bytes_received" bigint NOT NULL,
	"bytes_sent" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "service_definition" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"device_id" uuid NOT NULL,
	"stable_key" text NOT NULL,
	"name" text NOT NULL,
	"type" "service_type" NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"host" text,
	"port" integer,
	"url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "service_definition_target_ck" CHECK ((
    ("service_definition"."type" = 'tcp' AND "service_definition"."host" IS NOT NULL AND "service_definition"."port" BETWEEN 1 AND 65535 AND "service_definition"."url" IS NULL)
    OR
    ("service_definition"."type" IN ('http', 'https') AND "service_definition"."url" IS NOT NULL AND "service_definition"."host" IS NULL AND "service_definition"."port" IS NULL)
  ))
);
--> statement-breakpoint
CREATE TABLE "service_observation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"collection_run_id" uuid,
	"service_id" uuid NOT NULL,
	"observed_at" timestamp with time zone NOT NULL,
	"status" "service_status" NOT NULL,
	"response_time_ms" double precision,
	"http_status_code" integer
);
--> statement-breakpoint
CREATE TABLE "system_telemetry_sample" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"collection_run_id" uuid,
	"device_id" uuid NOT NULL,
	"observed_at" timestamp with time zone NOT NULL,
	"cpu_usage_percent" numeric(6, 3) NOT NULL,
	"memory_usage_percent" numeric(6, 3) NOT NULL,
	"memory_used_bytes" bigint,
	"memory_total_bytes" bigint,
	"disk_usage_percent" numeric(6, 3) NOT NULL,
	"disk_used_bytes" bigint,
	"disk_total_bytes" bigint,
	"uptime_seconds" bigint NOT NULL
);
--> statement-breakpoint
ALTER TABLE "alert_instance" ADD CONSTRAINT "alert_instance_device_id_monitored_device_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."monitored_device"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alert_instance" ADD CONSTRAINT "alert_instance_service_id_service_definition_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."service_definition"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alert_state_transition" ADD CONSTRAINT "alert_state_transition_alert_instance_id_alert_instance_id_fk" FOREIGN KEY ("alert_instance_id") REFERENCES "public"."alert_instance"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alert_state_transition" ADD CONSTRAINT "alert_state_transition_collection_run_id_collection_run_id_fk" FOREIGN KEY ("collection_run_id") REFERENCES "public"."collection_run"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "device_inventory" ADD CONSTRAINT "device_inventory_device_id_monitored_device_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."monitored_device"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "device_observation" ADD CONSTRAINT "device_observation_collection_run_id_collection_run_id_fk" FOREIGN KEY ("collection_run_id") REFERENCES "public"."collection_run"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "device_observation" ADD CONSTRAINT "device_observation_device_id_monitored_device_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."monitored_device"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "network_telemetry_sample" ADD CONSTRAINT "network_telemetry_sample_collection_run_id_collection_run_id_fk" FOREIGN KEY ("collection_run_id") REFERENCES "public"."collection_run"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "network_telemetry_sample" ADD CONSTRAINT "network_telemetry_sample_device_id_monitored_device_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."monitored_device"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_definition" ADD CONSTRAINT "service_definition_device_id_monitored_device_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."monitored_device"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_observation" ADD CONSTRAINT "service_observation_collection_run_id_collection_run_id_fk" FOREIGN KEY ("collection_run_id") REFERENCES "public"."collection_run"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_observation" ADD CONSTRAINT "service_observation_service_id_service_definition_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."service_definition"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_telemetry_sample" ADD CONSTRAINT "system_telemetry_sample_collection_run_id_collection_run_id_fk" FOREIGN KEY ("collection_run_id") REFERENCES "public"."collection_run"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_telemetry_sample" ADD CONSTRAINT "system_telemetry_sample_device_id_monitored_device_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."monitored_device"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "alert_instance_one_active_condition_uq" ON "alert_instance" USING btree ("condition_key") WHERE "alert_instance"."status" = 'active';--> statement-breakpoint
CREATE INDEX "alert_instance_status_last_observed_idx" ON "alert_instance" USING btree ("status","last_observed_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "alert_instance_device_first_observed_idx" ON "alert_instance" USING btree ("device_id","first_observed_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "alert_instance_condition_first_observed_idx" ON "alert_instance" USING btree ("condition_key","first_observed_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "alert_transition_instance_time_idx" ON "alert_state_transition" USING btree ("alert_instance_id","observed_at");--> statement-breakpoint
CREATE INDEX "device_observation_device_time_idx" ON "device_observation" USING btree ("device_id","observed_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "network_telemetry_device_time_idx" ON "network_telemetry_sample" USING btree ("device_id","observed_at" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "service_definition_device_stable_key_uq" ON "service_definition" USING btree ("device_id","stable_key");--> statement-breakpoint
CREATE INDEX "service_observation_service_time_idx" ON "service_observation" USING btree ("service_id","observed_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "system_telemetry_device_time_idx" ON "system_telemetry_sample" USING btree ("device_id","observed_at" DESC NULLS LAST);