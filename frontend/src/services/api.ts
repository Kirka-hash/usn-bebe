import type { Application, ApplicationForm, Profile, Role, Tournament, TournamentPlayer } from '@/types';

const BASE = import.meta.env.VITE_API_URL || '/api';
const SESSION_KEY = 'usn.session';
const ORGANIZER_KEY = 'usn.organizer.token';
const ROLE_TO_API: Record<Role, string> = { player: 'player', judge: 'voter', second: 'adviser', viewer: 'viewer' };
const API_TO_ROLE: Record<string, Role> = { player: 'player', voter: 'judge', adviser: 'second', viewer: 'viewer' };

interface Session { token: string; userId: string; email: string }
interface ApiProfile {
  user_id: string; email: string; last_name: string; first_name: string; country: string;
  city: string; phone: string; club: string; position: string; company: string; intro: string;
  telegram: string; vk: string;
}
interface ApiCompetition {
  id: string; title: string; format: Tournament['format']; open_roles: Record<string, boolean>;
  deadlines: Record<string, string>; days?: string[]; starts_at?: string | null; mode?: string; review_demo?: boolean;
  availability_blocks: Array<{ id: string; start: string; end: string; title: string; available?: number | null; parallel_duels?: number | null; panel_size?: number | null; reserve?: number | null }>;
}
interface ApiPlayer { id: string; name: string; club?: string; city?: string }
interface ApiApplication {
  id: string; competition_id: string; role: string; profile: ApiProfile; status: Application['status'];
  judge_scores?: Record<string, number>;
  team_status?: Application['teamStatus']; partner_user_id?: string | null;
  advised_player_ids: string[]; availability_block_ids: string[]; created_at: string; updated_at: string;
}

export class ApiError extends Error {
  constructor(public code: string, message: string) { super(message); }
}

function session(): Session | null {
  try { return JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null') as Session | null; }
  catch { return null; }
}
export function currentUserId(): string | null { return session()?.userId ?? null; }
export function isSignedIn(): boolean { return Boolean(session()); }

async function request<T>(path: string, init: RequestInit = {}, scope: 'participant' | 'organizer' = 'participant'): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body) headers.set('Content-Type', 'application/json');
  const token = scope === 'organizer' ? sessionStorage.getItem(ORGANIZER_KEY) : session()?.token;
  if (token) headers.set('Authorization', `Bearer ${token}`);
  let response: Response;
  try { response = await fetch(`${BASE}${path}`, { ...init, headers }); }
  catch { throw new ApiError('network', 'Не удалось связаться с сервером. Проверьте, что FastAPI запущен.'); }
  if (!response.ok) {
    let detail: unknown;
    try { detail = (await response.json()).detail; } catch { detail = null; }
    const info = typeof detail === 'object' && detail !== null ? detail as { code?: string; message?: string } : null;
    throw new ApiError(info?.code || String(response.status), info?.message || (typeof detail === 'string' ? detail : 'Ошибка сервера'));
  }
  return response.json() as Promise<T>;
}
const json = (body: unknown): RequestInit => ({ method: 'POST', body: JSON.stringify(body) });
const date = (value?: string): string => value ? new Date(value).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', timeZone: 'UTC' }) : '—';
const time = (value: string): string => new Date(value).toISOString().slice(11, 16);

function mapProfile(p: ApiProfile): Profile {
  return { id: p.user_id, email: p.email, lastName: p.last_name, firstName: p.first_name,
    country: p.country, city: p.city, phone: p.phone, club: p.club, position: p.position, company: p.company,
    displayName: p.intro, telegram: p.telegram, vk: p.vk,
    filled: Boolean(p.last_name && p.first_name && p.country && p.city) };
}
function toApiProfile(form: ApplicationForm, userId: string, email: string): ApiProfile {
  return { user_id: userId, email, last_name: form.lastName, first_name: form.firstName,
    country: form.country, city: form.city, phone: form.phone || '', club: form.club || '', position: form.position || '',
    company: form.company || '', intro: form.displayName || '', telegram: form.telegram || '', vk: form.vk || '' };
}
function mapApplication(a: ApiApplication): Application {
  return { id: a.id, tournamentId: a.competition_id, userId: a.profile.user_id,
    role: API_TO_ROLE[a.role] || 'viewer', status: a.status, teamStatus: a.team_status || undefined,
    form: mapProfile(a.profile), email: a.profile.email, judgeScores: a.judge_scores,
    publicId: a.role === 'voter' && /^review-\d+$/.test(a.id) ? `JUDGE_${a.id.slice(7).padStart(3, '0')}` : undefined, partnerId: a.partner_user_id || undefined,
    secondingPlayerIds: a.advised_player_ids, availabilityBlockIds: a.availability_block_ids,
    createdAt: a.created_at, updatedAt: a.updated_at, history: [] };
}
function mapTournament(c: ApiCompetition, players: TournamentPlayer[] = []): Tournament {
  const firstBlock = c.availability_blocks[0];
  const selectableBlocks = c.availability_blocks.filter(block => block.available !== 0);
  const firstDeadline = Object.values(c.deadlines)[0];
  const roles: Role[] = ['player', 'judge', 'second', 'viewer'];
  const days = c.days?.map(day => date(day)) ?? [];
  const firstDay = days[0];
  const lastDay = days.at(-1);
  const dates = firstDay && lastDay && firstDay !== lastDay
    ? (firstDay.slice(3) === lastDay.slice(3) ? firstDay.slice(0, 2) : firstDay) + '–' + lastDay
    : firstDay ?? date(firstBlock?.start || firstDeadline);
  const startsAt = c.starts_at || firstBlock?.start;
  const timeUtc = startsAt ? `${time(startsAt)} UTC` : '';
  const mode = c.mode ?? '';
  const format = { classic: 'Классика', team: 'Командный', express: 'Экспресс' }[c.format];
  return { id: c.id, name: c.title.replace(/ \(демо\)$/, ''), format: c.format,
    dates, timeUtc, mode, reviewDemo: c.review_demo,
    description: [`Формат: ${format}`, [dates, timeUtc, mode].filter(value => value && value !== '—').join(' · ')].filter(Boolean).join('\n'),
    roleWindows: roles.map(role => {
      const unsuitable = role === 'second' && c.format !== 'classic';
      const open = !unsuitable && Boolean(c.open_roles[ROLE_TO_API[role]]);
      return { role, open, deadline: c.deadlines[ROLE_TO_API[role]] ? date(c.deadlines[ROLE_TO_API[role]]) : '',
        labelSuffix: role === 'player' && c.format === 'team' ? '(команда из 2)' : undefined,
        closedReason: unsuitable ? 'Только для классики' : open ? undefined : 'Регистрация закрыта' };
    }),
    availabilityBlocks: selectableBlocks.map(b => ({ id: b.id,
      time: `${date(b.start)} ${time(b.start)}–${time(b.end)}`, title: b.title,
      parallelDuels: b.parallel_duels ?? 0, panelSize: b.panel_size ?? (c.format === 'express' ? 5 : 9), reserve: b.reserve ?? 0 })), players };
}
function mapPlayer(p: ApiPlayer, competitionId?: string): TournamentPlayer {
  return { id: p.id, name: p.name, club: p.club,
    city: p.city, inTournament: Boolean(competitionId), isSelf: p.id === currentUserId() };
}

export async function getTournaments(): Promise<Tournament[]> {
  return (await request<ApiCompetition[]>('/competitions')).map(c => mapTournament(c));
}
export async function getTournament(id: string): Promise<Tournament | undefined> {
  try {
    const [competition, players] = await Promise.all([
      request<ApiCompetition>(`/competitions/${encodeURIComponent(id)}`),
      session() ? request<ApiPlayer[]>(`/players?competition_id=${encodeURIComponent(id)}`) : Promise.resolve([]),
    ]);
    return mapTournament(competition, players.map(p => mapPlayer(p, id)));
  } catch (error) {
    if (error instanceof ApiError && error.code === '404') return undefined;
    throw error;
  }
}
export async function searchPlayers(search: string): Promise<TournamentPlayer[]> {
  return (await request<ApiPlayer[]>(`/players?search=${encodeURIComponent(search)}`)).map(p => mapPlayer(p));
}

export async function requestCode(email: string): Promise<void> { await request('/auth/request-code', json({ email })); }
export async function login(email: string, code: string, lastName = '', firstName = ''): Promise<Profile> {
  const result = await request<{ token: string; user_id: string }>('/auth/verify', json({ email, code }));
  sessionStorage.setItem(SESSION_KEY, JSON.stringify({ token: result.token, userId: result.user_id, email }));
  const profile = await getProfile();
  if (profile) return profile;
  return saveProfile({ lastName, firstName, country: '', city: '' });
}
export async function logout(): Promise<void> {
  try { if (session()) await request('/auth/logout', json({})); }
  finally { sessionStorage.removeItem(SESSION_KEY); }
}
export async function getProfile(): Promise<Profile | null> {
  if (!session()) return null;
  try {
    const me = await request<{ profile: ApiProfile | null }>('/auth/me');
    return me.profile ? mapProfile(me.profile) : null;
  } catch (error) {
    if (error instanceof ApiError && error.code === '401') { sessionStorage.removeItem(SESSION_KEY); return null; }
    throw error;
  }
}
export async function saveProfile(patch: Partial<ApplicationForm>): Promise<Profile> {
  const current = session();
  if (!current) throw new ApiError('login-required', 'Сначала войдите по email');
  const before = await getProfile();
  const form: ApplicationForm = { lastName: '', firstName: '', country: '', city: '', ...before, ...patch };
  const profile = toApiProfile(form, current.userId, current.email);
  return mapProfile(await request<ApiProfile>('/users/me/profile', { method: 'PUT', body: JSON.stringify(profile) }));
}
export async function getApplications(): Promise<Application[]> {
  const current = session();
  if (!current) return [];
  return (await request<ApiApplication[]>(`/users/${current.userId}/applications`)).map(mapApplication);
}
export async function getOrganizerApplications(): Promise<Application[]> {
  if (!sessionStorage.getItem(ORGANIZER_KEY)) return [];
  const competitions = await request<ApiCompetition[]>('/competitions');
  const groups = await Promise.all(competitions.map(c => request<ApiApplication[]>(
    `/organizer/competitions/${encodeURIComponent(c.id)}/applications`, {}, 'organizer')));
  return groups.flat().map(mapApplication);
}
export async function findApplication(tournamentId: string): Promise<Application | undefined> {
  return (await getApplications()).find(a => a.tournamentId === tournamentId && a.status !== 'withdrawn');
}
export function resolveRoleBlockReason(tournament: Tournament, role: Role, applications: Application[]): string | null {
  const active = applications.filter(a => a.tournamentId === tournament.id && a.status !== 'withdrawn');
  const window = tournament.roleWindows.find(w => w.role === role);
  if (!window?.open) return window?.closedReason || 'Регистрация закрыта';
  if (role === 'judge' && tournament.availabilityBlocks.length === 0) return 'Судейские слоты ещё не открыты';
  if (role === 'second' && tournament.format !== 'classic') return 'Только для классических турниров';
  if (active.some(a => a.role === role)) return 'Заявка в этой роли уже есть';
  if (active.length && !(role === 'second' && active.some(a => a.role === 'player'))) return 'Несовместимо с уже поданной заявкой';
  return null;
}
export interface SubmitApplicationPayload {
  tournamentId: string; role: Role; form: ApplicationForm; partnerId?: string;
  secondingPlayerIds?: string[]; availabilityBlockIds?: string[]; applicationId?: string;
}
export async function submitApplication(payload: SubmitApplicationPayload): Promise<Application> {
  const current = session();
  if (!current) throw new ApiError('login-required', 'Сначала войдите по email');
  const body = { competition_id: payload.tournamentId, role: ROLE_TO_API[payload.role],
    profile: toApiProfile(payload.form, current.userId, current.email), partner_user_id: payload.partnerId || null,
    advised_player_ids: payload.secondingPlayerIds || [], availability_block_ids: payload.availabilityBlockIds || [],
    consents: { rules: true, pd: true, media: true } };
  const result = await request<{ id: string }>('/applications', json(body));
  const application = (await getApplications()).find(a => a.id === result.id);
  if (!application) throw new ApiError('not-found', 'Заявка сохранена, но не найдена в списке. Обновите страницу.');
  return application;
}
export async function withdrawApplication(applicationId: string): Promise<Application> {
  return mapApplication(await request<ApiApplication>(`/applications/${encodeURIComponent(applicationId)}/withdraw`, json({})));
}
export interface TeamInvitation { inviterId: string; inviterName: string; tournamentId: string }
export async function getTeamInvitations(tournamentId: string): Promise<TeamInvitation[]> {
  const userId = currentUserId();
  if (!userId) return [];
  const invitations = await request<Array<{ inviter_id: string; inviter_name: string }>>(
    `/competitions/${encodeURIComponent(tournamentId)}/team-invitations?user_id=${encodeURIComponent(userId)}`);
  return invitations.map(i => ({ inviterId: i.inviter_id, inviterName: i.inviter_name, tournamentId }));
}
export async function answerTeamInvitation(tournamentId: string, inviterId: string, accept: boolean): Promise<void> {
  const userId = currentUserId();
  if (!userId) throw new ApiError('login-required', 'Сначала войдите по email');
  await request(`/competitions/${encodeURIComponent(tournamentId)}/team/${accept ? 'confirm' : 'decline'}`,
    json({ user_id: userId, inviter_id: inviterId }));
}

export interface OrganizerAuth { email: string }
export async function getOrganizerAuth(): Promise<OrganizerAuth | null> {
  if (!sessionStorage.getItem(ORGANIZER_KEY)) return null;
  try {
    return await request<OrganizerAuth>('/organizer/me', {}, 'organizer');
  } catch (error) {
    if (!(error instanceof ApiError) || error.code !== '401') throw error;
    sessionStorage.removeItem(ORGANIZER_KEY);
    return null;
  }
}
export async function organizerLogin(email: string, password: string): Promise<OrganizerAuth> {
  const result = await request<OrganizerAuth & { token: string }>('/organizer/login', json({ email, password }), 'organizer');
  sessionStorage.setItem(ORGANIZER_KEY, result.token);
  return { email: result.email };
}
export async function organizerLogout(): Promise<void> {
  try {
    if (sessionStorage.getItem(ORGANIZER_KEY)) await request('/organizer/logout', json({}), 'organizer');
  } finally {
    sessionStorage.removeItem(ORGANIZER_KEY);
  }
}
export async function setEntryStatus(applicationId: string, status: Application['status']): Promise<Application> {
  const result = await request<ApiApplication>(
    `/organizer/applications/${encodeURIComponent(applicationId)}/status?status=${status}`, json({}), 'organizer');
  return mapApplication(result);
}

export interface ReviewAssignment {
  judge_id: string; collegium: string; score: number; reasons: string[];
}
export interface ReviewPlan {
  id: string; title: string; start: string; complete: boolean;
  judge_scores: Record<string, Record<string, number>>;
  reserve_scores: Record<string, Record<string, number>>;
  proposal: { assignments: ReviewAssignment[]; reserve: string[]; missing: Record<string, number> };
}
export interface ReviewIssue {
  game_id: string; block_id: string; needed: number; suggestions: { id: string; label: string }[];
  can_resolve: boolean;
}
export interface ReviewState {
  plans: ReviewPlan[]; issues: ReviewIssue[]; panel_size: number; reserve: number;
}
export async function getReview(id: string): Promise<ReviewState | null> {
  try { return await request<ReviewState>(`/organizer/competitions/${encodeURIComponent(id)}/review`, {}, 'organizer'); }
  catch (e) { if (e instanceof ApiError && e.code === '404') return null; throw e; }
}
export function applyReview(id: string, game: string): Promise<ReviewState> {
  return request(`/organizer/competitions/${encodeURIComponent(id)}/review/${encodeURIComponent(game)}/apply`, json({}), 'organizer');
}
