import type { Application, ApplicationForm, Format, Profile, Role } from '@/types';

/** Черновик заявки, передаётся между шагами через router state */
export interface ApplicationDraft {
  role: Role;
  form?: ApplicationForm;
  partnerId?: string;
  secondingPlayerIds?: string[];
  availabilityBlockIds?: string[];
  /** Редактирование существующей заявки (после статуса «Получена») */
  applicationId?: string;
  /** Куда вести по «Назад» на общем шаге анкеты (U5) */
  back?: string;
}

export function readDraft(state: unknown): ApplicationDraft | null {
  if (state && typeof state === 'object' && 'role' in state) {
    return state as ApplicationDraft;
  }
  return null;
}

/** Черновик из уже поданной заявки — для правки без создания дубля (U8 → U5/U6) */
export function draftFromApplication(application: Application): ApplicationDraft {
  return {
    role: application.role,
    form: { ...application.form },
    partnerId: application.partnerId,
    secondingPlayerIds: [...application.secondingPlayerIds],
    availabilityBlockIds: [...application.availabilityBlockIds],
    applicationId: application.id,
    back: `/tournament/${application.tournamentId}/application`,
  };
}

/**
 * Первый шаг правки заявки: роль определяет, куда вести пользователя.
 * Формат игрока берётся из соревнования (командный → U6a, иначе → U5).
 */
export function editPathFor(application: Application, format: Format): string {
  const base = `/tournament/${application.tournamentId}/apply`;
  switch (application.role) {
    case 'judge':
      return `${base}/judge?role=judge`;
    case 'second':
      return `${base}/second?role=second`;
    case 'player':
      return format === 'team' ? `${base}/player?role=player` : `${base}/details?role=player`;
    case 'viewer':
      return `${base}/details?role=viewer`;
  }
}

/**
 * Собирает полную анкету из частичных данных шага и профиля.
 * Значения из шага приоритетнее: при правке заявки они берутся из неё.
 */
export function buildForm(base: Partial<ApplicationForm> | undefined, profile: Profile | null): ApplicationForm {
  return {
    lastName: base?.lastName || profile?.lastName || '',
    firstName: base?.firstName || profile?.firstName || '',
    country: base?.country || profile?.country || '',
    city: base?.city || profile?.city || '',
    club: base?.club ?? profile?.club ?? '',
    position: base?.position ?? profile?.position ?? '',
    company: base?.company ?? profile?.company ?? '',
    displayName: base?.displayName ?? profile?.displayName ?? '',
    telegram: base?.telegram ?? profile?.telegram ?? '',
    vk: base?.vk ?? profile?.vk ?? '',
  };
}
