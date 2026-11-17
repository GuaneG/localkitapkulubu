import "server-only";
import { requireAdmin } from "../auth/require-admin";
import { getDb } from "../db/client";
import { parseDraftInput, parsePublishInput } from "./contracts";
import { publishDraft, readAdminDraft, readDraftSummaries, saveAdminDraft as saveDraftWithSnapshot } from "./repository";

export async function getAdminDraft(headers: Headers, period: string) {
  await requireAdmin(headers);
  return readAdminDraft(getDb(), period);
}
export async function saveAdminDraft(headers: Headers, period: string, input: unknown) {
  await requireAdmin(headers);
  return saveDraftWithSnapshot(getDb(), period, parseDraftInput(input));
}

export async function getAdminDrafts(headers: Headers) {
  await requireAdmin(headers);
  return readDraftSummaries(getDb());
}

export async function publishAdminDraft(headers: Headers, period: string, input: unknown) {
  await requireAdmin(headers);
  return publishDraft(getDb(), period, parsePublishInput(input));
}
