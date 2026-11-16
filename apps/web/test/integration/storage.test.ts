import assert from "node:assert/strict";
import { test } from "node:test";
import { testDatabaseUrl } from "../helpers/database";

test("PostgreSQL atomically saves drafts, rejects create/version races and rolls back partial changes", { skip: !process.env.TEST_DATABASE_URL }, async () => {
  testDatabaseUrl();
  const { Pool } = await import("pg");
  const { drizzle } = await import("drizzle-orm/node-postgres");
  const { migrateDatabase } = await import("../../src/server/db/migrate.ts");
  const { saveDraft, readDraft } = await import("../../src/server/monthly-read/repository.ts");
  const pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL });
  const db = drizzle(pool);
  try {
    await migrateDatabase(db);
    await pool.query("TRUNCATE monthly_read_draft, book CASCADE");
    const input = { expectedVersion: null, titleTr: "İlk", titleEn: "", author: "Yazar", bandTr: "A", bandEn: "" };
    const results = await Promise.allSettled([saveDraft(db, "2026-11", input), saveDraft(db, "2026-11", { ...input, bandTr: "B" })]);
    assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
    const rejected = results.find((r) => r.status === "rejected");
    assert.equal(rejected?.status === "rejected" && rejected.reason.status, 409);
    assert.equal((await pool.query("SELECT count(*) FROM book")).rows[0].count, "1");
    const saved = await readDraft(db, "2026-11");
    assert.equal(saved?.version, 1);
    const update = await saveDraft(db, "2026-11", { ...input, expectedVersion: 1, titleTr: "Yeni", bandTr: "Yeni metin" });
    assert.equal(update.version, 2);
    await assert.rejects(saveDraft(db, "2026-11", { ...input, expectedVersion: 1, titleTr: "Eski", bandTr: "Eski" }), { status: 409 });
    assert.equal((await readDraft(db, "2026-11"))?.titleTr, "Yeni");
    await saveDraft(db, "2026-12", input);
    assert.equal((await readDraft(db, "2026-12"))?.version, 1);
    assert.equal(await readDraft(db, "2027-01"), null);
    await pool.query("ALTER TABLE book ADD CONSTRAINT test_reject_title CHECK (title_tr <> 'REJECT')");
    try { await assert.rejects(saveDraft(db, "2026-11", { ...input, expectedVersion: 2, titleTr: "REJECT" })); }
    finally { await pool.query("ALTER TABLE book DROP CONSTRAINT test_reject_title"); }
    assert.deepEqual(await readDraft(db, "2026-11"), update);
    const second = new Pool({ connectionString: process.env.TEST_DATABASE_URL });
    try { assert.deepEqual(await readDraft(drizzle(second), "2026-11"), update); } finally { await second.end(); }
  } finally { await pool.end(); }
});

test("PostgreSQL publishes immutable revisions and keeps one period pointer", { skip: !process.env.TEST_DATABASE_URL }, async () => {
  testDatabaseUrl();
  const { Pool } = await import("pg");
  const { drizzle } = await import("drizzle-orm/node-postgres");
  const { migrateDatabase } = await import("../../src/server/db/migrate.ts");
  const { saveDraft, readDraft, publishDraft, readPublishedReferences, readPublishedRevision } = await import("../../src/server/monthly-read/repository.ts");
  const pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL, max: 8 });
  const db = drizzle(pool);
  try {
    await migrateDatabase(db);
    await pool.query("TRUNCATE monthly_read_publication, monthly_read_revision, monthly_read_draft, book CASCADE");
    const draft = { expectedVersion: null, titleTr: "Kitap A", titleEn: "Book A", author: "Yazar A", bandTr: "Şerit A", bandEn: "Band A" };
    const first = await saveDraft(db, "2026-11", draft);
    const [receiptA, repeatedA] = await Promise.all([
      publishDraft(db, "2026-11", { expectedVersion: first.version }),
      publishDraft(db, "2026-11", { expectedVersion: first.version }),
    ]);
    assert.deepEqual(repeatedA, receiptA);
    assert.equal((await pool.query("SELECT count(*) FROM monthly_read_revision")).rows[0].count, "1");
    assert.deepEqual(await readPublishedReferences(db, "2026-11"), [{ period: "2026-11", revisionId: receiptA.revisionId }]);

    const second = await saveDraft(db, "2026-11", { ...draft, expectedVersion: first.version, titleTr: "Kitap B", titleEn: "Book B", author: "Yazar B", bandTr: "Şerit B", bandEn: "Band B" });
    assert.equal(second.version, 2);
    assert.equal(second.publication?.revisionId, receiptA.revisionId);
    assert.deepEqual(await readPublishedRevision(db, receiptA.revisionId), {
      id: receiptA.revisionId, period: "2026-11", sourceVersion: 1,
      titleTr: "Kitap A", titleEn: "Book A", author: "Yazar A", bandTr: "Şerit A", bandEn: "Band A",
      publishedAt: receiptA.publishedAt,
    });
    await assert.rejects(publishDraft(db, "2026-11", { expectedVersion: 1 }), { status: 409 });
    const receiptB = await publishDraft(db, "2026-11", { expectedVersion: second.version });
    assert.notEqual(receiptB.revisionId, receiptA.revisionId);
    assert.deepEqual(await readPublishedReferences(db, "2026-11"), [{ period: "2026-11", revisionId: receiptB.revisionId }]);
    assert.equal((await readPublishedRevision(db, receiptA.revisionId))?.titleTr, "Kitap A");
    assert.equal((await readDraft(db, "2026-11"))?.titleTr, "Kitap B");
  } finally { await pool.end(); }
});

test("PostgreSQL rolls back a revision when its period pointer cannot be written", { skip: !process.env.TEST_DATABASE_URL }, async () => {
  testDatabaseUrl();
  const { Pool } = await import("pg");
  const { drizzle } = await import("drizzle-orm/node-postgres");
  const { migrateDatabase } = await import("../../src/server/db/migrate.ts");
  const { saveDraft, publishDraft } = await import("../../src/server/monthly-read/repository.ts");
  const pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL });
  const db = drizzle(pool);
  try {
    await migrateDatabase(db);
    await pool.query("TRUNCATE monthly_read_publication, monthly_read_revision, monthly_read_draft, book CASCADE");
    const draft = await saveDraft(db, "2026-11", { expectedVersion: null, titleTr: "A", titleEn: "A", author: "Y", bandTr: "T", bandEn: "E" });
    await pool.query("CREATE FUNCTION reject_monthly_read_publication() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'forced publication failure'; END $$");
    await pool.query("CREATE TRIGGER reject_monthly_read_publication BEFORE INSERT OR UPDATE ON monthly_read_publication FOR EACH ROW EXECUTE FUNCTION reject_monthly_read_publication()");
    try { await assert.rejects(publishDraft(db, "2026-11", { expectedVersion: draft.version }), (error: unknown) => error instanceof Error && error.cause instanceof Error && error.cause.message === "forced publication failure"); }
    finally {
      await pool.query("DROP TRIGGER reject_monthly_read_publication ON monthly_read_publication");
      await pool.query("DROP FUNCTION reject_monthly_read_publication()");
    }
    assert.equal((await pool.query("SELECT count(*) FROM monthly_read_revision")).rows[0].count, "0");
    assert.equal((await pool.query("SELECT count(*) FROM monthly_read_publication")).rows[0].count, "0");
  } finally { await pool.end(); }
});

test("PostgreSQL serializes save and publish according to the locked draft row", { skip: !process.env.TEST_DATABASE_URL }, async () => {
  testDatabaseUrl();
  const { Pool } = await import("pg");
  const { drizzle } = await import("drizzle-orm/node-postgres");
  const { migrateDatabase } = await import("../../src/server/db/migrate.ts");
  const { saveDraft, publishDraft, readDraft, readPublishedReferences, readPublishedRevision } = await import("../../src/server/monthly-read/repository.ts");
  const pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL, max: 8, application_name: "monthly-read-race-test" });
  const db = drizzle(pool);
  const initial = { expectedVersion: null, titleTr: "Kitap A", titleEn: "Book A", author: "Yazar A", bandTr: "Şerit A", bandEn: "Band A" };
  const updated = { ...initial, expectedVersion: 1, titleTr: "Kitap B", titleEn: "Book B", author: "Yazar B", bandTr: "Şerit B", bandEn: "Band B" };
  async function waitForLockWaiters(count: number) {
    const deadline = Date.now() + 5000;
    while (Date.now() < deadline) {
      const result = await pool.query(`SELECT count(*)::int AS count FROM pg_stat_activity
        WHERE application_name = 'monthly-read-race-test' AND wait_event_type = 'Lock' AND query ILIKE '%monthly_read_draft%'`);
      if (result.rows[0].count >= count) return;
      await new Promise<void>((resolve) => setImmediate(resolve));
    }
    assert.fail(`Timed out waiting for ${count} repository operation(s) to block on the draft row`);
  }
  async function race(first: "publish" | "save") {
    await pool.query("TRUNCATE monthly_read_publication, monthly_read_revision, monthly_read_draft, book CASCADE");
    await saveDraft(db, "2026-11", initial);
    const blocker = await pool.connect();
    try {
      await blocker.query("BEGIN");
      await blocker.query("SELECT id FROM monthly_read_draft WHERE period = DATE '2026-11-01' FOR UPDATE");
      const op = (kind: "publish" | "save") => kind === "publish"
        ? publishDraft(db, "2026-11", { expectedVersion: 1 })
        : saveDraft(db, "2026-11", updated);
      const firstResult = op(first);
      await waitForLockWaiters(1);
      const secondResult = op(first === "publish" ? "save" : "publish");
      await waitForLockWaiters(2);
      await blocker.query("COMMIT");
      const settled = await Promise.allSettled([firstResult, secondResult]);
      const values = settled.map((result) => result.status === "fulfilled" ? result.value : null);
      const saved = await readDraft(db, "2026-11");
      const refs = await readPublishedReferences(db, "2026-11");
      return { settled, values, saved, refs, readPublishedRevision };
    } finally {
      try { await blocker.query("ROLLBACK"); } catch { /* The blocker may already be committed. */ }
      blocker.release();
    }
  }
  try {
    await migrateDatabase(db);
    const publishFirst = await race("publish");
    assert.deepEqual(publishFirst.settled.map((result) => result.status), ["fulfilled", "fulfilled"]);
    assert.equal(publishFirst.saved?.titleTr, "Kitap B");
    assert.equal((await publishFirst.readPublishedRevision(db, publishFirst.refs[0].revisionId))?.titleTr, "Kitap A");

    const saveFirst = await race("save");
    assert.deepEqual(saveFirst.settled.map((result) => result.status), ["fulfilled", "rejected"]);
    const rejected = saveFirst.settled[1];
    assert.equal(rejected.status === "rejected" && rejected.reason.status, 409);
    assert.equal(saveFirst.saved?.version, 2);
    assert.equal(saveFirst.refs.length, 0);
  } finally { await pool.end(); }
});
