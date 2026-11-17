import { useParams } from 'react-router-dom';
import {
  COLLEGE_ORDER,
  COLLEGE_SHORT,
  EXPRESS_COLUMN_TITLE,
  ROLE_LABELS,
  STATUS_LABELS,
  judgeScoresFor,
} from '@/data/mock';
import type { ChipVariant } from '@/components/ui/Chip';
import { Screen, ScreenHeader } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { Note } from '@/components/ui/Note';
import { DataTable } from '@/components/ui/DataTable';
import type { DataTableColumn } from '@/components/ui/DataTable';
import { useApp } from '@/state/AppContext';
import styles from './EntryCardPage.module.css';

const STATUS_VARIANTS: Record<keyof typeof STATUS_LABELS, ChipVariant> = {
  received: 'warn',
  confirmed: 'green',
  rejected: 'red',
  withdrawn: 'gray',
};

interface ScoreRow {
  expert: 'ОС' | 'КС';
  c1: string;
  c2: string;
  c3: string;
  express: string;
}

/**
 * O2a · Карточка участника — полные данные заявки, оценки экспертов (ОС/КС),
 * доступность судьи, история изменений. Резерв в MVP нет — не показываем.
 */
export function EntryCardPage() {
  const { entryId = '' } = useParams<{ entryId: string }>();
  const { organizerEntries, setEntryStatus, tournaments } = useApp();
  const application = organizerEntries.find((a) => a.id === entryId);
  const tournament = application ? tournaments.find((t) => t.id === application.tournamentId) : undefined;

  if (!application) {
    return (
      <Screen>
        <ScreenHeader title="Карточка участника" />
        <Note variant="err">Заявка не найдена.</Note>
        <div className={styles.actions}>
          <Button variant="soft" to="/organizer" arrowLeft>
            К соревнованиям
          </Button>
        </div>
      </Screen>
    );
  }

  const judgeData =
    application?.role === 'judge' && application.publicId
      ? judgeScoresFor(application.publicId)
      : undefined;

  const displayName = application.publicId ?? `${application.form.lastName} ${application.form.firstName}`.trim();

  const scoreRows: ScoreRow[] | null =
    judgeData
      ? (['ОС', 'КС'] as const).map((expert, idx) => ({
          expert,
          c1: String(judgeData.scores.c1?.[idx] ?? '—'),
          c2: String(judgeData.scores.c2?.[idx] ?? '—'),
          c3: String(judgeData.scores.c3?.[idx] ?? '—'),
          express: String(judgeData.hardNegotiations?.[idx] ?? '—'),
        }))
      : null;

  const scoreColumns: ReadonlyArray<DataTableColumn<ScoreRow>> | null = scoreRows
    ? [
        { key: 'expert', title: 'Оценки экспертов', width: 200, render: (r) => r.expert },
        ...COLLEGE_ORDER.map((cid) => ({
          key: cid,
          title: COLLEGE_SHORT[cid] ?? cid,
          width: 160,
          render: (r: ScoreRow) => (cid === 'c1' ? r.c1 : cid === 'c2' ? r.c2 : r.c3),
        })),
        { key: 'express', title: EXPRESS_COLUMN_TITLE, width: 220, render: (r) => r.express },
      ]
    : null;

  return (
    <Screen>
      <ScreenHeader title="Карточка участника" />

      <Card title={`${displayName} · ${ROLE_LABELS[application.role]}`}>
        <p className={styles.secondary}>
          {application.form.city ? `${application.form.city} · ` : ''}
          {application.form.club ? `${application.form.club} · ` : ''}
          {application.form.position ?? ''}
        </p>
        <Chip variant={STATUS_VARIANTS[application.status]}>{STATUS_LABELS[application.status]}</Chip>
      </Card>

      {judgeData && scoreColumns && scoreRows && (
        <DataTable columns={scoreColumns} rows={scoreRows} rowKey={(r) => r.expert} caption="Оценки экспертов" />
      )}

      {application.role === 'judge' && (
        <Card title="Доступность">
          {tournament?.availabilityBlocks
            .filter((b) => application.availabilityBlockIds.includes(b.id))
            .map((b) => (
              <p key={b.id} className={styles.availYes}>
                {`✓ ${b.time} · ${b.title}`}
              </p>
            ))}
        </Card>
      )}

      {application.role === 'second' && application.secondingPlayerIds.length > 0 && (
        <Card title="Связи: секундирует">
          {application.secondingPlayerIds.map((pid) => (
            <p key={pid} className={styles.main}>
              {pid}
            </p>
          ))}
        </Card>
      )}

      {application.role === 'player' && application.partnerId && (
        <Card title="Связи: напарник">
          <p className={styles.main}>{application.partnerId}</p>
        </Card>
      )}

      <Card title="История">
        <p className={styles.secondary}>
          {application.history.map((h, i) => (
            <span key={i}>
              {h.time} {h.text}
              {i < application.history.length - 1 ? ' · ' : ''}
            </span>
          ))}
        </p>
      </Card>

      {/* Кнопки статуса — по референсу O2a показываются и у подтверждённой заявки */}
      <div className={styles.actions}>
        <Button variant="greenSoft" onClick={() => void setEntryStatus(application.id, 'confirmed')}>
          Подтвердить
        </Button>
        <Button variant="dangerSoft" onClick={() => void setEntryStatus(application.id, 'rejected')}>
          Отклонить
        </Button>
      </div>

      <div className={styles.actions}>
        <Button variant="outline" to={`/organizer/competitions/${application.tournamentId}/entries`} arrowLeft>
          К заявкам
        </Button>
      </div>
    </Screen>
  );
}
