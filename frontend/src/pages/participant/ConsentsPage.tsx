import { useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import type { Application } from '@/types';
import { ROLE_LABELS } from '@/data/mock';
import * as api from '@/services/api';
import { ApiError } from '@/services/api';
import { Screen, ScreenHeader } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { Note } from '@/components/ui/Note';
import { Checkbox } from '@/components/ui/Checkbox';
import { useApp } from '@/state/AppContext';
import { useApplicationDraft } from '@/hooks/useApplicationDraft';
import styles from './ConsentsPage.module.css';

/**
 * U7 · Согласия и отправка.
 * 3 обязательных согласия. Сервер проверяет: роль открыта, сочетание допустимо,
 * обязательные поля заполнены, связи корректны. Ошибка → возврат с сохранением данных.
 */
export function ConsentsPage() {
  const { id } = useParams<{ id: string }>();
  const [params] = useSearchParams();
  const role = (params.get('role') ?? 'player') as Application['role'];
  const navigate = useNavigate();
  const { addApplication, updateApplication } = useApp();
  const draft = useApplicationDraft(id, role);

  const [rules, setRules] = useState(false);
  const [personal, setPersonal] = useState(false);
  const [media, setMedia] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const allChecked = rules && personal && media;
  const hasForm = Boolean(draft?.form);

  async function handleSubmit() {
    if (!allChecked || !draft?.form) return;
    setSubmitting(true);
    setError(null);
    try {
      const application = await api.submitApplication({
        tournamentId: id ?? '',
        role,
        form: draft.form,
        partnerId: draft.partnerId,
        secondingPlayerIds: draft.secondingPlayerIds,
        availabilityBlockIds: draft.availabilityBlockIds,
        applicationId: draft.applicationId,
      });
      if (draft.applicationId) {
        updateApplication(application);
      } else {
        addApplication(application);
      }
      navigate(`/tournament/${id}/application?role=${role}`, { replace: true });
    } catch (e) {
      if (e instanceof ApiError) {
        setError(e);
      } else {
        setError(new ApiError('unavailable', 'Сервер недоступен. Попробуйте ещё раз.'));
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (!hasForm) {
    return (
      <Screen>
        <ScreenHeader code="U7" title="Согласия и отправка" />
        <Note variant="err">
          Данные анкеты не найдены. Заполните анкету заново — заявка не отправлена.
        </Note>
        <div className={styles.actions}>
          <Button to={`/tournament/${id}/apply/details?role=${role}`} arrow>
            Заполнить анкету
          </Button>
          <Button variant="soft" to={`/tournament/${id}/register`} arrowLeft>
            Выбрать роль
          </Button>
        </div>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScreenHeader code="U7" title="Согласия и отправка" />

      <Checkbox name="rules" label="Принимаю правила соревнований" checked={rules} onChange={setRules} />
      <Checkbox name="personal" label="Согласен на обработку персональных данных" checked={personal} onChange={setPersonal} />
      <Checkbox name="media" label="Согласен на фото- и видеосъёмку" checked={media} onChange={setMedia} />

      <div className={styles.actions}>
        <Button onClick={handleSubmit} disabled={!allChecked || submitting} arrow>
          {submitting ? 'Отправляем…' : 'Отправить заявку'}
        </Button>
      </div>

      {error && (
        <>
          <Note variant="err">{error.message}{error.code === 'role_unavailable' && ' Введённые данные остались в анкете.'}</Note>
          <div className={styles.actions}>
            <Button variant="dangerSoft" onClick={() => navigate(-1)} arrow>
              Вернуться к анкете
            </Button>
          </div>
        </>
      )}

      {!error && <Note variant="info">
        Роль: {ROLE_LABELS[role]}. После отправки заявка появится со статусом «Получена»; её можно
        редактировать, пока регистрация в роли открыта.
      </Note>}
    </Screen>
  );
}
