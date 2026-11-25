import { test, expect } from '@playwright/test';
test('borrowing misconception, scaffold, persistent offline shell and cross-grade teacher group', async ({
  page,
  context,
}) => {
  await page.goto('/?device=browser-A');
  await expect(
    page.getByText('Your answers are safe with your teacher.'),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Meena Class 4', exact: true })
    .click();
  await expect(page.getByRole('heading', { name: '52 − 27' })).toBeVisible();
  await page.getByRole('button', { name: '35', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Let’s try it together.' }),
  ).toBeVisible();
  await expect(
    page.getByText('Kannada recording pending', { exact: false }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Try a smaller step' }).click();
  await expect(page.getByRole('heading', { name: '43 − 18' })).toBeVisible();
  await page.getByRole('button', { name: '25', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: '✓ That’s it. Well done!' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Sync now', exact: false }).click();
  await expect
    .poll(async () =>
      page.evaluate(async () => {
        const data = await (await fetch('/api/teacher/stats')).json();
        return data.attemptCount;
      }),
    )
    .toBe(65);
  await page.screenshot({
    path: 'test-results/student-correct.png',
    fullPage: true,
  });
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await context.setOffline(true);
  await page.reload();
  await expect(
    page.getByRole('button', { name: 'Meena Class 4', exact: true }),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Meena Class 4', exact: true })
    .click();
  await expect(page.locator('.question-board h1')).not.toHaveText('52 − 27');
  await expect(page.locator('.question-board h1')).not.toBeEmpty();
  await expect(
    page.getByText('Learning offline', { exact: true }),
  ).toBeVisible();
  await context.setOffline(false);
  await page.goto('/teacher?demo=1');
  const borrowing = page.locator('article').filter({
    has: page.getByRole('heading', {
      name: 'Subtraction with borrowing',
      exact: true,
    }),
  });
  await expect(
    borrowing.getByRole('button', { name: 'Meena C4' }),
  ).toBeVisible();
  await expect(
    borrowing.getByRole('button', { name: 'Kavya C3' }),
  ).toBeVisible();
  await borrowing.getByRole('button', { name: 'Meena C4' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(
    page.getByText('The vertical mark is the 75% mastery line.'),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Close ×' }).click();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: 'test-results/teacher-desktop.png',
    fullPage: true,
  });
});
test('360px layout, verified pack download and separate device history', async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await page.goto('/?device=browser-B');
  await expect(
    page.getByText('Your answers are safe with your teacher.'),
  ).toBeVisible();
  await page.getByRole('button', { name: '⌁ Connect to teacher' }).click();
  await page.getByRole('button', { name: 'Connect & save pack' }).click();
  await expect(
    page.getByRole('heading', { name: 'Connect to teacher', exact: true }),
  ).not.toBeVisible();
  await expect(
    page.getByText('90 activities saved on this device'),
  ).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    )
    .toBe(true);
  await page
    .getByRole('button', { name: 'Kavya Class 3', exact: true })
    .click();
  await expect(page.getByRole('heading', { name: '52 − 27' })).toBeVisible();
  await page.screenshot({
    path: 'test-results/student-mobile.png',
    fullPage: true,
  });
  await page.getByRole('button', { name: '35', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Let’s try it together.' }),
  ).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    )
    .toBe(true);
  await page.goto('/teacher');
  await expect(
    page.getByRole('heading', { name: 'Every child, at their own pace.' }),
  ).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    )
    .toBe(true);
  await expect(
    page.getByText('Demo controls', { exact: true }),
  ).not.toBeVisible();
});
test('clock makes review due and sync sheet restores focus on Escape', async ({
  page,
  request,
}) => {
  const advanced = await request.post('/api/teacher/clock', {
    data: { advanceDays: 1, dayMs: 60000 },
  });
  expect(advanced.ok()).toBe(true);
  await page.goto('/?device=browser-C');
  await expect(
    page.getByText('Your answers are safe with your teacher.'),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Meena Class 4', exact: true })
    .click();
  await expect(
    page.getByText('Time for a little review', { exact: true }),
  ).toBeVisible();
  const trigger = page.getByRole('button', {
    name: 'Teacher connected',
    exact: true,
  });
  await trigger.click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Your answers stay safe.' }),
  ).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(trigger).toBeFocused();
});
