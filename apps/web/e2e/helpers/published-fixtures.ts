import { randomUUID } from "node:crypto";
import { Pool } from "pg";

// Historical fixtures only; the publication acceptance owns the current month.
export async function seedPastReads() {
  if (!process.env.TEST_DATABASE_URL) return;
  const pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(561191116)");
    for (let i = 1; i <= 12; i++) {
      const period = `2000-${String(i).padStart(2, "0")}-01`;
      if ((await client.query("SELECT period FROM monthly_read_publication WHERE period = $1", [period])).rowCount) continue;
      const book = randomUUID(), draft = randomUUID(), revision = randomUUID();
      await client.query("INSERT INTO book (id, title_tr, title_en, author) VALUES ($1, $2, $2, 'Fixture author')", [book, `Shelf fixture ${i}`]);
      await client.query("INSERT INTO monthly_read_draft (id, period, book_id, band_tr, band_en) VALUES ($1, $2, $3, 'Past TR', 'Past EN')", [draft, period, book]);
      await client.query("INSERT INTO monthly_read_revision (id, draft_id, period, source_version, title_tr, title_en, author, band_tr, band_en) VALUES ($1, $2, $3, 1, $4, $4, 'Fixture author', 'Past TR', 'Past EN')", [revision, draft, period, `Shelf fixture ${i}`]);
      await client.query("INSERT INTO monthly_read_publication (period, revision_id) VALUES ($1, $2)", [period, revision]);
    }
    await client.query("COMMIT");
  } catch (error) { await client.query("ROLLBACK"); throw error; }
  finally { client.release(); await pool.end(); }
}
