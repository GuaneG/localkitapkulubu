import type { ReactNode } from "react";
import styles from "../admin.module.css";

export function AdminNotice({ kind = "info", children }: { kind?: "info" | "error" | "success"; children: ReactNode }) {
  if (!children) return null;
  return <div className={`${styles.notice} ${kind === "error" ? styles.error : ""}`} role={kind === "error" ? "alert" : kind === "success" ? "status" : undefined}>{children}</div>;
}
