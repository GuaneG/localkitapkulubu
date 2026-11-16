import "server-only";
import { unstable_cache } from "next/cache";
import type { Locale } from "../../lib/i18n";
import { getDb } from "../db/client";
import { loadPublishedHome, revisionWithFallback } from "./publication";
import { readPublishedReferences, readPublishedRevision } from "./repository";

const directRevision = (revisionId: string) => readPublishedRevision(getDb(), revisionId);
const cachedRevision = unstable_cache(directRevision, ["monthly-read-revision-v1"], { revalidate: false });

export function getPublicMonthlyRead(locale: Locale) {
  return loadPublishedHome(locale, new Date(), {
    readReferences: (period) => readPublishedReferences(getDb(), period),
    readRevision: (id) => revisionWithFallback(id, cachedRevision, directRevision),
  });
}
