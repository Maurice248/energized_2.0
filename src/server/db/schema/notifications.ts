import { relations } from "drizzle-orm";
import {
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth";

export const notificationKindEnum = pgEnum("notification_kind", [
  "application_received",
  "application_status_changed",
  "team_invite_accepted",
  "interview_proposed",
  "interview_confirmed",
  "interview_canceled",
  "interview_reminder",
  "interview_time_requested",
]);

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    kind: notificationKindEnum("kind").notNull(),
    title: text("title").notNull(),
    body: text("body"),
    href: text("href"),
    readAt: timestamp("read_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    userCreatedIdx: index("notifications_user_created_idx").on(
      t.userId,
      t.createdAt,
    ),
    userUnreadIdx: index("notifications_user_unread_idx").on(
      t.userId,
      t.readAt,
    ),
  }),
);

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(user, {
    fields: [notifications.userId],
    references: [user.id],
  }),
}));
