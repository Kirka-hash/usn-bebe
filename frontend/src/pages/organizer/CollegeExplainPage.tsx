import { useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { COLLEGE_SHORT, COLLEGES, DUEL_PLANS, JUDGE_SCORES } from '@/data/mock';
import type { JudgeScores } from '@/types';
import { CheckIcon } from '@/components/ui/icons';
import { Screen, ScreenHeader } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { Note } from '@/components/ui/Note';
import { DataTable } from '@/components/ui/DataTable';
import type { DataTableColumn } from '@/components/ui/DataTable';
import { pairLabel, scoreLabel, shortJudgeId } from '@/utils/judges';
import styles from './CollegeExplainPage.module.css';

interface Replacement {
  judgeId: string;
  /** «3 / 3» */
  score: string;
  available: boolean;
  conflict: string | null;
}

/**
 * O4a · Почему ИИ так предложил.
 * Короткое объяснение: 2–3 причины + что было бы альтернативой.
 * Организатор может заменить судью — система показывает подходящие замены
 * с баллами и проверкой конфликтов. В LLM уходят только обезличенные ID.
 */
export function CollegeExplainPage() {
  const { judgeId = 'JUDGE_003' } = useParams<{ judgeId: string }>();
  const [params] = useSearchParams();
  const duelId = params.get('duel') ?? 'd1';
  const duel = DUEL_PLANS.find((d) => d.id === duelId) ?? DUEL_PLANS[0]!;
  const target = JUDGE_SCORES.find((j) => j.judgeId === judgeId);
  const [replaced, setReplaced] = useState<string | null>(null);

  const collegeId = duel.panels[0]?.collegeId ?? 'c1';
  const collegeTitle = COLLEGES[collegeId] ?? COLLEGE_SHORT[collegeId] ?? collegeId;
  // «поединок №N» — краткая форма из заголовка поединка (по прототипу O4a)
  const duelShort = duel.title.includes('№') ? `поединок №${duel.title.split('№')[1]?.trim() ?? ''}` : duel.title;

  function expertAvg(judge: JudgeScores | undefined): string {
    if (!judge) return '—';
    return scoreLabel(judge.scores[collegeId]);
  }

  function expertPair(judge: JudgeScores | undefined): string {
    if (!judge) return '—';
    return pairLabel(judge.scores[collegeId]);
  }

  const alternativeId = 'JUDGE_018';

  const replacements: Replacement[] = [
    {
      judgeId: 'JUDGE_006',
      score: expertPair(JUDGE_SCORES.find((j) => j.judgeId === 'JUDGE_006')),
      available: true,
      conflict: null,
    },
    {
      judgeId: alternativeId,
      score: expertPair(JUDGE_SCORES.find((j) => j.judgeId === alternativeId)),
      available: true,
      conflict: judgeId === 'JUDGE_018' ? null : 'тот же клуб, что игрок',
    },
  ];

  const columns: ReadonlyArray<DataTableColumn<Replacement>> = [
    { key: 'judge', title: 'Замена', width: 200, render: (r) => shortJudgeId(r.judgeId) },
    { key: 'score', title: 'Балл', width: 160, render: (r) => r.score },
    {
      key: 'available',
      title: 'Доступен',
      width: 160,
      render: (r) => (
        <span className={styles.cellCenter} aria-label={r.available ? 'доступен' : 'недоступен'}>
          {r.available && <CheckIcon />}
        </span>
      ),
    },
    {
      key: 'conflict',
      title: 'Конфликт',
      width: 240,
      render: (r) =>
        r.conflict ? (
          <Chip variant="red">{r.conflict}</Chip>
        ) : (
          <Chip variant="green">нет</Chip>
        ),
    },
  ];

  return (
    <Screen>
      <ScreenHeader code="O4a" title="Почему ИИ так предложил" />

      <Card title={`${shortJudgeId(judgeId)} → «${collegeTitle}», ${duelShort}`}>
        <p className={styles.reason}>
          • Балл {expertAvg(target)} у обоих экспертов (ОС, КС) именно в этой коллегии
        </p>
        <p className={styles.reason}>• Доступен весь блок 06:00–08:30</p>
        <p className={styles.reason}>• Нет конфликта: другой клуб, не тренер и не напарник игроков</p>
      </Card>

      <DataTable columns={columns} rows={replacements} rowKey={(r) => r.judgeId} caption="Подходящие замены" />

      {replaced && <Note variant="info">Судья заменён на {shortJudgeId(replaced)}. Назначение обновлено, конфликтов нет.</Note>}

      <div className={styles.actions}>
        <Button variant="outline" onClick={() => setReplaced('JUDGE_006')}>
          {`Заменить на ${shortJudgeId('JUDGE_006')}`}
        </Button>
        <Button variant="soft" to={`/organizer/competitions/challenge-2026/colleges`} arrowLeft>
          К коллегиям
        </Button>
      </div>
    </Screen>
  );
}
