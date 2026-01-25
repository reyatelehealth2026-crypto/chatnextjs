import { expect, test } from '@playwright/test'

test('login screen renders', async ({ page }) => {
  await page.goto('/auth/login')
  await expect(page.getByRole('heading', { name: 'เข้าสู่ระบบ' })).toBeVisible()
})
