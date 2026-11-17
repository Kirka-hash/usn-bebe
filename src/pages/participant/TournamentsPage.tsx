import { useEffect, useState } from 'react';
import type { Tournament } from '@/types';
import * as api from '@/services/api';
import { ROLE_LABELS } from '@/data/mock';
import { Screen, ScreenHeader } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { Card } from '@/components/ui/Card';
import { Note } from '@/components/ui/Note';
import styles from './TournamentsPage.module.css';

function roleChipLabel(t: Tournament, role: (typeof t.roleWindows)[number]): { text: string; open: boolean } {
  const base = ROLE_LABELS[role.role];
  if (!role.open) {
    return { text: role.closedReason ?? `${base}: регистрация закрыта`, open: false };
  }
  return { text: role.labelSuffix ? `${base} ${role.labelSuffix}` : base, open: true };
}

/**
 * U1 · Турниры — список соревнований с открытыми ролями.
 * Вход не обязателен для просмотра.
 */
export function TournamentsPage() {
  const [tournaments, setTournaments] = useState<Tournament[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    api
      .getTournaments()
      .then((list) => alive && setTournaments(list))
      .catch(() => alive && setError('Не удалось загрузить список турниров. Попробуйте ещё раз.'));
    return () => {
      alive = false;
    };
  }, []);

  if (error) {
    return (
      <Screen>
        <ScreenHeader title="Турниры" />
        <Note variant="err">{error}</Note>
      </Screen>
    );
  }

  if (!tournaments) {
    return (
      <Screen>
        <ScreenHeader title="Турниры" />
        <p className={styles.loading}>Загрузка списка турниров…</p>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScreenHeader title="Турниры" />
      <div className={styles.page}>
        <p className={styles.pageTitle}>USN · Чемпионат 2026</p>
        <Button variant="outline" to="/login" arrow>
          Войти
        </Button>
      </div>
      {tournaments.map((t) => {
        const visible = t.roleWindows.filter((w) => w.open || w.closedReason);
        return (
          <Card key={t.id} title={t.name}>
            <p className={styles.meta}>
              {t.dates} · {t.timeUtc}
              {t.mode ? ` · ${t.mode}` : ''}
            </p>
            <div className={styles.chips}>
              {visible.map((w) => {
                const chip = roleChipLabel(t, w);
                return <Chip key={w.role} variant={chip.open ? 'green' : 'gray'}>{chip.text}</Chip>;
              })}
            </div>
            <Button to={`/tournament/${t.id}`} arrow>
              Подробнее
            </Button>
          </Card>
        );
      })}
    </Screen>
  );
}
