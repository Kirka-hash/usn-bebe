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

function roleChipLabel(role: Tournament['roleWindows'][number]): string {
  const base = ROLE_LABELS[role.role];
  if (!role.open) {
    return `${role.role === 'player' ? 'Игроки' : base}: регистрация закрыта`;
  }
  return [base, role.labelSuffix, role.deadline && `до ${role.deadline}`].filter(Boolean).join(' ');
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
        <ScreenHeader code="U1" title="Турниры" />
        <Note variant="err">{error}</Note>
      </Screen>
    );
  }

  if (!tournaments) {
    return (
      <Screen>
        <ScreenHeader code="U1" title="Турниры" />
        <p className={styles.loading}>Загрузка списка турниров…</p>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScreenHeader code="U1" title="Турниры" />
      <div className={styles.page}>
        <p className={styles.pageTitle}>USN · Чемпионат 2026</p>
        <Button variant="outline" to={api.isSignedIn() ? "/my-tournaments" : "/login"} arrow>
          {api.isSignedIn() ? 'Мои турниры' : 'Войти'}
        </Button>
      </div>
      {tournaments.map((t) => {
        const visible = t.roleWindows.filter(w => (w.open || w.closedReason) && (w.role !== 'second' || t.format === 'classic'));
        return (
          <Card key={t.id} title={t.name}>
            <p className={styles.meta}>
              {[t.dates, t.timeUtc, t.mode].filter(value => value && value !== '—').join(' · ')}
            </p>
            <div className={styles.chips}>
              {visible.map((w) => {
                return <Chip key={w.role} variant={w.open ? 'green' : 'gray'}>{roleChipLabel(w)}</Chip>;
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
