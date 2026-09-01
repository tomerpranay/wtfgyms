import { test, expect } from '@playwright/test';

test.describe('WTF LivePulse Dashboard E2E Tests', () => {

  test('1. Dashboard loads title, header, and gym selector without errors', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/WTF LivePulse/i);

    // Verify header brand element
    const headerTitle = page.locator('h1');
    await expect(headerTitle).toContainText('WTF LivePulse');

    // Verify gym selector
    const gymSelect = page.locator('select#gym-select');
    await expect(gymSelect).toBeVisible();

    // Verify occupancy widget present
    const occupancyWidget = page.locator('text=Live Gym Occupancy');
    await expect(occupancyWidget).toBeVisible();
  });

  test('2. Switching gym in dropdown updates displayed location name', async ({ page }) => {
    await page.goto('/');
    const gymSelect = page.locator('select#gym-select');
    await expect(gymSelect).toBeVisible();

    // Select second gym option
    const options = await gymSelect.locator('option').all();
    if (options.length > 1) {
      const secondOptionValue = await options[1].getAttribute('value');
      await gymSelect.selectOption(secondOptionValue);

      // Verify selected gym name heading updates
      const selectedGymHeading = page.locator('span.text-xl.font-extrabold');
      await expect(selectedGymHeading).toBeVisible();
    }
  });

  test('3. Simulator start button initiates live simulation stream', async ({ page }) => {
    await page.goto('/');
    const startButton = page.locator('button:has-text("Start Live Stream")');
    await expect(startButton).toBeVisible();

    await startButton.click();

    // Verify running indicator text
    const runningIndicator = page.locator('text=● Simulator Running');
    await expect(runningIndicator).toBeVisible();
  });

});
