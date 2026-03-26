import { test, expect } from '@playwright/test';

test.describe('Authentification et Navigation de base', () => {

    test.beforeEach(async ({ page }) => {
        // Naviguer vers la page de login avant chaque test
        await page.goto('/login');
    });

    test('Doit afficher la page de connexion avec les champs requis', async ({ page }) => {
        await expect(page).toHaveTitle(/Login/i);
        await expect(page.locator('input[type="email"]')).toBeVisible();
        await expect(page.locator('input[type="password"]')).toBeVisible();
        await expect(page.locator('button[type="submit"]')).toBeVisible();
    });

    test('Connexion réussie avec des identifiants valides', async ({ page }) => {
        // Saisie des identifiants de test (basés sur le seed)
        await page.locator('input[type="email"]').fill('inspecteur@sonatel.sn');
        await page.locator('input[type="password"]').fill('Admin123!');

        // Cliquer sur le bouton de connexion
        await page.locator('button[type="submit"]').click();

        // Attendre la redirection vers le dashboard ou planning
        // Note: Selon l'implémentation, il se peut qu'on soit redirigé vers /dashboard ou /
        await expect(page).toHaveURL(/.*dashboard|.*planning/i);

        // Vérifier que le nom de l'utilisateur est affiché
        await expect(page.locator('body')).toContainText('Inspecteur Principal');
    });

    test('Échec de connexion avec des identifiants invalides', async ({ page }) => {
        await page.locator('input[type="email"]').fill('wrong@sonatel.sn');
        await page.locator('input[type="password"]').fill('WrongPass123!');
        await page.locator('button[type="submit"]').click();

        // Vérifier qu'un message d'erreur est affiché
        // (A adapter selon le composant de toast ou l'alerte utilisée)
        const errorMsg = page.locator('text=/identifiants invalides|erreur|échec|invalid/i');
        await expect(errorMsg).toBeVisible();
    });
});
