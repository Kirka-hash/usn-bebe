import { Link } from 'react-router-dom';
import styles from './OrganizerTabs.module.css';

export const ORGANIZER_TABS = [
  { key: 'entries', label: 'Заявки', path: (id: string) => `/organizer/competitions/${id}/entries` },
  { key: 'availability', label: 'Доступность судей', path: (id: string) => `/organizer/competitions/${id}/availability` },
  { key: 'colleges', label: 'Коллегии (ИИ)', path: (id: string) => `/organizer/competitions/${id}/colleges` },
  { key: 'issues', label: 'Проблемные поединки (ИИ)', path: (id: string) => `/organizer/competitions/${id}/issues` },
] as const;

export type OrganizerTabKey = (typeof ORGANIZER_TABS)[number]['key'];

/**
 * Таб-навигация разделов организатора (внутри экрана, как в прототипе O2–O5):
 * активная — синяя, остальные — белые с рамкой и стрелкой.
 */
export function OrganizerTabs({ tournamentId, active }: { tournamentId: string; active: OrganizerTabKey }) {
  return (
    <nav className={styles.tabs} aria-label="Разделы соревнования">
      {ORGANIZER_TABS.map((tab) => (
        <Link
          key={tab.key}
          to={tab.path(tournamentId)}
          data-active={tab.key === active}
          className={styles.tab}
          aria-current={tab.key === active ? 'page' : undefined}
        >
          {tab.label}
          {tab.key !== active && (
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
              <path
                d="M2 6h8M6.6 2.6 10 6l-3.4 3.4"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </Link>
      ))}
    </nav>
  );
}
