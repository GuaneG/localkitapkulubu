import { expect, test } from "@playwright/test";
import { Pool } from "pg";

test("admin menu, bilingual live preview, persistent month list and empty-draft policy", async ({ browser, baseURL }, testInfo) => {
  test.skip(!process.env.TEST_DATABASE_URL, "Requires isolated acceptance database and disposable admin.");
  test.setTimeout(90_000);
  const context = await browser.newContext(); const page = await context.newPage();
  const marker = `EDITOR-${Date.now()}`;
  const pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL });
  try {
    await page.goto("/admin/giris");
    await page.getByLabel("E-posta").fill(process.env.ADMIN_EMAIL!);
    await page.getByLabel("Parola", { exact: true }).fill(process.env.ADMIN_PASSWORD!);
    await page.getByRole("button", { name: "Giriş yap", exact: true }).click();
    await expect(page).toHaveURL(`${baseURL}/admin`);
    await expect(page.getByRole("heading", { name: "Ana menü", exact: true })).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath("admin-menu.png"), fullPage: true });
    await page.getByRole("link", { name: "Ayın Kitabı’nı aç" }).click();

    for (const period of ["2032-04", "2032-05"]) {
      await page.getByLabel("Okuma ayı").fill(period);
      await page.getByRole("button", { name: "Ayı aç", exact: true }).click();
      await page.getByRole("textbox", { name: "Kitap adı — TR", exact: true }).fill(`${marker}-${period}-TR`);
      await page.getByRole("textbox", { name: "Şerit metni — TR", exact: true }).fill(`${marker}-${period}-TR şerit`);
      await expect(page.getByRole("region", { name: "İçerik önizlemesi" })).toContainText(`${marker}-${period}-TR`);
      await expect(page.getByRole("region", { name: "İçerik önizlemesi" })).toContainText(`${marker}-${period}-TR şerit`);
      await page.getByRole("tab", { name: "İngilizce", exact: true }).click();
      await page.getByRole("textbox", { name: "Kitap adı — EN", exact: true }).fill(`${marker}-${period}-EN`);
      await page.getByRole("textbox", { name: "Şerit metni — EN", exact: true }).fill(`${marker}-${period}-EN band`);
      await expect(page.getByRole("region", { name: "İçerik önizlemesi" })).toContainText(`${marker}-${period}-EN`);
      await expect(page.getByRole("region", { name: "İçerik önizlemesi" })).toContainText(`${marker}-${period}-EN band`);
      await page.getByRole("tab", { name: "Türkçe", exact: true }).click();
      await expect(page.getByRole("textbox", { name: "Kitap adı — TR", exact: true })).toHaveValue(`${marker}-${period}-TR`);
      await expect(page.getByRole("button", { name: "Yayın öncesi son kontrol", exact: true })).toBeDisabled();
      const saved = page.waitForResponse((r) => r.request().method() === "PUT" && r.url().endsWith(period));
      await page.getByRole("button", { name: "Taslağı kaydet", exact: true }).click();
      expect((await saved).status()).toBe(200);
      await expect(page.getByRole("status")).toContainText("kaydedildi");
    }
    await page.reload();
    for (const period of ["2032-04", "2032-05"]) {
      await page.getByRole("navigation", { name: "Kayıtlı taslaklar" }).getByRole("link").filter({ hasText: `${marker}-${period}-TR` }).click();
      await expect(page.getByRole("textbox", { name: "Kitap adı — TR", exact: true })).toHaveValue(`${marker}-${period}-TR`);
      await expect(page.getByRole("textbox", { name: "Şerit metni — TR", exact: true })).toHaveValue(`${marker}-${period}-TR şerit`);
      await page.getByRole("tab", { name: "İngilizce", exact: true }).click();
      await expect(page.getByRole("textbox", { name: "Kitap adı — EN", exact: true })).toHaveValue(`${marker}-${period}-EN`);
      await expect(page.getByRole("textbox", { name: "Şerit metni — EN", exact: true })).toHaveValue(`${marker}-${period}-EN band`);
      await page.getByRole("tab", { name: "Türkçe", exact: true }).click();
    }
    await page.getByRole("textbox", { name: "Kitap adı — TR", exact: true }).fill("Unsaved month text");
    page.once("dialog", (d) => d.dismiss());
    await page.getByRole("navigation", { name: "Kayıtlı taslaklar" }).getByRole("link").filter({ hasText: `${marker}-2032-04-TR` }).click();
    await expect(page).toHaveURL(/ay=2032-05/);
    await expect(page.getByRole("textbox", { name: "Kitap adı — TR", exact: true })).toHaveValue("Unsaved month text");
    page.once("dialog", (d) => d.accept());
    await page.getByRole("navigation", { name: "Kayıtlı taslaklar" }).getByRole("link").filter({ hasText: `${marker}-2032-04-TR` }).click();
    await expect(page).toHaveURL(/ay=2032-04/);
    await page.getByRole("button", { name: "Önizlemeyi büyüt", exact: true }).click();
    await expect(page.getByRole("button", { name: "Düzenlemeye dön", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Düzenlemeye dön", exact: true }).click();
    await page.screenshot({ path: testInfo.outputPath("admin-editor.png"), fullPage: true });

    await page.goto("/admin/ayin-kitabi?ay=2032-06");
    await page.getByRole("textbox", { name: "Kitap adı — TR", exact: true }).fill(" \n ");
    await page.getByRole("button", { name: "Taslağı kaydet", exact: true }).click();
    await expect(page.getByRole("main").getByRole("alert")).toContainText("en az bir");
    const blank = { expectedVersion: null, titleTr: "", titleEn: " ", author: "\t", bandTr: "\n", bandEn: "" };
    const denied = await context.request.put(`${baseURL}/api/admin/ayin-kitabi/2032-06`, { headers: { origin: baseURL! }, data: blank });
    expect(denied.status()).toBe(422);

    // A legacy all-empty row bypasses today's write parser only in the fixture.
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const book = await client.query("INSERT INTO book (title_tr,title_en,author) VALUES ('','','') RETURNING id");
      await client.query("INSERT INTO monthly_read_draft (period,book_id,band_tr,band_en) VALUES ('2032-07-01',$1,'','') ON CONFLICT (period) DO UPDATE SET book_id=EXCLUDED.book_id,band_tr='',band_en='',version=monthly_read_draft.version+1", [book.rows[0].id]);
      await client.query("COMMIT");
    } catch (e) { await client.query("ROLLBACK"); throw e; } finally { client.release(); }
    await page.goto("/admin/ayin-kitabi?ay=2032-07");
    await expect(page.getByText("Boş taslak", { exact: true }).first()).toBeVisible();
    await page.getByRole("textbox", { name: "Kitap adı — TR", exact: true }).fill(`${marker}-legacy-filled`);
    await page.getByRole("button", { name: "Taslağı kaydet", exact: true }).click();
    await expect(page.getByRole("status")).toContainText("kaydedildi");
    await page.reload();
    await expect(page.getByRole("textbox", { name: "Kitap adı — TR", exact: true })).toHaveValue(`${marker}-legacy-filled`);
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
    const anon = await browser.newContext();
    try {
      const list = await anon.request.get(`${baseURL}/api/admin/ayin-kitabi`);
      expect(list.status()).toBe(401); expect(await list.text()).not.toContain(marker);
      expect(list.headers()["cache-control"]).toContain("no-store");
    } finally { await anon.close(); }
  } finally { await context.close(); await pool.end(); }
});
