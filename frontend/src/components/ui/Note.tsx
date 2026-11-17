import type { ReactNode } from 'react';
import styles from './Note.module.css';

export type NoteVariant = 'info' | 'warn' | 'err' | 'success';

/** Цветная плашка-состояние из прототипа (инфо / предупреждение / ошибка / успех) */
export function Note({
  variant = 'info',
  children,
  as,
}: {
  variant?: NoteVariant;
  children: ReactNode;
  /** Роль ARIA: status по умолчанию, alert для ошибок */
  as?: 'status' | 'alert';
}) {
  return (
    <div className={`${styles.note} ${styles[variant]}`} role={variant === 'err' || as === 'alert' ? 'alert' : 'status'}>
      {children}
    </div>
  );
}
