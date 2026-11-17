import { expect, test } from "@playwright/test";
import { Pool } from "pg";

test("admin has its own Turkish root and anonymous draft access is refused", async ({ page, request }) => {
  await page.goto("/admin/giris");
  await expect(page.locator("html")).toHaveAttribute("lang", "tr");
  await expect(page.getByRole("heading", { name: "Yönetici girişi" })).toBeVisible();
  await page.goto("/admin/ayin-kitabi?ay=2026-11");
  await expect(page).toHaveURL(/\/admin\/giris/);
  const response = await request.get("/api/admin/ayin-kitabi/2026-11");
  expect(response.status()).toBe(401);
  expect(response.headers()["cache-control"]).toContain("no-store");
  const deniedWrite = await request.put("/api/admin/ayin-kitabi/2026-11", { headers: { origin: new URL(page.url()).origin }, data: { expectedVersion: null, titleTr: "", titleEn: "", author: "", bandTr: "", bandEn: "" } });
  expect([401, 503]).toContain(deniedWrite.status());
  await page.goto("/admin/ayin-kitabi/onizleme?ay=2026-11&dil=en");
  await expect(page).toHaveURL(/\/admin\/giris/);
});

test("forged, expired and non-admin sessions cannot read, write or preview a draft", async ({ browser, baseURL }) => {
  test.skip(!process.env.TEST_DATABASE_URL, "Requires the isolated acceptance database.");
  const context = await browser.newContext(); const page = await context.newPage();
  const pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL });
  const input = { expectedVersion: null, titleTr: "", titleEn: "", author: "", bandTr: "", bandEn: "" };
  const otherId = `nonadmin-${Date.now()}`;
  async function login() {
    const response = await context.request.post(`${baseURL}/api/auth/sign-in/email`, { headers: { origin: baseURL! }, data: { email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD } });
    expect(response.status()).toBe(200);
    const cookie = (await context.cookies()).find((c) => c.name.endsWith(".session_token"))!;
    return decodeURIComponent(cookie.value).split(".")[0];
  }
  try {
    const forged = await context.request.get(`${baseURL}/api/admin/ayin-kitabi/2028-11`, { headers: { cookie: "better-auth.session_token=forged" } });
    expect(forged.status()).toBe(401);
    const forgedWrite = await context.request.put(`${baseURL}/api/admin/ayin-kitabi/2028-11`, { headers: { cookie: "better-auth.session_token=forged", origin: baseURL! }, data: input });
    expect(forgedWrite.status()).toBe(401);
    await context.addCookies([{ name: "better-auth.session_token", value: "forged", url: baseURL! }]);
    await page.goto(`${baseURL}/admin/ayin-kitabi/onizleme?ay=2028-11&dil=tr`); await expect(page).toHaveURL(/\/admin\/giris/);
    await context.clearCookies();
    const token = await login();
    await pool.query('UPDATE auth_session SET "expiresAt" = now() - interval \'1 second\' WHERE token = $1', [token]);
    expect((await context.request.get(`${baseURL}/api/admin/ayin-kitabi/2028-11`)).status()).toBe(401);
    expect((await context.request.get(`${baseURL}/api/admin/ayin-kitabi`)).status()).toBe(401);
    expect((await context.request.put(`${baseURL}/api/admin/ayin-kitabi/2028-11`, { headers: { origin: baseURL! }, data: input })).status()).toBe(401);
    await page.goto(`${baseURL}/admin/ayin-kitabi/onizleme?ay=2028-11&dil=tr`); await expect(page).toHaveURL(/\/admin\/giris/);
    const nextToken = await login();
    await pool.query('INSERT INTO auth_user (id, name, email, "emailVerified") VALUES ($1, $2, $3, true)', [otherId, "Non-admin", `${otherId}@example.com`]);
    await pool.query('UPDATE auth_session SET "userId" = $1 WHERE token = $2', [otherId, nextToken]);
    expect((await context.request.get(`${baseURL}/api/admin/ayin-kitabi/2028-11`)).status()).toBe(403);
    const deniedList = await context.request.get(`${baseURL}/api/admin/ayin-kitabi`);
    expect(deniedList.status()).toBe(403);
    expect(deniedList.headers()["cache-control"]).toContain("no-store");
    expect((await context.request.put(`${baseURL}/api/admin/ayin-kitabi/2028-11`, { headers: { origin: baseURL! }, data: input })).status()).toBe(403);
    await page.goto(`${baseURL}/admin/ayin-kitabi/onizleme?ay=2028-11&dil=tr`);
    await expect(page.getByRole("main").getByRole("alert")).toContainText("yönetici değil");
    await expect(page.getByRole("heading", { name: "Yayın öncesi son kontrol" })).toHaveCount(0);
  } finally { await pool.query("DELETE FROM auth_user WHERE id = $1", [otherId]); await pool.end(); await context.close(); }
});

test("two real admin sessions preserve the stale form; preview is saved-only and public stays isolated", async ({ browser, baseURL }) => {
  test.skip(!process.env.TEST_DATABASE_URL, "Requires a separate, migrated PostgreSQL acceptance database and bootstrapped test admin.");
  const first = await browser.newContext(); const second = await browser.newContext();
  const a = await first.newPage(); const b = await second.newPage();
  const email = process.env.ADMIN_EMAIL!; const password = process.env.ADMIN_PASSWORD!;
  async function signIn(page: typeof a) {
    await page.goto(`${baseURL}/admin/giris`);
    await page.getByLabel("E-posta").fill(email); await page.getByLabel("Parola", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Giriş yap", exact: true }).click();
    await expect(page).toHaveURL(/\/admin$/);
  }
  try {
    await signIn(a); await signIn(b);
    await a.goto(`${baseURL}/admin/ayin-kitabi?ay=2028-11`);
    await b.goto(`${baseURL}/admin/ayin-kitabi?ay=2028-11`);
    const persistedPool = new Pool({ connectionString: process.env.TEST_DATABASE_URL });
    try {
      const persisted = await persistedPool.query("SELECT band_tr FROM monthly_read_draft WHERE period = '2028-11-01'");
      if (persisted.rowCount) await expect(a.getByLabel("Şerit metni — TR")).toHaveValue(persisted.rows[0].band_tr);
    } finally { await persistedPool.end(); }
    const marker = `PRIVATE-DRAFT-${Date.now()}`;
    await a.getByLabel("Kitap adı — TR").fill("Taslak kitap");
    await a.getByLabel("Şerit metni — TR").fill(marker);
    await a.getByRole("tab", { name: "İngilizce", exact: true }).click();
    await a.getByLabel("Şerit metni — EN").fill("Saved English draft");
    await a.getByRole("tab", { name: "Türkçe", exact: true }).click();
    await a.getByRole("button", { name: "Taslağı kaydet", exact: true }).click();
    await expect(a.getByRole("status")).toContainText("kaydedildi");
    await b.getByLabel("Şerit metni — TR").fill("İkinci oturumun korunacak metni");
    await b.getByRole("button", { name: "Taslağı kaydet", exact: true }).click();
    await expect(b.getByRole("main").getByRole("alert")).toContainText("Metniniz korundu");
    await expect(b.getByLabel("Şerit metni — TR")).toHaveValue("İkinci oturumun korunacak metni");
    await expect(b.getByText(marker, { exact: true })).toBeVisible();
    b.once("dialog", (dialog) => dialog.dismiss());
    await b.getByRole("button", { name: "Son kaydı yükle", exact: true }).click();
    await expect(b.getByLabel("Şerit metni — TR")).toHaveValue("İkinci oturumun korunacak metni");
    b.once("dialog", (dialog) => dialog.accept());
    await b.getByRole("button", { name: "Son kaydı yükle", exact: true }).click();
    await expect(b.getByLabel("Şerit metni — TR")).toHaveValue(marker);
    await b.getByLabel("Şerit metni — TR").fill("Unsaved secret");
    await expect(b.getByRole("button", { name: "Yayın öncesi son kontrol", exact: true })).toBeDisabled();
    await expect(b.getByText(/Son kontrolden önce/)).toBeVisible();
    await b.route("**/api/admin/ayin-kitabi/*", (route) => route.request().method() === "PUT" ? route.abort("connectionfailed") : route.continue());
    await b.getByRole("button", { name: "Taslağı kaydet", exact: true }).click();
    await expect(b.getByRole("main").getByRole("alert")).toContainText("Metniniz korundu");
    await expect(b.getByLabel("Şerit metni — TR")).toHaveValue("Unsaved secret");
    await b.getByLabel("Okuma ayı").fill("2028-12");
    b.once("dialog", (dialog) => dialog.dismiss());
    await b.getByRole("button", { name: "Ayı aç", exact: true }).click();
    await expect(b).toHaveURL(/ay=2028-11$/);
    await expect(b.getByLabel("Şerit metni — TR")).toHaveValue("Unsaved secret");
    await b.unroute("**/api/admin/ayin-kitabi/*");
    const pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL });
    try {
      const cookie = (await second.cookies()).find((c) => c.name.endsWith(".session_token"))!;
      await pool.query('UPDATE auth_session SET "expiresAt" = now() - interval \'1 second\' WHERE token = $1', [decodeURIComponent(cookie.value).split(".")[0]]);
    } finally { await pool.end(); }
    await b.getByRole("button", { name: "Taslağı kaydet", exact: true }).click();
    await expect(b.getByRole("main").getByRole("alert")).toContainText("Oturumunuz sona erdi");
    await expect(b.getByLabel("Şerit metni — TR")).toHaveValue("Unsaved secret");
    const reauth = await second.newPage(); await signIn(reauth); await reauth.close();
    const preview = await first.newPage();
    const response = await preview.goto(`${baseURL}/admin/ayin-kitabi/onizleme?ay=2028-11&dil=tr`);
    expect(response?.headers()["cache-control"]).toContain("no-store");
    await expect(preview.getByText(marker, { exact: true })).toBeVisible();
    await expect(preview.getByText("Unsaved secret", { exact: true })).toHaveCount(0);
    await preview.goto(`${baseURL}/admin/ayin-kitabi/onizleme?ay=2028-11&dil=en`);
    await expect(preview.getByText("Saved English draft", { exact: true })).toBeVisible();
    const publicResponse = await first.request.get(`${baseURL}/tr`);
    expect(await publicResponse.text()).not.toContain(marker);
    const rsc = await first.request.get(`${baseURL}/en?_rsc=privacy`, { headers: { RSC: "1" } });
    expect(await rsc.text()).not.toContain(marker);
    await a.reload(); await expect(a.getByLabel("Şerit metni — TR")).toHaveValue(marker);
    await a.getByRole("button", { name: "Çıkış yap", exact: true }).click();
    await expect(a).toHaveURL(/\/admin\/giris/);
    expect((await first.request.get(`${baseURL}/api/admin/ayin-kitabi/2028-11`)).status()).toBe(401);
    expect((await second.request.get(`${baseURL}/api/admin/ayin-kitabi/2028-11`)).status()).toBe(200);
  } finally { await first.close(); await second.close(); }
});
