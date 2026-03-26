import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, Mail, ChevronRight, CheckCircle2 } from "lucide-react";
import { authService } from "@/services/AuthService";
import { Button } from "@/components/ui/button";

const ForgotPassword = () => {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const response = await authService.forgotPassword(email);

            if (!response.error) {
                setSuccess(true);
                toast.success("Demande envoyée avec succès");
            } else {
                toast.error(response.error || "Une erreur est survenue");
            }
        } catch (error) {
            toast.error("Impossible de se connecter au serveur");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="relative min-h-screen flex items-center justify-center p-6 lg:p-12 overflow-hidden bg-white">
            {/* Background Wave - Asset Provided by User */}
            <div className="absolute inset-0 z-0 pointer-events-none">
                <div
                    className="absolute bottom-0 left-0 right-0 h-full bg-no-repeat bg-cover bg-bottom opacity-100"
                    style={{ backgroundImage: "url('/forgot-password.png')" }}
                />
            </div>

            {/* Content Card with Premium Design */}
            <div className="w-full max-w-[480px] bg-white rounded-[3rem] p-10 lg:p-14 shadow-[0_25px_60px_-15px_rgba(245,130,31,0.2)] border border-orange-50 relative z-10 animate-in fade-in zoom-in-95 duration-500">

                {/* Official Sonatel Logo */}
                <div className="flex flex-col items-center mb-10">
                    <img
                        src="/logo-sonatel.png"
                        alt="Sonatel G-SECU"
                        className="h-20 lg:h-24 object-contain animate-in fade-in slide-in-from-top-4 duration-700"
                    />
                    <div className="h-1 w-12 bg-orange-500 rounded-full mt-2"></div>
                </div>

                <div className="space-y-4 mb-10 text-center lg:text-left">
                    <h1 className="text-4xl lg:text-5xl font-black text-gray-900 tracking-tight leading-none">
                        Mot de passe<br />oublié ?
                    </h1>
                    <p className="text-gray-500 font-medium text-lg leading-snug">
                        Entrez votre email Sonatel pour recevoir un lien de réinitialisation sécurisé.
                    </p>
                </div>

                {success ? (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="p-10 bg-emerald-50 rounded-[2.5rem] border-2 border-emerald-100 flex flex-col items-center text-center space-y-6 shadow-xl shadow-emerald-500/5">
                            <div className="w-24 h-24 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/20">
                                <CheckCircle2 className="w-12 h-12 text-white" />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-2xl font-black text-gray-900 leading-tight">Vérifiez vos emails</h3>
                                <p className="text-sm text-emerald-700/70 font-bold leading-relaxed">
                                    Si <span className="text-emerald-800 font-extrabold">{email}</span> est reconnu, vous recevrez un lien d'ici peu.
                                </p>
                            </div>
                        </div>

                        <Button
                            onClick={() => navigate("/login")}
                            className="w-full h-20 rounded-[1.8rem] bg-gray-900 hover:bg-black text-white font-black uppercase text-xs tracking-[0.2em] shadow-2xl gap-3 transition-all active:scale-95"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Retour à la connexion
                        </Button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-8">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 ml-6">
                                Email Professionnel
                            </label>
                            <div className="relative group">
                                <div className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-orange-500 transition-colors">
                                    <Mail className="w-5 h-5" />
                                </div>
                                <input
                                    type="email"
                                    className="w-full h-20 pl-16 pr-6 bg-gray-50/50 border-2 border-gray-100 rounded-[2rem] focus:ring-8 focus:ring-orange-500/5 focus:border-orange-500 outline-none transition-all text-gray-900 font-black tracking-tight text-lg placeholder:text-gray-300 shadow-sm"
                                    placeholder="prenom.nom@sonatel.sn"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    disabled={loading}
                                    required
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading || !email}
                            className="w-full h-20 bg-orange-500 hover:bg-orange-600 text-white rounded-[2rem] font-black uppercase text-xs tracking-[0.3em] shadow-2xl shadow-orange-500/30 flex items-center justify-center gap-4 group transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                        >
                            {loading ? (
                                <div className="flex items-center gap-3">
                                    <div className="w-5 h-5 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
                                    <span>Traitement...</span>
                                </div>
                            ) : (
                                <>
                                    Demander le lien
                                    <ChevronRight className="w-5 h-5 opacity-50 group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>

                        <div className="pt-8 flex justify-center border-t border-gray-100">
                            <button
                                type="button"
                                onClick={() => navigate("/login")}
                                className="text-[11px] font-black uppercase tracking-[0.3em] text-gray-400 hover:text-orange-600 transition-colors flex items-center gap-2"
                            >
                                <ArrowLeft className="w-3 h-3" />
                                J'ai mon identifiant
                            </button>
                        </div>
                    </form>
                )}

                <div className="mt-12 text-center">
                    <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.4em] leading-relaxed">
                        © 2026 Direcion de la Sécurité <br />
                        SmartAudit by Sonatel DG/SECU
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ForgotPassword;
