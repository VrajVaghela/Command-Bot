import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import type { InferInsertModel, InferSelectModel } from "drizzle-orm";

/**
 * Database schema (architecture.md §5). Everything is scoped by `guild_id` so
 * multi-server becomes a later toggle, not a rewrite. Idempotency anchor is
 * `interactions.id` = the Discord interaction id (dedup key).
 */

// ── Enums ───────────────────────────────────────────────────────────────────
export const mirrorTypeEnum = pgEnum("mirror_type", ["slack", "discord"]);
export const interactionStatusEnum = pgEnum("interaction_status", [
  "received",
  "processed",
  "failed",
]);
export const actionKindEnum = pgEnum("action_kind", [
  "discord_reply",
  "mirror",
  "ai",
]);
export const actionStatusEnum = pgEnum("action_status", [
  "pending",
  "success",
  "failed",
]);

// ── guilds — connected Discord servers ──────────────────────────────────────
export const guilds = pgTable("guilds", {
  id: text("id").primaryKey(), // Discord guild id
  name: text("name").notNull(),
  postChannelId: text("post_channel_id"),
  mirrorType: mirrorTypeEnum("mirror_type"),
  // Secret: server-only, never sent to the client.
  mirrorWebhookUrl: text("mirror_webhook_url"),
  connectedBy: text("connected_by"), // admin user id
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ── command_configs — per-command, per-guild rules (UI-editable) ────────────
export const commandConfigs = pgTable(
  "command_configs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    guildId: text("guild_id")
      .notNull()
      .references(() => guilds.id, { onDelete: "cascade" }),
    commandName: text("command_name").notNull(), // e.g. "report", "status"
    enabled: boolean("enabled").notNull().default(true),
    // Rule definition: keyword tags, response template, mirror on/off, ai on/off.
    rule: jsonb("rule").notNull().default({}),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    unique("command_configs_guild_command_unique").on(t.guildId, t.commandName),
  ],
);

// ── interactions — the recorded command log (idempotency anchor) ────────────
export const interactions = pgTable("interactions", {
  id: text("id").primaryKey(), // Discord interaction id — dedup key
  guildId: text("guild_id"),
  type: integer("type").notNull(), // 1 PING / 2 COMMAND / 3 COMPONENT / 5 MODAL
  commandName: text("command_name"),
  userId: text("user_id"),
  userName: text("user_name"),
  payload: jsonb("payload"), // raw options/text (no secrets)
  status: interactionStatusEnum("status").notNull().default("received"),
  responseSummary: text("response_summary"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ── actions — every downstream action taken per interaction ─────────────────
// One row per (interaction, kind): get-or-created once, then updated in place
// across retry attempts. The unique constraint is the idempotency guarantee
// behind "duplicate delivery -> single action set" (build_plan.md Phase 3).
export const actions = pgTable(
  "actions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    interactionId: text("interaction_id")
      .notNull()
      .references(() => interactions.id, { onDelete: "cascade" }),
    kind: actionKindEnum("kind").notNull(),
    status: actionStatusEnum("status").notNull().default("pending"),
    attempts: integer("attempts").notNull().default(0), // retry counter
    detail: jsonb("detail"), // request/response summary, error message
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    unique("actions_interaction_kind_unique").on(t.interactionId, t.kind),
  ],
);

// ── admin_users — dashboard login ───────────────────────────────────────────
export const adminUsers = pgTable("admin_users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(), // argon2/bcrypt
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ── Inferred row types (code_standards §1 — never hand-retype rows) ──────────
export type Guild = InferSelectModel<typeof guilds>;
export type NewGuild = InferInsertModel<typeof guilds>;
export type CommandConfig = InferSelectModel<typeof commandConfigs>;
export type NewCommandConfig = InferInsertModel<typeof commandConfigs>;
export type Interaction = InferSelectModel<typeof interactions>;
export type NewInteraction = InferInsertModel<typeof interactions>;
export type Action = InferSelectModel<typeof actions>;
export type NewAction = InferInsertModel<typeof actions>;
export type AdminUser = InferSelectModel<typeof adminUsers>;
export type NewAdminUser = InferInsertModel<typeof adminUsers>;
