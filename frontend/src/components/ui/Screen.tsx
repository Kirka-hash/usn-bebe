import type { ReactNode } from 'react';
import styles from './Screen.module.css';

/** Контейнер экрана — visual reference из макета */
export function Screen({ children }: { children: ReactNode }) {
  return <div className={styles.screen}>{children}</div>;
}

/** Шапка экрана: заголовок (+ опциональная подпись) */
export function ScreenHeader({ title, subtitle, code }: { title: string; subtitle?: string; code?: string }) {
  return (
    <header className={styles.header}>
      <div className={styles.titleRow}>
        {code && <span className={styles.code} aria-hidden="true">{code}</span>}
        <h1 className={styles.title}>{title}</h1>
      </div>
      {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
    </header>
  );
}
