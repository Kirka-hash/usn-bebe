import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  INVITE_NOTE,
  ISSUE_DUELS,
  ISSUE_VARIANTS,
  inviteTextFor,
} from '@/data/mock';
import type { IssueDuel } from '@/data/mock';
import { shortJudgeId } from '@/utils/judges';
import { Screen, ScreenHeader } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { Card, CardText } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { Note } from '@/components/ui/Note';
import { DataTable } from '@/components/ui/DataTable';
import type { DataTableColumn } from '@/components/ui/DataTable';
import { OrganizerTabs } from './OrganizerTabs';
import { useApp } from '@/state/AppContext';
import styles from './IssuesPage.module.css';

type VariantState = Record<string, { applied: boolean; invited: boolean }>;

/**
 * O5 · Проблемные поединки — варианты ИИ (задача «Б»):
 * А) судьи соседних блоков — прийти раньше / задержаться; Б) опытные судьи, ещё не зарегистрированные;
 * В) резервный судья судит за недостающую коллегию (классика и командные).
 * Сокращать состав ИИ не предлагает — количество судей определено регламентом (ОС 10.11).
 * Каждый кандидат — с причиной; текст приглашения готов, организатор отправляет сам.
 */
export function IssuesPage() {
  const { id = '' } = useParams<{ id: string }>();
  const { tournaments } = useApp();
  const tournament = tournaments.find((t) => t.id === id);
  const [selectedDuelId, setSelectedDuelId] = useState<string | null>('d3');
  const [variantState, setVariantState] = useState<VariantState>({});
  const [copied, setCopied] = useState(false);

  // Демо-разбор для «Кубка Вызова»; созданным турнирам ИИ ещё не построил разбор
  const duels = tournament?.id === 'challenge-2026' ? ISSUE_DUELS : [];

  const selectedDuel = duels.find((d) => d.id === selectedDuelId) ?? null;
  const variants = selectedDuelId ? (ISSUE_VARIANTS[selectedDuelId] ?? []) : [];
  const inviteText = useMemo(
    () => (selectedDuel ? inviteTextFor(selectedDuel) : ''),
    [selectedDuel],
  );

  const columns: ReadonlyArray<DataTableColumn<IssueDuel>> = [
    {
      key: 'duel',
      title: 'Поединок',
      width: 280,
      render: (d) =>
        d.id === selectedDuelId ? (
          <span className={styles.chosenMark}>{d.title}</span>
        ) : (
          <button type="button" className={styles.duelLink} onClick={() => setSelectedDuelId(d.id)}>
            {d.title}
          </button>
        ),
    },
    {
      key: 'risk',
      title: 'Риск',
      width: 200,
      render: (d) => <Chip variant={d.riskVariant === 'red' ? 'red' : 'warn'}>{d.risk}</Chip>,
    },
    { key: 'reason', title: 'Причина', width: 300, render: (d) => d.reason },
    {
      key: 'action',
      title: 'Действие',
      width: 200,
      render: (d) => (d.id === selectedDuelId ? <span className={styles.chosenMark}>выбран ▸</span> : '—'),
    },
  ];

  function applyVariant(duelId: string, kind: string) {
    setVariantState((prev) => ({ ...prev, [duelId]: { applied: true, invited: prev[duelId]?.invited ?? false } }));
    void kind;
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(inviteText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <Screen>
      <ScreenHeader title="Проблемные поединки — варианты ИИ" />
      <p className={styles.subtitle}>{tournament?.name ?? ''}</p>

      <OrganizerTabs tournamentId={id} active="issues" />

      {duels.length === 0 ? (
        <Note variant="info">
          Проблемных поединков нет: вполне достаточно судей по всем блокам. Разбор поединков появится здесь,
          когда по какому-то блоку образуется дефицит.
        </Note>
      ) : (
        <DataTable columns={columns} rows={duels} rowKey={(d) => d.id} caption="Проблемные поединки" />
      )}

      {selectedDuel && (
        <>
          {variants.map((v) => {
            const state = variantState[selectedDuel.id];
            const applied = Boolean(state?.applied);
            return (
              <Card key={v.kind} title={`Вариант ${v.kind} · ${v.title}`}>
                <CardText>
                  {v.candidates
                    .map((c) => `${shortJudgeId(c.judgeId)} ${c.detail}`)
                    .concat(v.note ? [v.note] : [])
                    .join(' · ')}
                </CardText>
                <Button
                  variant={v.accent === 'green' ? 'greenSoft' : 'outline'}
                  onClick={() => applyVariant(selectedDuel.id, v.kind)}
                  disabled={applied}
                  arrow={!applied}
                >
                  {applied ? 'Вариант применён' : 'Применить вариант'}
                </Button>
              </Card>
            );
          })}
          {variants.length === 0 && (
            <Card title="Вариантов не найдено">
              <CardText>Приглашайте судей вручную через Telegram.</CardText>
            </Card>
          )}

          <Card title="Текст приглашения">
            <p className={styles.invite}>{inviteText}</p>
            <div className={styles.actions}>
              <Button variant="outline" onClick={handleCopy}>
                {copied ? 'Скопировано ✓' : 'Скопировать текст'}
              </Button>
              <Button
                variant="soft"
                onClick={() =>
                  setVariantState((prev) => ({
                    ...prev,
                    [selectedDuel.id]: { applied: prev[selectedDuel.id]?.applied ?? false, invited: true },
                  }))
                }
                disabled={variantState[selectedDuel.id]?.invited}
              >
                {variantState[selectedDuel.id]?.invited ? 'Отмечено: отправлено' : 'Отметить «приглашение отправлено»'}
              </Button>
            </div>
            {copied && <Note variant="info">Текст приглашения скопирован — отправьте кандидату вручную.</Note>}
          </Card>
        </>
      )}

      <Note variant="info">{INVITE_NOTE}</Note>
    </Screen>
  );
}
