import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import config from '@/config';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Mail, Loader2, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';

const EmailVerification = () => {
    const [otp, setOtp] = useState('');
    const [loading, setLoading] = useState(false);
    const [resending, setResending] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const { toast } = useToast();

    // Récupérer userId et email depuis l'état de navigation
    const { userId, email } = location.state || {};

    if (!userId || !email) {
        // Si pas d'infos, rediriger vers inscription
        navigate('/register');
        return null;
    }

    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault();

        if (otp.length !== 6) {
            toast({
                title: 'Code incomplet',
                description: 'Veuillez saisir les 6 chiffres du code',
                variant: 'destructive',
            });
            return;
        }

        setLoading(true);

        try {
            const response = await fetch(`${config.apiUrl}/auth/verify-email`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, otpCode: otp }),
            });

            const data = await response.json();

            if (response.ok) {
                toast({
                    title: 'Email vérifié !',
                    description: 'Votre compte est maintenant actif',
                });
                setTimeout(() => navigate('/login'), 1500);
            } else {
                toast({
                    title: 'Code invalide',
                    description: data.message || 'Le code est incorrect ou expiré',
                    variant: 'destructive',
                });
                setOtp('');
            }
        } catch (error) {
            toast({
                title: 'Erreur',
                description: 'Impossible de vérifier le code',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    const handleResend = async () => {
        setResending(true);

        try {
            const response = await fetch(`${config.apiUrl}/auth/resend-verification`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId }),
            });

            if (response.ok) {
                toast({
                    title: 'Code renvoyé',
                    description: 'Un nouveau code a été envoyé à votre email',
                });
            } else {
                toast({
                    title: 'Erreur',
                    description: 'Impossible de renvoyer le code',
                    variant: 'destructive',
                });
            }
        } catch (error) {
            toast({
                title: 'Erreur',
                description: 'Impossible de renvoyer le code',
                variant: 'destructive',
            });
        } finally {
            setResending(false);
        }
    };

    return (
        <div className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden">
            {/* Background elements */}
            <div className="absolute inset-0 bg-verification z-0"></div>

            <Card className="w-full max-w-md relative z-10 bg-white/80 backdrop-blur-xl border-2 border-white shadow-2xl rounded-[2.5rem]">
                <CardHeader className="space-y-1 text-center">
                    <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                        <Mail className="h-8 w-8 text-primary" />
                    </div>
                    <CardTitle className="text-2xl">Vérifiez votre email</CardTitle>
                    <CardDescription>
                        Un code à 6 chiffres a été envoyé à<br />
                        <strong>{email}</strong>
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleVerify} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="otp" className="text-center block">
                                Entrez le code de vérification
                            </Label>
                            <div className="flex justify-center">
                                <InputOTP
                                    maxLength={6}
                                    value={otp}
                                    onChange={(value) => setOtp(value)}
                                    disabled={loading}
                                >
                                    <InputOTPGroup>
                                        <InputOTPSlot index={0} />
                                        <InputOTPSlot index={1} />
                                        <InputOTPSlot index={2} />
                                        <InputOTPSlot index={3} />
                                        <InputOTPSlot index={4} />
                                        <InputOTPSlot index={5} />
                                    </InputOTPGroup>
                                </InputOTP>
                            </div>
                        </div>

                        <Alert>
                            <AlertDescription className="text-sm text-center">
                                Le code expire dans <strong>15 minutes</strong>
                            </AlertDescription>
                        </Alert>

                        <Button
                            type="submit"
                            className="w-full"
                            disabled={loading || otp.length !== 6}
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Vérification...
                                </>
                            ) : (
                                <>
                                    <CheckCircle2 className="mr-2 h-4 w-4" />
                                    Vérifier
                                </>
                            )}
                        </Button>

                        <div className="text-center space-y-2">
                            <p className="text-sm text-muted-foreground">
                                Vous n'avez pas reçu le code ?
                            </p>
                            <Button
                                type="button"
                                variant="link"
                                onClick={handleResend}
                                disabled={resending}
                                className="p-0 h-auto"
                            >
                                {resending ? 'Envoi en cours...' : 'Renvoyer le code'}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>

            <style>{`
                .bg-verification {
                    background-image: url('/background-verification.png');
                    background-size: cover;
                    background-position: center;
                    background-repeat: no-repeat;
                }
            `}</style>
        </div>
    );
};

export default EmailVerification;
