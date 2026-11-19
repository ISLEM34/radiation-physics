import {
  pgTable,
  serial,
  varchar,
  text,
  timestamp,
  integer,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    email: varchar("email", { length: 255 }).notNull(),
    name: varchar("name", { length: 120 }).notNull(),
    passwordHash: text("password_hash").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [uniqueIndex("users_email_unique").on(t.email)],
);

export const resources = pgTable(
  "resources",
  {
    id: serial("id").primaryKey(),
    title: varchar("title", { length: 400 }).notNull(),
    url: text("url").notNull(),
    description: text("description").notNull(),
    language: varchar("language", { length: 2 }).notNull(), // ar | fr | en
    type: varchar("type", { length: 20 }).notNull(), // course video paper book sim institution collection article dataset
    topic: varchar("topic", { length: 30 }).notNull(),
    publisher: varchar("publisher", { length: 200 }).notNull(),
    tags: text("tags").notNull().default(""),
    status: varchar("status", { length: 16 }).notNull().default("unverified"), // verified | dead | unknown | checking | unverified
    httpStatus: integer("http_status"),
    lastCheckedAt: timestamp("last_checked_at", { withTimezone: true }),
    reports: integer("reports").notNull().default(0),
    saves: integer("saves").notNull().default(0),
    addedAt: timestamp("added_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    uniqueIndex("resources_url_unique").on(t.url),
    index("resources_language_idx").on(t.language),
    index("resources_status_idx").on(t.status),
    index("resources_added_idx").on(t.addedAt),
    index("resources_topic_idx").on(t.topic),
  ],
);

export const savedResources = pgTable(
  "saved_resources",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull(),
    resourceId: integer("resource_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [uniqueIndex("saved_user_resource_unique").on(t.userId, t.resourceId)],
);

export const siteMeta = pgTable("site_meta", {
  key: varchar("key", { length: 64 }).primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type User = typeof users.$inferSelect;
export type Resource = typeof resources.$inferSelect;
