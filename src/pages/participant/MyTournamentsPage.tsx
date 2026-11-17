import { useMemo } from 'react';
import { ROLE_LABELS, STATUS_LABELS } from '@/data/mock';
import { blockWord, playerWord } from '@/utils/judges';
import type { Application } from '@/types';
import type { ChipVariant } from '@/components/ui/Chip';
import { Screen, ScreenHeader } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { Note } from '@/components/ui/Note';
import { useApp } from '@/state/AppContext';
import styles from './MyTournamentsPage.module.css';

const STATUS_VARIANTS: Record<Application['status'], ChipVariant> = {
  received: 'warn',
  confirmed: 'green',
  rejected: 'red',
  withdrawn: 'gray',
};

/** Описание заявки по прототипу U9: «Игрок + Секундант», «Судья · 3 блока» и т. п. */
function rosterLine(apps: Application[]): string {
  const roles = [...new Set(apps.map((a) => a.role))].map((r) => ROLE_LABELS[r]);
  const first = apps[0];
  if (!first) return '';
  if (first.role === 'judge') {
    const blocks = first.availabilityBlockIds.length;
    return blocks > 0 ? `Судья · ${blocks} ${blockWord(blocks)}` : 'Судья';
  }
  if (first.role === 'second') {
    const n = first.secondingPlayerIds.length;
    return n > 0 ? `Секундант · ${n} ${playerWord(n)}` : 'Секундант';
  }
  const base = roles.join(' + ');
  return apps.length > 1 ? `${base} (${apps.length} заявки)` : base;
}

/**
 * U9 · Мои турниры — личный кабинет участника: все заявки и их статусы.
 * Заявки одного турнира группируются в одну карточку; из карточки — в заявку (U8).
 */
export function MyTournamentsPage() {
  const { applications, profile, tournaments } = useApp();

  const grouped = useMemo(() => {
    const map = new Map<string, Application[]>();
    for (const a of applications) {
      if (a.status === 'withdrawn') continue;
      const list = map.get(a.tournamentId) ?? [];
      list.push(a);
      map.set(a.tournamentId, list);
    }
    return [...map.entries()];
  }, [applications]);

  return (
    <Screen>
      <ScreenHeader title="Мои турниры" />

      {grouped.length === 0 ? (
        <>
          <Note variant="info">
            Заявок пока нет. {profile?.filled ? 'Выберите турнир и подайте заявку.' : 'Заполните профиль и выберите турнир.'}
          </Note>
          <div className={styles.actions}>
            <Button to="/" arrow>
              Найти турниры
            </Button>
          </div>
        </>
      ) : (
        grouped.map(([tournamentId, apps]) => {
          const t = tournaments.find((x) => x.id === tournamentId);
          const statuses = apps.map((a) => a.status);
          const status = statuses.includes('confirmed')
            ? 'confirmed'
            : statuses.includes('received')
              ? 'received'
              : statuses[0] ?? 'received';
          return (
            <Card key={tournamentId} title={t?.name ?? tournamentId}>
              <p className={styles.meta}>{rosterLine(apps)}</p>
              <Chip variant={STATUS_VARIANTS[status as Application['status']] ?? 'gray'}>
                {STATUS_LABELS[status as Application['status']] ?? ''}
              </Chip>
              <div className={styles.rowActions}>
                <Button to={`/tournament/${tournamentId}/application`} arrow>
                  Открыть
                </Button>
              </div>
            </Card>
          );
        })
      )}

      <div className={styles.actions}>
        <Button to="/" arrow>
          Найти турниры
        </Button>
        <Button variant="soft" to="/profile" arrow>
          Профиль
        </Button>
      </div>
    </Screen>
  );
}
