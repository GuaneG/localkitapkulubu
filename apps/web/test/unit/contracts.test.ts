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
