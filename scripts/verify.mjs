/**
 * Сквозная проверка интерфейса в реальном браузере (Playwright + установленный Edge).
 *
 * Что проверяет:
 *  - все маршруты отвечают, содержат h1 и не падают;
 *  - нет ошибок в консоли браузера;
 *  - нет горизонтальной прокрутки страницы на 390 / 768 / 1280 px;
 *  - сценарий участника: выбор роли → анкета → согласия → заявка → правка без дубля;
 *  - сценарий организатора: подтверждение заявки, карточка, O5 (вариант + копирование).
 *
 * Требования: запущенный `npm run dev` на http://localhost:5173.
 * Запуск: `npm run verify`.
 */
import { chromium } from 'playwright';

const BASE = process.env.BASE_URL ?? 'http://localhost:5173';

const PARTICIPANT_ROUTES = [
  '/',
  '/login',
  '/profile',
  '/tournament/challenge-2026',
  '/tournament/challenge-2026/register',
  '/tournament/challenge-2026/apply/details?role=player',
  '/tournament/cooperation-2026/apply/player?role=player',
  '/tournament/challenge-2026/apply/second?role=second',
  '/tournament/challenge-2026/apply/judge?role=judge',
  '/tournament/challenge-2026/consents?role=viewer',
  '/tournament/cooperation-2026/application',
  '/my-tournaments',
];

const ORGANIZER_ROUTES = [
  '/organizer',
  '/organizer/competitions/challenge-2026/entries',
  '/organizer/entries/o-j1',
  '/organizer/competitions/challenge-2026/availability',
  '/organizer/competitions/challenge-2026/colleges',
  '/organizer/colleges/explain/J_003?duel=d1',
  '/organizer/competitions/challenge-2026/issues',
];

const failures = [];
const notes = [];

function check(condition, message) {
  if (!condition) failures.push(message);
}

async function collectRoute(page, route, width, errors) {
  await page.goto(BASE + route, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500); // мок-API отвечает с задержкой

  const bodyText = await page.locator('body').innerText();
  check(!/Application error|Unexpected Application Error/i.test(bodyText), `${width}px ${route}: упал рендер`);
  check((await page.locator('h1').count()) > 0, `${width}px ${route}: нет h1`);

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  check(overflow <= 1, `${width}px ${route}: горизонтальная прокрутка ${overflow}px`);

  if (errors.length > 0) {
    failures.push(`${width}px ${route}: ошибки консоли:\n  ${errors.join('\n  ')}`);
    errors.length = 0;
  }
}

async function main() {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 900 },
    permissions: ['clipboard-read', 'clipboard-write'],
  });
  const page = await context.newPage();
  // Чистое демо-состояние один раз; дальше localStorage переживает перезагрузки
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle' });
  const errors = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`console: ${m.text()}`);
  });

  // --- Маршруты на трёх ширинах ---
  const widths = [390, 768, 1280];
  const routes = [...PARTICIPANT_ROUTES, ...ORGANIZER_ROUTES];
  for (const width of widths) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of routes) {
      await collectRoute(page, route, width, errors);
    }
    notes.push(`${width}px: ${routes.length} маршрутов проверено`);
  }

  // --- Сценарий участника: новая заявка зрителя ---
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto(`${BASE}/tournament/challenge-2026`, { waitUntil: 'networkidle' });
  await page.getByRole('link', { name: 'Зарегистрироваться' }).click();
  await page.getByRole('button', { name: /Зритель/ }).click();
  await page.waitForURL(/apply\/details/);

  await page.locator('input[name="lastName"]').fill('Иванов');
  await page.locator('input[name="firstName"]').fill('Пётр');
  await page.locator('input[name="country"]').fill('Россия');
  await page.locator('input[name="city"]').fill('Екатеринбург');
  await page.getByRole('button', { name: 'Далее' }).click();
  await page.waitForURL(/consents/);

  await page.locator('input[name="rules"]').check();
  await page.locator('input[name="personal"]').check();
  await page.locator('input[name="media"]').check();
  await page.getByRole('button', { name: 'Отправить заявку' }).click();
  await page.waitForURL(/\/tournament\/challenge-2026\/application$/);
  await page.getByText('Заявка принята! Мы отправили письмо на почту.').waitFor();
  notes.push('участник: заявка создана и открыта в U8');

  // --- Правка: предзаполнение и сохранение в ту же заявку ---
  await page.getByRole('button', { name: 'Редактировать' }).click();
  await page.waitForURL(/apply\/details\?role=viewer/);
  const prefilled = await page.locator('input[name="lastName"]').inputValue();
  check(prefilled === 'Иванов', `правка: фамилия не предзаполнена (получено «${prefilled}»)`);

  await page.locator('input[name="city"]').fill('Казань');
  await page.getByRole('button', { name: 'Далее' }).click();
  await page.waitForURL(/consents/);
  await page.locator('input[name="rules"]').check();
  await page.locator('input[name="personal"]').check();
  await page.locator('input[name="media"]').check();
  await page.getByRole('button', { name: 'Отправить заявку' }).click();
  await page.waitForURL(/\/tournament\/challenge-2026\/application$/);
  await page.getByText('Казань').waitFor();

  await page.goto(`${BASE}/my-tournaments`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  const challengeCards = await page
    .getByRole('heading', { name: 'Кубок Вызова 2026 · Классика' })
    .count();
  check(challengeCards === 1, `правка: ожидалась 1 карточка турнира, найдено ${challengeCards} (создан дубль?)`);
  notes.push('участник: правка сохраняется в ту же заявку, дубля нет');

  // --- Организатор: подтверждение заявки ---
  await page.setViewportSize({ width: 1280, height: 1000 });
  await page.goto(`${BASE}/organizer/competitions/challenge-2026/entries`, {
    waitUntil: 'networkidle',
  });
  await page.waitForTimeout(500);
  const before = await page.getByRole('button', { name: 'Подтвердить' }).count();
  check(before > 0, 'организатор: нет заявок в статусе «Получена» для подтверждения');
  if (before > 0) {
    await page.getByRole('button', { name: 'Подтвердить' }).first().click();
    await page.waitForTimeout(600);
    const after = await page.getByRole('button', { name: 'Подтвердить' }).count();
    check(after === before - 1, 'организатор: подтверждение не изменило статус строки');
  }

  // --- O2a: карточка участника открывается из таблицы ---
  await page.getByRole('link', { name: 'Карточка' }).first().click().catch(async () => {
    await page.getByRole('button', { name: 'Карточка' }).first().click();
  });
  await page.waitForURL(/organizer\/entries\//);
  check((await page.getByText('История').count()) > 0, 'O2a: нет блока «История»');
  notes.push('организатор: подтверждение и карточка участника работают');

  // --- O5: вариант ИИ и копирование приглашения ---
  await page.goto(`${BASE}/organizer/competitions/challenge-2026/issues`, {
    waitUntil: 'networkidle',
  });
  await page.getByRole('button', { name: 'Применить вариант' }).first().click();
  await page.getByText('Вариант применён').first().waitFor();
  await page.getByRole('button', { name: 'Скопировать текст' }).click();
  await page.getByText('Скопировано ✓').waitFor();
  const clip = await page.evaluate(() => navigator.clipboard.readText());
  check(clip.length > 20, 'O5: текст приглашения не попал в буфер обмена');
  notes.push('организатор: O5 применяет вариант и копирует приглашение');

  // --- Финал ---
  if (errors.length > 0) {
    failures.push(`ошибки консоли в сценариях:\n  ${errors.join('\n  ')}`);
  }
  await context.close();
  await browser.close();

  console.log('Проверено:');
  for (const note of notes) console.log(`  ✓ ${note}`);
  if (failures.length > 0) {
    console.error(`\nПроблемы (${failures.length}):`);
    for (const failure of failures) console.error(`  ✗ ${failure}`);
    process.exitCode = 1;
  } else {
    console.log('\nВсе проверки пройдены.');
  }
}

main().catch((error) => {
  console.error('Проверка не запустилась:', error);
  process.exitCode = 1;
});
