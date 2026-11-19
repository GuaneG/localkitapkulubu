import type { ChangeEventHandler, InputHTMLAttributes } from "react";
import styles from "../admin.module.css";

type FieldProps = { id: string; label: string; multiline?: boolean; value?: string; name?: string; type?: string; maxLength?: number; autoComplete?: string; required?: boolean; disabled?: boolean; onChange?: ChangeEventHandler<HTMLInputElement | HTMLTextAreaElement> } & Pick<InputHTMLAttributes<HTMLInputElement>, "inputMode" | "min" | "max" | "step" | "aria-describedby">;
export function AdminField({ label, multiline, type = "text", ...props }: FieldProps) {
  return <div className={styles.field}><label htmlFor={props.id}>{label}</label>{multiline ? <textarea {...props} /> : <input {...props} type={type} />}</div>;
}
