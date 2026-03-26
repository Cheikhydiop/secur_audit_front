import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertCircle, ShieldCheck, Mail, Key, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";
import authService from "@/services/AuthService";
import { useAuth } from "@/contexts/AuthContext";

export default function ForcePasswordChange() {
    const navigate = useNavigate();
    const { logout } = useAuth();
    const [isSaving, setIsSaving] = useState(false);
    const [isLoadingOtp, setIsLoadingOtp] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [step, setStep] = useState(1); // 1: Demande OTP, 2: Saisie OTP

    const [formData, setFormData] = useState({
        otpCode: "",
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
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
                toast.success("Code envoyé", {
                    description: message,
                });
            } else {
                throw new Error(response.error);
            }
        } catch (error: any) {
            const msg = error.response?.data?.message || 'Erreur lors de la demande du code.';
            setError(msg);
            toast.error(msg);
        } finally {
            setIsLoadingOtp(false);
        }
    };

    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.otpCode || formData.otpCode.length < 6) {
            setError("Veuillez entrer le code de confirmation reçu par email");
            return;
        }

        try {
            setIsSaving(true);
            setError(null);

            const res = await authService.verifyOTPOnly(formData.otpCode);

            if (res.error) {
                throw new Error(res.error);
            }

            toast.success("Identité vérifiée", {
                description: "Votre accès a été validé avec succès.",
                duration: 3000
            });

            // Redirection vers le dashboard
            setTimeout(() => {
                navigate("/dashboard");
                window.location.reload(); // Recharger pour rafraîchir le statut de l'utilisateur
            }, 1500);

        } catch (err: any) {
            const msg = err.message || "Code invalide ou expiré.";
            setError(msg);
            toast.error(msg);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-md bg-white rounded-[32px] shadow-2xl shadow-orange-500/10 p-8 border-2 border-orange-50 animate-in fade-in zoom-in duration-500">

                <div className="flex flex-col items-center text-center mb-8">
                    <div className="w-16 h-16 bg-orange-50 rounded-2xl flex items-center justify-center mb-4">
                        <ShieldCheck className="w-8 h-8 text-sonatel-orange" />
                    </div>
                    <h1 className="text-2xl font-black text-gray-900 tracking-tight">Vérification Requise</h1>
                    <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest mt-1">Sécurité G-SECU SONATEL</p>
                </div>

                <Alert className="mb-8 bg-amber-50 border-amber-200 rounded-2xl">
                    <AlertCircle className="h-4 w-4 text-amber-600" />
                    <AlertTitle className="text-amber-700 font-black uppercase text-[10px] tracking-widest">Action requise</AlertTitle>
                    <AlertDescription className="text-amber-800 text-xs font-bold leading-relaxed">
                        Pour garantir la sécurité de votre compte, nous devons vérifier votre identité périodiquement via votre adresse email professionnelle.
                    </AlertDescription>
                </Alert>

                {error && (
                    <Alert variant="destructive" className="mb-6 rounded-2xl">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription className="font-bold text-xs">{error}</AlertDescription>
                    </Alert>
                )}

                {step === 1 ? (
                    <div className="space-y-6">
                        <div className="flex flex-col items-center gap-4 text-center py-4">
                            <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
                                <Mail className="w-6 h-6 text-sonatel-orange" />
                            </div>
                            <p className="text-sm text-gray-600 font-medium">
                                Un code de sécurité sera envoyé à votre adresse email enregistrée.
                            </p>
                        </div>
                        <Button
                            onClick={handleRequestOtp}
                            className="w-full h-12 rounded-2xl bg-sonatel-orange hover:bg-orange-600 text-white font-black uppercase tracking-widest"
                            disabled={isLoadingOtp}
                        >
                            {isLoadingOtp ? "Envoi en cours..." : "Recevoir le code par email"}
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => logout()}
                            className="w-full text-[10px] font-black uppercase text-gray-400"
                        >
                            DÉCONNEXION
                        </Button>
                    </div>
                ) : (
                    <form onSubmit={handleVerify} className="space-y-6">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 flex items-center gap-2">
                                <Key className="w-4 h-4 text-sonatel-orange" />
                                Code de sécurité reçu
                            </Label>
                            <Input
                                name="otpCode"
                                type="text"
                                placeholder="123456"
                                value={formData.otpCode}
                                onChange={handleChange}
                                disabled={isSaving}
                                className="h-14 rounded-xl border-gray-100 text-center text-2xl tracking-[0.5em] font-black focus:ring-[#F5821F]/20 focus:border-[#F5821F]"
                                maxLength={6}
                                autoFocus
                            />
                        </div>

                        <div className="flex flex-col gap-3">
                            <Button
                                type="submit"
                                className="w-full h-12 rounded-2xl bg-sonatel-orange hover:bg-orange-600 text-white font-black uppercase tracking-widest shadow-lg shadow-orange-500/20 active:scale-95 transition-all"
                                disabled={isSaving || formData.otpCode.length < 6}
                            >
                                {isSaving ? "Vérification..." : "Valider mon identité"}
                                {!isSaving && <CheckCircle2 className="ml-2 w-4 h-4" />}
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => setStep(1)}
                                disabled={isSaving}
                                className="text-[10px] font-black uppercase text-gray-400"
                            >
                                Renvoyer un code
                            </Button>
                        </div>
                    </form>
                )}
            </div>

            <p className="mt-8 text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">
                © 2026 SONATEL - DG/SECU G-SECU
            </p>
        </div>
    );
}
