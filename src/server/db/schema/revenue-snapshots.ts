import {
  bigint,
  date,
  index,
  integer,
  pgTable,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const revenueSnapshots = pgTable(
  "revenue_snapshots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    snapshotDate: date("snapshot_date").notNull().unique(),
    mrrCents: bigint("mrr_cents", { mode: "number" }).notNull().default(0),
    arrCents: bigint("arr_cents", { mode: "number" }).notNull().default(0),
    newSubsCount: integer("new_subs_count").notNull().default(0),
    churnedCount: integer("churned_count").notNull().default(0),
    enterpriseCents: bigint("enterprise_cents", { mode: "number" })
      .notNull()
      .default(0),
    growthCents: bigint("growth_cents", { mode: "number" })
      .notNull()
      .default(0),
    starterCents: bigint("starter_cents", { mode: "number" })
      .notNull()
      .default(0),
    addonsCents: bigint("addons_cents", { mode: "number" })
      .notNull()
      .default(0),
    paymentsLastDayCents: bigint("payments_last_day_cents", { mode: "number" })
      .notNull()
      .default(0),
    activeOrgCount: integer("active_org_count").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [index("revenue_snapshots_date_idx").on(table.snapshotDate)],
);

export type RevenueSnapshot = typeof revenueSnapshots.$inferSelect;
export type NewRevenueSnapshot = typeof revenueSnapshots.$inferInsert;
