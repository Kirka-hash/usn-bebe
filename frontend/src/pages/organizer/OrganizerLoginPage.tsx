import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Screen, ScreenHeader } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { Note } from '@/components/ui/Note';
import { Field } from '@/components/ui/Field';
import { useApp } from '@/state/AppContext';
import { DEMO_ORGANIZER } from '@/services/api';
import styles from './OrganizerLoginPage.module.css';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Вход организатора.
 * Демо-версия: локальная проверка демо-аккаунта, без сети — production-аутентификация
 * подключается на backend. Демо-доступ показан на экране явно.
 */
export function OrganizerLoginPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { organizerLogin, organizerAuth } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const next = params.get('next');
  const target = next && next.startsWith('/organizer') ? next : '/organizer';

  async function handleSubmit() {
    const errors: Record<string, string> = {};
    if (!EMAIL_RE.test(email.trim())) errors.email = 'Введите email';
    if (!password.trim()) errors.password = 'Введите пароль';
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    setFormError(null);
    try {
      await organizerLogin(email, password);
      navigate(target, { replace: true });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Не удалось войти');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen>
      <ScreenHeader title="Кабинет организатора · вход" />

      {organizerAuth ? (
        <>
          <Note variant="info">Сессия организатора уже активна.</Note>
          <div className={styles.actions}>
            <Button to="/organizer" arrow>
              К соревнованиям
            </Button>
          </div>
        </>
      ) : (
        <>
          <p className={styles.hint}>Вход только для команды организаторов. Участникам — <Link to="/login" className={styles.link}>общий вход</Link>.</p>

          <Field
            label="Email"
            name="org-email"
            type="email"
            autoComplete="email"
            mark
            placeholder="organizer@usn.demo"
            value={email}
            onChange={setEmail}
            error={fieldErrors.email}
          />
          <Field
            label="Пароль"
            name="org-password"
            type="password"
            autoComplete="current-password"
            mark
            placeholder="пароль демо-доступа"
            value={password}
            onChange={setPassword}
            error={fieldErrors.password}
          />

          <Note variant="info">
            Демо-доступ: {DEMO_ORGANIZER.email} · пароль «organizer». Это не production-аутентификация —
            реальный вход подключается на backend.
          </Note>

          {formError && <Note variant="err">{formError}</Note>}

          <div className={styles.actions}>
            <Button onClick={handleSubmit} disabled={submitting} arrow>
              {submitting ? 'Проверяем…' : 'Войти в кабинет'}
            </Button>
          </div>
        </>
      )}
    </Screen>
  );
}
