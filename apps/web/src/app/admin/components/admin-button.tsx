import type { ButtonHTMLAttributes } from "react";
import styles from "../admin.module.css";

export function AdminButton({ variant = "secondary", className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" }) {
  return <button type="button" {...props} className={`${styles.button} ${variant === "primary" ? styles.primary : ""} ${className}`} />;
}
