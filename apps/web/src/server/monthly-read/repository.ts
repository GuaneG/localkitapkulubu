import "server-only";
import { and, desc, eq, lte, sql } from "drizzle-orm";
import type { Database } from "../db/client";
import { book, monthlyReadDraft, monthlyReadPublication, monthlyReadRevision } from "../db/schema";
import { HttpError, parseDraftInput, parsePeriod, parsePublishInput, publicationIssues, type Draft, type DraftFields, type DraftInput, type PublicationReceipt, type PublishedRevision, type PublishInput } from "./contracts";

export async function readDraft(db: Database, period: string): Promise<Draft | null> {
  const [row] = await db.select({
    period: monthlyReadDraft.period, titleTr: book.titleTr, titleEn: book.titleEn, author: book.author,
    bandTr: monthlyReadDraft.bandTr, bandEn: monthlyReadDraft.bandEn, version: monthlyReadDraft.version, updatedAt: monthlyReadDraft.updatedAt,
    revisionId: monthlyReadRevision.id, sourceVersion: monthlyReadRevision.sourceVersion, publishedAt: monthlyReadRevision.publishedAt,
  }).from(monthlyReadDraft)
    .innerJoin(book, eq(book.id, monthlyReadDraft.bookId))
    .leftJoin(monthlyReadPublication, eq(monthlyReadPublication.period, monthlyReadDraft.period))
    .leftJoin(monthlyReadRevision, and(eq(monthlyReadRevision.id, monthlyReadPublication.revisionId), eq(monthlyReadRevision.period, monthlyReadPublication.period)))
    .where(eq(monthlyReadDraft.period, parsePeriod(period)));
  return row ? {
    titleTr: row.titleTr, titleEn: row.titleEn, author: row.author, bandTr: row.bandTr, bandEn: row.bandEn,
    period: row.period.slice(0, 7), version: row.version, updatedAt: row.updatedAt.toISOString(),
    publication: row.revisionId && row.sourceVersion !== null && row.publishedAt ? {
      revisionId: row.revisionId, sourceVersion: row.sourceVersion, publishedAt: row.publishedAt.toISOString(),
    } : null,
  } : null;
}

export async function saveDraft(db: Database, period: string, value: DraftInput): Promise<Draft> {
  const input = parseDraftInput(value);
  const month = parsePeriod(period);
  return db.transaction(async (tx) => {
    const titles = { titleTr: input.titleTr, titleEn: input.titleEn, author: input.author };
    if (input.expectedVersion === null) {
      const [createdBook] = await tx.insert(book).values(titles).returning({ id: book.id });
      const [created] = await tx.insert(monthlyReadDraft).values({ period: month, bookId: createdBook.id, bandTr: input.bandTr, bandEn: input.bandEn }).onConflictDoNothing({ target: monthlyReadDraft.period }).returning();
      if (!created) throw new HttpError(409, "Bu ay başka bir oturumda kaydedildi. Metniniz korundu.");
    } else {
      const [locked] = await tx.select({ id: monthlyReadDraft.id, version: monthlyReadDraft.version }).from(monthlyReadDraft)
        .where(eq(monthlyReadDraft.period, month)).for("update");
      if (!locked || locked.version !== input.expectedVersion) throw new HttpError(409, "Taslak başka bir oturumda değişti. Metniniz korundu.");
      const [updated] = await tx.update(monthlyReadDraft).set({ bandTr: input.bandTr, bandEn: input.bandEn, version: sql`${monthlyReadDraft.version} + 1`, updatedAt: new Date() })
        .where(eq(monthlyReadDraft.id, locked.id)).returning({ bookId: monthlyReadDraft.bookId });
      if (!updated) throw new Error("Locked draft disappeared");
      await tx.update(book).set(titles).where(eq(book.id, updated.bookId));
    }
    const saved = await readDraft(tx as unknown as Database, period);
    if (!saved) throw new Error("Saved draft missing");
    return saved;
  });
}

export async function readPublishedReferences(db: Database, currentPeriod: string): Promise<Array<{ period: string; revisionId: string }>> {
  const rows = await db.select({ period: monthlyReadPublication.period, revisionId: monthlyReadPublication.revisionId })
    .from(monthlyReadPublication).where(lte(monthlyReadPublication.period, parsePeriod(currentPeriod))).orderBy(desc(monthlyReadPublication.period));
  return rows.map((row) => ({ period: row.period.slice(0, 7), revisionId: row.revisionId }));
}

export async function readPublishedRevision(db: Database, revisionId: string): Promise<PublishedRevision | null> {
  const [row] = await db.select().from(monthlyReadRevision).where(eq(monthlyReadRevision.id, revisionId));
  return row ? {
    id: row.id, period: row.period.slice(0, 7), sourceVersion: row.sourceVersion,
    titleTr: row.titleTr, titleEn: row.titleEn, author: row.author, bandTr: row.bandTr, bandEn: row.bandEn,
    publishedAt: row.publishedAt.toISOString(),
  } : null;
}

export async function publishDraft(db: Database, period: string, value: PublishInput): Promise<PublicationReceipt> {
  const input = parsePublishInput(value);
  const month = parsePeriod(period);
  return db.transaction(async (tx) => {
    const [locked] = await tx.select({ id: monthlyReadDraft.id, version: monthlyReadDraft.version }).from(monthlyReadDraft)
      .where(eq(monthlyReadDraft.period, month)).for("update");
    if (!locked) throw new HttpError(422, "Bu ay için kaydedilmiş bir taslak yok.");
    if (locked.version !== input.expectedVersion) throw new HttpError(409, "Taslak başka bir oturumda değişti. Yeniden yükleyip önizleyin.");

    const [fields] = await tx.select({ titleTr: book.titleTr, titleEn: book.titleEn, author: book.author, bandTr: monthlyReadDraft.bandTr, bandEn: monthlyReadDraft.bandEn })
      .from(monthlyReadDraft).innerJoin(book, eq(book.id, monthlyReadDraft.bookId)).where(eq(monthlyReadDraft.id, locked.id));
    if (!fields) throw new Error("Locked draft fields missing");
    const issues = publicationIssues(fields as DraftFields);
    if (issues.length) throw new HttpError(422, "Yayın için Türkçe ve İngilizce başlık, yazar ve şerit metni gereklidir.");

    const [existing] = await tx.select({ id: monthlyReadRevision.id, sourceVersion: monthlyReadRevision.sourceVersion, publishedAt: monthlyReadRevision.publishedAt })
      .from(monthlyReadRevision).where(and(eq(monthlyReadRevision.draftId, locked.id), eq(monthlyReadRevision.sourceVersion, locked.version)));
    if (existing) return { revisionId: existing.id, sourceVersion: existing.sourceVersion, publishedAt: existing.publishedAt.toISOString() };

    const [revision] = await tx.insert(monthlyReadRevision).values({ draftId: locked.id, period: month, sourceVersion: locked.version, ...fields })
      .returning({ id: monthlyReadRevision.id, sourceVersion: monthlyReadRevision.sourceVersion, publishedAt: monthlyReadRevision.publishedAt });
    if (!revision) throw new Error("Published revision missing after insert");
    await tx.insert(monthlyReadPublication).values({ period: month, revisionId: revision.id })
      .onConflictDoUpdate({ target: monthlyReadPublication.period, set: { revisionId: revision.id } });
    return { revisionId: revision.id, sourceVersion: revision.sourceVersion, publishedAt: revision.publishedAt.toISOString() };
  });
}
