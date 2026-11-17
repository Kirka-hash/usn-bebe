import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { Application } from '@/types';
import { ROLE_LABELS, STATUS_LABELS } from '@/data/mock';
import { blockWord, playerWord } from '@/utils/judges';
import type { ChipVariant } from '@/components/ui/Chip';
import { Screen, ScreenHeader } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { Note } from '@/components/ui/Note';
import { useApp } from '@/state/AppContext';
import * as api from '@/services/api';
import { draftFromApplication, editPathFor } from './draft';
import styles from './MyApplicationPage.module.css';

const STATUS_VARIANTS: Record<Application['status'], ChipVariant> = {
  received: 'warn',
  confirmed: 'green',
  rejected: 'red',
  withdrawn: 'gray',
};

function statusVariant(status: Application['status']): ChipVariant {
  return STATUS_VARIANTS[status];
}

/**
 * U8 · Моя заявка.
 * Статусы: Получена → Подтверждена / Отклонена; Отозвана участником.
 * После «Получена» заявку можно редактировать, пока регистрация в роли открыта.
 * Поведение статуса после редактирования — см. docs/IMPLEMENTATION.md [UNKNOWN].
 * Резерв в MVP нет — организатор ведёт его в Telegram.
 */
export function MyApplicationPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { applications, updateApplication, tournaments } = useApp();
  const application = applications.find((a) => a.tournamentId === id && a.status !== 'withdrawn');

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!application) {
    return (
      <Screen>
        <ScreenHeader title="Моя заявка" />
        <Note variant="err">Заявка не найдена. Возможно, вы её отозвали.</Note>
        <div className={styles.actions}>
          <Button variant="soft" to={`/tournament/${id}`} arrowLeft>
            К карточке турнира
          </Button>
        </div>
      </Screen>
    );
  }

  const tournament = tournaments.find((t) => t.id === application.tournamentId);
  const roleOpen = Boolean(
    tournament?.roleWindows.find((w) => w.role === application.role)?.open,
  );
  // Игрок классики может добавить вторую роль — секундант другого игрока
  const canBecomeSecond =
    application.role === 'player' &&
    tournament?.format === 'classic' &&
    Boolean(tournament?.roleWindows.find((w) => w.role === 'second')?.open);

  /**
   * [UNKNOWN]: как меняется статус после редактирования, в обновлённой спеке не определено.
   * Сохраняем текущий статус (заявка остаётся в работе), решение фиксируется только на бэкенде USN.
   */
  async function handleWithdraw() {
    if (!application) return;
    setBusy(true);
    setError(null);
    try {
      const updated = await api.withdrawApplication(application.id);
      updateApplication(updated);
    } catch {
      setError('Не удалось отозвать заявку. Попробуйте ещё раз.');
    } finally {
      setBusy(false);
    }
  }

  const form = application.form;
  const judgeBlocks = application.availabilityBlockIds.length;

  /** Правка начинается с роль-специфичного шага и предзаполняется данными заявки */
  function handleEdit() {
    if (!application || !tournament) return;
    navigate(editPathFor(application, tournament.format), {
      state: draftFromApplication(application),
    });
  }

  return (
    <Screen>
      <ScreenHeader title="Моя заявка" />

      {application.status === 'received' && (
        <Note variant="success">
          Заявка принята! Мы отправили письмо на почту.
        </Note>
      )}

      <Card title={tournament?.name ?? application.tournamentId}>
        <div className={styles.chipRow}>
          <Chip variant="blue">{ROLE_LABELS[application.role]}</Chip>
          <Chip variant={statusVariant(application.status)}>{STATUS_LABELS[application.status]}</Chip>
          {application.role === 'judge' && judgeBlocks > 0 && (
            <Chip variant="gray">{`${judgeBlocks} ${blockWord(judgeBlocks)}`}</Chip>
          )}
          {application.role === 'second' && application.secondingPlayerIds.length > 0 && (
            <Chip variant="gray">{`Секундирую ${application.secondingPlayerIds.length} ${playerWord(application.secondingPlayerIds.length)}`}</Chip>
          )}
        </div>
        <p className={styles.secondary}>
          {form.lastName} {form.firstName}
          {form.city ? ` · ${form.city}` : ''}
          {form.club ? ` · ${form.club}` : ''}
        </p>
      </Card>

      {application.status === 'received' && roleOpen && (
        <div className={styles.actions}>
          <Button variant="outline" onClick={handleEdit} arrow>
            Редактировать
          </Button>
          {canBecomeSecond && (
            <Button variant="soft" to={`/tournament/${id}/apply/second?role=second`} arrow>
              + Стать секундантом
            </Button>
          )}
        </div>
      )}

      {application.status === 'received' && roleOpen && (
        <div className={styles.actions}>
          <Button variant="dangerSoft" onClick={handleWithdraw} disabled={busy}>
            {busy ? 'Отзываем…' : 'Отозвать заявку'}
          </Button>
        </div>
      )}

      <Note variant="info">
        Если роль закрыта: «Регистрация закрыта — изменения через организатора», кнопки редактирования скрыты.
      </Note>

      {application.status === 'confirmed' && (
        <Note variant="info">Заявка подтверждена — мы ждём вас на турнире.</Note>
      )}

      {error && <Note variant="err">{error}</Note>}

      <div className={styles.actions}>
        <Button variant="soft" to="/my-tournaments" arrowLeft>
          Все мои турниры
        </Button>
      </div>
    </Screen>
  );
}
