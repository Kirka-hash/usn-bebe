import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useApp } from '@/state/AppContext';

/** Ограничение раздела организатора демо-сессией организатора */
export function RequireOrganizer() {
  const { organizerAuth, ready } = useApp();
  const location = useLocation();

  if (!ready) return null;
  if (!organizerAuth) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/organizer/login?next=${next}`} replace />;
  }
  return <Outlet />;
}
