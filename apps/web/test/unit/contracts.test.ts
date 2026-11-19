import assert from "node:assert/strict";
import { test } from "node:test";

test("draft accepts incomplete translations but rejects invalid month/version or privilege fields", async () => {
  const { parsePeriod, parseDraftInput } = await import("../../src/server/monthly-read/contracts.ts");
  assert.equal(parsePeriod("2026-11"), "2026-11-01");
  assert.throws(() => parsePeriod("2026-13"));
  assert.throws(() => parsePeriod("2026-1"));
  const input = { expectedVersion: null, titleTr: "", titleEn: "", author: "", bandTr: "Taslak", bandEn: "" };
  assert.deepEqual(parseDraftInput(input), input);
  for (const value of [0, -1, 1.1, "1", undefined]) assert.throws(() => parseDraftInput({ ...input, expectedVersion: value }));
  assert.throws(() => parseDraftInput({ ...input, published: true }));
  assert.throws(() => parseDraftInput({ ...input, titleTr: "a".repeat(301) }));
});

test("publication requires trimmed, non-empty fields while drafts remain editable", async () => {
  const { isEmptyDraft, publicationIssues, parseDraftInput, parsePublishInput } = await import("../../src/server/monthly-read/contracts.ts");
  const draft = { expectedVersion: null, titleTr: "", titleEn: "  ", author: "", bandTr: "Taslak", bandEn: "" };
  assert.deepEqual(parseDraftInput(draft), draft);
  assert.equal(isEmptyDraft(draft), false);
  assert.equal(isEmptyDraft({ titleTr: " \n", titleEn: "\t", author: "", bandTr: " ", bandEn: "" }), true);
  assert.throws(() => parseDraftInput({ ...draft, bandTr: "  " }), { status: 422 });
  assert.deepEqual(publicationIssues({ titleTr: "", titleEn: "  ", author: "", bandTr: "  ", bandEn: "ok" }), [
    "titleTr", "titleEn", "author", "bandTr",
  ]);
  assert.deepEqual(publicationIssues({ titleTr: " Kitap ", titleEn: " Book ", author: " Yazar ", bandTr: " Şerit ", bandEn: " Band " }), []);
  assert.deepEqual(parsePublishInput({ expectedVersion: 2 }), { expectedVersion: 2 });
  for (const value of [0, -1, 1.5, "2", null, undefined]) assert.throws(() => parsePublishInput({ expectedVersion: value }));
  assert.throws(() => parsePublishInput({ expectedVersion: 2, titleTr: "client supplied" }));
});

test("reading number is an optional positive PostgreSQL integer with preserve and clear semantics", async () => {
  const { parseDraftInput, parseReadingNumber, isEmptyDraft, publicationIssues } = await import("../../src/server/monthly-read/contracts.ts");
  const textFields = { titleTr: "", titleEn: "", author: "", bandTr: "", bandEn: "" };
  const omitted = { ...textFields, bandTr: "Taslak", expectedVersion: null };
  assert.equal(parseReadingNumber(undefined), undefined);
  assert.equal(parseReadingNumber(null), null);
  assert.equal(parseReadingNumber(1), 1);
  assert.equal(parseReadingNumber(2147483647), 2147483647);
  for (const invalid of [0, -1, 1.5, "38", true, false, NaN, Infinity, -Infinity, Number.MAX_SAFE_INTEGER + 1, 2147483648]) {
    assert.throws(() => parseReadingNumber(invalid), { status: 400 });
    assert.throws(() => parseDraftInput({ ...omitted, readingNumber: invalid }), { status: 400 });
  }
  assert.deepEqual(parseDraftInput(omitted), omitted);
  assert.equal(parseDraftInput({ ...omitted, readingNumber: 38 }).readingNumber, 38);
  assert.equal(parseDraftInput({ ...omitted, readingNumber: null }).readingNumber, null);
  assert.equal(isEmptyDraft({ ...textFields, readingNumber: null }), true);
  assert.equal(isEmptyDraft({ ...textFields, readingNumber: 38 }), false);
  assert.equal(parseDraftInput({ ...textFields, readingNumber: 38, expectedVersion: null }).readingNumber, 38);
  const deferredEmptyUpdate = { ...textFields, expectedVersion: 1 };
  assert.deepEqual(parseDraftInput(deferredEmptyUpdate), deferredEmptyUpdate, "omitted number on update must be resolved against the locked row");
  assert.throws(() => parseDraftInput({ ...textFields, expectedVersion: null }), { status: 422 });
  assert.throws(() => parseDraftInput({ ...textFields, expectedVersion: 1, readingNumber: null }), { status: 422 });
  assert.deepEqual(publicationIssues(textFields), ["titleTr", "titleEn", "author", "bandTr", "bandEn"]);
});

test("login identity ignores spoofed forwarding headers locally and fails closed off supported hosts", async () => {
  const { clientIp, loginEmail } = await import("../../src/server/auth/login-identity.ts");
  const request = new Request("http://127.0.0.1:3000/api/auth/sign-in/email", { headers: { "x-forwarded-for": "8.8.8.8", "x-nf-client-connection-ip": "1.1.1.1" } });
  assert.equal(clientIp(request, { origin: "http://127.0.0.1:3000", netlifySiteId: "example-site-id" }), "127.0.0.1");
  assert.equal(clientIp(new Request("http://localhost:3000/api/auth/sign-in/email", { headers: { host: "127.0.0.1:3000", "x-forwarded-for": "9.9.9.9" } }), { origin: "http://127.0.0.1:3000" }), "127.0.0.1");
  assert.throws(() => clientIp(request, { origin: "https://example.com" }));
  assert.equal(loginEmail({ email: "  PO@Example.com ", password: "secret" }), "po@example.com");
  assert.throws(() => loginEmail({ email: "x", password: "secret" }));
});

test("Netlify runtime site ID enables the platform IP check for an HTTPS deployment", async () => {
  const { clientIp } = await import("../../src/server/auth/login-identity.ts");
  const origin = "https://local.example";
  const request = new Request(origin + "/api/auth/get-session", { headers: { "x-nf-client-connection-ip": "::ffff:192.0.2.1" } });
  const config = { origin, netlifySiteId: "example-site-id" };
  assert.equal(clientIp(request, config), "192.0.2.1");
  assert.throws(() => clientIp(request, { origin }), /Yerel giriş/);
  assert.throws(() => clientIp(new Request(request.url, { headers: { "x-forwarded-for": "192.0.2.1" } }), config), /Güvenilir istemci adresi/);
  assert.throws(() => clientIp(new Request(request.url, { headers: { "x-nf-client-connection-ip": "invalid" } }), config), /Güvenilir istemci adresi/);
});
