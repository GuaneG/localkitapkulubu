export type DraftTextFields = { titleTr: string; titleEn: string; author: string; bandTr: string; bandEn: string };
export type DraftFields = DraftTextFields & { readingNumber?: number | null };
export type DraftInput = DraftTextFields & { readingNumber?: number | null; expectedVersion: number | null };
export type PublicationReceipt = { revisionId: string; sourceVersion: number; publishedAt: string };
export type Draft = DraftFields & { period: string; version: number; updatedAt: string; publication: PublicationReceipt | null };
export type PublishInput = { expectedVersion: number };
export type PublishedRevision = DraftTextFields & { readingNumber?: number | null; id: string; period: string; sourceVersion: number; publishedAt: string };
export type DraftSummary = Pick<Draft, "period" | "titleTr" | "titleEn" | "version" | "updatedAt" | "publication"> & { isEmpty: boolean };
export type AdminDraft = Draft & { published: PublishedRevision | null };
export const draftFieldNames: Record<keyof DraftTextFields, string> = { titleTr: "Kitap adı — TR", titleEn: "Kitap adı — EN", author: "Yazar", bandTr: "Şerit metni — TR", bandEn: "Şerit metni — EN" };
const fieldLimits: Record<keyof DraftTextFields, number> = { titleTr: 300, titleEn: 300, author: 300, bandTr: 5000, bandEn: 5000 };

export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export function parseReadingNumber(value: unknown): number | null | undefined {
  if (value === undefined || value === null) return value;
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 1 || value > 2147483647) {
    throw new HttpError(400, "Okuma numarası pozitif bir tam sayı olmalıdır.");
  }
  return value;
}

export function isEmptyDraft(fields: DraftFields): boolean {
  return [fields.titleTr, fields.titleEn, fields.author, fields.bandTr, fields.bandEn].every((value) => value.trim().length === 0) && fields.readingNumber == null;
}

export function parsePeriod(value: string): string {
  if (!/^[1-9]\d{3}-(0[1-9]|1[0-2])$/.test(value)) throw new HttpError(400, "Geçerli bir ay seçin.");
  return `${value}-01`;
}

export function parseDraftInput(value: unknown): DraftInput {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new HttpError(400, "Taslak verisi geçersiz.");
  const input = value as Record<string, unknown>;
  if (Object.keys(input).some((key) => !Object.hasOwn(fieldLimits, key) && key !== "expectedVersion" && key !== "readingNumber")) throw new HttpError(400, "Bilinmeyen alan.");
  for (const [key, max] of Object.entries(fieldLimits)) {
    if (typeof input[key] !== "string" || input[key].length > max) throw new HttpError(400, "Metin alanlarını ve uzunluklarını kontrol edin.");
  }
  const version = input.expectedVersion;
  if (version !== null && (typeof version !== "number" || !Number.isSafeInteger(version) || version < 1 || version >= 2147483647)) throw new HttpError(400, "Taslak sürümü geçersiz.");
  const readingNumber = parseReadingNumber(input.readingNumber);
  // An older client may omit the number. Updates must check the final state
  // against the saved number under the repository's row lock.
  if ((version === null || readingNumber !== undefined) && isEmptyDraft({ ...input as DraftTextFields, readingNumber })) throw new HttpError(422, "En az bir içerik alanı doldurun.");
  return input as DraftInput;
}

export function parsePublishInput(value: unknown): PublishInput {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new HttpError(400, "Yayın verisi geçersiz.");
  const input = value as Record<string, unknown>;
  if (Object.keys(input).some((key) => key !== "expectedVersion")) throw new HttpError(400, "Bilinmeyen alan.");
  const version = input.expectedVersion;
  if (typeof version !== "number" || !Number.isSafeInteger(version) || version < 1 || version >= 2147483647) throw new HttpError(400, "Taslak sürümü geçersiz.");
  return { expectedVersion: version };
}

export function publicationIssues(fields: DraftTextFields): string[] {
  return Object.entries(fieldLimits).flatMap(([field, max]) => {
    const value = fields[field as keyof DraftTextFields];
    return value.trim().length === 0 || value.length > max ? [field] : [];
  });
}
