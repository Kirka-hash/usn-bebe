import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { isSignedIn } from '@/services/api';

export function RequireParticipant() {
  const location = useLocation();
  if (!isSignedIn()) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?next=${next}`} replace />;
  }
  return <Outlet />;
}
