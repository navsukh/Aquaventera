import { test, expect } from '@playwright/test';

test('Automated Design Consultation Form Submission', async ({ page }) => {
  // 1. Navigate to your local form page
  await page.goto('http://localhost:3000/'); 

  // 2. Fill out text inputs using exact placeholder matching (Screenshot 1)
  await page.getByPlaceholder('Your name').fill('Sukhraj Singh');
  await page.getByPlaceholder('you@example.com').fill('sukhraj@example.com');
  await page.getByPlaceholder('+91 98765 43210').fill('+91 99999 88888');
  await page.getByPlaceholder('DD.MM.YYYY (Only years 2026-2030 available)').fill('12.12.2026');

  // 3. Select Options from Native HTML Select Dropdowns by Index
  await page.locator('#f-guests').selectOption({ index: 1 }); 
  await page.locator('select').nth(1).selectOption({ index: 1 });

  // Fill in design text specific fields
  await page.getByPlaceholder('e.g. R & S · 14 February 2026').fill('A & B · 25 December 2026');
  await page.getByPlaceholder('e.g. Nastaliq, Devanagari, Latin italic').fill('Latin italic');
  await page.getByPlaceholder('e.g. blush pink, gold, ivory').fill('gold, ivory, emerald green');

  // 4. Fill custom text areas (Screenshot 2)
  await page.locator('textarea').first().fill('Please include custom gold initials.');
  await page.locator('textarea').nth(1).fill('Classic elegant wedding theme with deep emerald and gold accents.');

  // 5. Handle Mood Board File Upload (Injected Directly)
  // This finds your file input field and attaches a mock file instantly without clicking
  await page.locator('input[type="file"]').setInputFiles({
    name: 'mock-moodboard.png',
    mimeType: 'image/png',
    buffer: Buffer.from('fake-image-content')
  });

  // 6. Click submit
  await page.click('text=REQUEST A DESIGN CONSULTATION →');

  // 7. Verification: Wait for the submission action to complete
  await expect(page.locator('text=REQUEST A DESIGN CONSULTATION →')).not.toBeVisible({ timeout: 10000 });
});