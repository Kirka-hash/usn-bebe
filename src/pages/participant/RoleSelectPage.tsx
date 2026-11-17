import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { Role, Tournament } from '@/types';
import { ROLE_LABELS } from '@/data/mock';
import * as api from '@/services/api';
import { Screen, ScreenHeader } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { Note } from '@/components/ui/Note';
import { useApp } from '@/state/AppContext';
import styles from './RoleSelectPage.module.css';

/** Подписи кнопок по прототипу U4 (короткая формулировка действия) */
const ROLE_ACTION: Record<Role, string> = {
  player: 'участвую в поединках',
  judge: 'оцениваю поединки',
  second: 'помогаю игроку',
  viewer: 'смотрю трансляцию',
};

/**
 * U4 · Выбор роли.
 * Одна роль на турнир; исключение — Игрок + Секундант другого игрока.
 * Недоступные роли серые с причиной (закрыта / не для формата / конфликт / нет судейских слотов).
 * Индивидуальный или командный формат определяется типом соревнования, а не отдельной кнопкой.
 */
export function RoleSelectPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
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

  if (loading) {
    return (
      <Screen>
        <ScreenHeader title="Выбор роли" />
        <Note variant="info">Загрузка…</Note>
      </Screen>
    );
  }

  if (!tournament) {
    return (
      <Screen>
        <ScreenHeader title="Выбор роли" />
        <Note variant="err">Турнир не найден.</Note>
        <div className={styles.roles}>
          <Button variant="soft" to="/" arrowLeft>
            Ко всем турнирам
          </Button>
        </div>
      </Screen>
    );
  }

  const blockedReasons = new Map<Role, string>();
  for (const window of tournament.roleWindows) {
    const reason = api.resolveRoleBlockReason(tournament, window.role, applications);
    if (reason) blockedReasons.set(window.role, reason);
  }

  function go(role: Role) {
    if (blockedReasons.has(role)) return;
    const base = `/tournament/${tournament!.id}/apply`;
    const back = `/tournament/${tournament!.id}/register`;
    // Формат игрока берём из соревнования: индивидуальный → U5, командный → U6a
    const target =
      role === 'player' && tournament!.format === 'team'
        ? `${base}/player?role=player`
        : role === 'player' || role === 'viewer'
          ? `${base}/details?role=${role}`
          : `${base}/${role}?role=${role}`;
    navigate(target, { state: { role, back } });
  }

  return (
    <Screen>
      <ScreenHeader title="Выбор роли" />

      <div className={styles.roles}>
        {tournament.roleWindows.map((window) => {
          const reason = blockedReasons.get(window.role);
          if (reason) {
            return (
              <Button key={window.role} variant="muted" aria-disabled="true">
                {`${ROLE_LABELS[window.role]} — ${reason}`}
              </Button>
            );
          }
          return (
            <Button key={window.role} onClick={() => go(window.role)} arrow>
              {`${ROLE_LABELS[window.role]} — ${ROLE_ACTION[window.role]}`}
            </Button>
          );
        })}
      </div>

      <p className={styles.hint}>
        Игрок или команда — определяем по типу соревнования: в командном турнире после «Игрок» откроется
        шаг «Напарник» (U6a).
      </p>

      <Note variant="info">
        Недоступные роли показываются серыми с причиной: регистрация закрыта, роль не для этого формата,
        несовместима с уже поданной заявкой или судейские слоты ещё не открыты.
      </Note>
    </Screen>
  );
}
