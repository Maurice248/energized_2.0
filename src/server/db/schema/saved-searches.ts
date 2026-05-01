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

export const savedSearchSurfaceEnum = pgEnum("saved_search_surface", [
  "jobs",
  "candidates",
]);

export const savedSearches = pgTable(
  "saved_searches",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    surface: savedSearchSurfaceEnum("surface").notNull(),
    name: text("name").notNull(),
    queryString: text("query_string").notNull().default(""),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    userSurfaceIdx: index("saved_searches_user_surface_idx").on(
      t.userId,
      t.surface,
    ),
  }),
);

export const savedSearchesRelations = relations(savedSearches, ({ one }) => ({
  user: one(user, {
    fields: [savedSearches.userId],
    references: [user.id],
  }),
}));
