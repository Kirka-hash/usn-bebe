import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Screen, ScreenHeader } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { Note } from '@/components/ui/Note';
import { Field } from '@/components/ui/Field';
import { useApp } from '@/state/AppContext';
import styles from './LoginPage.module.css';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * U2 · Вход / регистрация на платформе.
 * Новый email → создаём аккаунт: обязательны Фамилия и Имя.
 * После входа возвращаем на турнир, с которого пришёл пользователь (?next=).
 */
export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useApp();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [lastName, setLastName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const isNewAccount = useMemo(() => email.length > 3 && EMAIL_RE.test(email), [email]);

  async function handleSubmit() {
    const errors: Record<string, string> = {};
    if (!EMAIL_RE.test(email)) errors.email = 'Введите корректный email';
    if (!code.trim()) errors.code = 'Введите код из письма или пароль';
    if (isNewAccount) {
      if (!lastName.trim()) errors.lastName = 'Обязательное поле для нового аккаунта';
      if (!firstName.trim()) errors.firstName = 'Обязательное поле для нового аккаунта';
    }
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    setFormError(null);
    try {
      await login(email, lastName, firstName);
      const params = new URLSearchParams(window.location.search);
      const next = params.get('next');
      navigate(next && next.startsWith('/') ? next : '/my-tournaments', { replace: true });
    } catch {
      setFormError('Не удалось войти. Проверьте данные и попробуйте ещё раз.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen>
      <ScreenHeader title="Вход / регистрация на платформе" />

      <Button variant="outline" type="button" disabled title="Google OAuth подключается на backend">
        Войти через Google
      </Button>
      <p className={styles.or}>или по email</p>

      <Field
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        mark
        placeholder="name@mail.ru"
        value={email}
        onChange={setEmail}
        error={fieldErrors.email}
      />
      <Field
        label="Код из письма / пароль"
        name="code"
        type="password"
        autoComplete="current-password"
        mark
        value={code}
        onChange={setCode}
        error={fieldErrors.code}
      />

      {isNewAccount && (
        <Note variant="info">Новый email → создаём аккаунт: заполните Фамилию и Имя</Note>
      )}

      {isNewAccount && (
        <>
          <Field
            label="Фамилия"
            name="lastName"
            autoComplete="family-name"
            mark
            value={lastName}
            onChange={setLastName}
            error={fieldErrors.lastName}
          />
          <Field
            label="Имя"
            name="firstName"
            autoComplete="given-name"
            mark
            value={firstName}
            onChange={setFirstName}
            error={fieldErrors.firstName}
          />
        </>
      )}

      {formError && <Note variant="err">{formError}</Note>}

      <div className={styles.actions}>
        <Button onClick={handleSubmit} disabled={submitting} arrow>
          {submitting ? 'Отправляем…' : 'Продолжить'}
        </Button>
      </div>
      <div className={styles.actions}>
        <Button variant="soft" to="/profile" arrow>
          Заполнить профиль сейчас (необязательно)
        </Button>
      </div>
      <p className={styles.or}>
        Нет доступа к почте?{' '}
        <Link to="/" className={styles.link}>
          Вернуться к турнирам
        </Link>
      </p>
    </Screen>
  );
}
