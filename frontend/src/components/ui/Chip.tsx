import type { ReactNode } from 'react';
import styles from './Chip.module.css';

export type ChipVariant = 'green' | 'gray' | 'blue' | 'warn' | 'red';

/** Плашка состояния из прототипа: 11px/500, радиус 12, паддинги 8/4 */
export function Chip({ variant = 'gray', children }: { variant?: ChipVariant; children: ReactNode }) {
  return <span className={`${styles.chip} ${styles[variant]}`}>{children}</span>;
}

/** Плашка-фильтр: кликабельная, активное состояние выделяется вариантом */
export function ChipFilter({
  variant = 'gray',
  onClick,
  children,
  ariaPressed,
}: {
  variant?: ChipVariant;
  onClick: () => void;
  children: ReactNode;
  ariaPressed?: boolean;
}) {
  return (
    <button
      type="button"
      className={`${styles.chip} ${styles[variant]}`}
      style={{ cursor: 'pointer' }}
      aria-pressed={ariaPressed}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
