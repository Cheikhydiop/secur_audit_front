import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock, User, ArrowLeft, Phone, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import authService from '@/services/AuthService';
import { ADMIN_PATH } from '@/config/admin';
import { decodeJWT } from '@/utils/jwt';

type AuthMode = 'login' | 'forgot' | 'reset' | 'register';

interface AuthProps {
  type?: AuthMode;
}

export default function Auth({ type }: AuthProps = {}) {
  const [searchParams] = useSearchParams();
  const urlMode = searchParams.get('mode') as AuthMode;
  const referralCode = searchParams.get('ref');

  // Si pas de mode dans l'URL, on utilise login par défaut
  const initialMode = urlMode || type || 'login';

  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '+221',
    password: '',
    confirmPassword: '',
    resetToken: '',
    referralCode: referralCode || '',
  });

  // Met à jour le formulaire si l'URL change (cas où on clique sur le lien alors qu'on est déjà sur la page)
  useEffect(() => {
    if (referralCode) {
      setMode('register');
      setFormData(prev => ({ ...prev, referralCode: referralCode }));
    }
  }, [referralCode]);

  const { login, register } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (mode === 'register') {
        if (formData.password !== formData.confirmPassword) {
          toast({
            title: 'Erreur',
            description: 'Les mots de passe ne correspondent pas',
            variant: 'destructive',
          });
          setIsLoading(false);
          return;
        }

        // Validation mot de passe simple (min 4 caractères)
        if (formData.password.length < 4) {
          toast({
            title: 'Mot de passe trop court',
            description: 'Le mot de passe doit contenir au moins 4 caractères.',
            variant: 'destructive',
          });
          setIsLoading(false);
          return;
        }

        // Valider le format du téléphone sénégalais
        const phoneRegex = /^\+221[0-9]{9}$/;
        if (!formData.phone || formData.phone.length < 13) {
          toast({
            title: 'Erreur',
            description: 'Veuillez saisir un numéro de téléphone complet (+221 + 9 chiffres)',
            variant: 'destructive',
          });
          setIsLoading(false);
          return;
        }
        if (!phoneRegex.test(formData.phone)) {
          toast({
            title: 'Erreur',
            description: 'Format de téléphone invalide. Utilisez +221XXXXXXXXX',
            variant: 'destructive',
          });
          setIsLoading(false);
          return;
        }

        const result = await register(formData.name, formData.email, formData.password, formData.phone, formData.referralCode);
        if (result.success) {
          toast({
            title: 'Inscription réussie',
            description: 'Un code de vérification a été envoyé à votre email',
          });
          // Rediriger vers la page de vérification email
          navigate('/verify-email', {
            state: {
              userId: result.userId,
              email: formData.email
            }
          });
        } else {
          toast({
            title: 'Erreur',
            description: result.error || "Erreur lors de l'inscription",
            variant: 'destructive',
          });
        }
      } else if (mode === 'login') {
        const result = await login(formData.email, formData.password);
        if (result.success) {
          // Vérification multi-appareils
          if (result.requiresDeviceVerification) {
            navigate('/device-verification', {
              state: {
                sessionId: result.sessionId,
                existingSessions: result.existingSessions,
                deviceInfo: result.deviceInfo
              }
            });
            return;
          }

          toast({
            title: 'Connexion réussie',
            description: 'Bienvenue sur SmartAudit DG-SECU/Sonatel !',
          });

          let userRole = result.user?.role;

          if (!userRole && result.token) {
            console.log('⚠️ Role missing in user object, trying to decode token...');
            const decoded = decodeJWT(result.token);
            if (decoded?.role) {
              userRole = decoded.role;
              console.log('✅ Role decoded from token:', userRole);
            }
          }

          console.log('👤 LOGIN DEBUG - Final Role:', userRole);
          console.log('👤 LOGIN DEBUG - Target ADMIN_PATH:', ADMIN_PATH);

          if (userRole === 'ADMIN' || userRole === 'SUPER_ADMIN') {
            console.log('👉 Redirecting to ADMIN...');
            navigate(ADMIN_PATH);
          } else {
            console.log('👉 Redirecting to HOME...');
            navigate('/');
          }
        } else {
          toast({
            title: 'Erreur',
            description: result.error || 'Identifiants incorrects',
            variant: 'destructive',
          });
        }
      } else if (mode === 'forgot') {
        const result = await authService.forgotPassword(formData.email);
        if (!result.error) {
          toast({
            title: 'Email envoyé',
            description: 'Vérifiez votre boîte mail pour réinitialiser votre mot de passe',
          });
          setMode('reset');
        } else {
          toast({
            title: 'Erreur',
            description: result.error,
            variant: 'destructive',
          });
        }
      } else if (mode === 'reset') {
        if (formData.password !== formData.confirmPassword) {
          toast({
            title: 'Erreur',
            description: 'Les mots de passe ne correspondent pas',
            variant: 'destructive',
          });
          setIsLoading(false);
          return;
        }

        const result = await authService.resetPassword(formData.resetToken, formData.password);
        if (!result.error) {
          toast({
            title: 'Mot de passe réinitialisé',
            description: 'Vous pouvez maintenant vous connecter avec votre nouveau mot de passe',
          });
          setMode('login');
          setFormData({ ...formData, password: '', confirmPassword: '', resetToken: '' });
        } else {
          toast({
            title: 'Erreur',
            description: result.error,
            variant: 'destructive',
          });
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const getTitle = () => {
    switch (mode) {
      case 'login':
        return 'Connexion';
      case 'register':
        return 'Inscription';
      case 'forgot':
        return 'Mot de passe oublié';
      case 'reset':
        return 'Réinitialiser le mot de passe';
    }
  };

  const getDescription = () => {
    switch (mode) {
      case 'login':
        return 'Connectez-vous à votre espace SmartAudit DG-SECU/Sonatel';
      case 'register':
        return 'Créez votre compte SmartAudit DG-SECU/Sonatel';
      case 'forgot':
        return 'Entrez votre email pour recevoir un lien de réinitialisation';
      case 'reset':
        return 'Entrez le code reçu par email et votre nouveau mot de passe';
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="p-4 safe-top">
        <button
          onClick={() => {
            if (mode === 'reset') {
              setMode('forgot');
            } else if (mode === 'forgot') {
              setMode('login');
            } else {
              navigate('/');
            }
          }}
          className="p-2 hover:bg-muted rounded-xl transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col justify-center px-6 pb-8">
        {/* Logo & Title */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/20">
            <span className="text-3xl font-bold text-white">SI</span>
          </div>
          <p className="text-muted-foreground">
            {getDescription()}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {(mode === 'login' || mode === 'forgot' || mode === 'register') && (
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                name="email"
                type="email"
                placeholder="Adresse email"
                value={formData.email}
                onChange={handleChange}
                className="pl-12"
                required
              />
            </div>
          )}

          {mode === 'register' && (
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                name="name"
                placeholder="Nom complet"
                value={formData.name}
                onChange={handleChange}
                className="pl-12"
                required
              />
            </div>
          )}

          {mode === 'register' && (
            <div className="relative">
              <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                name="phone"
                placeholder="Téléphone (+221XXXXXXXXX)"
                value={formData.phone}
                onChange={handleChange}
                className="pl-12"
                required
              />
            </div>
          )}

          {mode === 'reset' && (
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                name="resetToken"
                placeholder="Code de réinitialisation"
                value={formData.resetToken}
                onChange={handleChange}
                className="pl-12"
                required
              />
            </div>
          )}

          {(mode === 'login' || mode === 'reset' || mode === 'register') && (
            <div className="space-y-4">
              <div className="space-y-1">
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Mot de passe"
                    value={formData.password}
                    onChange={handleChange}
                    className="pl-12 pr-12"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2"
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5 text-muted-foreground" />
                    ) : (
                      <Eye className="w-5 h-5 text-muted-foreground" />
                    )}
                  </button>
                </div>
              </div>

              {(mode === 'reset' || mode === 'register') && (
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    name="confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Confirmer le mot de passe"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className="pl-12"
                    required
                  />
                </div>
              )}
            </div>
          )}

          <Button
            type="submit"
            variant="default"
            size="lg"
            className="w-full bg-sonatel-orange hover:bg-sonatel-orange/90 text-white rounded-2xl font-bold h-14"
            disabled={isLoading}
          >
            {isLoading ? (
              <span>Chargement...</span>
            ) : (
              <span>
                {mode === 'login'
                  ? 'Se connecter'
                  : mode === 'register'
                    ? "S'inscrire"
                    : mode === 'forgot'
                      ? 'Envoyer le lien'
                      : 'Réinitialiser'}
              </span>
            )}
          </Button>

          {/* Terms of Service for Registration */}
          {mode === 'register' && (
            <p className="text-xs text-center text-muted-foreground mt-2">
              <span>En vous inscrivant, vous acceptez nos </span>
              <button
                type="button"
                onClick={() => navigate('/terms')}
                className="text-primary hover:underline font-medium"
              >
                <span>Conditions Générales d'Utilisation</span>
              </button>
            </p>
          )}
        </form>

        {/* Toggle Mode */}
        {(mode === 'login' || mode === 'register') && (
          <p className="text-center mt-6 text-muted-foreground">
            <span>{mode === 'login' ? "Pas encore de compte ?" : 'Déjà un compte ?'} </span>
            <button
              type="button"
              onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
              className="text-primary font-semibold hover:underline"
            >
              <span>{mode === 'login' ? "S'inscrire" : 'Se connecter'}</span>
            </button>
          </p>
        )}

        {mode === 'forgot' && (
          <p className="text-center mt-6 text-muted-foreground">
            <span>Vous avez déjà un code ? </span>
            <button
              type="button"
              onClick={() => setMode('reset')}
              className="text-primary font-semibold hover:underline"
            >
              <span>Réinitialiser maintenant</span>
            </button>
          </p>
        )}

        {mode === 'login' && (
          <p className="text-center mt-2">
            <button
              type="button"
              onClick={() => setMode('forgot')}
              className="text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              <span>Mot de passe oublié ?</span>
            </button>
          </p>
        )}
      </div>
    </div>
  );
}