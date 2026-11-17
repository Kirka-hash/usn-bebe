import { NavLink, Outlet } from 'react-router-dom';
import styles from './SiteLayout.module.css';

function navLinkClass({ isActive }: { isActive: boolean }): string {
  return `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`;
}

/** Общая шапка сайта: переходы между разделами участника и организатора */
export function SiteLayout() {
  return (
    <div className={styles.site}>
      <header className={styles.bar}>
        <NavLink to="/" className={styles.brand}>
          <span className={styles.brandChip}>USN</span>
          Турниры
        </NavLink>
        <nav className={styles.nav} aria-label="Основная навигация">
          <NavLink to="/" end className={navLinkClass}>
            Турниры
          </NavLink>
          <NavLink to="/my-tournaments" className={navLinkClass}>
            Мои турниры
          </NavLink>
          <NavLink to="/profile" className={navLinkClass}>
            Профиль
          </NavLink>
          <NavLink to="/organizer" className={navLinkClass}>
            Кабинет организатора
          </NavLink>
        </nav>
      </header>
      <div className={styles.main} id="main-content">
        <Outlet />
      </div>
    </div>
  );
}
