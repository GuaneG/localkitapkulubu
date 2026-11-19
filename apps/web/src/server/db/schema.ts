import { sql } from "drizzle-orm";
import { boolean, check, date, foreignKey, index, integer, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";

export const user = pgTable("auth_user", {
  id: text().primaryKey(), name: text().notNull(), email: text().notNull().unique(), emailVerified: boolean().notNull().default(false), image: text(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(), updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});
export const session = pgTable("auth_session", {
  id: text().primaryKey(), token: text().notNull().unique(), userId: text().notNull().references(() => user.id, { onDelete: "cascade" }),
  expiresAt: timestamp({ withTimezone: true }).notNull(), createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(), updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(), ipAddress: text(), userAgent: text(),
}, (t) => [index("session_user_idx").on(t.userId)]);
export const account = pgTable("auth_account", {
  id: text().primaryKey(), accountId: text().notNull(), providerId: text().notNull(), userId: text().notNull().references(() => user.id, { onDelete: "cascade" }),
  password: text(), accessToken: text(), refreshToken: text(), idToken: text(), scope: text(), accessTokenExpiresAt: timestamp({ withTimezone: true }), refreshTokenExpiresAt: timestamp({ withTimezone: true }),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(), updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("account_user_idx").on(t.userId)]);
export const verification = pgTable("auth_verification", {
  id: text().primaryKey(), identifier: text().notNull(), value: text().notNull(), expiresAt: timestamp({ withTimezone: true }).notNull(), createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(), updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});
export const siteAdmin = pgTable("site_admin", {
  singleton: integer().primaryKey().default(1), userId: text().notNull().unique().references(() => user.id, { onDelete: "restrict" }),
}, (t) => [check("single_admin", sql`${t.singleton} = 1`)]);
export const book = pgTable("book", {
  id: uuid().primaryKey().defaultRandom(), titleTr: text("title_tr").notNull(), titleEn: text("title_en").notNull(), author: text().notNull(),
});
export const monthlyReadDraft = pgTable("monthly_read_draft", {
  id: uuid().primaryKey().defaultRandom(), period: date().notNull().unique(), bookId: uuid("book_id").notNull().references(() => book.id, { onDelete: "restrict" }),
  bandTr: text("band_tr").notNull(), bandEn: text("band_en").notNull(), readingNumber: integer("reading_number"), version: integer().notNull().default(1), updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [check("period_first_day", sql`extract(day from ${t.period}) = 1`), check("positive_version", sql`${t.version} > 0`), check("monthly_read_draft_reading_number_positive", sql`${t.readingNumber} IS NULL OR ${t.readingNumber} > 0`)]);
export const monthlyReadRevision = pgTable("monthly_read_revision", {
  id: uuid().primaryKey().defaultRandom(), draftId: uuid("draft_id").notNull().references(() => monthlyReadDraft.id, { onDelete: "restrict" }), period: date().notNull(),
  sourceVersion: integer("source_version").notNull(), titleTr: text("title_tr").notNull(), titleEn: text("title_en").notNull(), author: text().notNull(),
  bandTr: text("band_tr").notNull(), bandEn: text("band_en").notNull(), readingNumber: integer("reading_number"), publishedAt: timestamp("published_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  unique("monthly_read_revision_draft_source_unique").on(t.draftId, t.sourceVersion),
  unique("monthly_read_revision_period_id_unique").on(t.period, t.id),
  check("monthly_read_revision_period_first_day", sql`extract(day from ${t.period}) = 1`),
  check("monthly_read_revision_positive_source_version", sql`${t.sourceVersion} > 0`),
  check("monthly_read_revision_reading_number_positive", sql`${t.readingNumber} IS NULL OR ${t.readingNumber} > 0`),
]);
export const monthlyReadPublication = pgTable("monthly_read_publication", {
  period: date().primaryKey(), revisionId: uuid("revision_id").notNull(),
}, (t) => [
  check("monthly_read_publication_period_first_day", sql`extract(day from ${t.period}) = 1`),
  foreignKey({ name: "monthly_read_publication_revision_period_fk", columns: [t.period, t.revisionId], foreignColumns: [monthlyReadRevision.period, monthlyReadRevision.id] }),
]);
export const loginFailure = pgTable("login_failure", {
  id: uuid().primaryKey().defaultRandom(), key: text().notNull(), failedAt: timestamp("failed_at", { withTimezone: true }).notNull(),
}, (t) => [index("login_failure_window_idx").on(t.key, t.failedAt)]);
