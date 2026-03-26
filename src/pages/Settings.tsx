import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell, Moon, Sun, Volume2, VolumeX, Shield, Smartphone, LogOut, Save, Loader2, Settings as SettingsIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import userSettingsService, { UserSettings } from '@/services/UserSettingsService';
import { useTheme } from '@/components/theme-provider';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { globalSettingService, GlobalSetting } from '@/services/GlobalSettingService';
import { Database, FileClock, History, Timer } from 'lucide-react';

export default function Settings() {
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const { toast } = useToast();
    const { theme, setTheme } = useTheme();
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const [settings, setSettings] = useState<UserSettings>({
        pushNotifications: true,
        emailNotifications: true,
        smsNotifications: false,
        language: 'fr',
        theme: 'light',
        sound: true,
        twoFactorAuth: false,
        biometricAuth: false,
    });

    const [globalSettings, setGlobalSettings] = useState<GlobalSetting[]>([]);
    const [retentionDays, setRetentionDays] = useState("366");
    const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(user?.role || '');

    // Charger les paramètres depuis l'API au montage
    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            setIsLoading(true);
            const userPrefs = await userSettingsService.getSettings();
            setSettings(userPrefs);
            if (userPrefs.theme) {
                setTheme(userPrefs.theme as 'light' | 'dark' | 'system');
            }

            if (isAdmin) {
                const gData = await globalSettingService.getAll();
                setGlobalSettings(gData.data || []);
                const retention = gData.data?.find((s: any) => s.key === 'report_retention_days');
                if (retention) setRetentionDays(retention.value);
            }
        } catch (error) {
            console.error('Erreur chargement paramètres:', error);
            toast({
                title: '❌ Erreur',
                description: 'Impossible de charger vos paramètres',
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            setIsSaving(true);

            // Save user preferences
            await userSettingsService.updatePreferences({
                emailNotifications: settings.emailNotifications,
                theme: settings.theme,
            });

            // Save global settings if admin
            if (isAdmin) {
                await globalSettingService.updateMany([
                    { key: 'report_retention_days', value: retentionDays }
                ]);
            }

            toast({
                title: '✅ Paramètres enregistrés',
                description: 'Toutes les modifications ont été appliquées',
            });
        } catch (error) {
            toast({
                title: '❌ Erreur',
                description: 'Impossible de sauvegarder vos paramètres',
                variant: 'destructive',
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handleToggle = (key: keyof UserSettings) => {
        setSettings(prev => ({
            ...prev,
            [key]: !prev[key]
        }));
    };

    const handleSelectChange = (key: keyof UserSettings, value: string) => {
        setSettings(prev => ({
            ...prev,
            [key]: value
        }));

        // Appliquer immédiatement le thème si c'est ce qui est changé
        if (key === 'theme') {
            setTheme(value as 'dark' | 'light' | 'system');
        }
    };

    const handleLogout = async () => {
        await logout();
        toast({
            title: 'Déconnexion',
            description: 'À bientôt!',
        });
        navigate('/');
    };

    return (
        <>
            <div className="safe-top min-h-screen bg-background pb-20">
                {/* Header */}
                <header className="sticky top-0 z-10 px-4 py-4 flex items-center gap-3 border-b bg-background/95 backdrop-blur-sm">
                    <Button variant="ghost" size="icon" onClick={() => navigate('/profile')}>
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <h1 className="text-xl font-bold flex-1">Paramètres</h1>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleSave}
                        disabled={isSaving}
                    >
                        <Save className="w-4 h-4 mr-2" />
                        {isSaving ? 'Enregistrement...' : 'Enregistrer'}
                    </Button>
                </header>

                <div className="px-4 py-6 space-y-6">
                    {/* Les notifications, le thème et la langue sont activés par défaut et non modifiables */}


                    {/* Paramètres Globaux (ADMIN UNIQUEMENT) */}
                    {isAdmin && (
                        <section className="bg-orange-50/30 rounded-2xl p-6 border-2 border-sonatel-orange/10 space-y-6 animate-in slide-in-from-right-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-sonatel-orange rounded-xl shadow-lg shadow-orange-500/20">
                                    <Database className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-black text-gray-900 tracking-tight uppercase text-sm">Configuration Système</h2>
                                    <p className="text-[10px] font-bold text-sonatel-orange uppercase tracking-widest leading-none">Administration Globale</p>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className="space-y-4 bg-white/60 p-5 rounded-2xl border border-white/40 shadow-sm">
                                    <div className="flex items-center gap-2">
                                        <FileClock className="w-4 h-4 text-sonatel-orange" />
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Rétention des Rapports</Label>
                                    </div>
                                    <p className="text-[11px] text-muted-foreground font-medium leading-relaxed">
                                        Durée de conservation des rapports PDF et Excel sur le serveur avant suppression automatique.
                                    </p>
                                    <div className="flex items-center gap-4 pt-2">
                                        <Select value={retentionDays} onValueChange={setRetentionDays}>
                                            <SelectTrigger className="rounded-xl h-12 border-2 border-gray-100 font-bold flex-1 text-xs">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-xl">
                                                <SelectItem value="30">30 jours (1 mois)</SelectItem>
                                                <SelectItem value="90">90 jours (3 mois)</SelectItem>
                                                <SelectItem value="180">180 jours (6 mois)</SelectItem>
                                                <SelectItem value="366">366 jours (1 an)</SelectItem>
                                                <SelectItem value="732">732 jours (2 ans)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <div className="bg-gray-50 px-4 py-2 rounded-xl flex items-center gap-2 border border-gray-100 shadow-inner">
                                            <Timer className="w-4 h-4 text-gray-400" />
                                            <span className="text-[10px] font-black text-gray-900">AUTO-CLEAN</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 bg-amber-50 p-4 rounded-xl border border-amber-100">
                                    <History className="w-4 h-4 text-amber-500 shrink-0" />
                                    <p className="text-[10px] font-bold text-amber-700 leading-tight">
                                        Le nettoyage s'effectue quotidiennement à 03h00.
                                    </p>
                                </div>
                            </div>
                        </section>
                    )}

                    {/* Sécurité */}
                    <section>
                        <div className="flex items-center gap-2 mb-4">
                            <Shield className="w-5 h-5 text-sonatel-orange" />
                            <h2 className="text-lg font-black uppercase tracking-tight text-sm">Compte & Sécurité</h2>
                        </div>

                        <div className="bg-white rounded-2xl p-6 border-2 border-gray-100 shadow-sm space-y-4">
                            <Button
                                variant="outline"
                                className="w-full h-12 rounded-xl border-gray-100 font-bold text-xs uppercase tracking-widest hover:border-sonatel-orange hover:text-sonatel-orange transition-all"
                                onClick={() => navigate('/profile/change-password')}
                            >
                                Modifier mon mot de passe
                            </Button>
                        </div>
                    </section>

                    {/* Zone de danger */}
                    <section>
                        <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4">
                            <h3 className="text-sm font-semibold text-destructive mb-4">Zone de danger</h3>

                            <Button
                                variant="destructive"
                                className="w-full mb-3"
                                onClick={handleLogout}
                            >
                                <LogOut className="w-4 h-4 mr-2" />
                                Se déconnecter de cet appareil
                            </Button>

                            <Button
                                variant="outline"
                                className="w-full text-destructive border-destructive/20 hover:bg-destructive/10"
                                onClick={() => navigate('/profile/delete-account')}
                            >
                                Supprimer mon compte
                            </Button>
                        </div>
                    </section>

                    {/* Info version */}
                    <div className="text-center text-sm text-muted-foreground space-y-1">
                        <p className="font-bold text-[10px] uppercase tracking-widest text-gray-400">SmartAudit DG-SECU/Sonatel v2.1.0</p>
                        <p>© 2026 Direction Securité DG/SECU</p>
                    </div>
                </div>
            </div>
        </>
    );
}
