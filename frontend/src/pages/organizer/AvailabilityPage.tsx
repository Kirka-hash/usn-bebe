import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { Application } from '@/types';
import { JUDGE_AVAILABILITY, JUDGE_ROSTER } from '@/data/mock';
import { blockWord } from '@/utils/judges';
import { Screen, ScreenHeader } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { Note } from '@/components/ui/Note';
import { OrganizerTabs } from './OrganizerTabs';
import { useApp } from '@/state/AppContext';
import styles from './AvailabilityPage.module.css';

interface Summary {
  available: number;
  need: number;
  state: 'ok' | 'warn' | 'lack' | 'unknown';
  text: string;
}

interface MatrixRow {
  id: string;
  label: string;
  blocks: Set<string>;
}

const MAX_LISTED_ROWS = 4;

/** «судьи», «судей» для строки «… ещё N» */
function pluralJudges(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'судьи';
  return 'судей';
}

/**
 * Карта доступности судей — строки: судьи (ростер + заявки пользователей платформы),
 * отметки блоков — из заявок/данных USN. «Нужно» = поединков в блоке одновременно ×
 * (состав + резерв). Красный — не хватает, жёлтый — без резерва, зелёный — ок.
 * Клик по красному → разбор дефицита.
 */
export function AvailabilityPage() {
  const { id = '' } = useParams<{ id: string }>();
  const { tournaments, organizerEntries } = useApp();
  const tournament = tournaments.find((t) => t.id === id);

  // Заявки судей из FastAPI
  const judgeEntries = useMemo(
    () =>
      organizerEntries.filter(
        (a) => a.tournamentId === id && a.role === 'judge' && a.status !== 'withdrawn',
      ),
    [organizerEntries, id],
  );

  if (!tournament) {
    return (
      <Screen>
        <ScreenHeader title="Карта доступности судей" />
        <Note variant="err">Турнир не найден.</Note>
      </Screen>
    );
  }

  const blocks = tournament.availabilityBlocks;

  // Матрица: ростер демо-турнира (первые 4 — как в прототипе) + заявки пользователей
  const matrixRows: MatrixRow[] = (() => {
    const rosterRows: MatrixRow[] =
      tournament.id === 'challenge-2026'
        ? JUDGE_ROSTER.map((judgeId) => ({
            id: `roster-${judgeId}`,
            label: judgeId,
            blocks: new Set(
              Object.entries(JUDGE_AVAILABILITY)
                .filter(([, judges]) => judges.includes(judgeId))
                .map(([blockId]) => blockId),
            ),
          }))
        : [];

    const userRows: MatrixRow[] = judgeEntries
      .filter((entry) => !entry.publicId || !rosterRows.some((r) => r.label === entry.publicId))
      .map((entry: Application) => ({
        id: entry.id,
        label: entry.publicId ?? `${entry.form.lastName} ${entry.form.firstName}`.trim(),
        blocks: new Set(entry.availabilityBlockIds),
      }));

    return [...rosterRows, ...userRows];
  })();

  const listed = matrixRows.slice(0, MAX_LISTED_ROWS);
  const hiddenCount = Math.max(0, matrixRows.length - listed.length);

  const summary = (blockId: string): Summary => {
    const block = blocks.find((b) => b.id === blockId);
    const available = matrixRows.filter((row) => row.blocks.has(blockId)).length;
    // Состав задаёт организатор (9/7 + резерв в классике, 5+1 в экспрессе)
    const need = block ? block.parallelDuels * (block.panelSize + block.reserve) : 0;
    const resolved: Summary['state'] = !block?.parallelDuels ? 'unknown' :
      available < need ? 'lack' : available <= need ? 'warn' : 'ok';
    return { available, need, state: resolved, text: `${available} / ${resolved === 'unknown' ? '—' : need}` };
  };

  const lackBlocks = blocks.filter((b) => summary(b.id).state === 'lack');
  const hasWarn = blocks.some((b) => summary(b.id).state === 'warn');

  return (
    <Screen>
      <ScreenHeader title="Карта доступности судей" subtitle={tournament.name} />

      <OrganizerTabs tournamentId={id} active="availability" />
      <Note variant="info">Число судей «нужно» появится после передачи расписания и нормы резерва из USN.</Note>

      {blocks.length === 0 ? (
        <Note variant="warn">
          Судейские слоты ещё не открыты. Задайте блоки доступности в панели управления — после этого
          регистрация судей откроется, а матрица соберётся из их заявок.
        </Note>
      ) : matrixRows.length === 0 ? (
        <Note variant="info">
          Блоки заданы, заявок судей пока нет. Матрица построится автоматически из заявок.
        </Note>
      ) : (
        <div className={styles.scroll}>
          <table className={styles.matrixTable}>
            <caption className="visually-hidden">Матрица доступности судей по блокам</caption>
            <thead>
              <tr>
                <th scope="col">Судьи</th>
                {blocks.map((b) => (
                  <th key={b.id} scope="col">
                    {b.time}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {listed.map((row) => (
                <tr key={row.id}>
                  <td className={styles.judgeCell}>{row.label}</td>
                  {blocks.map((b) => {
                    const marked = row.blocks.has(b.id);
                    return (
                      <td key={b.id} className={marked ? styles.cellYes : styles.cellNo}>
                        {marked ? '✓' : '—'}
                        <span className="visually-hidden">{marked ? ' доступен' : ' недоступен'}</span>
                      </td>
                    );
                  })}
                </tr>
              ))}
              {hiddenCount > 0 && (
                <tr>
                  <td colSpan={blocks.length + 1} className={styles.moreRow}>
                    … ещё {hiddenCount} {pluralJudges(hiddenCount)}
                  </td>
                </tr>
              )}
              <tr className={styles.totalRow}>
                <td className={styles.summaryLabel}>Доступно / нужно</td>
                {blocks.map((b) => {
                  const s = summary(b.id);
                  const chip =
                    s.state === 'lack' ? (
                      <Chip variant="red">{s.text}</Chip>
                    ) : s.state === 'warn' ? (
                      <Chip variant="warn">{s.text}</Chip>
                    ) : s.state === 'unknown' ? (
                      <Chip variant="gray">{s.text}</Chip>
                    ) : (
                      <Chip variant="green">{s.text}</Chip>
                    );
                  return (
                    <td key={b.id} className={styles.summaryCell}>
                      {s.state === 'lack' ? (
                        <Link
                          to={`/organizer/competitions/${tournament.id}/issues`}
                          className={styles.issueLink}
                          aria-label={`Разобрать дефицит блока ${b.time}`}
                        >
                          {chip}
                        </Link>
                      ) : (
                        chip
                      )}
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {blocks.length > 0 && lackBlocks.length > 0 && (
        <div className={styles.actions}>
          <Button to={`/organizer/competitions/${id}/colleges`} arrow>
            Сформировать коллегии
          </Button>
          <Button variant="dangerSoft" to={`/organizer/competitions/${id}/issues`} arrow>
            {`Разобрать дефицит: ${lackBlocks.length} ${blockWord(lackBlocks.length)}`}
          </Button>
        </div>
      )}

      {blocks.length > 0 && blocks.every(b => summary(b.id).state !== 'unknown') && lackBlocks.length === 0 && !hasWarn && (
        <Note variant="info">Дефицитов нет — по всем блокам хватает судей.</Note>
      )}
    </Screen>
  );
}
