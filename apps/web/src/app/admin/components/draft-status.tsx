import type { DraftSummary } from "@/server/monthly-read/contracts";
import { draftStatus } from "../presentation";
import styles from "../admin.module.css";

export function DraftStatus({ draft }: { draft: Pick<DraftSummary, "version" | "publication" | "isEmpty"> | null }) {
  return <span className={styles.draftStatus}>{draftStatus(draft)}</span>;
}
