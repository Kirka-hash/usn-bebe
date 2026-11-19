import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import type { TournamentPlayer } from '@/types';
import { Screen, ScreenHeader } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Field } from '@/components/ui/Field';
import { Note } from '@/components/ui/Note';
import { Checkbox } from '@/components/ui/Checkbox';
import { useApplicationDraft } from '@/hooks/useApplicationDraft';
import * as api from '@/services/api';
import styles from './PartnerStepPage.module.css';

/**
 * U6a · Игрок · напарник (командный формат).
 * Напарника ищем среди всех пользователей, зарегистрированных как игрок в USN,
 * не только среди заявленных на этот турнир (ответ заказчика 10.11).
 */
export function PartnerStepPage() {
  const { id } = useParams<{ id: string }>();
  const [params] = useSearchParams();
  const role = (params.get('role') ?? 'player') as 'player';
  const navigate = useNavigate();
  const draft = useApplicationDraft(id, role);

  const [query, setQuery] = useState('');
  const [partnerId, setPartnerId] = useState<string | null>(draft?.partnerId ?? null);
  const [results, setResults] = useState<TournamentPlayer[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    void api.searchPlayers(query).then(players => {
      if (live) setResults(players.filter(p => !p.isSelf));
    }).catch(err => { if (live) setError(err instanceof Error ? err.message : 'Поиск недоступен'); });
    return () => { live = false; };
  }, [query]);

  function handleNext() {
    const back = `/tournament/${id}/apply/player?role=player`;
    navigate(`/tournament/${id}/apply/details?role=${role}`, {
      state: { role, partnerId, form: draft?.form, applicationId: draft?.applicationId, back },
    });
  }

  return (
    <Screen>
      <ScreenHeader code="U6a" title="Игрок · напарник (командный формат)" />

      <Field
        label="Кто ваш напарник по команде"
        name="partner"
        mark
        placeholder="Найти по фамилии среди игроков USN…"
        value={query}
        onChange={setQuery}
      />

      <Card title="Найдено среди игроков USN">
        {results.map((p) => (
          <PlayerOption
            key={p.id}
            player={p}
            checked={partnerId === p.id}
            onToggle={(checked) => setPartnerId(checked ? p.id : null)}
          />
        ))}
        {results.length === 0 && <p className={styles.searchHint}>Игроков пока нет или никого не найдено.</p>}
      </Card>

      <Note variant="info">
        Напарника можно указать позже. Попросите его зарегистрироваться на платформе как игрок;
        тогда вы сможете найти его здесь или он выберет вас.
      </Note>
      {error && <Note variant="err">{error}</Note>}

      <div className={styles.actions}>
        <Button onClick={handleNext} arrow>
          Далее
        </Button>
        <Button variant="soft" to={draft?.back ?? `/tournament/${id}/register`} arrowLeft>
          Назад
        </Button>
      </div>
    </Screen>
  );
}

function PlayerOption({
  player,
  checked,
  onToggle,
}: {
  player: TournamentPlayer;
  checked: boolean;
  onToggle: (checked: boolean) => void;
}) {
  const label = player.club ? `${player.name} · ${player.club}` : player.city ? `${player.name} · ${player.city}` : player.name;
  return (
    <Checkbox
      name={`partner-${player.id}`}
      label={label}
      checked={checked}
      onChange={onToggle}
    />
  );
}
