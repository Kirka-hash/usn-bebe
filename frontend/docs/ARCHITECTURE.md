# Архитектура USN (архив первоначального демопрототипа)

Актуальная схема данных и ограничения — в [README](../README.md) и [архитектуре сервиса](../../docs/architecture.md).

## Обзор

SPA на React 19 + TypeScript (strict) + Vite 6, React Router 7. Состояние — React Context c демо-персистентностью в `localStorage`. Стейлинг — CSS Modules с дизайн-токенами на CSS-переменных.

```
src/
  main.tsx            # вход: шрифты Inter, global.css, StrictMode
  App.tsx             # маршруты: SiteLayout → Participant* / Organizer*
  styles/
    tokens.css        # дизайн-токены (цвета, типографика, радиусы, отступы)
    global.css        # reset, фокус, базовая типографика
  types/index.ts      # доменные типы: Tournament, Application, JudgeScores…
  data/mock.ts        # мок-данные прототипа (турниры, судьи, панели, варианты ИИ)
  services/api.ts     # мок-API: контракт будущего Django-backend USN
  state/AppContext.tsx# глобальное состояние: профиль, заявки, org-заявки
  layouts/            # SiteLayout (шапка), ParticipantLayout (390), OrganizerLayout (1280)
  components/ui/      # Screen, Button, Chip, Card, Note, Field, Checkbox, DataTable, icons
  pages/
    participant/      # U1–U9: турниры, вход, профиль, заявка, шаги ролей
    organizer/        # O1–O5: соревнования, заявки, доступность, коллегии, проблемы
  utils/judges.ts     # объединение баллов ОС/КС, форматирование ID судей
```

## Ответственность модулей

- **types** — единственный источник доменных типов; страницы и сервисы импортируют отсюда.
- **data/mock** — демо-данные, согласованные с референсами (панели O4, матрица O3, варианты O5). При подключении бэкенда удаляется целиком.
- **services/api** — асинхронный контракт с задержкой 350 мс; проверки дублируют будущие серверные (`role-closed`, `no-slots`, `duplicate`, `missing-fields`). UI не меняется при замене на `fetch`.
- **state/AppContext** — загрузка профиля/заявок, мутации, `resetDemo`. Организаторские демо-заявки живут отдельно (`organizerEntries`), чтобы не смешивать с заявками пользователя.
- **layouts** — три слоя: сайт (шапка), участник (мобильная колонка до 430px), организатор (широкий контейнер до 1320px).
- **components/ui** — примитивы дизайн-системы без бизнес-логики; стилизация только через токены.
- **pages/organizer/OrganizerTabs** — общая таб-навигация O2–O5 (по референсам табы находятся внутри экрана).

## Маршруты

См. README: participant-поток `/`, `/login`, `/profile`, `/tournament/:id[/register|/apply/*|/consents|/application]`, `/my-tournaments`; organizer-поток `/organizer/...`.

Особенности:
- Передача состояния шагов заявок — через router `state` (`pages/participant/draft.ts`), без глобального стора.
- «Назад» на U5 вычисляется по роли (судья → U6c, секундант → U6b).
- Организаторские таб-ссылки строятся от `tournamentId` активного турнира.

## Обработка данных и ошибок

- Страницы с загрузкой (U1, U3, U4) имеют состояния loading / error / пустые данные.
- Ошибки API — `ApiError` с кодом; UI показывает человекочитаемый текст в `Note err`.
- Мок-база: `localStorage['usn.demo.v1']`, повреждённые данные игнорируются, приватный режим не ломает приложение.

## Решение по расширению

- Новая роль: добавить `Role`, `ROLE_LABELS`, `roleWindows`, шаг в `App.tsx` — UI U4 соберёт кнопку автоматически.
- Новый статус: `ApplicationStatus`, `STATUS_LABELS`, `STATUS_VARIANTS` в трёх местах (U8/U9/O2/O2a) — при росте вынести в общий модуль.
- Коллегии/панели: `DuelPlan`/`CollegePanel` в mock; при подключении ИИ-бэкенда структуры переносятся 1:1.
