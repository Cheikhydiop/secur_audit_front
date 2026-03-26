import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import {
    Eye as EyeIcon,
    EyeOff as EyeOffIcon,
    CheckCircle2 as CheckCircleIcon,
    Lock,
    ChevronRight as ChevronIcon,
    AlertTriangle as AlertIcon,
    ShieldCheck,
    ArrowLeft,
    Sparkles,
    Shield
} from "lucide-react";
import { authService } from "@/services/AuthService";
import { Button } from "@/components/ui/button";

const ResetPassword = () => {
    const [searchParams] = useSearchParams();
    const token = searchParams.get("token");
    const navigate = useNavigate();

    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            setMousePos({
                x: (e.clientX / window.innerWidth - 0.5) * 20,
                y: (e.clientY / window.innerHeight - 0.5) * 20
            });
        };
        window.addEventListener("mousemove", handleMouseMove);
        return () => window.removeEventListener("mousemove", handleMouseMove);
    }, []);

    const getPasswordRequirements = (password: string) => [
        { label: "8 caractères minimum", met: password.length >= 8 },
        { label: "Une majuscule & minuscule", met: /[A-Z]/.test(password) && /[a-z]/.test(password) },
        { label: "Un chiffre requis", met: /[0-9]/.test(password) },
        { label: "Caractère spécial", met: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password) }
    ];

    const requirements = getPasswordRequirements(newPassword);
    const isPasswordValid = requirements.every(req => req.met);
    const passwordsMatch = newPassword === confirmPassword && newPassword !== "";

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isPasswordValid || !passwordsMatch || !token) return;

        setLoading(true);
        try {
            const response = await authService.resetPassword(token, newPassword);
            if (!response.error) {
                setSuccess(true);
                toast.success("Signature numérique mise à jour");
                setTimeout(() => navigate("/login"), 3000);
            } else {
                toast.error(response.error || "Lien expiré ou invalide");
            }
        } catch (error) {
            toast.error("Échec critique du serveur de sécurité");
        } finally {
            setLoading(false);
        }
    };

    if (!token) {
        return (
            <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-8 relative overflow-hidden">
                <div className="absolute inset-0 z-0 opacity-10 blur-[150px] animate-pulse">
                    <div className="absolute top-[-20%] left-[-20%] w-[100vw] h-[100vh] bg-red-400 rounded-full"></div>
                </div>

                <div className="w-full max-w-[520px] bg-white rounded-[4rem] p-16 shadow-2xl flex flex-col items-center text-center space-y-10 animate-in zoom-in-95 duration-1000 relative z-10 border border-gray-100">
                    <div className="w-32 h-32 bg-red-50 rounded-full flex items-center justify-center shadow-2xl shadow-red-500/10 transition-transform hover:scale-110 duration-500">
                        <AlertIcon className="w-14 h-14 text-red-500 animate-bounce" />
                    </div>
                    <div className="space-y-4">
                        <h1 className="text-4xl font-black text-gray-900 tracking-tighter uppercase leading-[0.8] italic">Sceau <span className="text-red-500">Corrompu</span></h1>
                        <div className="w-20 h-1.5 bg-red-500 rounded-full mx-auto"></div>
                        <p className="text-gray-400 font-medium text-lg max-w-[320px] mx-auto leading-relaxed">Le lien de réinitialisation a été interrompu ou est arrivé à expiration.</p>
                    </div>
                    <button
                        onClick={() => navigate("/forgot-password")}
                        className="w-full h-24 rounded-[2.5rem] bg-gray-900 hover:bg-black text-white font-black uppercase text-sm tracking-[0.4em] shadow-2xl transition-all"
                    >
                        Nouveau lien
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="relative min-h-screen flex items-center justify-center p-6 lg:p-12 overflow-hidden bg-[#F8FAFC]">

            {/* --- DYNAMIC BACKGROUND LAYERS --- */}
            <div className="absolute inset-0 z-0 pointer-events-none">
                <div
                    className="absolute top-[-10%] right-[-5%] w-[40vw] h-[40vw] bg-teal-400/10 rounded-full blur-[120px] animate-pulse"
                />

                <div
                    className="absolute inset-0 transition-transform duration-700 ease-out"
                    style={{ transform: `scale(1.05) translate(${mousePos.x * 0.5}px, ${mousePos.y * 0.5}px)` }}
                >
                    <div
                        className="absolute bottom-0 left-0 right-0 h-full bg-no-repeat bg-cover bg-bottom opacity-100 translate-y-[5%]"
                        style={{ backgroundImage: "url('/forgot-password.png')" }}
                    />
                </div>
            </div>

            {/* --- MAIN CARD --- */}
            <div className="w-full max-w-[520px] bg-white/70 backdrop-blur-[32px] rounded-[4.5rem] p-12 lg:p-16 shadow-[0_45px_120px_-30px_rgba(245,130,31,0.25)] border-[1.5px] border-white/80 relative z-10 animate-in fade-in zoom-in-95 duration-1000">

                {/* Official Sonatel Logo */}
                <div className="flex flex-col items-center mb-14 transition-transform hover:scale-105 duration-700">
                    <img src="/logo-sonatel.png" alt="Sonatel" className="h-20 lg:h-24 object-contain drop-shadow-sm" />
                    <div className="flex items-center gap-2 mt-4 px-4 py-1 bg-teal-500/5 rounded-full border border-teal-500/10">
                        <Shield className="w-3 h-3 text-teal-500" />
                        <span className="text-[9px] font-black uppercase tracking-[0.3em] text-teal-600">Upgrade Sécurité</span>
                    </div>
                </div>

                <div className="space-y-6 mb-12 text-center lg:text-left">
                    <h1 className="text-4xl lg:text-5xl font-black text-gray-900 tracking-tight leading-[0.9] text-balance">
                        Signature<br />Numérique
                    </h1>
                    <p className="text-gray-500 font-medium text-lg leading-relaxed max-w-[320px] lg:mx-0 mx-auto">
                        Renouvelez votre accès avec une sécurité renforcée.
                    </p>
                </div>

                {success ? (
                    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-1000">
                        <div className="p-10 bg-orange-50 rounded-[3.5rem] border-2 border-orange-100 text-center space-y-8 shadow-2xl shadow-orange-500/10">
                            <div className="w-24 h-24 bg-orange-500 rounded-full flex items-center justify-center mx-auto shadow-2xl shadow-orange-500/40 relative overflow-hidden">
                                <CheckCircleIcon className="w-12 h-12 text-white relative z-10" />
                                <div className="absolute inset-0 bg-white/30 -translate-x-[100%] animate-[shimmer_2s_infinite]"></div>
                            </div>
                            <div className="space-y-3 px-2">
                                <h3 className="text-3xl font-black text-gray-900 leading-tight">C'est parfait !</h3>
                                <p className="text-sm font-bold text-orange-800/60 leading-relaxed">
                                    Compte sécurisé. Redirection imminente vers le portail...
                                </p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-10">
                        <div className="space-y-8">
                            <div className="relative group">
                                <label className="absolute -top-3 left-8 px-3 bg-white text-[10px] font-black uppercase tracking-[0.4em] text-gray-400 group-focus-within:text-orange-600 transition-all z-10 rounded-full shadow-sm">
                                    Nouveau mot de passe
                                </label>
                                <div className="relative">
                                    <div className="absolute left-8 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-orange-600 transition-colors">
                                        <Lock className="w-6 h-6" />
                                    </div>
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        className="w-full h-24 pl-20 pr-16 bg-gray-50/20 border-2 border-gray-100 rounded-[2.8rem] focus:ring-[15px] focus:ring-orange-500/5 focus:border-orange-500 focus:bg-white outline-none transition-all text-gray-900 font-bold tracking-tight text-xl placeholder:text-gray-200 shadow-sm"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        required
                                    />
                                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-8 top-1/2 -translate-y-1/2 p-2 text-gray-300 hover:text-orange-600 transition-all">
                                        {showPassword ? <EyeOffIcon className="w-6 h-6" /> : <EyeIcon className="w-6 h-6" />}
                                    </button>
                                </div>
                            </div>

                            <div className="relative group">
                                <label className="absolute -top-3 left-8 px-3 bg-white text-[10px] font-black uppercase tracking-[0.4em] text-gray-400 group-focus-within:text-orange-600 transition-all z-10 rounded-full shadow-sm">
                                    Confirmation
                                </label>
                                <div className="relative">
                                    <div className="absolute left-8 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-orange-600 transition-colors">
                                        <ShieldCheck className="w-6 h-6" />
                                    </div>
                                    <input
                                        type={showConfirm ? "text" : "password"}
                                        className="w-full h-24 pl-20 pr-16 bg-gray-50/20 border-2 border-gray-100 rounded-[2.8rem] focus:ring-[15px] focus:ring-orange-500/5 focus:border-orange-500 focus:bg-white outline-none transition-all text-gray-900 font-bold tracking-tight text-xl"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        required
                                    />
                                    <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-8 top-1/2 -translate-y-1/2 p-2 text-gray-300 hover:text-orange-600">
                                        {showConfirm ? <EyeOffIcon className="w-6 h-6" /> : <EyeIcon className="w-6 h-6" />}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Requirements */}
                        <div className="p-10 bg-gray-50/30 border-2 border-gray-100 rounded-[3rem] grid grid-cols-2 gap-4 shadow-inner">
                            {requirements.map((req, i) => (
                                <div key={i} className="flex items-center gap-3">
                                    <div className={`w-6 h-6 rounded-xl flex items-center justify-center transition-all ${req.met ? "bg-emerald-500 shadow-xl shadow-emerald-500/20 text-white" : "bg-gray-100"}`}>
                                        {req.met ? <CheckCircleIcon className="w-3.5 h-3.5" /> : <div className="w-1.5 h-1.5 bg-gray-300 rounded-full text-transparent" />}
                                    </div>
                                    <span className={`text-[10px] font-black uppercase tracking-wider ${req.met ? "text-emerald-600" : "text-gray-400"}`}>
                                        {req.label}
                                    </span>
                                </div>
                            ))}
                        </div>

                        <button
                            type="submit"
                            disabled={loading || !isPasswordValid || !passwordsMatch}
                            className="relative w-full h-24 bg-gray-900 hover:bg-orange-600 text-white rounded-[2.8rem] font-black uppercase text-sm tracking-[0.4em] shadow-2xl flex items-center justify-center gap-5 group transition-all hover:scale-[1.03] active:scale-[0.97] disabled:opacity-30 overflow-hidden"
                        >
                            {loading ? (
                                <div className="w-8 h-8 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
                            ) : (
                                <>
                                    Mettre à jour
                                    <ChevronIcon className="w-6 h-6 opacity-40 group-hover:translate-x-3 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>
                )}

                <div className="mt-14 text-center">
                    <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.5em] leading-relaxed">
                        Copyright © 2026 SmartAudit <br />
                        <span className="text-orange-200">DG-SECU / Sonatel Group</span>
                    </p>
                </div>
            </div>

            <style>{`
                @keyframes shimmer {
                    100% { transform: translateX(100%); }
                }
            `}</style>
        </div>
    );
};

export default ResetPassword;
