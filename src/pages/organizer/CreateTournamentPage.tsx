import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Screen, ScreenHeader } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { Note } from '@/components/ui/Note';
import { Field } from '@/components/ui/Field';
import inputStyles from '@/components/ui/Field.module.css';
import { useApp } from '@/state/AppContext';
import type { CreateTournamentPayload } from '@/services/api';
import styles from './CreateTournamentPage.module.css';

const FORMAT_OPTIONS: Array<{ value: CreateTournamentPayload['format']; label: string; hint: string }> = [
  { value: 'classic', label: 'Классика', hint: 'индивидуальные поединки, секунданты, коллегия 9 (3·3·3)' },
  { value: 'team', label: 'Командный', hint: 'команды из 2 игроков, секундантов нет' },
  { value: 'express', label: 'Экспресс', hint: 'короткие поединки, «жёсткие переговоры»' },
];

/**
 * Создание турнира — минимальный рабочий цикл организатора.
 * Поля: название, тип соревнования, даты, место, описание, время начала, дедлайн.
 * Данные записываются в демо-БД (localStorage) — после создания турнир виден
 * в списке соревнований и доступен участникам. Блоки судейских слотов после
 * создания не заданы: регистрация судей открывается, когда организатор их добавит.
 */
export function CreateTournamentPage() {
  const navigate = useNavigate();
  const { createTournament } = useApp();
  const [form, setForm] = useState<CreateTournamentPayload>({
    name: '',
    format: 'classic',
    dates: '',
    timeUtc: '',
    mode: '',
    description: '',
    deadline: '',
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const set = (key: keyof CreateTournamentPayload) => (value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  async function handleSubmit() {
    setSubmitting(true);
    setFormError(null);
    try {
      const tournament = await createTournament(form);
      navigate('/organizer', { state: { createdId: tournament.id } });
    } catch (err) {
      if (err instanceof Error && err.message.startsWith('{')) {
        try {
          setFieldErrors(JSON.parse(err.message) as Record<string, string>);
        } catch {
          setFieldErrors({});
          setFormError('Проверьте заполнение полей.');
        }
      } else {
        setFormError(err instanceof Error ? err.message : 'Не удалось создать турнир');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen>
      <ScreenHeader title="Новый турнир" subtitle="Появится в списке соревнований сразу после сохранения" />

      <Field
        label="Название"
        name="name"
        mark
        placeholder="например: Кубок Весны 2026 · Классика"
        value={form.name}
        onChange={set('name')}
        error={fieldErrors.name}
      />

      <fieldset className={styles.formatGroup}>
        <legend className={styles.legend}>Тип соревнования *</legend>
        {FORMAT_OPTIONS.map((opt) => (
          <label key={opt.value} className={styles.formatOption}>
            <input
              type="radio"
              name="format"
              value={opt.value}
              checked={form.format === opt.value}
              onChange={() => set('format')(opt.value)}
            />
            <span>
              <strong>{opt.label}</strong> — {opt.hint}
            </span>
          </label>
        ))}
      </fieldset>

      <div className={styles.pairRow}>
        <Field
          label="Даты"
          name="dates"
          mark
          placeholder="18–19.04"
          value={form.dates}
          onChange={set('dates')}
          error={fieldErrors.dates}
        />
        <Field
          label="Время начала"
          name="timeUtc"
          placeholder="12:00 UTC (необязательно)"
          value={form.timeUtc}
          onChange={set('timeUtc')}
        />
      </div>

      <Field
        label="Место проведения"
        name="mode"
        mark
        placeholder="онлайн (Zoom) или адрес площадки"
        value={form.mode}
        onChange={set('mode')}
        error={fieldErrors.mode}
      />

      <div className={styles.fieldWrap}>
        <label className={inputStyles.label} htmlFor="t-description">
          Описание *
        </label>
        <textarea
          id="t-description"
          className={`${inputStyles.input} ${fieldErrors.description ? inputStyles.invalid : ''} ${styles.textarea}`}
          placeholder="Формат проведения, регламент, состав коллегии…"
          rows={4}
          value={form.description}
          onChange={(e) => set('description')(e.target.value)}
          aria-invalid={Boolean(fieldErrors.description)}
          aria-describedby={fieldErrors.description ? 't-description-error' : undefined}
        />
        {fieldErrors.description && (
          <p className={inputStyles.error} id="t-description-error">
            {fieldErrors.description}
          </p>
        )}
      </div>

      <Field
        label="Дедлайн регистрации"
        name="deadline"
        placeholder="17.04 (необязательно)"
        value={form.deadline}
        onChange={set('deadline')}
      />

      <Note variant="info">
        После создания откройте раздел «Доступность судей»: судейские слоты задаются в панели управления,
        и регистрация судей откроется, только когда слоты появятся.
      </Note>

      {formError && <Note variant="err">{formError}</Note>}

      <div className={styles.actions}>
        <Button onClick={handleSubmit} disabled={submitting} arrow>
          {submitting ? 'Сохраняем…' : 'Создать турнир'}
        </Button>
        <Button variant="soft" to="/organizer" arrowLeft>
          Отмена
        </Button>
      </div>
    </Screen>
  );
}
