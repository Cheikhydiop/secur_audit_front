import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldCheck, Loader2, Smartphone, Laptop, Tablet, AlertCircle, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { authService } from '@/services/AuthService';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';

const DeviceVerification = () => {
    const [otp, setOtp] = useState('');
    const [loading, setLoading] = useState(false);
    const [resending, setResending] = useState(false);
    const [countdown, setCountdown] = useState(0);
    const navigate = useNavigate();
    const location = useLocation();
    const { toast } = useToast();

    const { sessionId, existingSessions, deviceInfo, from } = location.state || {};

    useEffect(() => {
        if (!sessionId) {
            navigate('/login');
        }
    }, [sessionId, navigate]);

    useEffect(() => {
        let timer: any;
        if (countdown > 0) {
            timer = setInterval(() => setCountdown(prev => prev - 1), 1000);
        }
        return () => clearInterval(timer);
    }, [countdown]);

    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        if (otp.length !== 6) return;

        setLoading(true);
        try {
            const res = await authService.verifyDevice(sessionId, otp);
            if (res.data?.token) {
                localStorage.setItem('auth_token', res.data.token);
                if (res.data.refreshToken) localStorage.setItem('refresh_token', res.data.refreshToken);
                toast({ title: 'Vérification réussie', description: 'Bienvenue sur votre espace sécurisé' });

                const targetPath = from?.pathname || '/dashboard';
                navigate(targetPath, { replace: true });
            } else {
                toast({ title: 'Erreur', description: res.error || 'Code invalide', variant: 'destructive' });
                setOtp('');
            }
        } catch (error: any) {
            toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    };

    const handleResend = async () => {
        if (countdown > 0) return;
        setResending(true);
        try {
            const res = await authService.resendDeviceOTP(sessionId);
            if (!res.error) {
                toast({ title: 'Code renvoyé', description: 'Un nouveau code a été envoyé par email' });
                setCountdown(60);
            } else {
                toast({ title: 'Erreur', description: res.error, variant: 'destructive' });
            }
        } catch (error: any) {
            toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
        } finally {
            setResending(false);
        }
    };

    const getDeviceIcon = (type: string) => {
        switch (type?.toUpperCase()) {
            case 'MOBILE': return <Smartphone className="w-8 h-8" />;
            case 'TABLET': return <Tablet className="w-8 h-8" />;
            default: return <Laptop className="w-8 h-8" />;
        }
    };

    if (!sessionId) return null;

    return (
        <div className="relative min-h-screen flex items-center justify-center p-4 md:p-8 bg-[#FDFDFD] overflow-hidden font-sans">
            {/* Background decorative wave - positioned elegantly */}
            <div className="absolute -bottom-10 -right-10 w-full h-full opacity-40 pointer-events-none z-0">
                <div className="absolute bottom-0 right-0 w-[120%] h-[120%] bg-verification bg-no-repeat bg-bottom bg-right transition-all duration-1000"></div>
            </div>

            {/* Professional top-left branding */}
            <div className="absolute top-10 left-10 hidden md:flex items-center gap-10 animate-in fade-in slide-in-from-left-4 duration-1000">
                <img src="/logo-sonatel.png" alt="Sonatel" className="h-32" />
                <div className="h-28 w-[5px] bg-gray-200"></div>
                <div className="flex flex-col">
                    <span className="text-base font-black text-gray-400 uppercase tracking-widest">Digitalisation</span>
                    <span className="text-3xl font-black text-gray-900 leading-none mt-4">Contrôle des Sites</span>
                </div>
            </div>

            <div className="max-w-[1000px] w-full grid grid-cols-1 lg:grid-cols-2 bg-white rounded-[3rem] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.12)] border border-gray-100/50 overflow-hidden relative z-10 animate-in fade-in zoom-in-95 duration-1000">

                {/* Visual Side (LHS on Desktop) */}
                <div className="hidden lg:flex flex-col justify-between p-16 bg-gradient-to-br from-sonatel-orange to-orange-600 text-white relative overflow-hidden">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.2),transparent)] opacity-50"></div>

                    <div className="relative z-10">
                        <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mb-10 shadow-xl border border-white/20">
                            <ShieldCheck className="w-8 h-8 text-white" />
                        </div>
                        <h2 className="text-3xl font-black leading-tight mb-6">
                            Sécurisation de la session
                        </h2>
                        <p className="text-orange-50 font-medium leading-relaxed opacity-90">
                            Nous vérifions que vous vous connectez depuis un appareil autorisé pour garantir l'intégrité des rapports d'audit.
                        </p>
                    </div>

                    <div className="relative z-10 space-y-6">
                        <div className="flex items-center gap-4 p-4 bg-white/10 rounded-2xl border border-white/10 backdrop-blur-sm">
                            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                                <Laptop className="w-5 h-5" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black uppercase tracking-widest opacity-70">Appareil actuel</span>
                                <span className="text-sm font-bold">{deviceInfo?.deviceName || 'Linux PC (Navigateur)'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Decorative abstract shape */}
                    <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
                </div>

                {/* Interaction Side (RHS) */}
                <div className="p-10 lg:p-20 flex flex-col justify-center">
                    <div className="text-center lg:text-left mb-10 space-y-4">
                        <div className="lg:hidden flex justify-center mb-6">
                            <img src="/logo-sonatel.png" alt="Sonatel" className="h-10" />
                        </div>
                        <h1 className="text-3xl font-black text-gray-900 tracking-tight">Code de sécurité</h1>
                        <p className="text-gray-500 font-medium leading-relaxed">
                            Saisissez le code de validation reçu sur votre boîte mail professionnelle.
                        </p>
                    </div>

                    <form onSubmit={handleVerify} className="space-y-10">
                        <div className="flex justify-center lg:justify-start">
                            <InputOTP
                                maxLength={6}
                                value={otp}
                                onChange={(v) => setOtp(v)}
                            >
                                <InputOTPGroup className="gap-3">
                                    {[0, 1, 2, 3, 4, 5].map((idx) => (
                                        <InputOTPSlot
                                            key={idx}
                                            index={idx}
                                            className="w-11 h-14 rounded-xl border-2 border-gray-100 bg-gray-50/50 text-xl font-black text-gray-900 focus:border-sonatel-orange focus:ring-4 focus:ring-sonatel-orange/10 transition-all"
                                        />
                                    ))}
                                </InputOTPGroup>
                            </InputOTP>
                        </div>

                        <div className="space-y-6">
                            <Button
                                type="submit"
                                disabled={loading || otp.length < 6}
                                className="w-full h-14 bg-sonatel-orange hover:bg-orange-600 text-white rounded-2xl font-black tracking-widest shadow-xl shadow-orange-500/20 transition-all hover:scale-[1.01] active:scale-[0.99] uppercase text-xs"
                            >
                                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Vérifier & Accéder"}
                            </Button>

                            <button
                                type="button"
                                onClick={handleResend}
                                disabled={resending || countdown > 0}
                                className="w-full flex items-center justify-center gap-2 text-xs font-black text-gray-400 hover:text-sonatel-orange uppercase tracking-widest transition-colors py-2"
                            >
                                <RefreshCw className={`w-3.5 h-3.5 ${resending ? 'animate-spin' : ''}`} />
                                {countdown > 0 ? `Renvoyer (${countdown}s)` : "Renvoyer le code"}
                            </button>
                        </div>
                    </form>

                    {/* Mobile Footer Branding */}
                    <div className="mt-12 lg:hidden text-center">
                        <p className="text-[10px] font-black text-gray-300 tracking-[0.2em] uppercase">
                            © Sonatel Sécurité
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
};

export default DeviceVerification;
