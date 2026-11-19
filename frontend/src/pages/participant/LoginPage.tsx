import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Screen, ScreenHeader } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { Note } from '@/components/ui/Note';
import { Field } from '@/components/ui/Field';
import { useApp } from '@/state/AppContext';
import * as api from '@/services/api';
import styles from './LoginPage.module.css';

const EMAIL_RE = /^[a-z0-9.!#$%&'*+/=?^_`{|}~\-]+@[a-z0-9.-]+\.[a-z0-9-]+$/i;

/**
 * U2 · Вход / регистрация на платформе.
 * Новый email → создаём аккаунт: обязательны Фамилия и Имя.
 * После входа возвращаем на турнир, с которого пришёл пользователь (?next=).
 */
export function LoginPage() {
  const navigate = useNavigate();
  const { login, tournaments } = useApp();
  const review = tournaments.some(t => t.reviewDemo);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [lastName, setLastName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  async function handleRequestCode() {
    if (!EMAIL_RE.test(email.trim())) { setFieldErrors({ email: 'Введите корректный email' }); return; }
    setSubmitting(true); setFormError(null); setFieldErrors({});
    try { await api.requestCode(email.trim()); setCodeSent(true); }
    catch (err) { setFormError(err instanceof Error ? err.message : 'Не удалось отправить код'); }
    finally { setSubmitting(false); }
  }

  async function handleSubmit() {
    const errors: Record<string, string> = {};
    if (!EMAIL_RE.test(email.trim())) errors.email = 'Введите корректный email';
    if (!code.trim()) errors.code = 'Введите код из письма';
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    setFormError(null);
    try {
      await login(email.trim(), code.trim(), lastName, firstName);
      const params = new URLSearchParams(window.location.search);
      const next = params.get('next');
      navigate(next && next.startsWith('/') ? next : '/my-tournaments', { replace: true });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Не удалось войти');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen>
      <ScreenHeader code="U2" title="Вход / регистрация на платформе" />

      {review && !codeSent && <div className={styles.actions}>
        <Button variant="soft" onClick={() => { setEmail('player@usn.example.test'); setFieldErrors({}); setFormError(null); }}>Демо: игрок</Button>
        <Button variant="soft" onClick={() => { setEmail('judge@usn.example.test'); setFieldErrors({}); setFormError(null); }}>Демо: судья</Button>
      </div>}

      <Field
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        mark
        placeholder="name@mail.ru"
        value={email}
        onChange={(value) => { setEmail(value); setCodeSent(false); }}
        error={fieldErrors.email}
      />
      {!codeSent ? (
        <Button onClick={handleRequestCode} disabled={submitting}>Отправить код на почту</Button>
      ) : (
        <>
          <Note variant="info">Код отправлен на {email}. На демосервере письмо выводится в лог бэкенда.</Note>
          <Field label="Код из письма" name="code" autoComplete="one-time-code" mark
            value={code} onChange={setCode} error={fieldErrors.code} />
          <Note variant="info">Если аккаунт новый, укажите имя и фамилию. Остальные данные заполните в профиле.</Note>
          <Field
            label="Фамилия"
            name="lastName"
            autoComplete="family-name"
            value={lastName}
            onChange={setLastName}
            error={fieldErrors.lastName}
          />
          <Field
            label="Имя"
            name="firstName"
            autoComplete="given-name"
            value={firstName}
            onChange={setFirstName}
            error={fieldErrors.firstName}
          />
          <div className={styles.actions}>
            <Button onClick={handleSubmit} disabled={submitting} arrow>
              {submitting ? 'Проверяем…' : 'Войти'}
            </Button>
            <Button variant="soft" onClick={handleRequestCode} disabled={submitting}>Отправить код повторно</Button>
          </div>
        </>
      )}

      {formError && <Note variant="err">{formError}</Note>}
      <p className={styles.or}>
        Нет доступа к почте?{' '}
        <Link to="/" className={styles.link}>
          Вернуться к турнирам
        </Link>
      </p>
    </Screen>
  );
}
