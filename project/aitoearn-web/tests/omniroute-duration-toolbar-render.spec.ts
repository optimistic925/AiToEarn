import { expect, test } from '@playwright/test'

for (const modelName of ['veoaifree-web/veo', 'veoaifree-web/seedance']) {
  test(`${modelName} renders the real toolbar without the duration selector`, async ({ page }) => {
    await page.goto(`http://127.0.0.1:3101/?model=${encodeURIComponent(modelName)}`)
    await expect(page.getByTestId('duration-toolbar-fixture')).toBeVisible()
    await expect(page.getByTestId('draftbox-ai-duration')).toHaveCount(0)
  })
}

test('selectable-duration model renders the real toolbar duration selector baseline', async ({ page }) => {
  await page.goto('http://127.0.0.1:3101/?model=selectable-video')
  await expect(page.getByTestId('duration-toolbar-fixture')).toBeVisible()
  await expect(page.getByTestId('draftbox-ai-duration')).toHaveCount(1)
})
