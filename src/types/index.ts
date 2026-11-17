export type Role = 'player' | 'judge' | 'second' | 'viewer';

export type Format = 'classic' | 'team' | 'express';

export type ApplicationStatus = 'received' | 'confirmed' | 'rejected' | 'withdrawn';

export interface RoleWindow {
  role: Role;
  /** Свободна ли регистрация в роли сейчас */
  open: boolean;
  /** Дата закрытия, формат «19.03» */
  deadline: string;
  /** Дополнительная подпись на чипе, например «(команда из 2)» */
  labelSuffix?: string;
  /** Причина закрытия роли */
  closedReason?: string;
  /** Уточнение в карточке турнира, например «жеребьёвка 20.03» (U3) */
  note?: string;
}

export interface Tournament {
  id: string;
  name: string;
  format: Format;
  /** Короткая строка дат, «21–22.03» */
  dates: string;
  /** Время начала по UTC, «06:00 UTC» */
  timeUtc: string;
  /** Формат проведения, «онлайн (Zoom)» */
  mode: string;
  /** Полное описание для карточки турнира (U3) */
  description: string;
  roleWindows: RoleWindow[];
  /** Сводка заявок для организатора, «32 / 38 / 9 / 40» */
  entryCounts?: [string, string, string, string];
  /** Блоки доступности судей (создаются организатором в Django Admin) */
  availabilityBlocks: AvailabilityBlock[];
  players: TournamentPlayer[];
}

export interface AvailabilityBlock {
  id: string;
  /** «21.03 06:00–08:30» */
  time: string;
  /** «Групповой этап, 1–2 круг» */
  title: string;
  /** Сколько поединков идёт одновременно */
  parallelDuels: number;
  /** Состав судей на поединок (по регламенту, ИИ не меняет) */
  panelSize: number;
  /** Резерв по регламенту */
  reserve: number;
}

export interface TournamentPlayer {
  id: string;
  name: string;
  club?: string;
  city?: string;
  /** Заявлен ли игрок на конкретный турнир (для U6b) */
  inTournament: boolean;
  /** Сам пользователь — выбирать себя нельзя (U6b) */
  isSelf?: boolean;
}

export interface Application {
  id: string;
  tournamentId: string;
  userId: string;
  role: Role;
  status: ApplicationStatus;
  /** Анкетные данные (копия профиля на момент отправки) */
  form: ApplicationForm;
  /** Напарник (U6a, командный формат) */
  partnerId?: string;
  /** Кому секундирую (U6b, классика) */
  secondingPlayerIds: string[];
  /** Отмеченные блоки доступности (U6c, судья) */
  availabilityBlockIds: string[];
  createdAt: string;
  updatedAt: string;
  /** История изменений (O2a) */
  history: HistoryEvent[];
  /** Публичный обезличенный ID судьи в орг-интерфейсе, «JUDGE_057» */
  publicId?: string;
  /** Текстовая связь из прототипа, например «ждёт напарника» (демо-подсказка) */
  note?: string;
}

export interface ApplicationForm {
  lastName: string;
  firstName: string;
  country: string;
  city: string;
  club?: string;
  position?: string;
  company?: string;
  displayName?: string;
  telegram?: string;
  vk?: string;
}

export interface HistoryEvent {
  time: string;
  text: string;
}

export interface Profile extends ApplicationForm {
  id: string;
  email: string;
  filled: boolean;
}

/** Пара баллов двух экспертов: ОС и КС (1–3) */
export type ScorePair = [number, number];

/** Экспертные баллы судьи по коллегиям + экспресс («жёсткие переговоры») */
export interface JudgeScores {
  judgeId: string;
  /** Баллы по коллегиям, пара [ОС, КС] */
  scores: Record<string, ScorePair>;
  /** Экспресс: способность судить экспресс-поединки ([ОС, КС]) — не отдельный балл переговоров */
  hardNegotiations?: ScorePair;
  position: string;
  company: string;
  club?: string;
  city?: string;
}
