import type { Application, ApplicationForm, Format, Profile, Role, Tournament } from '@/types';
import {
  CURRENT_USER_ID,
  INITIAL_APPLICATIONS,
  ROLE_LABELS,
  ROLE_ORDER,
  STATUS_LABELS,
  TOURNAMENTS,
} from '@/data/mock';

/**
 * Мок-API фронтенда.
 * Повторяет контракт будущего backend USN (Django): те же проверки, те же коды ошибок.
 * При подключении реального API методы заменяются на fetch, UI не меняется.
 */

const STORAGE_KEY = 'usn.demo.v1';
const API_DELAY_MS = 350;

export interface OrganizerAuth {
  email: string;
}

interface DemoDb {
  profile: Profile | null;
  applications: Application[];
  /** Демо-заявки других участников для организаторских экранов (изменяемые) */
  organizerEntries: Application[];
  /** Турниры, созданные организатором в приложении */
  tournaments: Tournament[];
  /** Демо-сессия организатора (не production-аутентификация) */
  organizerAuth: OrganizerAuth | null;
}

const DEFAULT_DB: DemoDb = {
  profile: null,
  applications: INITIAL_APPLICATIONS,
  organizerEntries: getOrganizerSeed(),
  tournaments: [],
  organizerAuth: null,
};

function loadDb(): DemoDb {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<DemoDb>;
      return {
        profile: parsed.profile ?? null,
        applications: parsed.applications ?? INITIAL_APPLICATIONS,
        // Старые сохранения без орг-заявок получают актуальный сид
        organizerEntries: parsed.organizerEntries ?? getOrganizerSeed(),
        tournaments: parsed.tournaments ?? [],
        organizerAuth: parsed.organizerAuth ?? null,
      };
    }
  } catch {
    // повреждённые данные игнорируем — начнём с дефолтного состояния
  }
  return DEFAULT_DB;
}

function saveDb(db: DemoDb): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch {
    // приватный режим — работаем без персистентности
  }
}

let db: DemoDb = loadDb();

function delay<T>(value: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), API_DELAY_MS));
}

function nowStamp(): string {
  return new Date().toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getTournaments(): Promise<Tournament[]> {
  return delay([...db.tournaments, ...TOURNAMENTS]);
}

export function getTournament(id: string): Promise<Tournament | undefined> {
  return delay(findTournament(id));
}

/** Поиск среди созданных организатором и демо-турниров */
export function findTournament(id: string): Tournament | undefined {
  return db.tournaments.find((t) => t.id === id) ?? TOURNAMENTS.find((t) => t.id === id);
}

export function getProfile(): Promise<Profile | null> {
  return delay(db.profile);
}

export function saveProfile(patch: Partial<ApplicationForm>): Promise<Profile> {
  const base: Profile =
    db.profile ??
    ({
      id: CURRENT_USER_ID,
      email: '',
      filled: false,
      lastName: '',
      firstName: '',
      country: '',
      city: '',
    } satisfies Profile);
  db.profile = { ...base, ...patch };
  db.profile.filled = Boolean(db.profile.lastName && db.profile.firstName && db.profile.country && db.profile.city);
  saveDb(db);
  return delay(db.profile);
}

/** U2: вход по email; новый email → создаём аккаунт */
export function login(email: string, lastName?: string, firstName?: string): Promise<Profile> {
  const profile: Profile =
    db.profile ?? {
      id: CURRENT_USER_ID,
      email,
      filled: false,
      lastName: lastName ?? '',
      firstName: firstName ?? '',
      country: '',
      city: '',
    };
  if (!db.profile) db.profile = profile;
  saveDb(db);
  return delay(db.profile);
}

export function getApplications(): Promise<Application[]> {
  return delay(db.applications);
}

/** O2/O2a: демо-заявки других участников (подтверждение статусов сохраняется) */
export function getOrganizerApplications(): Promise<Application[]> {
  return delay(db.organizerEntries);
}

export function findApplication(tournamentId: string): Promise<Application | undefined> {
  return delay(
    db.applications.find(
      (a) => a.tournamentId === tournamentId && a.userId === CURRENT_USER_ID && a.status !== 'withdrawn',
    ),
  );
}

export class ApiError extends Error {
  /** Машиночитаемый код для UI */
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

/** Может ли пользователь выбрать роль (логика U4) */
export function resolveRoleBlockReason(
  tournament: Tournament,
  role: Role,
  applications: Application[],
): string | null {
  const active = applications.filter((a) => a.tournamentId === tournament.id && a.status !== 'withdrawn');
  // Регистрация судей не открывается без блоков доступности (правило USN, обновление 11.2026)
  if (role === 'judge' && tournament.availabilityBlocks.length === 0) {
    return 'Судейские слоты ещё не открыты';
  }
  const window = tournament.roleWindows.find((w) => w.role === role);
  if (!window || !window.open) {
    return window?.closedReason
      ? `${window.closedReason}`
      : `Регистрация закрыта${window?.deadline ? ` ${window.deadline}` : ''}`;
  }
  const alreadyPlayer = active.some((a) => a.role === 'player');
  const hasSameRole = active.some((a) => a.role === role);
  if (hasSameRole && !(alreadyPlayer && role === 'second')) {
    return 'Вы уже подали заявку в этой роли';
  }
  if (role === 'second' && tournament.format !== 'classic') {
    return 'Только для классических турниров';
  }
  // Единственное допустимое сочетание: Игрок + Секундант другого игрока
  if (active.length > 0 && !(alreadyPlayer && role === 'second')) {
    return 'Несовместимо с уже поданной заявкой';
  }
  return null;
}

export interface SubmitApplicationPayload {
  tournamentId: string;
  role: Role;
  form: ApplicationForm;
  partnerId?: string;
  secondingPlayerIds?: string[];
  availabilityBlockIds?: string[];
  /** Редактирование существующей заявки (после статуса «Получена») */
  applicationId?: string;
}

/** U7: серверная проверка и создание заявки */
export async function submitApplication(payload: SubmitApplicationPayload): Promise<Application> {
  // Турнир ищем и среди демо-сидов, и среди созданных организатором
  const tournament = findTournament(payload.tournamentId);
  if (!tournament) throw new ApiError('no-tournament', 'Турнир не найден');

  const window = tournament.roleWindows.find((w) => w.role === payload.role);
  if (!window?.open) {
    throw new ApiError(
      'role-closed',
      `Регистрация в роли «${ROLE_LABELS[payload.role]}» закрылась${window?.deadline ? ` ${window.deadline}` : ''}. Ваши данные сохранены.`,
    );
  }
  // Судейские слоты не созданы — заявки без слотов не принимаются (правило 11.2026)
  if (payload.role === 'judge' && tournament.availabilityBlocks.length === 0) {
    throw new ApiError('no-slots', 'Судейские слоты ещё не открыты. Заявка не отправлена, ваши данные сохранены.');
  }

  const active = db.applications.filter(
    (a) => a.tournamentId === payload.tournamentId && a.userId === CURRENT_USER_ID && a.status !== 'withdrawn',
  );
  const duplicate = active.find((a) => a.id !== payload.applicationId && a.role === payload.role);
  if (duplicate && !(payload.role === 'second' && active.some((a) => a.role === 'player'))) {
    throw new ApiError('duplicate', 'Заявка в этой роли уже существует');
  }

  const missing: string[] = [];
  if (!payload.form.lastName.trim()) missing.push('Фамилия');
  if (!payload.form.firstName.trim()) missing.push('Имя');
  if (!payload.form.country.trim()) missing.push('Страна');
  if (!payload.form.city.trim()) missing.push('Город');
  if (payload.role === 'judge' && !payload.availabilityBlockIds?.length) {
    throw new ApiError('no-availability', 'Отметьте хотя бы один блок доступности');
  }
  if (payload.role === 'second' && !payload.secondingPlayerIds?.length) {
    throw new ApiError('no-seconding', 'Выберите хотя бы одного игрока');
  }
  if (payload.role === 'player' && tournament.format === 'team' && !payload.partnerId) {
    throw new ApiError('no-partner', 'Выберите напарника по команде');
  }
  if (missing.length > 0) {
    throw new ApiError('missing-fields', `Заполните обязательные поля: ${missing.join(', ')}`);
  }

  const existing = payload.applicationId
    ? db.applications.find((a) => a.id === payload.applicationId)
    : undefined;
  if (existing) {
    // Правка сохраняется в ту же заявку, без новой записи (логика U8)
    existing.form = payload.form;
    existing.partnerId = payload.partnerId;
    existing.secondingPlayerIds = payload.secondingPlayerIds ?? [];
    existing.availabilityBlockIds = payload.availabilityBlockIds ?? [];
    existing.updatedAt = new Date().toISOString();
    existing.history.push({ time: nowStamp(), text: 'Заявка отредактирована участником' });
    saveDb(db);
    return delay(existing);
  }

  const application: Application = {
    id: `a-${Date.now()}`,
    tournamentId: payload.tournamentId,
    userId: CURRENT_USER_ID,
    role: payload.role,
    status: 'received',
    form: payload.form,
    partnerId: payload.partnerId,
    secondingPlayerIds: payload.secondingPlayerIds ?? [],
    availabilityBlockIds: payload.availabilityBlockIds ?? [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    history: [{ time: nowStamp(), text: 'Заявка создана' }],
  };
  db.applications.push(application);
  saveDb(db);
  return delay(application);
}

export async function withdrawApplication(applicationId: string): Promise<Application> {
  const application = db.applications.find((a) => a.id === applicationId);
  if (!application) throw new ApiError('not-found', 'Заявка не найдена');
  application.status = 'withdrawn';
  application.updatedAt = new Date().toISOString();
  application.history.push({ time: nowStamp(), text: 'Заявка отозвана участником' });
  saveDb(db);
  return delay(application);
}

/* --- Организатор --- */

/**
 * Демо-аутентификация организатора.
 * НЕ production-grade: пароль проверяется локально, без сети и хеширования.
 * Реальный вход (Google OAuth / USN SSO) подключается на backend.
 */
export const DEMO_ORGANIZER = {
  email: 'organizer@usn.demo',
  password: 'organizer',
  name: 'Организатор USN',
};

export function getOrganizerAuth(): Promise<OrganizerAuth | null> {
  return delay(db.organizerAuth);
}

export async function organizerLogin(email: string, password: string): Promise<OrganizerAuth> {
  const normalized = email.trim().toLowerCase();
  if (normalized !== DEMO_ORGANIZER.email || password !== DEMO_ORGANIZER.password) {
    throw new ApiError('bad-credentials', 'Неверный email или пароль организатора');
  }
  db.organizerAuth = { email: DEMO_ORGANIZER.email };
  saveDb(db);
  return delay(db.organizerAuth);
}

export function organizerLogout(): void {
  db.organizerAuth = null;
  saveDb(db);
}

export interface CreateTournamentPayload {
  name: string;
  format: Format;
  dates: string;
  timeUtc: string;
  mode: string;
  description: string;
  /** Дедлайн регистрации игроков, «до 17.04»» */
  deadline: string;
}

const DATES_RE = /^\d{1,2}([.–]\d{1,2})?(–\d{1,2}([.–]\d{1,2})?)?$/;

/** Создание турнира организатором: валидация обязательных полей, сохранение в БД */
export async function createTournament(payload: CreateTournamentPayload): Promise<Tournament> {
  const name = payload.name.trim();
  const description = payload.description.trim();
  const mode = payload.mode.trim();
  const dates = payload.dates.trim();
  const deadline = payload.deadline.trim();

  const fieldErrors: Record<string, string> = {};
  if (name.length < 3) fieldErrors.name = 'Название — минимум 3 символа';
  if (description.length < 10) fieldErrors.description = 'Опишите формат проведения — минимум 10 символов';
  if (!mode) fieldErrors.mode = 'Укажите место проведения';
  if (!DATES_RE.test(dates)) fieldErrors.dates = 'Формат дат: «18–19.04» или «18.04»';
  if (payload.format !== 'classic' && payload.format !== 'team' && payload.format !== 'express') {
    fieldErrors.format = 'Выберите тип соревнования';
  }
  if (Object.keys(fieldErrors).length > 0) {
    throw new ApiError('validation', JSON.stringify(fieldErrors));
  }

  const sameName = [...db.tournaments, ...TOURNAMENTS].find((t) => t.name.toLowerCase() === name.toLowerCase());
  if (sameName) {
    throw new ApiError('validation', JSON.stringify({ name: 'Турнир с таким названием уже есть' }));
  }

  const dl = deadline.replace(/^до\s*/, '');
  const isClassic = payload.format === 'classic';
  const isExpress = payload.format === 'express';
  const tournament: Tournament = {
    id: `t-${Date.now()}`,
    name,
    format: payload.format,
    dates,
    timeUtc: payload.timeUtc.trim() || '12:00 UTC',
    mode,
    description: `${description}${dl ? `\nРегистрация до ${dl}.` : ''}`,
    // Окна ролей: секундант есть только в классике; блоки доступности не заданы → «Судейские слоты ещё не открыты»
    roleWindows: [
      {
        role: 'player',
        open: true,
        deadline: dl || dates,
        labelSuffix: dl ? `до ${dl}` : '',
        note: isClassic ? 'жеребьёвка в день турнира' : undefined,
      },
      { role: 'judge', open: true, deadline: dl || dates, labelSuffix: '' },
      { role: 'second', open: isClassic, deadline: dl || dates, closedReason: isClassic ? undefined : 'Секунданта нет — не классика' },
      { role: 'viewer', open: true, deadline: dl || dates, labelSuffix: '' },
    ],
    entryCounts: isClassic ? ['0', '0', '0', '0'] : isExpress ? ['0', '0', '—', '0'] : ['0', '0', '—', '0'],
    availabilityBlocks: [], // создаёт организатор (Django Admin); до блоков регистрация судей закрыта
    players: [],
  };
  db.tournaments.push(tournament);
  saveDb(db);
  return delay(tournament);
}

export async function setEntryStatus(
  applicationId: string,
  status: Application['status'],
): Promise<Application> {
  const application =
    db.applications.find((a) => a.id === applicationId) ??
    db.organizerEntries.find((a) => a.id === applicationId);
  if (!application) throw new ApiError('not-found', 'Заявка не найдена');
  application.status = status;
  application.updatedAt = new Date().toISOString();
  application.history.push({ time: nowStamp(), text: `Статус: Получена → ${STATUS_LABEL(status)}` });
  saveDb(db);
  return delay(application);
}

const STATUS_LABEL = (s: Application['status']) => STATUS_LABELS[s];

/** Демо-заявки для организаторских экранов (добавляются к заявкам пользователя) */
export function getOrganizerSeed(): Application[] {
  const t = TOURNAMENTS[0]!;
  const mk = (
    id: string,
    role: Role,
    name: [string, string],
    status: Application['status'],
    extra: Partial<Application> = {},
  ): Application => ({
    id,
    tournamentId: t.id,
    userId: `u-${id}`,
    role,
    status,
    form: {
      lastName: name[0]!,
      firstName: name[1]!,
      country: 'Россия',
      city: extra.form?.city ?? 'Екатеринбург',
      club: extra.form?.club ?? 'УШП',
      position: extra.form?.position ?? '—',
      company: extra.form?.company ?? 'ООО «Пример»',
    },
    secondingPlayerIds: [],
    availabilityBlockIds: [],
    createdAt: '2026-03-01T09:00:00Z',
    updatedAt: '2026-03-05T12:00:00Z',
    history: [{ time: '01.03 09:00', text: 'заявка получена' }],
    ...extra,
  });

  // Судья из прототипа O2/O2a: подтверждён, история и блоки — по референсу
  const judge057 = mk('o-j-JUDGE_057', 'judge', ['JUDGE_057', ''], 'confirmed', {
    publicId: 'JUDGE_057',
    form: {
      lastName: 'JUDGE_057',
      firstName: '',
      country: 'Россия',
      city: 'Казань',
      club: 'Клуб переговоров «Диалог»',
      position: 'HR-директор',
      company: 'Клуб переговоров «Диалог»',
    },
    availabilityBlockIds: ['b1', 'b3', 'b5'],
    history: [
      { time: '15.09 19:42', text: 'заявка получена' },
      { time: '16.09 10:05', text: 'подтверждена (Вера В.)' },
      { time: '20.09 12:00', text: 'изменена доступность' },
    ],
  });

  // Остальные демо-заявки по прототипу O2: игрок «ждёт напарника», зритель
  return [
    judge057,
    mk('o-p1', 'player', ['Сидоров', 'Антон'], 'received', {
      note: 'ждёт напарника',
      form: { lastName: 'Сидоров', firstName: 'Антон', country: 'Россия', city: 'Красноярск' },
    }),
    mk('o-v1', 'viewer', ['Смирнова', 'Анна'], 'received', {
      form: { lastName: 'Смирнова', firstName: 'Анна', country: 'Россия', city: 'Минск' },
    }),
  ];
}

/** Роли, доступные для выбора (порядок U4) */
export const ALL_ROLES: Role[] = ROLE_ORDER;
