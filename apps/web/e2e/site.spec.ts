import { expect, test } from "@playwright/test";

test("first visit is English, chosen language is remembered, explicit URLs win", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/en$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await page.getByRole("link", { name: "About", exact: true }).first().click();
  await expect(page).toHaveURL(/\/en\/about$/);
  await expect(page.getByRole("heading", { name: "About us" })).toBeVisible();
  await page.getByRole("link", { name: "Türkçeye geç" }).click();
  await expect(page).toHaveURL(/\/tr\/hakkimizda$/);
  await expect(page.getByRole("heading", { name: "Hakkımızda" })).toBeVisible();
  await page.goto("/");
  await expect(page).toHaveURL(/\/tr$/);
  await page.goto("/en/contact");
  await expect(page.getByRole("heading", { name: "Contact", exact: true })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
});

test("home is server-rendered, covers are static and the shelf scrolls", async ({ page, request }) => {
  const response = await request.get("/tr");
  expect(response.ok()).toBeTruthy();
  expect(await response.text()).toContain("Birlikte okuduklarımız");
  await page.goto("/tr");
  await expect(page.getByRole("heading", { name: "Read of the month #38" })).toBeVisible();
  await expect(page.locator(".read-band a, .shelf-book a, .shelf-book button")).toHaveCount(0);
  const track = page.locator(".shelf-track");
  await page.getByRole("button", { name: "Daha önce okunan kitapları göster" }).click();
  await expect.poll(() => track.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
  await expect(page.getByRole("button", { name: "Daha yeni okunan kitapları göster" })).toBeFocused();
  await page.getByRole("button", { name: "Daha yeni okunan kitapları göster" }).click();
  await expect.poll(() => track.evaluate((element) => element.scrollLeft)).toBe(0);
  await expect(page.getByRole("button", { name: "Daha önce okunan kitapları göster" })).toBeFocused();
});

test("gallery opens a reloadable album and accessible keyboard lightbox", async ({ page }) => {
  await page.goto("/tr/galeri");
  await page.getByRole("link", { name: "Albümü aç 1" }).click();
  await expect(page).toHaveURL(/\/tr\/galeri\/1$/);
  await page.reload();
  const opener = page.getByRole("button", { name: "Fotoğrafı büyüt 1", exact: true });
  await opener.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await page.keyboard.press("ArrowRight");
  await expect(dialog.getByRole("img")).toHaveAttribute("alt", /2$/);
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(opener).toBeFocused();
  await page.getByRole("link", { name: "Switch to English" }).click();
  await expect(page).toHaveURL(/\/en\/gallery\/1$/);
  await expect(page.getByRole("link", { name: "Back to albums" })).toBeVisible();
});

test("forms are honest previews and never submit personal data", async ({ page }) => {
  const submissions: string[] = [];
  page.on("request", (request) => {
    if (request.postData()?.includes("reader@example.com") || request.url().includes("reader%40")) submissions.push(request.url());
  });
  await page.goto("/tr");
  await expect(page.getByRole("status")).toContainText("Önizleme");
  await page.getByLabel("E-posta", { exact: true }).fill("reader@example.com");
  await page.getByRole("button", { name: "Abone ol", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("e-posta gönderilmedi");
  await page.goto("/tr/iletisim");
  await expect(page.getByRole("status")).toContainText("Önizleme");
  await expect(page.getByLabel(/ad.?soyad/i)).toHaveCount(0);
  await page.getByLabel("E-posta", { exact: true }).fill("reader@example.com");
  await page.getByLabel("Mesajın", { exact: true }).fill("Kitap kulübü hakkında bir soru.");
  await page.getByRole("button", { name: "Mesaj gönder" }).click();
  await expect(page.getByRole("status")).toContainText("e-posta gönderilmedi");
  expect(submissions).toEqual([]);
  await expect(page).toHaveURL(/\/tr\/iletisim$/);
});

test("removed and unknown pages return real 404 responses", async ({ request }) => {
  for (const path of ["/tr/takvim", "/en/calendar", "/tr/kitaplar/satranc", "/en/books/chess", "/tr/galeri/999", "/de", "/en/not-a-page"]) {
    const response = await request.get(path);
    expect(response.status(), path).toBe(404);
  }
});

test("reduced motion stops hover scrolling but keeps the arrow usable", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/en");
  const arrow = page.getByRole("button", { name: "Show earlier reads" });
  await arrow.hover();
  await page.waitForTimeout(250);
  expect(await page.locator(".shelf-track").evaluate((element) => element.scrollLeft)).toBe(0);
  await arrow.click();
  await expect.poll(() => page.locator(".shelf-track").evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
});

test("narrow fallback menu and footer remain reachable without horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/tr");
  const menu = page.getByRole("button", { name: "Menü", exact: true });
  await menu.click();
  await expect(menu).toHaveAttribute("aria-expanded", "true");
  await page.getByRole("navigation").getByRole("link", { name: "Galeri" }).click();
  await expect(page).toHaveURL(/\/tr\/galeri$/);
  await page.getByRole("contentinfo").scrollIntoViewIfNeeded();
  await expect(page.getByRole("link", { name: "Shopier", exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
});
