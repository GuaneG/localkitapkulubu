import { expect, test, type BrowserContext } from "@playwright/test";
import { Pool } from "pg";
import { seedPastReads } from "./helpers/published-fixtures";

test.describe.configure({ mode: "serial" });
test.beforeAll(seedPastReads);

test("an unpublished current month shows a placeholder while published future months stay hidden", async ({ browser, baseURL }) => {
  test.skip(!process.env.TEST_DATABASE_URL, "Requires the isolated acceptance database.");
  const parts = new Intl.DateTimeFormat("en", { timeZone: "Europe/Istanbul", year: "numeric", month: "2-digit" }).formatToParts(new Date());
  const period = `${parts.find((p) => p.type === "year")!.value}-${parts.find((p) => p.type === "month")!.value}-01`;
  const pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL });
  const admin = await browser.newContext(), anon = await browser.newContext();
  const previous = (await pool.query("SELECT revision_id FROM monthly_read_publication WHERE period = $1", [period])).rows[0];
  try {
    const headers = { origin: baseURL! };
    expect((await admin.request.post(`${baseURL}/api/auth/sign-in/email`, { headers, data: { email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD } })).status()).toBe(200);
    const endpoint = `${baseURL}/api/admin/ayin-kitabi/2091-01`;
    const current = await (await admin.request.get(endpoint)).json();
    const saved = await admin.request.put(endpoint, { headers, data: { titleTr: "FUTURE-PUBLISHED-TR", titleEn: "FUTURE-PUBLISHED-EN", author: "Future author", bandTr: "FUTURE-BAND-TR", bandEn: "FUTURE-BAND-EN", expectedVersion: current?.version ?? null } });
    expect(saved.status()).toBe(200);
    expect((await admin.request.post(`${endpoint}/yayin`, { headers, data: { expectedVersion: (await saved.json()).version } })).status()).toBe(200);
    await pool.query("DELETE FROM monthly_read_publication WHERE period = $1", [period]);
    for (const [locale, message] of [["tr", "Bu ayın kitabı henüz açıklanmadı."], ["en", "This month's book has not been announced yet."]]) {
      const page = await anon.newPage(); const response = await page.goto(`${baseURL}/${locale}`);
      await expect(page.locator(".read-band")).toContainText(message);
      await expect(page.locator(".read-band .book-cover")).toHaveCount(0);
      await expect(page.locator(".shelf-book")).not.toHaveCount(0);
      expect(await response!.text()).not.toContain("FUTURE-PUBLISHED");
      expect(await response!.text()).not.toContain("FUTURE-BAND");
      await page.close();
    }
  } finally {
    if (previous) await pool.query("INSERT INTO monthly_read_publication (period, revision_id) VALUES ($1, $2) ON CONFLICT (period) DO UPDATE SET revision_id = EXCLUDED.revision_id", [period, previous.revision_id]);
    await pool.end(); await admin.close(); await anon.close();
  }
});

test("publication checks admin/origin, bilingual fields and the previewed saved version", async ({ browser, request, baseURL }) => {
  test.skip(!process.env.TEST_DATABASE_URL, "Requires the isolated acceptance database.");
  const endpoint = "/api/admin/ayin-kitabi/2090-01";
  const headers = { origin: baseURL! };
  expect((await request.post(`${endpoint}/yayin`, { headers, data: { expectedVersion: 1 } })).status()).toBe(401);
  const admin = await browser.newContext();
  try {
    expect((await admin.request.post(`${baseURL}/api/auth/sign-in/email`, { headers, data: { email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD } })).status()).toBe(200);
    expect((await admin.request.post(`${baseURL}${endpoint}/yayin`, { headers: { origin: "https://untrusted.example" }, data: { expectedVersion: 1 } })).status()).toBe(403);
    const initial = await (await admin.request.get(`${baseURL}${endpoint}`)).json();
    const incomplete = { titleTr: "Türkçe", titleEn: "", author: "Yazar", bandTr: "Türkçe şerit", bandEn: " " };
    const saved = await (await admin.request.put(`${baseURL}${endpoint}`, { headers, data: { ...incomplete, expectedVersion: initial?.version ?? null } })).json();
    const blocked = await admin.request.post(`${baseURL}${endpoint}/yayin`, { headers, data: { expectedVersion: saved.version } });
    expect(blocked.status()).toBe(422); expect(blocked.headers()["cache-control"]).toContain("no-store");
    const page = await admin.newPage();
    await page.goto(`${baseURL}/admin/ayin-kitabi/onizleme?ay=2090-01`);
    await expect(page.getByRole("button", { name: "Yayınla", exact: true })).toBeDisabled();
    const complete = { ...incomplete, titleEn: "English", bandEn: "English band" };
    const next = await (await admin.request.put(`${baseURL}${endpoint}`, { headers, data: { ...complete, expectedVersion: saved.version } })).json();
    await page.reload(); await expect(page.getByRole("button", { name: "Yayınla", exact: true })).toBeEnabled();
    expect((await admin.request.put(`${baseURL}${endpoint}`, { headers, data: { ...complete, bandTr: "Yeni kayıt", expectedVersion: next.version } })).status()).toBe(200);
    await page.getByRole("button", { name: "Yayınla", exact: true }).click();
    await expect(page.getByRole("main").getByRole("alert")).toContainText("başka bir oturumda değişti");
    expect((await admin.request.post(`${baseURL}${endpoint}/yayin`, { headers, data: { expectedVersion: next.version, titleTr: "forged" } })).status()).toBe(400);
  } finally { await admin.close(); }
});

test("saved B survives reload while anonymous TR/EN keep A until B is published", async ({ browser, baseURL }, testInfo) => {
  test.skip(!process.env.TEST_DATABASE_URL, "Requires the separate publication acceptance database and test admin.");
  test.setTimeout(120_000);
  const parts = new Intl.DateTimeFormat("en", { timeZone: "Europe/Istanbul", year: "numeric", month: "2-digit" }).formatToParts(new Date());
  const period = `${parts.find((p) => p.type === "year")!.value}-${parts.find((p) => p.type === "month")!.value}`;
  const marker = `PUBLICATION-${Date.now()}`;
  const pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL });
  const admin = await browser.newContext();
  const page = await admin.newPage();
  const api = `/api/admin/ayin-kitabi/${period}`;
  const preview = `/admin/ayin-kitabi/onizleme?ay=${period}&dil=tr`;
  let previewStyle: { transform: string; spine: string };
  const fields = (name: string) => ({ titleTr: `${marker} ${name} TR title`, titleEn: `${marker} ${name} EN title`, author: `${marker} ${name} author`, bandTr: `${marker} ${name} TR band`, bandEn: `${marker} ${name} EN band` });
  async function fill(values: ReturnType<typeof fields>) {
    for (const [label, value] of [["Kitap adı — TR", values.titleTr], ["Kitap adı — EN", values.titleEn], ["Yazar", values.author], ["Şerit metni — TR", values.bandTr], ["Şerit metni — EN", values.bandEn]]) await page.getByRole("textbox", { name: label, exact: true }).fill(value);
    const saved = page.waitForResponse((r) => r.url().endsWith(api) && r.request().method() === "PUT");
    await page.getByRole("button", { name: "Taslağı kaydet", exact: true }).click();
    const response = await saved; expect(response.status()).toBe(200);
    await expect(page.getByRole("status")).toContainText("kaydedildi");
    return response.json();
  }
  async function publicVersion(values: ReturnType<typeof fields>, absent: string) {
    const anon: BrowserContext = await browser.newContext();
    try {
      expect(await anon.cookies()).toEqual([]);
      for (const locale of ["tr", "en"] as const) {
        const visitor = await anon.newPage();
        const response = await visitor.goto(`${baseURL}/${locale}`);
        expect(response?.status()).toBe(200);
        expect(response?.headers()["cache-control"]).toContain("no-store");
        await expect(visitor.locator(".read-band")).toContainText(locale === "tr" ? values.bandTr : values.bandEn);
        await expect(visitor.locator(".read-band")).toContainText(locale === "tr" ? values.titleTr : values.titleEn);
        const publicStyle = await visitor.locator(".read-band .book-cover").locator("..").evaluate((element) => ({ transform: getComputedStyle(element).transform, spine: getComputedStyle(element, "::before").content }));
        expect(publicStyle).toEqual(previewStyle);
        expect(await response!.text()).not.toContain(absent);
        const rsc = await anon.request.get(`${baseURL}/${locale}?_rsc=publication`, { headers: { RSC: "1" } });
        expect(rsc.status()).toBe(200);
        expect(rsc.headers()["content-type"]).toContain("text/x-component");
        expect(rsc.headers()["cache-control"]).toContain("no-store");
        const payload = await rsc.text();
        expect(payload).toContain(locale === "tr" ? values.bandTr : values.bandEn);
        expect(payload).not.toContain(absent);
        await visitor.close();
      }
    } finally { await anon.close(); }
  }
  try {
    const login = await admin.request.post(`${baseURL}/api/auth/sign-in/email`, { headers: { origin: baseURL! }, data: { email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD } });
    expect(login.status()).toBe(200);
    await page.goto(`${baseURL}/admin/ayin-kitabi?ay=${period}`);
    const a = fields("A"); const b = fields("B");
    const savedA = await fill(a);
    await page.goto(`${baseURL}${preview}`);
    await expect(page.getByRole("heading", { name: "Read of the month", exact: true })).toBeVisible();
    previewStyle = await page.locator(".read-band .book-cover").locator("..").evaluate((element) => ({ transform: getComputedStyle(element).transform, spine: getComputedStyle(element, "::before").content }));
    const publishA = page.waitForResponse((r) => r.url().endsWith(`${api}/yayin`) && r.request().method() === "POST");
    await page.getByRole("button", { name: "Yayınla", exact: true }).click();
    const publishedA = await publishA; expect(publishedA.status()).toBe(200);
    const receiptA = await publishedA.json();
    await expect(page.getByRole("status")).toContainText("Yayınlandı");
    await publicVersion(a, `${marker} B`);

    await page.goto(`${baseURL}/admin/ayin-kitabi?ay=${period}`);
    const savedB = await fill(b);
    await page.reload();
    for (const [label, value] of [["Kitap adı — TR", b.titleTr], ["Kitap adı — EN", b.titleEn], ["Yazar", b.author], ["Şerit metni — TR", b.bandTr], ["Şerit metni — EN", b.bandEn]]) await expect(page.getByRole("textbox", { name: label, exact: true })).toHaveValue(value);
    await expect(page.getByText(new RegExp(`Sürüm ${savedB.version} · Son kayıt`))).toBeVisible();
    const persisted = await admin.request.get(`${baseURL}${api}`); expect((await persisted.json()).version).toBe(savedB.version);
    for (const locale of ["tr", "en"] as const) {
      await page.goto(`${baseURL}/admin/ayin-kitabi/onizleme?ay=${period}&dil=${locale}`);
      await expect(page.locator(".read-band")).toContainText(locale === "tr" ? b.bandTr : b.bandEn);
    }
    await publicVersion(a, `${marker} B`);
    const stale = await admin.request.post(`${baseURL}${api}/yayin`, { headers: { origin: baseURL! }, data: { expectedVersion: savedA.version } });
    expect(stale.status()).toBe(409);

    // Let the real request commit, then drop only its response to the browser.
    let receiptB: { revisionId: string; sourceVersion: number } | undefined;
    await page.route(`**${api}/yayin`, async (route) => {
      const response = await route.fetch(); expect(response.status()).toBe(200);
      receiptB = await response.json(); await route.abort("connectionfailed");
    });
    await page.getByRole("button", { name: "Yayınla", exact: true }).click();
    await expect(page.getByRole("main").getByRole("alert")).toContainText("Sonuç doğrulanamadı");
    await page.unroute(`**${api}/yayin`);
    await publicVersion(b, `${marker} A`);
    await page.reload();
    await expect(page.getByText(`Son yayın · Sürüm ${savedB.version}`, { exact: false })).toBeVisible();
    const repeated = await Promise.all([0, 1].map(() => admin.request.post(`${baseURL}${api}/yayin`, { headers: { origin: baseURL! }, data: { expectedVersion: savedB.version } })));
    for (const response of repeated) { expect(response.status()).toBe(200); expect((await response.json()).revisionId).toBe(receiptB?.revisionId); }
    expect(receiptB?.revisionId).not.toBe(receiptA.revisionId);
    expect((await pool.query("SELECT count(*)::int AS count FROM monthly_read_revision WHERE period = $1 AND source_version = $2", [`${period}-01`, savedB.version])).rows[0].count).toBe(1);
    const oldRetry = await admin.request.post(`${baseURL}${api}/yayin`, { headers: { origin: baseURL! }, data: { expectedVersion: savedA.version } }); expect(oldRetry.status()).toBe(409);
    await publicVersion(b, `${marker} A`);
    await page.screenshot({ path: testInfo.outputPath("published-preview.png"), fullPage: true });
  } finally { await page.close(); await admin.close(); await pool.end(); }
});
