import assert from "node:assert/strict";
import { test } from "node:test";
import type { PublishedRevision } from "../../src/server/monthly-read/contracts";
import { currentPeriod, loadPublishedHome, revisionWithFallback } from "../../src/server/monthly-read/publication";

const a: PublishedRevision = { id: "A", period: "2026-11", sourceVersion: 1, publishedAt: "2026-11-01T00:00:00Z", titleTr: "Kitap A", titleEn: "Book A", author: "Author A", bandTr: "TR A", bandEn: "EN A" };
const b: PublishedRevision = { ...a, readingNumber: 39, id: "B", sourceVersion: 2, titleTr: "Kitap B", titleEn: "Book B", bandTr: "TR B", bandEn: "EN B" };

test("Istanbul chooses the month at the request time, including UTC's preceding day", () => {
  assert.equal(currentPeriod(new Date("2026-10-31T21:30:00Z")), "2026-11");
  assert.equal(currentPeriod(new Date("2026-10-31T20:59:00Z")), "2026-10");
});

test("only selected published snapshots become current/past; an empty month never reuses its predecessor", async () => {
  const deps = { readReferences: async () => [{ period: "2026-10", revisionId: "past" }], readRevision: async () => ({ ...a, id: "past", period: "2026-10" }) };
  const home = await loadPublishedHome("en", new Date("2026-11-15T12:00:00Z"), deps);
  assert.equal(home.current, null);
  assert.deepEqual(home.past, [{ revisionId: "past", period: "2026-10", title: "Book A", author: "Author A", band: "EN A", readingNumber: null }]);
  await assert.rejects(loadPublishedHome("tr", new Date(), { ...deps, readReferences: async () => { throw new Error("db unavailable"); } }), /db unavailable/);
  await assert.rejects(loadPublishedHome("tr", new Date("2026-11-15"), { ...deps, readRevision: async () => null }), /Published revision/);
});

test("late A cache refill cannot replace B selected by the next fresh reference read", async () => {
  let pointer = "A";
  let finishA!: (value: PublishedRevision) => void;
  let started!: () => void;
  const didStart = new Promise<void>((resolve) => { started = resolve; });
  const pendingA = new Promise<PublishedRevision>((resolve) => { finishA = resolve; });
  const cache = new Map<string, PublishedRevision>();
  const deps = {
    readReferences: async () => [{ period: "2026-11", revisionId: pointer }],
    readRevision: async (id: string) => {
      if (cache.has(id)) return cache.get(id)!;
      if (id === "A") { started(); cache.set(id, await pendingA); }
      else cache.set(id, b);
      return cache.get(id)!;
    },
  };
  const old = loadPublishedHome("tr", new Date("2026-11-15"), deps);
  await didStart;
  pointer = "B";
  finishA(a);
  assert.equal((await old).current?.title, "Kitap A");
  assert.equal((await old).current?.readingNumber, null);
  assert.equal((await loadPublishedHome("tr", new Date("2026-11-15"), deps)).current?.title, "Kitap B");
  assert.equal((await loadPublishedHome("tr", new Date("2026-11-15"), deps)).current?.readingNumber, 39);
  assert.equal((await loadPublishedHome("en", new Date("2026-11-15"), deps)).current?.title, "Book B");
  assert.equal((await loadPublishedHome("en", new Date("2026-11-15"), deps)).current?.readingNumber, 39);
});

test("cache failure reads the same selected revision from DB; DB failure remains an error", async () => {
  const seen: string[] = [];
  const cached = async () => { throw new Error("cache unavailable"); };
  const read = async (id: string) => { seen.push(id); return b; };
  assert.equal((await revisionWithFallback("B", cached, read))?.id, "B");
  assert.deepEqual(seen, ["B"]);
  await assert.rejects(revisionWithFallback("B", cached, async () => { throw new Error("db unavailable"); }), /db unavailable/);
});
