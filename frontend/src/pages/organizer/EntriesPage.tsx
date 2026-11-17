import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ROLE_LABELS, STATUS_LABELS, USN_PLAYERS } from '@/data/mock';
import type { Application, Role } from '@/types';
import { blockWord } from '@/utils/judges';
import { Screen, ScreenHeader } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { Note } from '@/components/ui/Note';
import { DataTable } from '@/components/ui/DataTable';
import type { DataTableColumn } from '@/components/ui/DataTable';
import { OrganizerTabs } from './OrganizerTabs';
import { useApp } from '@/state/AppContext';
import styles from './EntriesPage.module.css';

interface EntryRow {
  key: string;
  /** Заявки группы (одна или Игрок + Секундант) */
  apps: Application[];
  name: string;
  roleLabel: string;
  status: Application['status'];
  links: string;
  entryHref: string;
}

const STATUS_VARIANTS: Record<Application['status'], 'warn' | 'green' | 'red' | 'gray'> = {
  received: 'warn',
  confirmed: 'green',
  rejected: 'red',
  withdrawn: 'gray',
};

const ROLE_FILTER_ORDER: Role[] = ['player', 'judge', 'second', 'viewer'];

/** «Петров Илья» → «Петров И.» для колонки связей */
function shortName(fullName: string): string {
  const [last, first] = fullName.split(' ');
  return first ? `${last} ${first.charAt(0)}.` : `${last}`;
}

/**
 * O2 · Заявки турнира — все заявки в одном месте, фильтры по роли и статусу, поиск по ФИО.
 * Действия: Подтвердить / Отклонить / Карточка. Новая заявка судьи → баннер о пересчёте коллегий.
 * Заявки одного участника в двух ролях (Игрок + Секундант) объединяются в одну строку [ESTIMATED].
 */
export function EntriesPage() {
  const { id = '' } = useParams<{ id: string }>();
  const { organizerEntries, setEntryStatus, tournaments } = useApp();
  const [roleFilter, setRoleFilter] = useState<Role | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<Application['status'] | 'all'>('all');
  const [query, setQuery] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [judgeAlert, setJudgeAlert] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const tournament = tournaments.find((t) => t.id === id);

  const entries = useMemo(
    () => organizerEntries.filter((a) => a.tournamentId === id && a.status !== 'withdrawn'),
    [organizerEntries, id],
  );

  const rows: EntryRow[] = useMemo(() => {
    const groups = new Map<string, Application[]>();
    for (const a of entries) {
      const key = `${a.form.lastName} ${a.form.firstName}`.trim().toLowerCase();
      const list = groups.get(key) ?? [];
      list.push(a);
      groups.set(key, list);
    }
    return [...groups.values()].map((apps) => {
      const sorted = [...apps].sort(
        (a, b) => ROLE_FILTER_ORDER.indexOf(a.role) - ROLE_FILTER_ORDER.indexOf(b.role),
      );
      const first = sorted[0] ?? apps[0]!;
      const playerEntry = apps.find((a) => a.role === 'player');
      const secondEntry = apps.find((a) => a.role === 'second');
      const judgeEntry = apps.find((a) => a.role === 'judge');
      const roles = [...new Set(sorted.map((a) => a.role))].map((r) => ROLE_LABELS[r]);

      let links = '—';
      if (secondEntry) {
        links =
          secondEntry.secondingPlayerIds.length > 0
            ? `секундирует: ${secondEntry.secondingPlayerIds
                .map((pid) => USN_PLAYERS.find((p) => p.id === pid)?.name ?? tournament?.players.find((p) => p.id === pid)?.name ?? pid)
                .map(shortName)
                .join(', ')}`
            : '—';
      } else if (playerEntry) {
        links = playerEntry.teamStatus === 'confirmed' ? 'Команда подтверждена' :
          playerEntry.teamStatus === 'awaiting' ? 'Команда: ждёт подтверждения' :
          playerEntry.teamStatus === 'declined' ? 'Напарник отклонил' :
          playerEntry.partnerId ? `напарник: ${playerEntry.partnerId}` : playerEntry.note ?? 'Напарник не указан';
      } else if (judgeEntry) {
        const blocks = judgeEntry.availabilityBlockIds.length;
        links = `${blocks} ${blockWord(blocks)} · ${judgeEntry.form.position ?? '—'}`;
      }

      return {
        key: first.id,
        apps: sorted,
        name: judgeEntry ? judgeEntry.publicId ?? `${first.form.lastName} ${first.form.firstName}` : `${first.form.lastName} ${first.form.firstName}`.trim(),
        roleLabel: roles.join(' + '),
        status: first.status,
        links,
        entryHref: first.id,
      };
    });
  }, [entries, tournament]);

  const filtered = rows.filter(
    (row) =>
      (roleFilter === 'all' || row.apps.some((a) => a.role === roleFilter)) &&
      (statusFilter === 'all' || row.status === statusFilter) &&
      (query.trim() === '' || row.name.toLowerCase().includes(query.trim().toLowerCase())),
  );

  async function changeStatus(apps: Application[], status: Application['status']) {
    setBusyId(apps[0]?.id ?? null);
    setError(null);
    try {
      for (const a of apps) {
        await setEntryStatus(a.id, status);
      }
      // Подтверждение судьи меняет карту коллегий → предлагаем пересчёт (как в прототипе O2)
      const judge = apps.find((a) => a.role === 'judge');
      if (status === 'confirmed' && judge) {
        setJudgeAlert(judge.publicId ?? `${judge.form.lastName} ${judge.form.firstName}`.trim());
      }
    } catch {
      setError('Не удалось изменить статус заявки. Попробуйте ещё раз.');
    } finally {
      setBusyId(null);
    }
  }

  const columns: ReadonlyArray<DataTableColumn<EntryRow>> = [
    {
      key: 'name',
      title: 'Участник',
      width: 220,
      render: (r) => (
        <Link to={`/organizer/entries/${r.entryHref}`} className={styles.entryLink}>
          {r.name}
        </Link>
      ),
    },
    { key: 'role', title: 'Роль', width: 170, render: (r) => r.roleLabel },
    { key: 'links', title: 'Связи / доп. данные', width: 280, render: (r) => r.links },
    {
      key: 'status',
      title: 'Статус',
      width: 130,
      render: (r) => <Chip variant={STATUS_VARIANTS[r.status]}>{STATUS_LABELS[r.status]}</Chip>,
    },
    {
      key: 'actions',
      title: 'Действия',
      width: 360,
      render: (r) => (
        <span className={styles.cellChips}>
          {r.status === 'received' && (
            <>
              <Button
                variant="greenSoft"
                onClick={() => void changeStatus(r.apps, 'confirmed')}
                disabled={busyId === r.key}
              >
                Подтвердить
              </Button>
              <Button
                variant="dangerSoft"
                onClick={() => void changeStatus(r.apps, 'rejected')}
                disabled={busyId === r.key}
              >
                Отклонить
              </Button>
            </>
          )}
          <Button variant="outline" to={`/organizer/entries/${r.entryHref}`} arrow>
            Карточка
          </Button>
        </span>
      ),
    },
  ];

  return (
    <Screen>
      <ScreenHeader title="Заявки турнира" />
      <p className={styles.subtitle}>{tournament ? `${tournament.name} · ${tournament.dates}` : ''}</p>

      <OrganizerTabs tournamentId={id} active="entries" />

      <div className={styles.filters}>
        <select
          className={styles.filterSelect}
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value as Role | 'all')}
          aria-label="Фильтр по роли"
        >
          <option value="all">Все роли</option>
          {ROLE_FILTER_ORDER.map((r) => (
            <option key={r} value={r}>
              {ROLE_LABELS[r]}
            </option>
          ))}
        </select>
        <select
          className={styles.filterSelect}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as Application['status'] | 'all')}
          aria-label="Фильтр по статусу"
        >
          <option value="all">Все статусы</option>
          {(['received', 'confirmed', 'rejected'] as Application['status'][]).map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
        <input
          className={styles.searchInput}
          type="search"
          placeholder="Поиск по ФИО"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Поиск по ФИО"
        />
      </div>

      {error && <Note variant="err">{error}</Note>}

      {filtered.length === 0 ? (
        <p className={styles.empty}>По выбранным фильтрам заявок нет.</p>
      ) : (
        <DataTable columns={columns} rows={filtered} rowKey={(r) => r.key} caption="Заявки турнира" />
      )}

      {judgeAlert && (
        <Note variant="warn">
          {`${judgeAlert} подтвердён в роли судьи — он мог стоять в утверждённой коллегии. Пересчитать?`}
          <button type="button" className={styles.dismiss} onClick={() => setJudgeAlert(null)}>
            Скрыть
          </button>
        </Note>
      )}

      <div className={styles.actions}>
        <Button to={`/organizer/competitions/${id}/colleges`} arrow>
          Перейти к коллегиям
        </Button>
      </div>
    </Screen>
  );
}
