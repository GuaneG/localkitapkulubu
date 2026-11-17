import type { ChangeEventHandler } from "react";
import styles from "../admin.module.css";

type FieldProps = { id: string; label: string; multiline?: boolean; value?: string; name?: string; type?: string; maxLength?: number; autoComplete?: string; required?: boolean; disabled?: boolean; onChange?: ChangeEventHandler<HTMLInputElement | HTMLTextAreaElement> };
export function AdminField({ label, multiline, type = "text", ...props }: FieldProps) {
  return <div className={styles.field}><label htmlFor={props.id}>{label}</label>{multiline ? <textarea {...props} /> : <input {...props} type={type} />}</div>;
}
