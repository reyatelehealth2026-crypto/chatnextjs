import { expect, test } from '@playwright/test'

test('login page performance budget', async ({ page }) => {
  const budgetMs = Number(process.env.PERF_BUDGET_MS || 2000)
  await page.goto('/auth/login', { waitUntil: 'networkidle' })

  const timing = await page.evaluate(() => {
    const entry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined
    if (entry && entry.domContentLoadedEventEnd) {
      return entry.domContentLoadedEventEnd
    }
    const legacy = performance.timing
    return legacy.domContentLoadedEventEnd - legacy.navigationStart
  })

  expect(timing).toBeLessThanOrEqual(budgetMs)
})
