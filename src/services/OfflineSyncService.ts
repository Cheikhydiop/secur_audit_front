import { OfflineQueueService } from './OfflineQueueService';
import { inspectionService } from './InspectionService';
import { planningService } from './PlanningService';
import { toast } from 'sonner';

/**
 * OfflineSyncService — Service orchestrateur pour la synchronisation des données stockées offline.
 */
export class OfflineSyncService {
    private static isSyncing = false;

    /**
     * Tente de synchroniser toute la file d'attente
     * Retourne le nombre de succès
     */
    static async syncAll(): Promise<{ success: number; failed: number }> {
        if (this.isSyncing) return { success: 0, failed: 0 };
        if (!navigator.onLine) {
            return { success: 0, failed: 0 };
        }

        this.isSyncing = true;
        const queue = await OfflineQueueService.getInspectionQueue();
        let successCount = 0;
        let failedCount = 0;

        if (queue.length === 0) {
            this.isSyncing = false;
            return { success: 0, failed: 0 };
        }

        const toastId = toast.loading(`Synchronisation de ${queue.length} inspection(s)...`);

        for (const item of queue) {
            try {
                // 1. Créer l'inspection avec les métadonnées offline (GPS, etc)
                const createRes = await inspectionService.create({
                    siteId: item.siteId,
                    latitudeStart: item.data.latitudeStart,
                    longitudeStart: item.data.longitudeStart,
                    dateStart: item.data.dateStart,
                    missionId: item.data.missionId
                });
                if (createRes.error || !createRes.data) throw new Error(createRes.error || "Erreur création");

                const inspectionId = createRes.data.id;

                // 2. Formater les réponses (identique à InspectionPage)
                const formattedReponses = Object.entries(item.data.answers).map(([key, ans]: [string, any]) => {
                    const [rid, idx] = key.split("-");
                    return {
                        questionId: key,
                        rubrique: rid,
                        texte: "Question " + key, // Le backend recalculera si besoin
                        valeur: ans.status === "conforme" ? "CONFORME" : ans.status === "non-conforme" ? "NON_CONFORME" : "NON_APPLICABLE",
                        observation: ans.observation,
                        recommandation: ans.recommendation,
                        photos: ans.photos || []
                    };
                });

                // 3. Update & Submit
                await inspectionService.update(inspectionId, { reponses: formattedReponses });
                const submitRes = await inspectionService.soumettre(inspectionId);

                if (submitRes.data) {
                    // 4. Si une mission était associée, on la clôture aussi
                    if (item.data.missionId) {
                        try {
                            await planningService.finishInspection(item.data.missionId);
                        } catch (err) {
                            console.error(`[OfflineSync] Erreur clôture mission ${item.data.missionId}:`, err);
                            // On continue quand même car l'inspection est soumise
                        }
                    }

                    successCount++;
                    await OfflineQueueService.dequeueInspection(item.id);
                } else {
                    throw new Error("Échec soumission");
                }
            } catch (err: any) {
                console.error(`[OfflineSync] Erreur pour l'item ${item.id}:`, err);
                failedCount++;
                await OfflineQueueService.updateItem(item.id, {
                    attempts: item.attempts + 1,
                    lastError: err.message
                });
            }
        }

        this.isSyncing = false;

        if (successCount > 0) {
            toast.success(`${successCount} inspection(s) synchronisée(s) !`, { id: toastId });
        } else {
            toast.error(`Échec de la synchronisation (${failedCount} erreurs)`, { id: toastId });
        }

        return { success: successCount, failed: failedCount };
    }
}
