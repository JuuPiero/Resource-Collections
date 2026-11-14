import {
  bigint,
  boolean,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const resourceStatus = pgEnum("resource_status", [
  "draft",
  "published",
  "archived",
]);

export const accessLevel = pgEnum("access_level", [
  "public",
  "authenticated",
  "restricted",
]);

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: varchar("email", { length: 320 }).notNull(),
    passwordHash: varchar("password_hash", { length: 255 }),
    name: varchar("name", { length: 160 }),
    avatarUrl: text("avatar_url"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  },
  (table) => [uniqueIndex("users_email_unique").on(table.email)],
);

export const resources = pgTable(
  "resources",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: varchar("title", { length: 180 }).notNull(),
    slug: varchar("slug", { length: 220 }).notNull(),
    description: text("description"),
    version: varchar("version", { length: 40 }),
    status: resourceStatus("status").notNull().default("draft"),
    accessLevel: accessLevel("access_level").notNull().default("restricted"),
    createdById: uuid("created_by_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("resources_slug_unique").on(table.slug),
    index("resources_status_idx").on(table.status),
  ],
);

export const resourceFiles = pgTable(
  "resource_files",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    resourceId: uuid("resource_id")
      .notNull()
      .references(() => resources.id, { onDelete: "cascade" }),
    storageProvider: varchar("storage_provider", { length: 20 })
      .notNull()
      .default("local"),
    originalName: varchar("original_name", { length: 255 }).notNull(),
    storageKey: text("storage_key").notNull(),
    mimeType: varchar("mime_type", { length: 120 })
      .notNull()
      .default("application/zip"),
    size: bigint("size", { mode: "number" }).notNull(),
    sha256: varchar("sha256", { length: 64 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("resource_files_resource_idx").on(table.resourceId),
    uniqueIndex("resource_files_storage_key_unique").on(table.storageKey),
  ],
);

export const resourcePreviews = pgTable(
  "resource_previews",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    resourceId: uuid("resource_id")
      .notNull()
      .references(() => resources.id, { onDelete: "cascade" }),
    imageUrl: text("image_url").notNull(),
    backupUrl: text("backup_url"),
    thumbUrl: text("thumb_url"),
    altText: varchar("alt_text", { length: 255 }),
    position: bigint("position", { mode: "number" }).notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("resource_previews_resource_idx").on(table.resourceId)],
);

export const resourcePermissions = pgTable(
  "resource_permissions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    resourceId: uuid("resource_id")
      .notNull()
      .references(() => resources.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    canDownload: boolean("can_download").notNull().default(true),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    grantedById: uuid("granted_by_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("resource_permissions_resource_user_unique").on(
      table.resourceId,
      table.userId,
    ),
    index("resource_permissions_user_idx").on(table.userId),
  ],
);

export const downloadAudits = pgTable(
  "download_audits",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    resourceId: uuid("resource_id")
      .notNull()
      .references(() => resources.id, { onDelete: "cascade" }),
    fileId: uuid("file_id")
      .notNull()
      .references(() => resourceFiles.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    ipAddress: varchar("ip_address", { length: 64 }),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("download_audits_resource_idx").on(table.resourceId),
    index("download_audits_created_at_idx").on(table.createdAt),
  ],
);
