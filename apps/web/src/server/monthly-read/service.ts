import "server-only";
import { requireAdmin } from "../auth/require-admin";
import { getDb } from "../db/client";
import { parseDraftInput, parsePublishInput } from "./contracts";
import { publishDraft, readDraft, saveDraft } from "./repository";

export async function getAdminDraft(headers: Headers, period: string) {
  await requireAdmin(headers);
  return readDraft(getDb(), period);
}
export async function saveAdminDraft(headers: Headers, period: string, input: unknown) {
  await requireAdmin(headers);
  return saveDraft(getDb(), period, parseDraftInput(input));
}

export async function publishAdminDraft(headers: Headers, period: string, input: unknown) {
  await requireAdmin(headers);
  return publishDraft(getDb(), period, parsePublishInput(input));
}
