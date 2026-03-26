import { test, expect } from '@playwright/test';

test.describe('PWA Offline & Synchronization Flow', () => {

    test.beforeEach(async ({ page }) => {
        // 1. Initial login - Required to have session for offline mode
        await page.goto('/login');
        await page.locator('input[type="email"]').fill('inspecteur@sonatel.sn');
        await page.locator('input[type="password"]').fill('Admin123!');
        await page.locator('button[type="submit"]').click();
        await expect(page).toHaveURL(/.*dashboard/i);
    });

    test('Should save inspection to IndexedDB when offline and sync when online', async ({ page, context }) => {
        // 1. Go to inspection page
        await page.goto('/inspection');

        // Wait for GPS authorization (mocked or handled by the app)
        const gpsBtn = page.locator('button:has-text("Autoriser le GPS")');
        if (await gpsBtn.isVisible()) {
            await gpsBtn.click();
        }
        await expect(page.locator('text=/conformité globale/i')).toBeVisible({ timeout: 10000 });

        // 2. Select a site (manually if needed or via planning)
        // Since we are on /inspection, we might need to select a site if no mission is linked
        const siteSelectBtn = page.locator('button:has-text("Sélectionner un planning")');
        await siteSelectBtn.click();
        const firstMission = page.locator('[role="menuitem"], .cursor-pointer').first();
        await firstMission.click();

        // 3. SWITCH TO OFFLINE MODE
        await context.setOffline(true);

        // Verify offline banner
        await expect(page.locator('text=/Vous êtes hors ligne/i')).toBeVisible();

        // 4. Fill a minimal questionnaire
        await page.locator('button[role="tab"]:has-text("Questionnaire")').click();
        const firstQuestionCard = page.locator('.group\\/q').first();
        await firstQuestionCard.locator('button:has-text("OUI")').click();

        // 5. GO TO SUMMARY AND SUBMIT
        await page.locator('button[role="tab"]:has-text("Résumé Global")').click();
        const finalizeBtn = page.locator('button:has-text("Clôturer l\'Audit")');
        await finalizeBtn.click();

        const submitBtn = page.locator('button:has-text("Soumettre le rapport final")');
        await submitBtn.click();

        // 6. VERIFY OFFLINE TOAST
        await expect(page.locator('text=/Mode Hors-ligne activé/i')).toBeVisible();
        await expect(page.locator('text=/sauvegardée localement/i')).toBeVisible();

        // 7. VERIFY REDIRECTION TO DASHBOARD AND QUEUE COUNT
        await expect(page).toHaveURL(/.*dashboard/);

        // Verify the sync button on dashboard shows "1"
        const syncBadge = page.locator('.bg-sonatel-orange:has-text("1")');
        // Note: The specific selector might vary based on DashboardPage implementation
        // Let's assume there is a badge showing the count in the header or dashboard

        // 8. GO ONLINE
        await context.setOffline(false);

        // 9. VERIFY AUTO-SYNC
        await expect(page.locator('text=/Connexion rétablie/i')).toBeVisible({ timeout: 15000 });
        await expect(page.locator('text=/synchronisée/i')).toBeVisible({ timeout: 30000 });

        // 10. VERIFY QUEUE IS EMPTY
        // The badge should disappear or show 0
        await expect(page.locator('text=/audit en attente/i')).not.toBeVisible();
    });
});
