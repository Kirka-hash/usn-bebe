import type { ReactNode } from 'react';
import styles from './Card.module.css';

/** Белая карточка прототипа: радиус 10, паддинги 12, внутренний ритм 6 */
export function Card({
  title,
  children,
  tone = 'default',
}: {
  title?: ReactNode;
  children: ReactNode;
  tone?: 'default' | 'text';
}) {
  return (
    <section className={styles.card} data-tone={tone}>
      {title && <h2 className={styles.title}>{title}</h2>}
      {children}
    </section>
  );
}

/** Вторичный текст внутри карточки (12px, #6b7380, межстрочный 17px) */
export function CardText({ children }: { children: ReactNode }) {
  return <p className={styles.body}>{children}</p>;
}
