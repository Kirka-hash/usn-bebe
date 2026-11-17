import { Outlet } from 'react-router-dom';
import styles from './OrganizerLayout.module.css';

/**
 * Раздел организатора: десктопный поток 1280px из прототипа.
 * Навигация по разделам — табы внутри каждого экрана (OrganizerTabs, O2–O5).
 */
export function OrganizerLayout() {
  return (
    <div className={styles.wide}>
      <div className={styles.screenRow}>
        <Outlet />
      </div>
    </div>
  );
}
