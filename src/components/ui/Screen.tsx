import type { ReactNode } from 'react';
import styles from './Screen.module.css';

/** Контейнер экрана — visual reference из макета */
export function Screen({ children }: { children: ReactNode }) {
  return <div className={styles.screen}>{children}</div>;
}

/** Шапка экрана: заголовок (+ опциональная подпись) */
export function ScreenHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header className={styles.header}>
      <h1 className={styles.title}>{title}</h1>
      {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
    </header>
  );
}
