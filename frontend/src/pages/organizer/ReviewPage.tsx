import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Screen, ScreenHeader } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { Card, CardText } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { Note } from '@/components/ui/Note';
import { DataTable } from '@/components/ui/DataTable';
import type { DataTableColumn } from '@/components/ui/DataTable';
import { getReview, applyReview } from '@/services/api';
import type { ReviewPlan, ReviewState } from '@/services/api';
import { useApp } from '@/state/AppContext';
import { OrganizerTabs } from './OrganizerTabs';
import styles from './CollegesPage.module.css';

const colleges = [
  ['hiring', 'Нанимающиеся'],
  ['sending', 'Отправляющие'],
  ['ownership', 'Доверяющие'],
] as const;

const when = (start: string) => start.slice(8, 10) + '.' + start.slice(5, 7) + ' ' + start.slice(11, 16) + ' UTC';

export function ReviewPage({ view }: { view: 'colleges' | 'issues' }) {
  const { id = '' } = useParams();
  const { refresh, tournaments } = useApp();
  const [review, setReview] = useState<ReviewState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [formed, setFormed] = useState(false);
  const [approved, setApproved] = useState(false);
  const [showReasons, setShowReasons] = useState(false);
  const [selected, setSelected] = useState('');
  const isIssues = view === 'issues';

  useEffect(() => {
    let active = true;
    setApproved(false);
    setFormed(false);
    setSelected('');
    setReview(null);
    setError('');
    if (isIssues) void getReview(id)
      .then(state => { if (active) setReview(state); })
      .catch(() => { if (active) setError('Не удалось загрузить разбор дефицита.'); });
    return () => { active = false; };
  }, [id, isIssues]);

  async function calculate() {
    setBusy(true);
    setError('');
    try {
      setReview(await getReview(id));
      setFormed(true);
      setApproved(false);
      setSelected('');
    } catch {
      setError('Не удалось собрать предложение.');
    } finally {
      setBusy(false);
    }
  }

  async function apply(gameId: string) {
    setBusy(true);
    setError('');
    try {
      setReview(await applyReview(id, gameId));
      await refresh();
    } catch {
      setError('Не удалось применить предложение. Проверьте доступность судей.');
    } finally {
      setBusy(false);
    }
  }

  function replaceWithReserve(planId: string, judgeId: string, reserveId: string) {
    if (!review || approved) return;
    setReview({ ...review, plans: review.plans.map(plan => {
      if (plan.id !== planId || !plan.proposal.reserve.includes(reserveId)) return plan;
      const reserve = plan.proposal.reserve.map(id => id === reserveId ? judgeId : id);
      const assignments = plan.proposal.assignments.map(a => a.judge_id === judgeId ? {
        ...a, judge_id: reserveId, score: plan.reserve_scores[reserveId]?.[a.collegium] ?? 0,
        reasons: ['замена из доступного резерва по решению организатора'],
      } : a);
      const original = plan.proposal.assignments.find(a => a.judge_id === judgeId);
      const reserveScores = { ...plan.reserve_scores };
      if (original) reserveScores[judgeId] = plan.judge_scores[judgeId] ?? {};
      return { ...plan, reserve_scores: reserveScores, proposal: { ...plan.proposal, assignments, reserve } };
    }) });
  }

  const target = review?.plans.find(p => p.id === selected);
  const firstReserve = target?.proposal.reserve[0];
  const columns: DataTableColumn<ReviewPlan>[] = [
    { key: 'duel', title: 'Поединок', width: 265, render: p => <div>{p.title}<br />{when(p.start)}</div> },
    ...colleges.map(([key, title]) => ({
      key, title, width: 215, render: (p: ReviewPlan) => {
        const names = p.proposal.assignments.filter(a => a.collegium === key)
          .map(a => a.judge_id + ' (' + a.score + ')').join(' · ');
        const missing = p.proposal.missing[key] ?? 0;
        return <div>{names || '—'} {missing > 0 && <Chip variant="red">Не хватает {missing}</Chip>}</div>;
      },
    })),
    { key: 'reserve', title: 'Резерв', width: 135, render: p => p.proposal.reserve.join(', ') || '—' },
    { key: 'status', title: 'Статус', width: 140, render: p => p.complete
      ? <Chip variant="green">Состав собран</Chip>
      : <Button variant="dangerSoft" to={`/organizer/competitions/${id}/issues`}>Разобрать</Button> },
  ];

  return <Screen>
    <ScreenHeader code={isIssues ? 'O5' : 'O4'} title={isIssues ? 'Проблемные поединки — варианты ИИ' : 'Коллегии — предложение ИИ'}
      subtitle={tournaments.find(t => t.id === id)?.name} />
    <OrganizerTabs tournamentId={id} active={view} />
    {error && <Note variant="err">{error}</Note>}
    {isIssues ? (
      review && (review.issues.length === 0 ? (
        <Note variant="success">Дефицит закрыт. Для всех {review.plans.length} поединков собраны коллегии.</Note>
      ) : review.issues.map(issue => {
        const plan = review.plans.find(p => p.id === issue.game_id);
        return <Card key={issue.game_id} title={plan?.title ?? 'Проблемный поединок'}>
          <Chip variant="red">Не хватает судей: {issue.needed}</Chip>
          <Button onClick={() => setSelected(issue.game_id)} disabled={selected === issue.game_id} arrow>Помочь</Button>
          {selected === issue.game_id && (issue.can_resolve ? <>
            <CardText>Предложение: попросить судей соседних блоков расширить доступность.
              Кандидаты в коллегии: {issue.suggestions.slice(0, issue.needed).map(s => s.label).join(', ')}.
              {issue.suggestions.length > issue.needed && ` В резерв: ${issue.suggestions.slice(issue.needed).map(s => s.label).join(', ')}.`}
            </CardText>
            <CardText>Текст приглашения: «Здравствуйте! Сможете ли вы судить поединок {plan && when(plan.start)}? Подтвердите, пожалуйста, свою доступность».</CardText>
            <Button variant="greenSoft" disabled={busy} onClick={() => void apply(issue.game_id)}>
              {busy ? 'Пересчитываем…' : 'Применить вариант'}
            </Button>
            <CardText>В демо применение имитирует согласие судей и пересчитывает состав. Сообщение можно отправить вручную.</CardText>
          </> : <CardText>Подходящих кандидатов пока недостаточно.</CardText>)}
        </Card>;
      }))
    ) : <>
      <div className={styles.actions}>
        <Button onClick={() => void calculate()} disabled={busy}>{formed ? 'Пересчитать' : 'Сформировать предложение'}</Button>
        {review && <Button variant="greenSoft" onClick={() => setApproved(true)} disabled={approved || review.issues.length > 0}>
          {approved ? 'Распределение утверждено' : 'Утвердить распределение'}
        </Button>}
      </div>
      {review && <>
        <Note variant="info">Состав: {review.panel_size}. Резерв: {review.reserve}. Подбор учитывает доступность и учебные оценки судей.</Note>
        {review.issues.length > 0 && <Note variant="warn">Закройте дефицит перед утверждением.</Note>}
        <DataTable columns={columns} rows={review.plans} rowKey={p => p.id} caption="Коллегии по поединкам" />
        <Card title="Объяснение">
          <label>Поединок <select aria-label="Поединок" value={selected} onChange={event => { setSelected(event.target.value); setShowReasons(false); }}>
            <option value="">Выберите поединок</option>
            {review.plans.map(plan => <option key={plan.id} value={plan.id}>{plan.title}</option>)}
          </select></label>
          {target?.complete && !approved && firstReserve && (
            <label>Заменить судью резервным <select aria-label="Заменить судью резервным" value="" onChange={event => {
              if (event.target.value) replaceWithReserve(target.id, event.target.value, firstReserve);
            }}>
              <option value="">Выберите судью для замены</option>
              {target.proposal.assignments.map(a => <option key={a.judge_id} value={a.judge_id}>{a.judge_id}</option>)}
            </select></label>
          )}
          <Button variant="outline" onClick={() => setShowReasons(true)} disabled={!target}>Почему так?</Button>
          {showReasons && target?.proposal.assignments.map(a => <CardText key={a.judge_id}>
            {a.judge_id} · {colleges.find(([key]) => key === a.collegium)?.[1]} — {a.reasons.join(', ')}.
          </CardText>)}
        </Card>
      </>}
    </>}
  </Screen>;
}
