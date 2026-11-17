import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { Tournament } from '@/types';
import * as api from '@/services/api';
import { Screen, ScreenHeader } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Field } from '@/components/ui/Field';
import { Note } from '@/components/ui/Note';
import { Checkbox } from '@/components/ui/Checkbox';
import { useApp } from '@/state/AppContext';
import { useApplicationDraft } from '@/hooks/useApplicationDraft';
import { buildForm } from './draft';
import styles from './JudgeStepPage.module.css';

/**
 * U6c · Судья · доступность.
 * Блоки доступности создаются организатором в Django Admin.
 * Нужно отметить минимум один блок. Коллегию судья не выбирает и не видит.
 */
export function JudgeStepPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useApp();
  const draft = useApplicationDraft(id, 'judge');

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [selected, setSelected] = useState<string[]>(draft?.availabilityBlockIds ?? []);
  const [position, setPosition] = useState(draft?.form?.position ?? profile?.position ?? '');
  const [company, setCompany] = useState(draft?.form?.company ?? profile?.company ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    let alive = true;
    void api.getTournament(id ?? '').then((t) => {
      if (alive) setTournament(t ?? null);
    });
    return () => {
      alive = false;
    };
  }, [id]);

  const blocks = tournament?.availabilityBlocks ?? [];
  const noBlocks = tournament !== null && blocks.length === 0;

  function toggle(blockId: string, checked: boolean) {
    setSelected((prev) => (checked ? [...prev, blockId] : prev.filter((x) => x !== blockId)));
  }

  function handleNext() {
    const errs: Record<string, string> = {};
    if (selected.length === 0) errs.blocks = 'Отметьте хотя бы один блок доступности';
    if (!position.trim()) errs.position = 'Обязательное поле';
    if (!company.trim()) errs.company = 'Обязательное поле';
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    const back = `/tournament/${id}/apply/judge?role=judge`;
    navigate(`/tournament/${id}/apply/details?role=judge`, {
      state: {
        role: 'judge',
        form: { ...buildForm(draft?.form, profile), position, company },
        availabilityBlockIds: selected,
        applicationId: draft?.applicationId,
        back,
      },
    });
  }

  return (
    <Screen>
      <ScreenHeader title="Судья · доступность" />

      {noBlocks ? (
        <Note variant="warn">
          Судейские слоты ещё не открыты. «Регистрация временно недоступна»: без блоков доступности заявки
          судей не принимаются; на стороне USN открытие регистрации судей без слотов блокируется.
        </Note>
      ) : (
        <Card title="Когда вы готовы судить (UTC)">
          {blocks.map((b) => (
            <Checkbox
              key={b.id}
              name={`block-${b.id}`}
              label={`${b.time} · ${b.title}`}
              checked={selected.includes(b.id)}
              onChange={(checked) => toggle(b.id, checked)}
            />
          ))}
          {errors.blocks && <p className={styles.hint} role="alert">{errors.blocks}</p>}
        </Card>
      )}

      <Field label="Должность" name="position" mark required value={position} onChange={setPosition} error={errors.position} />
      <Field label="Компания" name="company" mark required autoComplete="organization" value={company} onChange={setCompany} error={errors.company} />

      <p className={styles.hint}>Коллегию назначает Главный арбитр.</p>

      <div className={styles.actions}>
        <Button onClick={handleNext} disabled={noBlocks} arrow>
          Далее
        </Button>
        <Button variant="soft" to={draft?.back ?? `/tournament/${id}/register`} arrowLeft>
          Назад
        </Button>
      </div>
    </Screen>
  );
}
