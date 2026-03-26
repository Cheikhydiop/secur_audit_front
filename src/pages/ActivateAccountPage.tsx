import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { authService } from "@/services/AuthService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ShieldCheck, User, Lock, ArrowRight, CheckCircle2, Loader2 } from "lucide-react";

export default function ActivateAccountPage() {
    const { token } = useParams<{ token: string }>();
    const navigate = useNavigate();
    const [name, setName] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            toast.error("Les mots de passe ne correspondent pas");
            return;
        }

        setIsLoading(true);
        try {
            const res = await authService.activateAccount(token || "", name, password);

            if (res.data) {
                setIsSuccess(true);
                toast.success("Compte activé avec succès !");
                setTimeout(() => navigate("/login"), 3000);
            } else {
                toast.error(res.error || "Erreur d'activation");
            }
        } catch (error: any) {
            toast.error(error.message || "Lien invalide ou expiré");
        } finally {
            setIsLoading(false);
        }
    };

    const passwordRequirements = [
        { label: "8 caractères minimum", regex: /.{8,}/ },
        { label: "Au moins un chiffre", regex: /[0-9]/ },
        { label: "Une majuscule", regex: /[A-Z]/ },
    ];

    const isPasswordValid = (req: typeof passwordRequirements[0]) => req.regex.test(password);

    if (isSuccess) {
        return (
            <div className="relative min-h-screen flex items-center justify-center p-6 overflow-hidden">
                <div className="absolute inset-0 bg-verification z-0 opacity-100 transition-opacity duration-1000"></div>
                <Card className="max-w-md w-full relative z-10 border-[3px] border-white/80 shadow-[0_32px_64px_-16px_rgba(16,185,129,0.2)] rounded-[3rem] p-10 text-center animate-in zoom-in duration-700 bg-white/60 backdrop-blur-2xl">
                    <div className="flex justify-center mb-8">
                        <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-[2rem] flex items-center justify-center shadow-inner relative group">
                            <CheckCircle2 className="w-12 h-12" />
                            <div className="absolute inset-0 bg-emerald-200/50 rounded-[2rem] animate-ping opacity-20"></div>
                        </div>
                    </div>
                    <CardTitle className="text-3xl font-black mb-4 text-gray-900 tracking-tight">Activation Réussie !</CardTitle>
                    <CardDescription className="text-gray-600 font-bold text-lg mb-10 leading-relaxed px-4">
                        Votre compte est désormais actif. Préparons votre espace de travail...
                    </CardDescription>
                    <div className="animate-pulse flex items-center justify-center gap-3 text-emerald-600 font-black tracking-widest text-xs uppercase">
                        <div className="w-2 h-2 bg-emerald-600 rounded-full"></div>
                        Redirection en cours
                    </div>
                </Card>
                <style>{`
                    .bg-verification {
                        background-image: url('/background-verification.png');
                        background-size: cover;
                        background-position: bottom right;
                        background-repeat: no-repeat;
                        background-attachment: fixed;
                    }
                `}</style>
            </div>
        );
    }

    return (
        <div className="relative min-h-screen flex items-center justify-center p-4 md:p-8 bg-[#FDFDFD] overflow-hidden font-sans">
            {/* Background decorative wave */}
            <div className="absolute -bottom-20 -right-20 w-full h-full opacity-20 pointer-events-none z-0">
                <div className="absolute bottom-0 right-0 w-[120%] h-[120%] bg-verification bg-no-repeat bg-bottom bg-right transition-all duration-1000"></div>
            </div>

            <div className="max-w-[1100px] w-full grid grid-cols-1 lg:grid-cols-2 bg-white rounded-[4rem] shadow-[0_40px_120px_-20px_rgba(0,0,0,0.15)] border border-gray-100/50 overflow-hidden relative z-10 animate-in fade-in zoom-in-95 duration-1000">

                {/* Visual Side (LHS) */}
                <div className="hidden lg:flex flex-col justify-between p-20 bg-gradient-to-br from-[#f5821f] via-[#f5821f] to-[#e67300] text-white relative overflow-hidden">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.4),transparent_60%)]"></div>

                    <div className="relative z-10">
                        <img src="/logo-sonatel.png" alt="Sonatel" className="h-28 brightness-0 invert mb-16 drop-shadow-2xl" />
                        <h2 className="text-5xl font-black leading-[1.1] mb-10 tracking-tight">
                            Bienvenue dans l'équipe SmartAudit.
                        </h2>
                        <p className="text-white font-bold text-xl leading-relaxed opacity-100 max-w-sm">
                            Votre outil centralisé pour la digitalisation et l'optimisation des contrôles de sites.
                        </p>
                    </div>

                    <div className="relative z-10 mt-12">
                        <div className="p-10 bg-white/15 rounded-[3rem] border-2 border-white/20 backdrop-blur-xl shadow-2xl">
                            <div className="flex items-center gap-5 mb-5">
                                <div className="p-4 bg-white/20 rounded-2xl shadow-inner">
                                    <ShieldCheck className="w-8 h-8" />
                                </div>
                                <span className="font-black uppercase tracking-[0.2em] text-sm">Accès Sécurisé</span>
                            </div>
                            <p className="text-base font-bold opacity-90 leading-relaxed">
                                Vos données et rapports sont protégés par les protocoles de sécurité de la Direction de la Sécurité Sonatel.
                            </p>
                        </div>
                    </div>

                    {/* Decorative abstract elements */}
                    <div className="absolute -top-20 -right-20 w-80 h-80 bg-white/10 rounded-full blur-[100px]"></div>
                </div>

                {/* Form Side (RHS) */}
                <div className="p-10 lg:p-24 flex flex-col justify-center bg-white">
                    <div className="text-center lg:text-left mb-16 space-y-5">
                        <div className="lg:hidden flex justify-center mb-8">
                            <img src="/logo-sonatel.png" alt="Sonatel" className="h-16" />
                        </div>
                        <h1 className="text-4xl font-black text-gray-900 tracking-tight">Activer votre compte</h1>
                        <p className="text-gray-600 font-bold text-lg leading-relaxed">
                            Complétez votre profil pour commencer à utiliser la plateforme.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-10">
                        <div className="space-y-3 group">
                            <label className="text-xs font-black text-gray-500 uppercase tracking-widest ml-1 transition-colors group-focus-within:text-sonatel-orange">Nom Complet</label>
                            <div className="relative">
                                <User className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-sonatel-orange transition-colors" />
                                <Input
                                    placeholder="Ex: Cheikh Tidiane Diop"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="pl-16 h-16 rounded-2xl border-2 border-gray-100 bg-gray-50/50 focus:bg-white focus:ring-sonatel-orange/10 transition-all font-black text-lg placeholder:text-gray-300"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-5">
                            <div className="space-y-3 group">
                                <label className="text-xs font-black text-gray-500 uppercase tracking-widest ml-1 transition-colors group-focus-within:text-sonatel-orange">Nouveau Mot de passe</label>
                                <div className="relative">
                                    <Lock className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-sonatel-orange transition-colors" />
                                    <Input
                                        type="password"
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="pl-16 h-16 rounded-2xl border-2 border-gray-100 bg-gray-50/50 focus:bg-white focus:ring-sonatel-orange/10 transition-all font-black text-lg placeholder:text-gray-300"
                                        required
                                    />
                                </div>
                            </div>

                            {/* Enhanced Password Tracker */}
                            <div className="flex flex-wrap gap-2 pt-2">
                                {passwordRequirements.map((req, idx) => {
                                    const valid = isPasswordValid(req);
                                    return (
                                        <div
                                            key={idx}
                                            className={`flex items-center gap-2 px-4 py-2 rounded-full text-[11px] font-black uppercase tracking-tight transition-all duration-300 shadow-sm border-2 ${valid
                                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                    : 'bg-gray-50 text-gray-500 border-gray-100'
                                                }`}
                                        >
                                            <CheckCircle2 className={`w-4 h-4 ${valid ? 'opacity-100' : 'opacity-40'}`} />
                                            {req.label}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="space-y-3 group">
                            <label className="text-xs font-black text-gray-500 uppercase tracking-widest ml-1 transition-colors group-focus-within:text-sonatel-orange">Confirmation</label>
                            <div className="relative">
                                <Lock className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-sonatel-orange transition-colors" />
                                <Input
                                    type="password"
                                    placeholder="Réécrire le mot de passe"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="pl-16 h-16 rounded-2xl border-2 border-gray-100 bg-gray-50/50 focus:bg-white focus:ring-sonatel-orange/10 transition-all font-black text-lg placeholder:text-gray-300"
                                    required
                                />
                            </div>
                            {password && confirmPassword && password !== confirmPassword && (
                                <p className="text-xs text-red-600 font-black uppercase tracking-widest ml-1 mt-3 animate-pulse">Les mots de passe ne correspondent pas</p>
                            )}
                        </div>

                        <Button
                            type="submit"
                            className="w-full h-18 bg-sonatel-orange hover:bg-orange-600 text-white rounded-[2rem] font-black tracking-[0.2em] shadow-2xl shadow-orange-500/30 group transition-all hover:scale-[1.02] active:scale-[0.98] uppercase text-sm mt-6 py-8"
                            disabled={isLoading || password !== confirmPassword || passwordRequirements.some(r => !isPasswordValid(r))}
                        >
                            {isLoading ? (
                                <Loader2 className="w-8 h-8 animate-spin" />
                            ) : (
                                <span className="flex items-center justify-center gap-5 text-lg">
                                    ACTIVER MON COMPTE <ArrowRight className="w-6 h-6 group-hover:translate-x-3 transition-transform" />
                                </span>
                            )}
                        </Button>
                    </form>

                    {/* Footer branding */}
                    <div className="mt-20 text-center lg:text-left">
                        <p className="text-[11px] font-black text-gray-400 uppercase tracking-[0.3em] leading-relaxed">
                            Direction de la Sécurité | SONATEL<br />
                            <span className="text-sonatel-orange/50 italic capitalize font-bold">SmartAudit Digitalisation 360</span>
                        </p>
                    </div>
                </div>
            </div>

            <style>{`
                .bg-verification {
                    background-image: url('/background-verification.png');
                    background-size: contain;
                }
            `}</style>
        </div>
    );
}
