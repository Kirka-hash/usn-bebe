# USN · Платформа турниров

Веб-приложение платформы турниров USN (чемпионаты по управленческой борьбе): регистрация участников по ролям, заявки, доступность судей, ИИ-распределение по коллегиям и проблемные поединки.

Реализовано по обновлённым референсам прототипа (`design-references/`, 16.11.2026; мобайл 390 для участника / десктоп 1280 для организатора) с учётом бизнес-правил обновления 11.2026 (см. `docs/IMPLEMENTATION.md`).

## Запуск

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # typecheck + production-сборка в dist/
npm run preview   # предпросмотр production-сборки
npm run typecheck # только проверка типов
```

Требуется Node.js 18+.

## Что внутри

| Раздел | Экраны прототипа | Маршруты |
|---|---|---|
| Список турниров | U1 | `/` |
| Вход / регистрация | U2 | `/login` |
| Профиль участника | U2a | `/profile` |
| Карточка турнира | U3 | `/tournament/:id` |
| Выбор роли | U4 | `/tournament/:id/register` |
| Напарник (командный) | U6a | `/tournament/:id/apply/player` |
| Секундант | U6b | `/tournament/:id/apply/second` |
| Судья · доступность | U6c | `/tournament/:id/apply/judge` |
| Анкета участника | U5 | `/tournament/:id/apply/details` |
| Согласия и отправка | U7 | `/tournament/:id/consents` |
| Моя заявка | U8 | `/tournament/:id/application` |
| Мои турниры | U9 | `/my-tournaments` |
| Соревнования (организатор) | O1 | `/organizer` (вход: `/organizer/login`) |
| Вход организатора | — | `/organizer/login` |
| Новый турнир (организатор) | — | `/organizer/competitions/new` |
| Заявки турнира | O2 | `/organizer/competitions/:id/entries` |
| Карточка участника | O2a | `/organizer/entries/:entryId` |
| Доступность судей | O3 | `/organizer/competitions/:id/availability` |
| Коллегии (ИИ) | O4 | `/organizer/competitions/:id/colleges` |
| Почему ИИ так предложил | O4a | `/organizer/colleges/explain/:judgeId` |
| Проблемные поединки (ИИ) | O5 | `/organizer/competitions/:id/issues` |

Демо-состояние (профиль, заявки, турниры, сессия организатора) хранится в `localStorage` (ключ `usn.demo.v1`). Сброс: очистить ключ или «жёсткое обновление» страницы после изменения кода мока.

## Кабинет организатора (демо-доступ)

Раздел `/organizer` защищён сессией организатора. Демо-аккаунт (не production-аутентификация — реальный вход подключается на backend):

- email: `organizer@usn.demo`
- пароль: `organizer`

После входа — список соревнований, кнопка «Создать турнир» (название, тип, даты, время, место, описание, дедлайн — с валидацией). Турнир сохраняется в демо-БД и виден участникам сразу; судейские слоты у нового турнира не заданы, поэтому регистрация судей закрыта («Судейские слоты ещё не открыты»), пока организатор не задаст блоки доступности.

## Стек

- React 19 + TypeScript (strict), Vite 6
- React Router 7
- CSS Modules + дизайн-токены на CSS-переменных (`src/styles/tokens.css`)
- Inter (self-hosted через `@fontsource/inter`)

Больше о дизайн-системе: `docs/DESIGN.md`, об архитектуре: `docs/ARCHITECTURE.md`, о реализованном функционале и ограничениях: `docs/IMPLEMENTATION.md`.
