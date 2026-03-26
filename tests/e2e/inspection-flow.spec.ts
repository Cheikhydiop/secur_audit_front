import { test, expect } from '@playwright/test';

test.describe('Flux complet d\'inspection et création de plan d\'actions', () => {

    test.beforeEach(async ({ page }) => {
        // Connexion initiale
        await page.goto('/login');
        await page.locator('input[type="email"]').fill('inspecteur@sonatel.sn');
        await page.locator('input[type="password"]').fill('Admin123!');
        await page.locator('button[type="submit"]').click();

        // Attendre d'être sur le dashboard ou planning
        await expect(page).toHaveURL(/.*dashboard|.*planning/i);
    });

    test('Doit permettre de démarrer, remplir et soumettre une inspection avec non-conformité', async ({ page, context }) => {
        // 1. Accéder au planning si on n'y est pas déjà
        if (!page.url().includes('planning')) {
            await page.goto('/planning');
        }

        // 2. Trouver une mission "Planifiée" (A_FAIRE)
        // On cherche le bouton "Démarrer" qui ne s'affiche que pour les missions de notre entité
        const startButton = page.locator('button:has-text("Démarrer")').first();
        await expect(startButton).toBeVisible({ timeout: 10000 });
        await startButton.click();

        // 3. Redirection vers la page d'inspection (via le dialogue de succès ou direct)
        // Note: Le bouton "Démarrer" dans PlanningPage.tsx n'effectue pas de navigation automatique 
        // selon le code vu, mais dans le Dialog d'édition oui (L1133).
        // Si on clique sur "Démarrer" depuis la liste, il faut peut-être rafraîchir ou cliquer sur Détails.
        // Mais attendez, le code de handleStartInspection (L406) met à jour le statut.
        // Pour naviguer, on clique souvent sur "Détails" ou on est redirigé. 
        // Vérifions si le bouton "Détails" mène à l'inspection.

        // On va plutôt chercher le bouton "Détails" ou "Démarrer l'audit" dans le modal d'édition
        await page.locator('button:has(svg.lucide-edit)').first().click();
        const startAuditBtn = page.locator('button:has-text("Démarrer l\'audit")');
        await expect(startAuditBtn).toBeVisible();
        await startAuditBtn.click();

        // 4. Page d'inspection
        await expect(page).toHaveURL(/.*inspection/);

        // Gérer l'autorisation GPS (simulée ou clic bouton)
        const gpsBtn = page.locator('button:has-text("Autoriser le GPS")');
        if (await gpsBtn.isVisible()) {
            await gpsBtn.click();
        }

        // Attendre que le lock screen disparaisse (gpsStatus === 'granted')
        await expect(page.locator('text=/conformité globale/i')).toBeVisible({ timeout: 10000 });

        // 5. Passer au questionnaire
        await page.locator('button[role="tab"]:has-text("Questionnaire")').click();

        // 6. Répondre "NON" à la première question (Non-conforme)
        const firstQuestionCard = page.locator('.group\\/q').first();
        await firstQuestionCard.locator('button:has-text("NON")').click();

        // Vérifier l'apparition du plan d'action correctif
        await expect(page.locator('text=/Plan d\'Action Correctif/i')).toBeVisible();

        // Remplir les détails de la non-conformité
        await page.locator('textarea[placeholder*="Observations d\'audit"]').first().fill('Test E2E : Extincteur périmé ou manquant.');
        await page.locator('textarea[placeholder*="action à mener"]').first().fill('Remplacer l\'extincteur immédiatement.');
        await page.locator('input[placeholder*="Porteur"]').first().fill('Responsable SSI');

        // Saisie d'une date d'échéance (demain)
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const dateStr = tomorrow.toISOString().split('T')[0];
        await page.locator('input[type="date"]').nth(1).fill(dateStr); // nth(1) car il y a d'autres dates sur la page

        // 7. Passer à la rubrique suivante (pour tester la navigation)
        // On clique sur la 2ème rubrique dans la timeline à gauche
        await page.locator('.lg\\:pl-16').evaluate(node => node.scrollIntoView());
        const secondRubric = page.locator('button.group:has(.text-\\[10px\\])').nth(1);
        await secondRubric.click();

        // 8. Répondre "OUI" à tout le reste pour pouvoir soumettre rapidement (optionnel)
        // On peut aussi aller directement au résumé global
        await page.locator('button[role="tab"]:has-text("Résumé Global")').click();

        // 9. Finaliser l'inspection
        const finalizeBtn = page.locator('button:has-text("Clôturer l\'Inspection")');
        await expect(finalizeBtn).toBeVisible();
        await finalizeBtn.click();

        // 10. Soumettre dans le dialogue de résumé
        const submitBtn = page.locator('button:has-text("Soumettre le rapport final")');
        await expect(submitBtn).toBeVisible();
        await submitBtn.click();

        // Attendre le dialogue de succès
        await expect(page.locator('text=/Inspection soumise avec succès/i')).toBeVisible({ timeout: 15000 });

        // 11. Vérifier la création de l'action dans "Mes Actions"
        await page.goto('/mes-actions');
        await expect(page.locator('text=/Test E2E : Extincteur périmé/i')).toBeVisible();
    });
});
