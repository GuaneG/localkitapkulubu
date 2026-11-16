export function testDatabaseUrl(): string {
  const url = process.env.TEST_DATABASE_URL;
  if (!url || process.env.ALLOW_TEST_DATABASE_RESET !== "1") throw new Error("Integration tests reset tables. Set a separate TEST_DATABASE_URL and ALLOW_TEST_DATABASE_RESET=1 explicitly.");
  if (url === process.env.DATABASE_URL) throw new Error("Integration reset database must differ from the application DATABASE_URL.");
  return url;
}
