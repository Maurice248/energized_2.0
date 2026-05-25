import { relations } from "drizzle-orm";
import {
  index,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth";
import { employerOrgs } from "./employer-orgs";
import {
  supportTicketPriorityEnum,
  supportTicketStatusEnum,
} from "./enums";

export const supportTickets = pgTable(
  "support_tickets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    code: text("code").notNull().unique(),
    subject: text("subject").notNull(),
    body: text("body"),
    priority: supportTicketPriorityEnum("priority").notNull().default("p2"),
    status: supportTicketStatusEnum("status").notNull().default("open"),
    requesterUserId: text("requester_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    requesterOrgId: uuid("requester_org_id").references(() => employerOrgs.id, {
      onDelete: "set null",
    }),
    assignedTo: text("assigned_to").references(() => user.id, {
      onDelete: "set null",
    }),
    firstResponseAt: timestamp("first_response_at"),
    closedAt: timestamp("closed_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date()),
  },
  (table) => [
    index("support_tickets_status_idx").on(table.status, table.priority),
    index("support_tickets_requester_idx").on(table.requesterUserId),
    index("support_tickets_org_idx").on(table.requesterOrgId),
  ],
);

export const supportTicketRelations = relations(supportTickets, ({ one }) => ({
  requesterUser: one(user, {
    fields: [supportTickets.requesterUserId],
    references: [user.id],
    relationName: "ticketRequester",
  }),
  requesterOrg: one(employerOrgs, {
    fields: [supportTickets.requesterOrgId],
    references: [employerOrgs.id],
  }),
  assignee: one(user, {
    fields: [supportTickets.assignedTo],
    references: [user.id],
    relationName: "ticketAssignee",
  }),
}));

export type SupportTicket = typeof supportTickets.$inferSelect;
export type NewSupportTicket = typeof supportTickets.$inferInsert;
