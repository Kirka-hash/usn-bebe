import { useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import type { Tournament } from '@/types';
import * as api from '@/services/api';
import { Screen, ScreenHeader } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Field } from '@/components/ui/Field';
import { Note } from '@/components/ui/Note';
import { Checkbox } from '@/components/ui/Checkbox';
import { useApplicationDraft } from '@/hooks/useApplicationDraft';
import styles from './SecondStepPage.module.css';

/**
 * U6b · Секундант · кому секундирую.
 * Можно выбрать несколько игроков (на каждого — отдельная связь).
 * Нельзя секундировать самому себе; игрок этого турнира может быть секундантом другого игрока.
 */
export function SecondStepPage() {
  const { id } = useParams<{ id: string }>();
  const [params] = useSearchParams();
  const role = (params.get('role') ?? 'second') as 'second';
  const navigate = useNavigate();
  const draft = useApplicationDraft(id, role);

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string[]>(draft?.secondingPlayerIds ?? []);

  useEffect(() => {
    let alive = true;
    void api.getTournament(id ?? '').then((t) => {
      if (alive) setTournament(t ?? null);
    });
    return () => {
      alive = false;
    };
  }, [id]);

  const players = useMemo(() => {
    const pool = tournament?.players ?? [];
    const q = query.trim().toLowerCase();
    if (!q) return pool;
    return pool.filter((p) => p.name.toLowerCase().includes(q) || p.club?.toLowerCase().includes(q));
  }, [tournament, query]);

  function toggle(playerId: string, checked: boolean) {
    setSelected((prev) => (checked ? [...new Set([...prev, playerId])] : prev.filter((x) => x !== playerId)));
  }

  function handleNext() {
    if (tournament?.format !== 'classic' || selected.length === 0) return;
    const back = `/tournament/${id}/apply/second?role=second`;
    navigate(`/tournament/${id}/apply/details?role=${role}`, {
      state: { role, secondingPlayerIds: selected, form: draft?.form, applicationId: draft?.applicationId, back },
    });
  }

  if (tournament && tournament.format !== 'classic') {
    return <Navigate to={`/tournament/${id}/register`} replace />;
  }

  return (
    <Screen>
      <ScreenHeader code="U6b" title="Секундант · кому секундирую" />

      <Field
        label="Кому вы секундируете"
        name="seconding"
        mark
        placeholder="Найти игрока…"
        value={query}
        onChange={setQuery}
      />

      <Card title="Игроки турнира">
        {players.map((p) => {
          const isSelf = p.isSelf === true;
          const label = p.club ? `${p.name} · ${p.club}` : p.name;
          return (
            <Checkbox
              key={p.id}
              name={`second-${p.id}`}
              label={isSelf ? `${label} (это вы) — недоступно` : label}
              checked={selected.includes(p.id)}
              disabled={isSelf}
              onChange={(checked) => toggle(p.id, checked)}
            />
          );
        })}
        {players.length === 0 && (
          <p className={styles.listNote}>Пока нет подходящих игроков — уточните запрос.</p>
        )}
      </Card>

      <Note variant="info">
        Игрока нет в списке? Попросите его сначала зарегистрироваться на турнир как игрок.
      </Note>

      <div className={styles.actions}>
        <Button onClick={handleNext} disabled={selected.length === 0} arrow>
          Далее
        </Button>
        <Button variant="soft" to={draft?.back ?? `/tournament/${id}/register`} arrowLeft>
          Назад
        </Button>
      </div>
    </Screen>
  );
}
