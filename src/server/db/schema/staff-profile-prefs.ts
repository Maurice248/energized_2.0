import { relations } from "drizzle-orm";
import { boolean, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { user } from "./auth";

/** Platform admin personal prefs (phone + notification toggles) on `/admin/profile-settings`. */
export const staffProfilePrefs = pgTable("staff_profile_prefs", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  phone: text("phone"),
  emailNotifications: boolean("email_notifications").notNull().default(true),
  pushNotifications: boolean("push_notifications").notNull().default(true),
  updatedAt: timestamp("updated_at")
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const staffProfilePrefsRelations = relations(staffProfilePrefs, ({ one }) => ({
  user: one(user, {
    fields: [staffProfilePrefs.userId],
    references: [user.id],
  }),
}));
