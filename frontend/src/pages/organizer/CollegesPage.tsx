import { ReviewPage } from "./ReviewPage";
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  COLLEGE_EXPLAIN_NOTE,
  COLLEGE_ORDER,
  COLLEGE_SHORT,
  DUEL_PLANS,
} from '@/data/mock';
import { Screen, ScreenHeader } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { Note } from '@/components/ui/Note';
import { DataTable } from '@/components/ui/DataTable';
import type { DataTableColumn } from '@/components/ui/DataTable';
import { OrganizerTabs } from './OrganizerTabs';
import { useApp } from '@/state/AppContext';
import { shortJudgeId } from '@/utils/judges';
import styles from './CollegesPage.module.css';

interface PlanRow {
  id: string;
  title: string;
  cells: Array<{ text: string; shortage?: number }>;
  reserves: string;
  issue: boolean;
}

/**
 * O4 · Коллегии — предложение ИИ (задача «А»): распределить судей по поединкам и коллегиям.
 * Учитывает: доступность по блокам; баллы 1–3 (среднее двух экспертов ОС и КС);
 * согласовано с заказчиком (10.11); в экспрессе — столбец «жёсткие переговоры»;
 * конфликт интересов: одна школа/клуб (покрывает тренер–ученик), напарник; USN — не конфликт.
 * Состав судей задан регламентом — ИИ его не меняет и не сокращает.
 * ИИ не назначает сам: Принять / Изменить / Пересчитать.
 */
export function CollegesPage() {
  const { id = '' } = useParams<{ id: string }>();
  const { tournaments } = useApp();
  return tournaments.find(t => t.id === id)?.availabilityBlocks.some(b => b.parallelDuels > 0)
    ? <ReviewPage key={id} view="colleges" />
    : <LegacyCollegesPage />;
}

function LegacyCollegesPage() {
  const { id = '' } = useParams<{ id: string }>();
  const { tournaments } = useApp();
  const tournament = tournaments.find((t) => t.id === id);
  const [accepted, setAccepted] = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  const [recalculatedAt, setRecalculatedAt] = useState<string | null>(null);

  const isExpress = tournament?.format === 'express';
  // Предложение ИИ — демо-данные для «Кубка Вызова»; для созданных турниров раздел пуст до расчёта на backend
  const plans = tournament?.id === 'challenge-2026' ? DUEL_PLANS : [];

  const rows: PlanRow[] = plans.map((plan) => ({
    id: plan.id,
    title: plan.title,
    cells: COLLEGE_ORDER.map((cid) => {
      const panel = plan.panels.find((p) => p.collegeId === cid);
      return {
        text: panel
          ? panel.judges.map((j) => `${shortJudgeId(j.judgeId)}(${j.score})`).join(' ')
          : '',
        shortage: panel?.shortage,
      };
    }),
    reserves: plan.reserves.map(shortJudgeId).join(' '),
    issue: Boolean(plan.issue),
  }));

  const columns: ReadonlyArray<DataTableColumn<PlanRow>> = [
    { key: 'duel', title: 'Поединок', width: 220, render: (r) => r.title },
    ...COLLEGE_ORDER.map(
      (cid, i): DataTableColumn<PlanRow> => ({
        key: cid,
        title: COLLEGE_SHORT[cid] ?? cid,
        width: 240,
        render: (r) => {
          const cell = r.cells[i] ?? { text: '' };
          if (cell.shortage) {
            return <Chip variant="red">{`не хватает ${cell.shortage}`}</Chip>;
          }
          return <span className={styles.panelList}>{cell.text}</span>;
        },
      }),
    ),
    {
      key: 'reserves',
      title: 'Резерв',
      width: 180,
      render: (r) =>
        r.issue ? (
          <Button variant="dangerSoft" to={`/organizer/competitions/${id}/issues`} arrow>
            Разобрать
          </Button>
        ) : (
          <span className={styles.panelList}>{r.reserves}</span>
        ),
    },
  ];

  function handleRecalculate() {
    setRecalculating(true);
    setTimeout(() => {
      setRecalculating(false);
      setRecalculatedAt(new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }));
    }, 700);
  }

  return (
    <Screen>
      <ScreenHeader code="O4" title="Коллегии — предложение ИИ" />
      <p className={styles.subtitle}>{tournament?.name ?? ''}</p>

      <OrganizerTabs tournamentId={id} active="colleges" />

      <div className={styles.topRow}>
        <Button variant="outline">Состав: 9 (3/3/3) — по регламенту</Button>
        <Button variant="outline">Резервных судей: 1–3</Button>
        <Button onClick={() => setAccepted(true)} disabled={accepted} arrow>
          {accepted ? 'Предложение сформировано' : 'Сформировать предложение'}
        </Button>
      </div>

      <DataTable columns={columns} rows={rows} rowKey={(r) => r.id} caption="Предложение ИИ по коллегиям" />

      <div className={styles.actions}>
        <Button variant="outline" to={`/organizer/colleges/explain/JUDGE_003?duel=d1`} arrow>
          Почему так? (объяснение)
        </Button>
        <Button variant="outline" onClick={handleRecalculate} disabled={recalculating}>
          {recalculating ? 'Пересчитываем…' : 'Пересчитать'}
        </Button>
        <Button variant="greenSoft" onClick={() => setAccepted(true)} disabled={accepted || recalculating}>
          {accepted ? 'Распределение утверждено' : 'Утвердить распределение'}
        </Button>
      </div>

      {recalculatedAt && (
        <Note variant="info">
          Пересчёт выполнен в {recalculatedAt}. Состав судей не изменился — количество задано регламентом.
        </Note>
      )}

      {accepted && !recalculatedAt && (
        <Note variant="info">
          Распределение утверждено в прототипе.
        </Note>
      )}

      <Note variant="info">{COLLEGE_EXPLAIN_NOTE}</Note>

      {isExpress && (
        <Note variant="info">
          Экспресс: учитывается столбец «Экспресс («жёсткие перег.»)» — способность судить экспресс-поединки.
        </Note>
      )}
    </Screen>
  );
}
