import {
  boolean,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { sectorEnum } from "./enums";

export const testTopics = pgTable("test_topics", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  parentTopicId: uuid("parent_topic_id"),
  name: text("name").notNull(),
  monogram: text("monogram").notNull(),
  blurb: text("blurb"),
  subDescription: text("sub_description"),
  tileColor: text("tile_color").notNull(),
  jobSectorMatch: sectorEnum("job_sector_match"),
  isHot: boolean("is_hot").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type TestTopic = typeof testTopics.$inferSelect;
export type NewTestTopic = typeof testTopics.$inferInsert;
