import { relations } from "drizzle-orm";
import {
  bigserial,
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  serial,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

// Doc 01 §Tables — column naming is snake_case throughout (NS-011); this file
// owns every table, none of it is Better Auth's, so no camelCase exception applies here.

export const contactSourceEnum = pgEnum("contact_source", [
  "outreach",
  "referral",
  "inbound",
  "event",
  "social",
]);

// Stage machine is locked (doc 01) — automated transitions only ever move
// forward; LOST is manual-only and requires a one-line reason stored as an interaction.
export const engagementStageEnum = pgEnum("engagement_stage", [
  "LEAD",
  "CONTACTED",
  "IN_CONVERSATION",
  "TRIALING",
  "SIGNED_UP",
  "ACTIVE",
  "PAYING",
  "DORMANT",
  "LOST",
]);

export const interactionChannelEnum = pgEnum("interaction_channel", [
  "whatsapp",
  "telegram",
  "call",
  "in_person",
  "email",
  "social",
  "system",
]);

export const interactionDirectionEnum = pgEnum("interaction_direction", [
  "outbound",
  "inbound",
  "note",
]);

export const nextActionStatusEnum = pgEnum("next_action_status", [
  "open",
  "done",
  "cancelled",
]);

export const ingestStatusEnum = pgEnum("ingest_status", [
  "processed",
  "duplicate",
  "error",
]);

// Seeded reference table, not an enum — new ventures get added by insert, not migration.
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  active: boolean("active").notNull().default(true),
});

export const contacts = pgTable("contacts", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  company: text("company"),
  phone: text("phone"),
  phoneAlt: text("phone_alt").array(),
  email: text("email"),
  source: contactSourceEnum("source"),
  referredBy: uuid("referred_by"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const engagements = pgTable(
  "engagements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    contactId: uuid("contact_id")
      .notNull()
      .references(() => contacts.id),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id),
    stage: engagementStageEnum("stage").notNull().default("LEAD"),
    tier: smallint("tier"),
    appUserId: text("app_user_id"),
    interestNote: text("interest_note"),
    // Doc 02 §3 — set on a signup webhook that couldn't match an existing
    // prospect, so an unrecognized signup surfaces for a human to check
    // (they may be an existing prospect under a different name/contact).
    needsReview: boolean("needs_review").notNull().default(false),
    stageChangedAt: timestamp("stage_changed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("engagements_contact_id_product_id_key").on(
      table.contactId,
      table.productId,
    ),
    index("engagements_product_id_stage_idx").on(table.productId, table.stage),
  ],
);

// Append-only history — the successor to outreach-log.md entries.
export const interactions = pgTable(
  "interactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    engagementId: uuid("engagement_id")
      .notNull()
      .references(() => engagements.id),
    happenedAt: timestamp("happened_at", { withTimezone: true }).notNull(),
    channel: interactionChannelEnum("channel").notNull(),
    direction: interactionDirectionEnum("direction").notNull(),
    summary: text("summary").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("interactions_engagement_id_happened_at_idx").on(
      table.engagementId,
      table.happenedAt.desc(),
    ),
  ],
);

// Kept separate from interactions so the "This Week" view is a single indexed query.
export const nextActions = pgTable(
  "next_actions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    engagementId: uuid("engagement_id")
      .notNull()
      .references(() => engagements.id),
    description: text("description").notNull(),
    dueDate: date("due_date"),
    status: nextActionStatusEnum("status").notNull().default("open"),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => [
    index("next_actions_status_due_date_idx").on(table.status, table.dueDate),
  ],
);

// Written only by /api/ingest/usage (doc 02).
export const usageRollups = pgTable(
  "usage_rollups",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id),
    appUserId: text("app_user_id").notNull(),
    periodDate: date("period_date").notNull(),
    lastActiveAt: timestamp("last_active_at", { withTimezone: true }),
    counts: jsonb("counts"),
    receivedAt: timestamp("received_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("usage_rollups_product_id_app_user_id_period_date_key").on(
      table.productId,
      table.appUserId,
      table.periodDate,
    ),
    index("usage_rollups_product_id_app_user_id_period_date_idx").on(
      table.productId,
      table.appUserId,
      table.periodDate.desc(),
    ),
  ],
);

// Raw record of every inbound webhook/API call — idempotency checks, debugging, replay.
// Prune >12 months. `source` is free-form text (bazabooks, chama360, zeroclaw, …) rather
// than an enum, matching doc 01's "…" — new inbound sources shouldn't need a migration.
export const ingestLog = pgTable(
  "ingest_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    source: text("source").notNull(),
    endpoint: text("endpoint").notNull(),
    payload: jsonb("payload"),
    status: ingestStatusEnum("status").notNull(),
    error: text("error"),
    receivedAt: timestamp("received_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("ingest_log_source_received_at_idx").on(
      table.source,
      table.receivedAt.desc(),
    ),
  ],
);

export const productsRelations = relations(products, ({ many }) => ({
  engagements: many(engagements),
}));

export const contactsRelations = relations(contacts, ({ one, many }) => ({
  engagements: many(engagements),
  referredByContact: one(contacts, {
    fields: [contacts.referredBy],
    references: [contacts.id],
    relationName: "referrals",
  }),
  referrals: many(contacts, { relationName: "referrals" }),
}));

export const engagementsRelations = relations(engagements, ({ one, many }) => ({
  contact: one(contacts, {
    fields: [engagements.contactId],
    references: [contacts.id],
  }),
  product: one(products, {
    fields: [engagements.productId],
    references: [products.id],
  }),
  interactions: many(interactions),
  nextActions: many(nextActions),
  usageRollups: many(usageRollups),
}));

export const interactionsRelations = relations(interactions, ({ one }) => ({
  engagement: one(engagements, {
    fields: [interactions.engagementId],
    references: [engagements.id],
  }),
}));

export const nextActionsRelations = relations(nextActions, ({ one }) => ({
  engagement: one(engagements, {
    fields: [nextActions.engagementId],
    references: [engagements.id],
  }),
}));

export const usageRollupsRelations = relations(usageRollups, ({ one }) => ({
  product: one(products, {
    fields: [usageRollups.productId],
    references: [products.id],
  }),
}));
