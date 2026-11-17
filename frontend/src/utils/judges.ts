import type { ScorePair } from '@/types';

/**
 * Баллы двух экспертов (ОС и КС) объединяются средним арифметическим.
 * Отображение — с одной десятичной при наличии 0,5 («2,5»), иначе целое.
 * Решение зафиксировано в docs/IMPLEMENTATION.md.
 */
export function avgScore(pair: ScorePair | undefined): number {
  if (!pair) return 0;
  const avg = (pair[0] + pair[1]) / 2;
  return Number.isInteger(avg) ? avg : Math.round(avg * 10) / 10;
}

/** Строка балла для подписи у ID судьи: «3» или «2,5» */
export function scoreLabel(pair: ScorePair | undefined): string {
  if (!pair) return '—';
  const avg = avgScore(pair);
  return Number.isInteger(avg) ? String(avg) : avg.toFixed(1).replace('.', ',');
}

/** Обе оценки строкой: «3 / 3» (как в таблице замен O4a) */
export function pairLabel(pair: ScorePair | undefined): string {
  if (!pair) return '—';
  return `${pair[0]} / ${pair[1]}`;
}

/** Обезличенные ID судей хранятся как «JUDGE_057», в таблицах O4/O4a/O5 — краткая форма «J_057» */
export function shortJudgeId(judgeId: string): string {
  return judgeId.replace(/^JUDGE_/, 'J_');
}

/** Подпись блока: «блок», «блока», «блоков» */
export function blockWord(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return 'блок';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'блока';
  return 'блоков';
}

/** Подпись игрока: «игрок», «игрока», «игроков» */
export function playerWord(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return 'игрок';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'игрока';
  return 'игроков';
}
