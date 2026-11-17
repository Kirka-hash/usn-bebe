/** Smoke for the real FastAPI-backed participant UI. Run API and Vite first. */
import { chromium } from 'playwright';

const base = process.env.BASE_URL || 'http://127.0.0.1:5173';
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 900 } });
const errors = [];
page.on('pageerror', error => errors.push(error.message));

try {
  for (const width of [390, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of ['/', '/login', '/tournament/cup-challenge-classic']) {
      await page.goto(base + path);
      await page.getByRole('heading', { level: 1 }).waitFor();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      if (overflow > 1) throw new Error(`${width}px ${path}: горизонтальная прокрутка ${overflow}px`);
    }
  }
  await page.goto(base + '/tournament/cup-challenge-classic/register');
  await page.waitForURL(/\/login\?next=/);
  await page.getByRole('textbox', { name: 'Email' }).fill('smoke@example.com');
  await page.getByRole('button', { name: 'Отправить код на почту' }).click();
  await page.getByText('Код отправлен на').waitFor();
  if (errors.length) throw new Error(`Ошибки браузера: ${errors.join('; ')}`);
  console.log('UI smoke: маршруты, адаптивность, вход и FastAPI-запрос кода — OK');
} finally {
  await browser.close();
}
