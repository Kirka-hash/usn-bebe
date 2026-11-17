import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { Application, ApplicationForm, Profile, Tournament } from '@/types';
import * as api from '@/services/api';
import type { CreateTournamentPayload, OrganizerAuth } from '@/services/api';

interface AppState {
  ready: boolean;
  profile: Profile | null;
  applications: Application[];
  /** Демо-заявки других участников для организаторских экранов */
  organizerEntries: Application[];
  /** Все турниры: демо-сид + созданные организатором */
  tournaments: Tournament[];
  /** Демо-сессия организатора (null — организатор не вошёл) */
  organizerAuth: OrganizerAuth | null;
  login: (email: string, lastName?: string, firstName?: string) => Promise<Profile>;
  updateProfile: (patch: Partial<ApplicationForm>) => Promise<Profile>;
  addApplication: (application: Application) => void;
  updateApplication: (application: Application) => void;
  setEntryStatus: (applicationId: string, status: Application['status']) => Promise<void>;
  organizerLogin: (email: string, password: string) => Promise<OrganizerAuth>;
  organizerLogout: () => void;
  createTournament: (payload: CreateTournamentPayload) => Promise<Tournament>;
  resetDemo: () => void;
}

const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [organizerEntries, setOrganizerEntries] = useState<Application[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [organizerAuth, setOrganizerAuth] = useState<OrganizerAuth | null>(null);

  useEffect(() => {
    void Promise.all([
      api.getProfile(),
      api.getApplications(),
      api.getOrganizerApplications(),
      api.getTournaments(),
      api.getOrganizerAuth(),
    ]).then(([p, apps, entries, ts, org]) => {
      setProfile(p);
      setApplications(apps);
      setOrganizerEntries(entries);
      setTournaments(ts);
      setOrganizerAuth(org);
      setReady(true);
    });
  }, []);

  const login = useCallback(async (email: string, lastName?: string, firstName?: string) => {
    const p = await api.login(email, lastName, firstName);
    setProfile(p);
    return p;
  }, []);

  const updateProfile = useCallback(async (patch: Partial<ApplicationForm>) => {
    const p = await api.saveProfile(patch);
    setProfile(p);
    return p;
  }, []);

  const addApplication = useCallback((application: Application) => {
    setApplications((prev) => [...prev.filter((a) => a.id !== application.id), application]);
  }, []);

  const updateApplication = useCallback((application: Application) => {
    setApplications((prev) => prev.map((a) => (a.id === application.id ? application : a)));
  }, []);

  const setEntryStatus = useCallback(async (applicationId: string, status: Application['status']) => {
    const updated = await api.setEntryStatus(applicationId, status);
    setOrganizerEntries((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
    setApplications((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
  }, []);

  const organizerLogin = useCallback(async (email: string, password: string) => {
    const auth = await api.organizerLogin(email, password);
    setOrganizerAuth(auth);
    return auth;
  }, []);

  const organizerLogout = useCallback(() => {
    api.organizerLogout();
    setOrganizerAuth(null);
  }, []);

  const createTournament = useCallback(async (payload: CreateTournamentPayload) => {
    const tournament = await api.createTournament(payload);
    setTournaments((prev) => [tournament, ...prev]);
    return tournament;
  }, []);

  const resetDemo = useCallback(() => {
    try {
      localStorage.removeItem('usn.demo.v1');
    } catch {
      /* приватный режим */
    }
    window.location.reload();
  }, []);

  const value = useMemo<AppState>(
    () => ({
      ready,
      profile,
      applications,
      organizerEntries,
      tournaments,
      organizerAuth,
      login,
      updateProfile,
      addApplication,
      updateApplication,
      setEntryStatus,
      organizerLogin,
      organizerLogout,
      createTournament,
      resetDemo,
    }),
    [ready, profile, applications, organizerEntries, tournaments, organizerAuth, login, updateProfile, addApplication, updateApplication, setEntryStatus, organizerLogin, organizerLogout, createTournament, resetDemo],
  );

  // Экраны правки заявки строят начальное состояние из загруженных данных,
  // поэтому не показываем пустые формы до готовности демо-стора.
  if (!ready) {
    return (
      <div className="app-loading" role="status">
        Загрузка платформы…
      </div>
    );
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp должен вызываться внутри AppProvider');
  return ctx;
}
