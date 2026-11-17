"use client";
import styles from "../admin.module.css";

export function AdminTabs<T extends string>({ id, label, items, value, onChange }: { id: string; label: string; items: readonly { value: T; label: string }[]; value: T; onChange: (value: T) => void }) {
  return <div className={styles.tabs} role="tablist" aria-label={label} onKeyDown={(event) => {
    const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
    const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
    let next = index;
    if (event.key === "ArrowRight") next = (index + 1) % items.length;
    else if (event.key === "ArrowLeft") next = (index - 1 + items.length) % items.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = items.length - 1;
    else return;
    event.preventDefault(); onChange(items[next].value); buttons[next].focus();
  }}>{items.map((item) => <button type="button" role="tab" key={item.value} id={`${id}-${item.value}-tab`} aria-controls={`${id}-${item.value}-panel`} aria-selected={value === item.value} tabIndex={value === item.value ? 0 : -1} onClick={() => onChange(item.value)}>{item.label}</button>)}</div>;
}
