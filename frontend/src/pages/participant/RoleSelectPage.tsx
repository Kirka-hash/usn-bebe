import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { Role, Tournament } from '@/types';
import { ROLE_LABELS } from '@/data/mock';
import * as api from '@/services/api';
import { Screen, ScreenHeader } from '@/components/ui/Screen';
import { ArrowIcon } from '@/components/ui/icons';
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

const ROLE_ICON: Record<Role, string> = {
  player: 'M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M14 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z',
  judge: 'M12 3v17M7 21h10M4 7h16M6 7l-3 8h6L6 7Zm12 0-3 8h6l-3-8Z',
  second: 'M4 4h16v12H9l-5 4V4Z',
  viewer: 'M2 12s4-6 10-6 10 6 10 6-4 6-10 6-10-6-10-6Zm13 0a3 3 0 1 0-6 0 3 3 0 0 0 6 0Z',
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
    setLoading(true);
    api.getTournament(id ?? '').then((t) => {
      if (alive) {
        setTournament(t ?? null);
        setLoading(false);
      }
    }).catch(() => { if (alive) { setTournament(null); setLoading(false); } });
    return () => {
      alive = false;
    };
  }, [id]);

  if (loading) {
    return (
      <Screen>
        <ScreenHeader code="U4" title="Выбор роли" />
        <Note variant="info">Загрузка…</Note>
      </Screen>
    );
  }

  if (!tournament) {
    return (
      <Screen>
        <ScreenHeader code="U4" title="Выбор роли" />
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
      <ScreenHeader code="U4" title="Выбор роли" />

      <div>
        <p className={styles.tournament}>{tournament.name}</p>
        <p className={styles.hint}>
          В одном турнире — одна роль. Игрок также может быть секундантом другого игрока.
          {tournament.format === 'team' && ' После выбора роли игрока откроется выбор напарника.'}
        </p>
      </div>
      <div className={styles.roles}>
        {([...tournament.roleWindows].sort((a, b) =>
          Number(blockedReasons.has(a.role)) - Number(blockedReasons.has(b.role))
        )).map((window) => {
          const reason = blockedReasons.get(window.role);
          const deadline = window.deadline && window.deadline !== '—' ? ` · до ${window.deadline}` : '';
          return (
            <button type="button" key={window.role} className={styles.role} disabled={Boolean(reason)}
              onClick={() => go(window.role)}>
              <span className={styles.icon}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d={ROLE_ICON[window.role]} />
                </svg>
              </span>
              <span className={styles.roleText}>
                <strong>{ROLE_LABELS[window.role]}</strong>
                <small>{reason || `${ROLE_ACTION[window.role]}${deadline}`}</small>
              </span>
              {reason ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg>
                : <ArrowIcon />}
            </button>
          );
        })}
      </div>
    </Screen>
  );
}
