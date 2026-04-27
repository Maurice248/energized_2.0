import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { user } from "./auth";
import { employerOrgs } from "./employer-orgs";

export const profileViews = pgTable(
  "profile_views",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    subjectUserId: text("subject_user_id").references(() => user.id, {
      onDelete: "cascade",
    }),
    subjectOrgId: uuid("subject_org_id").references(() => employerOrgs.id, {
      onDelete: "cascade",
    }),
    viewerUserId: text("viewer_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    viewedAt: timestamp("viewed_at").notNull().defaultNow(),
  },
  (t) => ({
    subjectUserIdx: index("profile_views_subject_user_idx").on(
      t.subjectUserId,
      t.viewedAt,
    ),
    subjectOrgIdx: index("profile_views_subject_org_idx").on(
      t.subjectOrgId,
      t.viewedAt,
    ),
  }),
);
