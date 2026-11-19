import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useRef } from 'react';
import styles from './SiteLayout.module.css';

function navLinkClass({ isActive }: { isActive: boolean }): string {
  return `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`;
}

/** Общая шапка сайта: переходы между разделами участника и организатора */
export function SiteLayout() {
  const { pathname } = useLocation();
  const organizer = pathname.startsWith('/organizer');
  const organizerDashboard = organizer && pathname !== '/organizer/login';
  const menu = useRef<HTMLDetailsElement>(null);
  const closeMenu = () => { menu.current?.removeAttribute('open'); };
  return (
    <div className={styles.site}>
      <header className={`${styles.bar} ${organizerDashboard ? styles.wide : styles.compact}`}>
        <NavLink to={organizer ? "/organizer" : "/"} className={styles.brand}>
          <span className={styles.brandChip}>USN</span>
          <span>{organizer ? <>Кабинет<br />организатора</> : <>Универсальная<br />Школа Переговоров</>}</span>
        </NavLink>
        <details ref={menu} className={styles.menu}>
          <summary aria-label="Открыть меню">
            <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </summary>
          <nav className={styles.nav} aria-label="Основная навигация">
            <NavLink to="/" end className={navLinkClass} onClick={closeMenu}>Турниры</NavLink>
            <NavLink to="/my-tournaments" className={navLinkClass} onClick={closeMenu}>Мои турниры</NavLink>
            <NavLink to="/profile" className={navLinkClass} onClick={closeMenu}>Профиль</NavLink>
            <NavLink to="/organizer" className={navLinkClass} onClick={closeMenu}>Кабинет организатора</NavLink>
          </nav>
        </details>
      </header>
      <div className={styles.main} id="main-content">
        <Outlet />
      </div>
    </div>
  );
}
