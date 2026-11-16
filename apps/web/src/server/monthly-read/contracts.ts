export type DraftFields = { titleTr: string; titleEn: string; author: string; bandTr: string; bandEn: string };
export type DraftInput = DraftFields & { expectedVersion: number | null };
export type PublicationReceipt = { revisionId: string; sourceVersion: number; publishedAt: string };
export type Draft = DraftFields & { period: string; version: number; updatedAt: string; publication: PublicationReceipt | null };
export type PublishInput = { expectedVersion: number };
export type PublishedRevision = DraftFields & { id: string; period: string; sourceVersion: number; publishedAt: string };
export const draftFieldNames: Record<keyof DraftFields, string> = { titleTr: "Kitap adı — TR", titleEn: "Kitap adı — EN", author: "Yazar", bandTr: "Şerit metni — TR", bandEn: "Şerit metni — EN" };
const fieldLimits = { titleTr: 300, titleEn: 300, author: 300, bandTr: 5000, bandEn: 5000 };

export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export function parsePeriod(value: string): string {
  if (!/^[1-9]\d{3}-(0[1-9]|1[0-2])$/.test(value)) throw new HttpError(400, "Geçerli bir ay seçin.");
  return `${value}-01`;
}

export function parseDraftInput(value: unknown): DraftInput {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new HttpError(400, "Taslak verisi geçersiz.");
  const input = value as Record<string, unknown>;
  if (Object.keys(input).some((key) => !Object.hasOwn(fieldLimits, key) && key !== "expectedVersion")) throw new HttpError(400, "Bilinmeyen alan.");
  for (const [key, max] of Object.entries(fieldLimits)) {
    if (typeof input[key] !== "string" || input[key].length > max) throw new HttpError(400, "Metin alanlarını ve uzunluklarını kontrol edin.");
  }
  const version = input.expectedVersion;
  if (version !== null && (typeof version !== "number" || !Number.isSafeInteger(version) || version < 1 || version >= 2147483647)) throw new HttpError(400, "Taslak sürümü geçersiz.");
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

export function publicationIssues(fields: DraftFields): string[] {
  return Object.entries(fieldLimits).flatMap(([field, max]) => {
    const value = fields[field as keyof DraftFields];
    return value.trim().length === 0 || value.length > max ? [field] : [];
  });
}
