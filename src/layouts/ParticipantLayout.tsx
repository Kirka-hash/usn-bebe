import { Outlet } from 'react-router-dom';
import styles from './ParticipantLayout.module.css';

/**
 * Раздел участника: мобильный поток 390px из прототипа.
 * На десктопе колонка центрируется, дизайн сохраняется без искажений.
 */
export function ParticipantLayout() {
  return (
    <div className={styles.participant}>
      <div className={styles.column}>
        <Outlet />
      </div>
    </div>
  );
}
