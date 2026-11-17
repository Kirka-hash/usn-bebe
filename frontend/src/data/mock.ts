import type {
  Application,
  AvailabilityBlock,
  JudgeScores,
  Role,
  ScorePair,
  Tournament,
  TournamentPlayer,
} from '@/types';

export const ROLE_LABELS: Record<Role, string> = {
  player: 'Игрок',
  judge: 'Судья',
  second: 'Секундант',
  viewer: 'Зритель',
};

export const STATUS_LABELS: Record<Application['status'], string> = {
  received: 'Получена',
  confirmed: 'Подтверждена',
  rejected: 'Отклонена',
  withdrawn: 'Отозвана',
};

export const ROLE_ORDER: Role[] = ['player', 'judge', 'second', 'viewer'];

/* --- Коллегии (актуальные названия по обновлённому прототипу) --- */

export const COLLEGES: Record<string, string> = {
  c1: '«Нанимающиеся на работу»',
  c2: '«Отправляющие»',
  c3: '«Доверяющие»',
};

/** Краткие названия для колонок таблиц (O2a, O4) */
export const COLLEGE_SHORT: Record<string, string> = {
  c1: 'Нанимающиеся',
  c2: 'Отправляющие',
  c3: 'Доверяющие',
};

export const COLLEGE_ORDER = ['c1', 'c2', 'c3'] as const;

/** Четвёртая колонка оценок — экспресс («жёсткие переговоры») */
export const EXPRESS_COLUMN_TITLE = 'Экспресс («жёсткие перег.»)';

/* --- Блоки доступности турнира «Кубок Вызова 2026 · Классика» --- */

export const AVAILABILITY_BLOCKS: AvailabilityBlock[] = [
  { id: 'b1', time: '21.03 06:00–08:30', title: 'Групповой этап, 1–2 круг', parallelDuels: 1, panelSize: 9, reserve: 3 },
  { id: 'b2', time: '21.03 09:00–11:30', title: 'Групповой этап, 3 круг', parallelDuels: 1, panelSize: 9, reserve: 3 },
  { id: 'b3', time: '21.03 11:50–14:30', title: '1/4 финала', parallelDuels: 1, panelSize: 9, reserve: 3 },
  { id: 'b4', time: '22.03 09:00–11:30', title: '1/2 финала', parallelDuels: 1, panelSize: 7, reserve: 5 },
  { id: 'b5', time: '22.03 13:40–15:50', title: 'Финал', parallelDuels: 1, panelSize: 9, reserve: 3 },
];

/** Список судей: первые 4 — как в таблице O3 прототипа, всего 38 («... ещё 34 судьи») */
export const JUDGE_ROSTER: string[] = [
  'JUDGE_018', 'JUDGE_057', 'JUDGE_071', 'JUDGE_113',
  'JUDGE_001', 'JUDGE_002', 'JUDGE_003', 'JUDGE_004', 'JUDGE_005', 'JUDGE_006',
  'JUDGE_007', 'JUDGE_008', 'JUDGE_009', 'JUDGE_010', 'JUDGE_011', 'JUDGE_013',
  'JUDGE_014', 'JUDGE_019', 'JUDGE_020', 'JUDGE_021', 'JUDGE_034', 'JUDGE_040',
  'JUDGE_042', 'JUDGE_045', 'JUDGE_048', 'JUDGE_053', 'JUDGE_059', 'JUDGE_061',
  'JUDGE_064', 'JUDGE_066', 'JUDGE_068', 'JUDGE_073', 'JUDGE_079', 'JUDGE_082',
  'JUDGE_085', 'JUDGE_090', 'JUDGE_095', 'JUDGE_104',
];

/**
 * Отметки доступности судей по блокам (матрица O3).
 * Согласовано с итоговой строкой прототипа: b1 14/12, b2 10/12, b3 12/12, b4 7/12, b5 13/12 —
 * и с чипами O3 (14/12 зелёный, 10/12 красный, 12/12 жёлтый, 7/12 красный, 13/12 зелёный).
 */
export const JUDGE_AVAILABILITY: Record<string, string[]> = {
  b1: ['JUDGE_018', 'JUDGE_057', 'JUDGE_071', 'JUDGE_113', 'JUDGE_001', 'JUDGE_002', 'JUDGE_003', 'JUDGE_006', 'JUDGE_007', 'JUDGE_009', 'JUDGE_010', 'JUDGE_008', 'JUDGE_019', 'JUDGE_020'],
  b2: ['JUDGE_018', 'JUDGE_071', 'JUDGE_001', 'JUDGE_003', 'JUDGE_006', 'JUDGE_009', 'JUDGE_010', 'JUDGE_005', 'JUDGE_002', 'JUDGE_020'],
  b3: ['JUDGE_057', 'JUDGE_001', 'JUDGE_002', 'JUDGE_004', 'JUDGE_005', 'JUDGE_006', 'JUDGE_008', 'JUDGE_010', 'JUDGE_013', 'JUDGE_014', 'JUDGE_020', 'JUDGE_021'],
  b4: ['JUDGE_018', 'JUDGE_113', 'JUDGE_002', 'JUDGE_005', 'JUDGE_011', 'JUDGE_019', 'JUDGE_034'],
  b5: ['JUDGE_057', 'JUDGE_071', 'JUDGE_113', 'JUDGE_001', 'JUDGE_003', 'JUDGE_004', 'JUDGE_006', 'JUDGE_010', 'JUDGE_013', 'JUDGE_019', 'JUDGE_021', 'JUDGE_034', 'JUDGE_040'],
};

/** Всего судей в ростере (для строки «… ещё N судьи» в O3) */
export const JUDGE_ROSTER_TOTAL = 38;

/* --- Турниры --- */

export const TOURNAMENTS: Tournament[] = [
  {
    id: 'challenge-2026',
    name: 'Кубок Вызова 2026 · Классика',
    format: 'classic',
    dates: '21–22.03',
    timeUtc: '06:00 UTC',
    mode: 'онлайн (Zoom)',
    description:
      'Формат: классическая управленческая борьба, 9 судей в коллегии.\n21–22.03.2026 · онлайн в Zoom',
    roleWindows: [
      { role: 'player', open: true, deadline: '19.03', labelSuffix: 'до 19.03', note: 'жеребьёвка 20.03' },
      { role: 'judge', open: true, deadline: '19.03', labelSuffix: 'до 19.03' },
      { role: 'second', open: true, deadline: '19.03', labelSuffix: '', note: 'только классика' },
      { role: 'viewer', open: true, deadline: '19.03', labelSuffix: '' },
    ],
    entryCounts: ['32', '38', '9', '40'],
    availabilityBlocks: AVAILABILITY_BLOCKS,
    players: [
      { id: 'u-petrov', name: 'Петров Илья', club: 'УШП', inTournament: true },
      { id: 'u-kozlova', name: 'Козлова Мария', club: 'СразуДа', inTournament: true },
      { id: 'u-self', name: 'Иванов Пётр', club: 'УШП', city: 'Екатеринбург', inTournament: true, isSelf: true },
    ],
  },
  {
    id: 'cooperation-2026',
    name: 'Кубок Сотрудничества · Командный',
    format: 'team',
    dates: '04.04',
    timeUtc: '07:00 UTC',
    mode: 'онлайн (Zoom)',
    description: 'Формат: командная управленческая борьба, команды из 2 игроков.\n04.04.2026 · онлайн в Zoom',
    roleWindows: [
      { role: 'player', open: true, deadline: '02.04', labelSuffix: '(команда из 2)' },
      { role: 'judge', open: true, deadline: '02.04', labelSuffix: '' },
      { role: 'second', open: false, deadline: '', closedReason: 'Секунданта нет — не классика' },
      { role: 'viewer', open: true, deadline: '02.04', labelSuffix: '' },
    ],
    entryCounts: ['24', '21', '—', '15'],
    availabilityBlocks: [
      { id: 'b1', time: '04.04 07:00–09:30', title: 'Групповой этап', parallelDuels: 5, panelSize: 7, reserve: 1 },
      { id: 'b2', time: '04.04 10:00–12:30', title: '1/2 финала', parallelDuels: 2, panelSize: 7, reserve: 1 },
      { id: 'b3', time: '04.04 13:00–15:00', title: 'Финал', parallelDuels: 1, panelSize: 7, reserve: 1 },
    ],
    players: [],
  },
  {
    id: 'strategy-2026',
    name: 'Кубок Стратегии · Экспресс',
    format: 'express',
    dates: '10.10',
    timeUtc: '06:00 UTC',
    mode: 'онлайн (Zoom)',
    description: 'Формат: экспресс-поединки, 5 судей + 1 резерв.\n10.10.2026 · онлайн в Zoom',
    roleWindows: [
      { role: 'player', open: false, deadline: '08.10', closedReason: 'Игроки: регистрация закрыта' },
      { role: 'judge', open: true, deadline: '08.10', labelSuffix: 'до 08.10' },
      { role: 'second', open: false, deadline: '', closedReason: 'Секунданта нет — не классика' },
      { role: 'viewer', open: true, deadline: '08.10', labelSuffix: '' },
    ],
    entryCounts: ['28', '14', '—', '22'],
    availabilityBlocks: [
      { id: 'b1', time: '10.10 06:00–07:30', title: 'Экспресс, 1–2 круг', parallelDuels: 8, panelSize: 5, reserve: 1 },
      { id: 'b2', time: '10.10 08:00–09:30', title: 'Финал', parallelDuels: 1, panelSize: 5, reserve: 1 },
    ],
    players: [],
  },
];

/** Игроки, зарегистрированные в USN как игроки (U6a — не только этого турнира) */
export const USN_PLAYERS: TournamentPlayer[] = [
  { id: 'u-sidorov', name: 'Сидоров Антон', city: 'Красноярск', inTournament: false },
  { id: 'u-smirnova', name: 'Смирнова Анна', city: 'Минск', inTournament: false },
  { id: 'u-petrov', name: 'Петров Илья', club: 'УШП', inTournament: true },
  { id: 'u-kozlova', name: 'Козлова Мария', club: 'СразуДа', inTournament: true },
  { id: 'u-volkov', name: 'Волков Дмитрий', city: 'Новосибирск', inTournament: false },
];

export const CURRENT_USER_ID = 'u-self';
export const CURRENT_USER_NAME = 'Иванов Пётр';

/* --- Баллы экспертов (O2a, O4) --- */

const pair = (os: number, ks: number): ScorePair => [os, ks];

/** Баллы ОС/КС по трём коллегиям; гарантированы значения из панелей O4 (JUDGE_003 → 3 и т. д.) */
export const JUDGE_SCORES: JudgeScores[] = [
  { judgeId: 'JUDGE_018', scores: { c1: pair(2, 2), c2: pair(3, 3), c3: pair(2, 2) }, hardNegotiations: pair(3, 2), position: 'HR-директор', company: 'ООО «Вектор»', club: 'Школа «Максимум»', city: 'Казань' },
  { judgeId: 'JUDGE_057', scores: { c1: pair(2, 2), c2: pair(3, 3), c3: pair(2, 2) }, hardNegotiations: pair(3, 2), position: 'HR-директор', company: 'Клуб переговоров «Диалог»', club: 'Клуб переговоров «Диалог»', city: 'Казань' },
  { judgeId: 'JUDGE_071', scores: { c1: pair(2, 2), c2: pair(2, 2), c3: pair(3, 3) }, hardNegotiations: pair(2, 2), position: 'Директор по стратегии', company: 'ООО «Пример»', club: 'УШП', city: 'Екатеринбург' },
  { judgeId: 'JUDGE_113', scores: { c1: pair(2, 2), c2: pair(2, 2), c3: pair(2, 2) }, hardNegotiations: pair(2, 3), position: 'Генеральный директор', company: 'ООО «Пример»', club: 'СразуДа', city: 'Москва' },
  ...['JUDGE_001', 'JUDGE_002', 'JUDGE_003', 'JUDGE_004', 'JUDGE_005', 'JUDGE_006', 'JUDGE_007', 'JUDGE_008', 'JUDGE_009', 'JUDGE_010', 'JUDGE_011', 'JUDGE_013', 'JUDGE_014', 'JUDGE_019', 'JUDGE_020', 'JUDGE_021'].map((judgeId) => ({
    judgeId,
    scores: deterministicScores(judgeId),
    hardNegotiations: deterministicScores(judgeId).c2,
    position: judgeId === 'JUDGE_003' ? 'HR-директор' : 'Генеральный директор',
    company: judgeId === 'JUDGE_003' ? 'ООО «Вектор»' : 'ООО «Пример»',
    club: judgeId === 'JUDGE_113' ? 'СразуДа' : 'УШП',
  })),
];

function hashOf(judgeId: string): number {
  let n = 0;
  for (const ch of judgeId) n = (n * 31 + ch.charCodeAt(0)) % 997;
  return n;
}

function deterministicScores(judgeId: string): { c1: ScorePair; c2: ScorePair; c3: ScorePair } {
  const h = hashOf(judgeId);
  const one = (offset: number): number => (h * (offset + 3)) % 3 + 1;
  return {
    c1: [one(1), one(2)],
    c2: [one(3), one(4)],
    c3: [one(5), one(6)],
  };
}

/** Баллы судьи по ID: из демо-списка либо детерминированный синтез (график одинаков между экранами) */
export function judgeScoresFor(judgeId: string): JudgeScores {
  const found = JUDGE_SCORES.find((j) => j.judgeId === judgeId);
  if (found) return found;
  const scores = deterministicScores(judgeId);
  return {
    judgeId,
    scores,
    hardNegotiations: scores.c2,
    position: 'Эксперт',
    company: 'ООО «Пример»',
    club: 'УШП',
  };
}

// Ключевые панели O4 заданы прототипом: JUDGE_003(3), JUDGE_006(3), JUDGE_018(2), JUDGE_001(3),
// JUDGE_009(3), JUDGE_057(3), JUDGE_007(3), JUDGE_071(2), JUDGE_010(2), JUDGE_113(2), JUDGE_005(3), JUDGE_002(2)
for (const judge of JUDGE_SCORES) {
  const fixed: Record<string, ScorePair> | undefined = ({
    JUDGE_003: { c1: pair(3, 3), c2: pair(3, 3), c3: pair(2, 2) },
    JUDGE_006: { c1: pair(3, 3), c2: pair(3, 3), c3: pair(2, 2) },
    JUDGE_018: { c1: pair(2, 2), c2: pair(3, 3), c3: pair(2, 2) },
    JUDGE_001: { c1: pair(3, 3), c2: pair(3, 3), c3: pair(2, 2) },
    JUDGE_009: { c1: pair(3, 3), c2: pair(3, 3), c3: pair(2, 2) },
    JUDGE_057: { c1: pair(2, 2), c2: pair(3, 3), c3: pair(2, 2) },
    JUDGE_007: { c1: pair(2, 2), c2: pair(3, 3), c3: pair(3, 3) },
    JUDGE_071: { c1: pair(2, 2), c2: pair(2, 2), c3: pair(2, 2) },
    JUDGE_010: { c1: pair(2, 2), c2: pair(2, 2), c3: pair(2, 2) },
    JUDGE_113: { c1: pair(2, 2), c2: pair(2, 2), c3: pair(2, 2) },
    JUDGE_005: { c1: pair(3, 3), c2: pair(3, 3), c3: pair(2, 2) },
    JUDGE_002: { c1: pair(2, 2), c2: pair(2, 2), c3: pair(2, 2) },
  })[judge.judgeId];
  if (fixed) judge.scores = fixed;
}

/* --- Коллегии: предложение ИИ (O4) --- */

/** Коллегия на поединке: 3 судьи по регламенту (9 = 3+3+3), ИИ состав не сокращает */
export interface CollegePanel {
  collegeId: string;
  /** Судьи панели с баллом по коллегии (среднее ОС/КС) */
  judges: Array<{ judgeId: string; score: string }>;
  /** Если судей не хватает (дефицит блока) */
  shortage?: number;
}

export interface DuelPlan {
  id: string;
  /** «21.03 06:20 · Гр. этап №1» */
  title: string;
  blockId: string;
  panels: CollegePanel[];
  /** Резервные судьи поединка (по регламенту 1–3) */
  reserves: string[];
  /** Проблемный поединок — ссылка «Разобрать» (O5) */
  issue?: boolean;
}

export const DUEL_PLANS: DuelPlan[] = [
  {
    id: 'd1',
    title: '21.03 06:20 · Гр. этап №1',
    blockId: 'b1',
    panels: [
      { collegeId: 'c1', judges: [jd('JUDGE_003', 'c1'), jd('JUDGE_006', 'c1'), jd('JUDGE_018', 'c1')] },
      { collegeId: 'c2', judges: [jd('JUDGE_001', 'c2'), jd('JUDGE_009', 'c2'), jd('JUDGE_057', 'c2')] },
      { collegeId: 'c3', judges: [jd('JUDGE_007', 'c3'), jd('JUDGE_071', 'c3'), jd('JUDGE_010', 'c3')] },
    ],
    reserves: ['JUDGE_004', 'JUDGE_008'],
  },
  {
    id: 'd2',
    title: '21.03 06:55 · Гр. этап №2',
    blockId: 'b1',
    panels: [
      { collegeId: 'c1', judges: [jd('JUDGE_003', 'c1'), jd('JUDGE_006', 'c1'), jd('JUDGE_113', 'c1')] },
      { collegeId: 'c2', judges: [jd('JUDGE_001', 'c2'), jd('JUDGE_005', 'c2'), jd('JUDGE_057', 'c2')] },
      { collegeId: 'c3', judges: [jd('JUDGE_007', 'c3'), jd('JUDGE_071', 'c3'), jd('JUDGE_002', 'c3')] },
    ],
    reserves: ['JUDGE_004'],
  },
  {
    id: 'd3',
    title: '21.03 09:00 · Гр. этап №5',
    blockId: 'b2',
    panels: [
      { collegeId: 'c1', judges: [], shortage: 2 },
      { collegeId: 'c2', judges: [jd('JUDGE_009', 'c2'), jd('JUDGE_018', 'c2'), jd('JUDGE_005', 'c2')] },
      { collegeId: 'c3', judges: [jd('JUDGE_071', 'c3'), jd('JUDGE_002', 'c3'), jd('JUDGE_007', 'c3')] },
    ],
    reserves: [],
    issue: true,
  },
];

/** Балл судьи в коллегии строкой («3», «2,5») */
function jd(judgeId: string, collegeId: string): { judgeId: string; score: string } {
  const src = JUDGE_SCORES.find((j) => j.judgeId === judgeId);
  const pairScores = src?.scores[collegeId];
  const avg = pairScores ? (pairScores[0] + pairScores[1]) / 2 : 0;
  return { judgeId, score: Number.isInteger(avg) ? String(avg) : avg.toFixed(1).replace('.', ',') };
}/* --- Проблемные поединки (O5) --- */

export interface IssueDuel {
  id: string;
  title: string;
  blockId: string;
  /** Чип риска */
  risk: string;
  riskVariant: 'red' | 'warn';
  reason: string;
}

export const ISSUE_DUELS: IssueDuel[] = [
  {
    id: 'd3',
    title: '21.03 09:00 · Гр. этап №5',
    blockId: 'b2',
    risk: 'не хватает 2',
    riskVariant: 'red',
    reason: 'в блоке 10 судей из 12',
  },
  {
    id: 'd-half',
    title: '22.03 09:00 · 1/2 финала',
    blockId: 'b4',
    risk: 'не хватает 5',
    riskVariant: 'red',
    reason: 'в блоке 7 из 12, финальная стадия',
  },
  {
    id: 'd-qf',
    title: '21.03 11:50 · 1/4 финала',
    blockId: 'b3',
    risk: 'без резерва',
    riskVariant: 'warn',
    reason: 'ровно 12 из 12',
  },
];

/** Варианты ИИ (задача «Б») */
export interface IssueCandidate {
  judgeId: string;
  /** «Отправляющие, 3/3», «— свободен с 09:00» */
  detail: string;
}

export interface IssueVariant {
  kind: 'А' | 'Б' | 'В';
  /** Заголовок карточки, «попросить судей соседнего блока задержаться» */
  title: string;
  candidates: IssueCandidate[];
  /** Текст после списка кандидатов (иаконный для варианта В) */
  note?: string;
  /** Стиль кнопки «Применить вариант» */
  accent: 'green' | 'outline';
}

export const ISSUE_VARIANTS: Record<string, IssueVariant[]> = {
  d3: [
    {
      kind: 'А',
      title: 'попросить судей соседнего блока задержаться',
      accent: 'green',
      candidates: [
        { judgeId: 'JUDGE_018', detail: '(Отправляющие, 3/3) — в блоке до 08:30, судил 4 поединка' },
        { judgeId: 'JUDGE_113', detail: '(Нанимающиеся, 2/2) — свободен с 09:00' },
      ],
    },
    {
      kind: 'Б',
      title: 'пригласить опытных незарегистрированных',
      accent: 'outline',
      candidates: [
        { judgeId: 'JUDGE_009', detail: '— Отправляющие 3/3, судил финал Кубка Вызова 2025' },
        { judgeId: 'JUDGE_005', detail: '— 3/3, Екатеринбург' },
      ],
    },
    {
      kind: 'В',
      title: 'резервный судья судит за недостающую коллегию',
      accent: 'outline',
      candidates: [
        { judgeId: 'JUDGE_004', detail: 'стоит в резерве на соседних поединках' },
      ],
      note: '— в классике и командных поединках может судить за «Нанимающихся». Состав не сокращаем: количество судей задано регламентом.',
    },
  ],
  'd-half': [
    {
      kind: 'А',
      title: 'попросить судей соседнего блока задержаться',
      accent: 'green',
      candidates: [
        { judgeId: 'JUDGE_013', detail: '(Нанимающиеся, 2/2) — судит 1/4 финала 21.03, задержится на утро 22.03' },
      ],
    },
    {
      kind: 'Б',
      title: 'пригласить опытных незарегистрированных',
      accent: 'outline',
      candidates: [
        { judgeId: 'JUDGE_003', detail: '— Нанимающиеся 3/3, опытный (финал Кубка Вызова 2025)' },
      ],
    },
    {
      kind: 'В',
      title: 'резервный судья судит за недостающую коллегию',
      accent: 'outline',
      candidates: [
        { judgeId: 'JUDGE_004', detail: 'стоит в резерве на соседних поединках' },
      ],
      note: '— в классике и командных поединках может судить за недостающую коллегию. Состав не сокращаем: количество судей задано регламентом.',
    },
  ],
  'd-qf': [
    {
      kind: 'А',
      title: 'попросить резервных судей соседних поединков быть на связи',
      accent: 'green',
      candidates: [
        { judgeId: 'JUDGE_004', detail: '(Нанимающиеся, 3/3) — резерв поединка №1, свободен в 11:50' },
      ],
    },
  ],
};

/** Текст приглашения (O5) — организатор отправляет сам. Персонализация — на бэкенде. */
export function inviteTextFor(_duel: IssueDuel): string {
  return 'Добрый день! 21 марта в 09:00 UTC на Кубке Вызова не хватает судей в коллегии «Нанимающиеся на работу». Сможете ли вы задержаться до 11:30? Будем очень благодарны!';
}

/** Объяснение предложения ИИ (плашка внизу O4) */
export const COLLEGE_EXPLAIN_NOTE =
  'Объяснение кратко у каждого поединка: «JUDGE_003 — HR-директор, балл 3 в «Нанимающихся» от обоих экспертов; не из клуба игроков»';

/** Сноска O5 про отправку приглашения */
export const INVITE_NOTE =
  'Текст приглашения готов — организатор отправляет сам. Сокращать состав ИИ не предлагает: количество судей определено регламентом (ОС 10.11).';

/* --- Демо-заявки для организаторских экранов --- */

export const INITIAL_APPLICATIONS: Application[] = [
  {
    id: 'a-demo-viewer',
    tournamentId: 'cooperation-2026',
    userId: CURRENT_USER_ID,
    role: 'viewer',
    status: 'confirmed',
    form: {
      lastName: 'Иванов',
      firstName: 'Пётр',
      country: 'Россия',
      city: 'Екатеринбург',
      club: 'УШП',
      displayName: 'Консультант по развитию бизнеса',
      telegram: '@ivanov',
    },
    secondingPlayerIds: [],
    availabilityBlockIds: [],
    createdAt: '2026-02-14T10:00:00Z',
    updatedAt: '2026-02-15T09:30:00Z',
    history: [
      { time: '14.02 10:00', text: 'Заявка создана · Зритель' },
      { time: '15.02 09:30', text: 'Статус: Получена → Подтверждена' },
    ],
  },
  {
    // Демо-заявка игрока на «Кубок Вызова» — для экранов U8/U9 и строки O2 [по прототипу]
    id: 'a-demo-player',
    tournamentId: 'challenge-2026',
    userId: CURRENT_USER_ID,
    role: 'player',
    status: 'received',
    form: {
      lastName: 'Иванов',
      firstName: 'Пётр',
      country: 'Россия',
      city: 'Екатеринбург',
      club: 'УШП',
      displayName: 'Консультант по развитию бизнеса',
      telegram: '@ivanov',
    },
    secondingPlayerIds: [],
    availabilityBlockIds: [],
    createdAt: '2026-03-10T08:00:00Z',
    updatedAt: '2026-03-10T08:00:00Z',
    history: [{ time: '10.03 08:00', text: 'заявка получена' }],
  },
  {
    // Вторая роль того же участника: секундант двух игроков (объединённая строка O2)
    id: 'a-demo-second',
    tournamentId: 'challenge-2026',
    userId: CURRENT_USER_ID,
    role: 'second',
    status: 'received',
    form: {
      lastName: 'Иванов',
      firstName: 'Пётр',
      country: 'Россия',
      city: 'Екатеринбург',
      club: 'УШП',
      displayName: 'Консультант по развитию бизнеса',
      telegram: '@ivanov',
    },
    secondingPlayerIds: ['u-petrov', 'u-kozlova'],
    availabilityBlockIds: [],
    createdAt: '2026-03-10T08:10:00Z',
    updatedAt: '2026-03-10T08:10:00Z',
    history: [{ time: '10.03 08:10', text: 'заявка получена · секундант' }],
  },
];
