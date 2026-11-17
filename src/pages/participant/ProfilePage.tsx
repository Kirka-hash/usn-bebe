import { useEffect, useState } from 'react';
import { Screen, ScreenHeader } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { Note } from '@/components/ui/Note';
import { Field } from '@/components/ui/Field';
import type { ApplicationForm } from '@/types';
import { useApp } from '@/state/AppContext';
import styles from './ProfilePage.module.css';

/**
 * U2a · Профиль участника — источник данных для автозаполнения анкет.
 * Обязательные для участия: Фамилия, Имя, Страна, Город. Остальное — опционально.
 */
export function ProfilePage() {
  const { profile, updateProfile } = useApp();
  const [form, setForm] = useState<ApplicationForm>({
    lastName: '',
    firstName: '',
    country: '',
    city: '',
    club: '',
    position: '',
    company: '',
    displayName: '',
    telegram: '',
    vk: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setForm((prev) => ({
        ...prev,
        lastName: profile.lastName || prev.lastName,
        firstName: profile.firstName || prev.firstName,
        country: profile.country || prev.country,
        city: profile.city || prev.city,
        club: profile.club ?? '',
        position: profile.position ?? '',
        company: profile.company ?? '',
        displayName: profile.displayName ?? '',
        telegram: profile.telegram ?? '',
        vk: profile.vk ?? '',
      }));
    }
  }, [profile]);

  const set = (key: keyof ApplicationForm) => (value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  async function handleSave() {
    const errs: Record<string, string> = {};
    if (!form.lastName.trim()) errs.lastName = 'Обязательное поле';
    if (!form.firstName.trim()) errs.firstName = 'Обязательное поле';
    if (!form.country.trim()) errs.country = 'Обязательное поле';
    if (!form.city.trim()) errs.city = 'Обязательное поле';
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    setSaving(true);
    try {
      await updateProfile(form);
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen>
      <ScreenHeader title="Профиль участника" />

      <Field label="Фамилия" name="lastName" mark required autoComplete="family-name" value={form.lastName} onChange={set('lastName')} error={errors.lastName} />
      <Field label="Имя" name="firstName" mark required autoComplete="given-name" value={form.firstName} onChange={set('firstName')} error={errors.firstName} />
      <Field label="Страна" name="country" mark required autoComplete="country-name" value={form.country} onChange={set('country')} error={errors.country} />
      <Field label="Город" name="city" mark required autoComplete="address-level2" value={form.city} onChange={set('city')} error={errors.city} />
      <Field label="Школа / клуб" name="club" value={form.club ?? ''} onChange={set('club')} />
      <Field label="Должность" name="position" autoComplete="organization-title" value={form.position ?? ''} onChange={set('position')} />
      <Field label="Компания" name="company" autoComplete="organization" value={form.company ?? ''} onChange={set('company')} />
      <Field label="Как вас представить участникам" name="displayName" value={form.displayName ?? ''} onChange={set('displayName')} />
      <Field label="Telegram" name="telegram" value={form.telegram ?? ''} onChange={set('telegram')} />
      <Field label="VK" name="vk" value={form.vk ?? ''} onChange={set('vk')} />

      {saved && <Note variant="info">Профиль сохранён — данные подставятся в анкеты турниров.</Note>}

      <div className={styles.actions}>
        <Button onClick={handleSave} disabled={saving} arrow>
          {saving ? 'Сохраняем…' : 'Сохранить'}
        </Button>
        <Button variant="soft" to="/my-tournaments" arrow>
          Мои турниры
        </Button>
      </div>
    </Screen>
  );
}
