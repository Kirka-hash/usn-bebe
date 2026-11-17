import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { Application, Tournament } from '@/types';
import { ROLE_LABELS, STATUS_LABELS } from '@/data/mock';
import * as api from '@/services/api';
import { Screen, ScreenHeader } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { Card, CardText } from '@/components/ui/Card';
import { Note } from '@/components/ui/Note';
import { useApp } from '@/state/AppContext';
import styles from './TournamentPage.module.css';

/**
 * U3 · Карточка турнира.
 * Состояние А — заявки нет: «Зарегистрироваться» (U4).
 * Состояние Б — заявка есть: «Моя заявка» (U8), повторная регистрация не создаёт дубль.
 */
export function TournamentPage() {
  const { id } = useParams<{ id: string }>();
  const { applications } = useApp();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    api.getTournament(id ?? '').then((t) => {
      if (alive) {
        setTournament(t ?? null);
        setLoading(false);
      }
    });
    return () => {
      alive = false;
    };
  }, [id]);

  const application: Application | undefined = tournament
    ? applications.find((a) => a.tournamentId === tournament.id && a.status !== 'withdrawn')
    : undefined;

  if (loading) {
    return (
      <Screen>
        <ScreenHeader title="Карточка турнира" />
        <Note variant="info">Загрузка турнира…</Note>
      </Screen>
    );
  }

  if (!tournament) {
    return (
      <Screen>
        <ScreenHeader title="Карточка турнира" />
        <Note variant="err">Турнир не найден.</Note>
        <div className={styles.actions}>
          <Button variant="soft" to="/" arrowLeft>
            Ко всем турнирам
          </Button>
        </div>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScreenHeader title="Карточка турнира" />

      <Card title={tournament.name} tone="text">
        {tournament.description.split('\n').map((line) => (
          <CardText key={line}>{line}</CardText>
        ))}
      </Card>

      <Card title="Регистрация по ролям">
        {tournament.roleWindows.map((w) => (
          <CardText key={w.role}>
            {`• ${ROLE_LABELS[w.role]} — ${
              w.open
                ? `открыта до ${w.deadline}${w.note ? ` (${w.note})` : ''}`
                : `закрыта${w.closedReason ? `: ${w.closedReason.toLowerCase()}` : ''}`
            }`}
          </CardText>
        ))}
      </Card>

      {application ? (
        <>
          <Note variant="info">
            Состояние Б: заявка уже есть (роль: {ROLE_LABELS[application.role]}, статус «
            {STATUS_LABELS[application.status]}»)
          </Note>
          <div className={styles.actions}>
            <Button variant="outline" to={`/tournament/${tournament.id}/application`} arrow>
              Моя заявка
            </Button>
          </div>
        </>
      ) : (
        <>
          <Note variant="info">Состояние А: заявки нет</Note>
          <div className={styles.actions}>
            <Button to={`/tournament/${tournament.id}/register`} arrow>
              Зарегистрироваться
            </Button>
          </div>
        </>
      )}

      <div className={styles.actions}>
        <Button variant="soft" to="/" arrowLeft>
          Ко всем турнирам
        </Button>
      </div>

      <p className={styles.notFound}>
        <Link to="/login">Войти</Link>, чтобы видеть свои заявки на всех устройствах.
      </p>
    </Screen>
  );
}
