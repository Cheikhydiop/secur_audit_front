import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Lock, AlertCircle, Mail, Key } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import authService from '@/services/AuthService';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function ChangePassword() {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [isSaving, setIsSaving] = useState(false);
    const [isLoadingOtp, setIsLoadingOtp] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [step, setStep] = useState(1); // 1: Demande OTP, 2: Saisie OTP + Nouveau MDP

    const [formData, setFormData] = useState({
        otpCode: '',
        newPassword: '',
        confirmPassword: ''
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        setError(null);
    };

    const handleRequestOtp = async () => {
        try {
            setIsLoadingOtp(true);
            setError(null);

            const response = await authService.requestPasswordChangeOTP();

            if (!response.error) {
                setStep(2);
                const message = (response.data as any)?.message || 'Un code de confirmation a été envoyé à votre adresse email.';
                toast({
                    title: '✅ Code envoyé',
                    description: message,
                });
            } else {
                throw new Error(response.error);
            }

        } catch (error: any) {
            const msg = error.response?.data?.message || 'Erreur lors de la demande du code.';
            setError(msg);
            toast({
                title: '❌ Erreur',
                description: msg,
                variant: 'destructive',
            });
        } finally {
            setIsLoadingOtp(false);
        }
    };

    const validateForm = () => {
        if (!formData.otpCode) {
            setError('Veuillez entrer le code de confirmation reçu par email');
            return false;
        }

        if (formData.newPassword.length < 6) {
            setError('Le nouveau mot de passe doit contenir au moins 6 caractères');
            return false;
        }

        if (formData.newPassword !== formData.confirmPassword) {
            setError('Les nouveaux mots de passe ne correspondent pas');
            return false;
        }

        return true;
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) return;

        try {
            setIsSaving(true);
            setError(null);

            const response = await authService.changePasswordWithOTP(
                formData.otpCode,
                formData.newPassword
            );

            if (!response.error) {
                toast({
                    title: '✅ Succès',
                    description: 'Votre mot de passe a été modifié avec succès',
                });

                // Rediriger vers le profil après succès
                setTimeout(() => {
                    navigate('/profile');
                }, 1500);
            } else {
                throw new Error(response.error);
            }


        } catch (error: any) {
            console.error('Erreur changement mot de passe:', error);
            const errorMessage = error.response?.data?.message || 'Code invalide ou expiré.';
            setError(errorMessage);

            toast({
                title: '❌ Erreur',
                description: errorMessage,
                variant: 'destructive',
            });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <AppLayout>
            <div className="safe-top min-h-screen bg-background pb-20">
                {/* Header */}
                <header className="sticky top-0 z-10 px-4 py-4 flex items-center gap-3 border-b bg-background/95 backdrop-blur-sm">
                    <Button variant="ghost" size="icon" onClick={() => navigate('/profile/settings')}>
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <h1 className="text-xl font-bold flex-1">Sécurité</h1>
                </header>

                <div className="px-4 py-6 max-w-md mx-auto">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <Lock className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold">Changer le mot de passe</h2>
                            <p className="text-sm text-muted-foreground">Sécurisation du compte via OTP</p>
                        </div>
                    </div>

                    {error && (
                        <Alert variant="destructive" className="mb-6">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    {step === 1 ? (
                        <div className="space-y-6 text-center py-8">
                            <div className="mx-auto w-16 h-16 rounded-full bg-primary/5 flex items-center justify-center mb-4">
                                <Mail className="w-8 h-8 text-primary" />
                            </div>
                            <h3 className="text-lg font-medium">Vérification de sécurité</h3>
                            <p className="text-muted-foreground text-sm">
                                Pour changer votre mot de passe, nous devons d'abord vérifier votre identité.
                                Un code de sécurité sera envoyé à votre adresse email.
                            </p>
                            <Button
                                onClick={handleRequestOtp}
                                className="w-full h-12 text-md"
                                disabled={isLoadingOtp}
                            >
                                {isLoadingOtp ? (
                                    <>
                                        <span className="animate-spin mr-2">⏳</span>
                                        Envoi en cours...
                                    </>
                                ) : (
                                    <>
                                        Recevoir le code de sécurité
                                    </>
                                )}
                            </Button>
                        </div>
                    ) : (
                        <form onSubmit={handleSave} className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="otpCode" className="flex items-center gap-2">
                                    <Key className="w-4 h-4 text-primary" />
                                    Code de sécurité (reçu par email)
                                </Label>
                                <Input
                                    id="otpCode"
                                    name="otpCode"
                                    type="text"
                                    placeholder="Ex: 123456"
                                    value={formData.otpCode}
                                    onChange={handleChange}
                                    disabled={isSaving}
                                    className="h-12 text-center text-xl tracking-[0.5em] font-mono"
                                    maxLength={6}
                                />
                                <p className="text-[10px] text-muted-foreground italic">
                                    Si vous n'avez pas reçu le code, vérifiez vos spams ou réessayez.
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="newPassword">Nouveau mot de passe</Label>
                                <Input
                                    id="newPassword"
                                    name="newPassword"
                                    type="password"
                                    placeholder="Minimum 6 caractères"
                                    value={formData.newPassword}
                                    onChange={handleChange}
                                    disabled={isSaving}
                                    className="h-12"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="confirmPassword">Confirmer le nouveau mot de passe</Label>
                                <Input
                                    id="confirmPassword"
                                    name="confirmPassword"
                                    type="password"
                                    placeholder="Confirmez le mot de passe"
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                    disabled={isSaving}
                                    className="h-12"
                                />
                            </div>

                            <div className="flex flex-col gap-3">
                                <Button
                                    type="submit"
                                    className="w-full h-12 text-md"
                                    disabled={isSaving}
                                >
                                    {isSaving ? (
                                        <>
                                            <span className="animate-spin mr-2">⏳</span>
                                            Modification...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="w-4 h-4 mr-2" />
                                            Mettre à jour le mot de passe
                                        </>
                                    )}
                                </Button>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={() => setStep(1)}
                                    disabled={isSaving}
                                >
                                    Renvoyer un code
                                </Button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}

