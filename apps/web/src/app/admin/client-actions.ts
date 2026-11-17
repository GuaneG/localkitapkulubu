"use client";

export async function signOutAdmin() {
  const response = await fetch("/api/auth/sign-out", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
  if (!response.ok) throw new Error("Çıkış yapılamadı.");
}
export function navigateAdmin(url: string) { window.location.assign(url); }
