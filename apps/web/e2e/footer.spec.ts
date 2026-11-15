import { expect, test } from "@playwright/test";

test.use({ launchOptions: { ignoreDefaultArgs: ["--hide-scrollbars"] } });

test("navigation preserves horizontal alignment and short pages fill the viewport", async ({ page }) => {
  await page.goto("/tr");
  await page.evaluate(() => document.fonts.ready);
  const initialLinks = await page.locator(".footer-links").boundingBox();
  expect(initialLinks).not.toBeNull();

  for (const [label, path] of [["Hakkımızda", "/tr/hakkimizda"], ["Galeri", "/tr/galeri"], ["İletişim", "/tr/iletisim"]]) {
    await page.getByRole("navigation").getByRole("link", { name: label, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`${path}$`));
    const links = await page.locator(".footer-links").boundingBox();
    expect(links).not.toBeNull();
    expect(Math.abs(links!.x - initialLinks!.x), `${path}: footer links moved horizontally`).toBeLessThan(1);
    const footer = await page.getByRole("contentinfo").boundingBox();
    expect(footer).not.toBeNull();
    expect(Math.abs(footer!.y + footer!.height - 1000), `${path}: footer is above the viewport bottom`).toBeLessThan(1);
    const headerLogo = await page.locator(".site-header .brand").boundingBox();
    const footerLogo = await page.locator(".footer-brand").boundingBox();
    expect(Math.abs(headerLogo!.x - footerLogo!.x)).toBeLessThan(1);
  }
});

test("secondary pages share a footer baseline on short and tall desktop viewports", async ({ page }) => {
  for (const height of [720, 800, 900, 1000]) {
    await page.setViewportSize({ width: 1440, height });
    for (const locale of ["tr", "en"]) {
      const pages = locale === "tr"
        ? [["Galeri", "/tr/galeri"], ["İletişim", "/tr/iletisim"]]
        : [["Gallery", "/en/gallery"], ["Contact", "/en/contact"]];
      await page.goto(locale === "tr" ? "/tr/hakkimizda" : "/en/about");
      await page.evaluate(() => document.fonts.ready);
      const baseline = await page.locator(".footer-links").boundingBox();
      expect(baseline).not.toBeNull();
      for (const [label, path] of pages) {
        await page.getByRole("navigation").getByRole("link", { name: label, exact: true }).click();
        await expect(page).toHaveURL(new RegExp(`${path}$`));
        const links = await page.locator(".footer-links").boundingBox();
        expect(Math.abs(links!.y - baseline!.y), `${path} at ${height}px: footer baseline changed`).toBeLessThan(1);
        const main = await page.locator("main").boundingBox();
        const footer = await page.getByRole("contentinfo").boundingBox();
        expect(footer!.y).toBeGreaterThanOrEqual(main!.y + main!.height - 1);
      }
    }
  }
});
