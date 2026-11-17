import { useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import type { ApplicationForm, Role } from '@/types';
import { ROLE_LABELS } from '@/data/mock';
import { Screen, ScreenHeader } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { Note } from '@/components/ui/Note';
import { useApp } from '@/state/AppContext';
import { useApplicationDraft } from '@/hooks/useApplicationDraft';
import { buildForm } from './draft';
import styles from './step.module.css';

/**
 * U5 · Анкета участника — общая для всех ролей.
 * Одна кнопка «Далее» → согласия (U7). Поля подтягиваются из профиля.
 * Школа/клуб важна: по ней проверяем конфликт интересов судьи.
 */
export function ApplicationDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const [params] = useSearchParams();
  const role = (params.get('role') ?? 'player') as Role;
  const navigate = useNavigate();
  const { profile, updateProfile } = useApp();
  const draft = useApplicationDraft(id, role);

  const [form, setForm] = useState<ApplicationForm>(() => buildForm(draft?.form, profile));
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = (key: keyof ApplicationForm) => (value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  function handleNext() {
    const errs: Record<string, string> = {};
    if (!form.lastName.trim()) errs.lastName = 'Обязательное поле';
    if (!form.firstName.trim()) errs.firstName = 'Обязательное поле';
    if (!form.country.trim()) errs.country = 'Обязательное поле';
    if (!form.city.trim()) errs.city = 'Обязательное поле';
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    void updateProfile(form); // профиль пополняется данными первой анкеты
    navigate(`/tournament/${id}/consents?role=${role}`, {
      state: {
        role,
        form,
        partnerId: draft?.partnerId,
        secondingPlayerIds: draft?.secondingPlayerIds,
        availabilityBlockIds: draft?.availabilityBlockIds,
        applicationId: draft?.applicationId,
      },
    });
  }

  // «Назад» зависит от роли: у судьи и секунданта перед анкетой был свой шаг (U6c / U6b)
  const backTarget =
    draft?.back ??
    (role === 'judge'
      ? `/tournament/${id}/apply/judge?role=judge`
      : role === 'second'
        ? `/tournament/${id}/apply/second?role=second`
        : `/tournament/${id}/register`);

  return (
    <Screen>
      <ScreenHeader title="Анкета участника" />

      <Field label="Фамилия" name="lastName" mark required autoComplete="family-name" value={form.lastName} onChange={set('lastName')} error={errors.lastName} />
      <Field label="Имя" name="firstName" mark required autoComplete="given-name" value={form.firstName} onChange={set('firstName')} error={errors.firstName} />
      <Field label="Страна" name="country" mark required autoComplete="country-name" value={form.country} onChange={set('country')} error={errors.country} />
      <Field label="Город" name="city" mark required autoComplete="address-level2" value={form.city} onChange={set('city')} error={errors.city} />
      <Field label="Школа / клуб" name="club" value={form.club ?? ''} onChange={set('club')} />
      <Field label="Как вас представить участникам" name="displayName" value={form.displayName ?? ''} onChange={set('displayName')} />
      <Field label="Telegram" name="telegram" value={form.telegram ?? ''} onChange={set('telegram')} />
      <Field label="VK" name="vk" value={form.vk ?? ''} onChange={set('vk')} />

      <Note variant="info">
        Роль: {ROLE_LABELS[role]}. По школе/клубу система проверяет конфликт интересов судьи
        (тренер–ученик определяется по названию школы).
      </Note>

      <div className={styles.actions}>
        <Button onClick={handleNext} arrow>
          Далее
        </Button>
        <Button variant="soft" to={backTarget} arrowLeft>
          Назад
        </Button>
      </div>
    </Screen>
  );
}
