import { DataTable } from '@/components/ui/DataTable';
import type { DataTableColumn } from '@/components/ui/DataTable';
import { Screen, ScreenHeader } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { Note } from '@/components/ui/Note';
import { ROLE_LABELS } from '@/data/mock';
import type { Tournament } from '@/types';
import { useApp } from '@/state/AppContext';
import styles from './CompetitionsPage.module.css';

const FORMAT_LABELS: Record<Tournament['format'], string> = {
  classic: 'Классика',
  team: 'Командный',
  express: 'Экспресс',
};

/**
 * Список соревнований со сводкой. Данные — из состояния приложения:
 * демо-турниры + созданные организатором (сохраняются между сессиями).
 * Создание нового турнира — форма «Новый турнир» в приложении.
 */
export function CompetitionsPage() {
  const { tournaments, organizerLogout } = useApp();

  const columns: ReadonlyArray<DataTableColumn<Tournament>> = [
    { key: 'name', title: 'Соревнование', width: 300, render: (t) => t.name },
    {
      key: 'format',
      title: 'Формат',
      width: 140,
      render: (t) => FORMAT_LABELS[t.format],
    },
    { key: 'dates', title: 'Даты', width: 140, render: (t) => t.dates },
    {
      key: 'roles',
      title: 'Роли открыты',
      width: 200,
      render: (t) => {
        const open = t.roleWindows.filter((w) => w.open);
        const playersClosed = !t.roleWindows.find((w) => w.role === 'player')?.open;
        if (open.length === t.roleWindows.length) return <Chip variant="green">4 из 4</Chip>;
        if (open.length === 0) return <Chip variant="warn">Все закрыты</Chip>;
        if (playersClosed) return <Chip variant="warn">Игроки закрыты</Chip>;
        return <Chip variant="green">{open.map((w) => ROLE_LABELS[w.role]).join(', ')}</Chip>;
      },
    },
    {
      key: 'entries',
      title: 'Заявки (игр/суд/сек/зр)',
      width: 180,
      render: (t) => (t.entryCounts ? t.entryCounts.join(' / ') : '—'),
    },
    {
      key: 'actions',
      title: ' ',
      width: 170,
      render: (t) => (
        <span className={styles.cellChips}>
          {t.id === 'strategy-2026' && <Chip variant="red">3 проблемных</Chip>}
          <Button variant="outline" to={`/organizer/competitions/${t.id}/entries`} arrow>
            Открыть
          </Button>
        </span>
      ),
    },
  ];

  return (
    <Screen>
      <ScreenHeader title="Соревнования" />

      <div className={styles.topRow}>
        <Button variant="soft" onClick={organizerLogout}>
          Выйти из кабинета
        </Button>
      </div>

      <Note variant="info">Соревнования создаются в системе USN. Здесь отображаются данные нашего API.</Note>

      <DataTable columns={columns} rows={tournaments} rowKey={(t) => t.id} caption="Список соревнований" />

      {tournaments.length === 0 && <Note variant="info">Соревнований пока нет.</Note>}
    </Screen>
  );
}
