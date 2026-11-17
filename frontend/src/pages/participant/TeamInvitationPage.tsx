import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Screen, ScreenHeader } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { Note } from '@/components/ui/Note';
import { useApp } from '@/state/AppContext';
import * as api from '@/services/api';
import type { TeamInvitation } from '@/services/api';

/** U8b: второй игрок принимает приглашение после собственной заявки игрока. */
export function TeamInvitationPage() {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { applications, refresh } = useApp();
  const [invitations, setInvitations] = useState<TeamInvitation[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mine = applications.find(a => a.tournamentId === id && a.role === 'player' && a.status !== 'withdrawn');

  useEffect(() => {
    let live = true;
    void api.getTeamInvitations(id).then(items => { if (live) setInvitations(items); })
      .catch(err => { if (live) setError(err instanceof Error ? err.message : 'Не удалось загрузить приглашения'); });
    return () => { live = false; };
  }, [id]);

  async function answer(inviterId: string, accept: boolean) {
    setBusy(true); setError(null);
    try {
      await api.answerTeamInvitation(id, inviterId, accept);
      await refresh();
      navigate(accept ? `/tournament/${id}/application` : '/my-tournaments');
    } catch (err) { setError(err instanceof Error ? err.message : 'Не удалось ответить'); }
    finally { setBusy(false); }
  }

  return <Screen>
    <ScreenHeader title="Приглашение в команду" />
    {invitations.length === 0 && <Note variant="info">Активных приглашений нет.</Note>}
    {invitations.map(item => <div key={item.inviterId}>
      <Note variant="info">{item.inviterName} указал вас напарником в командном турнире.</Note>
      {mine ? <div>
        <Button onClick={() => void answer(item.inviterId, true)} disabled={busy}>Подтвердить участие</Button>{' '}
        <Button variant="dangerSoft" onClick={() => void answer(item.inviterId, false)} disabled={busy}>Отклонить</Button>
      </div> : <div>
        <Note variant="info">Сначала подайте собственную заявку игрока. Напарник будет подставлен автоматически.</Note>
        <Link to={`/tournament/${id}/apply/player?role=player`} state={{ role: 'player', partnerId: item.inviterId }}>
          Зарегистрироваться как игрок
        </Link>{' '}
        <Button variant="dangerSoft" onClick={() => void answer(item.inviterId, false)} disabled={busy}>Отклонить</Button>
      </div>}
    </div>)}
    {error && <Note variant="err">{error}</Note>}
    <Button variant="soft" to="/my-tournaments" arrowLeft>Мои турниры</Button>
  </Screen>;
}
