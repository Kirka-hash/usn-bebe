import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import type { Role } from '@/types';
import { useApp } from '@/state/AppContext';
import { draftFromApplication, readDraft } from '@/pages/participant/draft';
import type { ApplicationDraft } from '@/pages/participant/draft';

/**
 * Актуальный черновик шага заявки.
 *
 * Приоритет: router state (пользователь идёт по шагам) → существующая заявка
 * (правка из U8 или прямой переход с предзаполнением) → null (новая заявка).
 * Возвращает null, пока AppProvider не загрузил заявки, — экраны показывают
 * состояние загрузки вместо пустой формы.
 */
export function useApplicationDraft(
  tournamentId: string | undefined,
  role: Role,
): ApplicationDraft | null {
  const location = useLocation();
  const { applications, ready } = useApp();

  return useMemo(() => {
    const fromState = readDraft(location.state);
    if (fromState) return fromState;
    if (!ready) return null;
    const existing = applications.find(
      (a) => a.tournamentId === tournamentId && a.role === role && a.status !== 'withdrawn',
    );
    return existing ? draftFromApplication(existing) : null;
  }, [location.state, applications, ready, tournamentId, role]);
}
