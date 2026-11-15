import { NextRequest, NextResponse } from "next/server";
import { isLocale } from "@/lib/i18n";

export function proxy(request: NextRequest) {
  const preference = request.cookies.get("local-language")?.value;
  const locale = preference && isLocale(preference) ? preference : "en";
  const response = NextResponse.redirect(new URL(`/${locale}`, request.url));
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export const config = { matcher: "/" };
