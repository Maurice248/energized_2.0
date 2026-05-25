import {
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { systemServiceStatusEnum } from "./enums";

export const systemServices = pgTable("system_services", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  category: text("category").notNull().default("infra"),
  lastStatus: systemServiceStatusEnum("last_status")
    .notNull()
    .default("operational"),
  lastLatencyMs: integer("last_latency_ms"),
  lastCheckedAt: timestamp("last_checked_at"),
  lastIncidentAt: timestamp("last_incident_at"),
  // Rolling 30-day uptime as a percentage (e.g. 99.97).
  uptime30dPct: numeric("uptime_30d_pct", { precision: 5, scale: 2 })
    .notNull()
    .default("100.00"),
  // Rolling probe counters used by the background job to recompute uptime.
  rollup: jsonb("rollup")
    .$type<{ days: { date: string; ok: number; fail: number }[] }>()
    .notNull()
    .default({ days: [] }),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at")
    .notNull()
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date()),
});

export type SystemService = typeof systemServices.$inferSelect;
export type NewSystemService = typeof systemServices.$inferInsert;
