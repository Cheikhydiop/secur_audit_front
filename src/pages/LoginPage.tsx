import { useState, useEffect } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { getOfflineUsers } from "@/services/OfflineAuthService";
import { useOnlineStatus } from "@/hooks/use-online-status";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isOnline = useOnlineStatus();

  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [offlineUsers, setOfflineUsers] = useState<string[]>([]);

  const from = location.state?.from?.pathname || "/dashboard";

  // Charger les utilisateurs avec session offline disponible
  useEffect(() => {
    setOfflineUsers(getOfflineUsers());
  }, []);

  const canLoginOffline = !isOnline && offlineUsers.length > 0;
  const emailHasOfflineSession = !isOnline && offlineUsers.includes(email.toLowerCase().trim());

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const result = await login(email, password);

      if (result.success) {
        if (result.requiresDeviceVerification) {
          navigate("/device-verification", {
            state: {
              sessionId: result.sessionId,
              existingSessions: result.existingSessions,
              deviceInfo: result.deviceInfo,
              from: location.state?.from,
            },
          });
          return;
        }

        if (result.offlineMode) {
          toast.success("Connexion hors-ligne réussie", {
            description: "Vos données locales sont disponibles. La synchronisation reprendra dès que vous serez connecté.",
            duration: 5000,
          });
        } else {
          toast.success("Connexion réussie");
        }

        navigate(from, { replace: true });
      } else {
        toast.error(result.error || "Identifiants invalides");
      }
    } catch {
      toast.error("Une erreur est survenue lors de la connexion");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen">
      {/* Background image */}
      <div className="absolute inset-0 bg-building"></div>

      {/* Right sidebar with blur effect */}
      <div className="right-sidebar">
        {/* Login card */}
        <div className="login-card animate-in fade-in zoom-in duration-500">

          {/* Bandeau offline */}
          {!isOnline && (
            <div className="mb-5 rounded-xl overflow-hidden">
              <div className="bg-amber-500 text-white px-4 py-3 flex items-center gap-3">
                <span className="text-xl">📡</span>
                <div>
                  <p className="font-black text-sm leading-tight">Mode hors-ligne</p>
                  {canLoginOffline ? (
                    <p className="text-xs opacity-90 mt-0.5 leading-tight">
                      Session locale disponible pour{" "}
                      <span className="font-black">{offlineUsers.length} compte{offlineUsers.length > 1 ? "s" : ""}</span>
                    </p>
                  ) : (
                    <p className="text-xs opacity-90 mt-0.5 leading-tight">
                      Aucune session locale — connectez-vous d'abord en ligne
                    </p>
                  )}
                </div>
              </div>

              {/* Liste des comptes offline disponibles */}
              {canLoginOffline && offlineUsers.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 px-4 py-2">
                  <p className="text-[11px] text-amber-700 font-bold mb-1.5">Comptes disponibles hors-ligne :</p>
                  <div className="flex flex-wrap gap-1.5">
                    {offlineUsers.map((u) => (
                      <button
                        key={u}
                        type="button"
                        onClick={() => setEmail(u)}
                        className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border transition-all ${email.toLowerCase().trim() === u
                          ? "bg-amber-500 text-white border-amber-500"
                          : "bg-white text-amber-700 border-amber-300 hover:border-amber-500"
                          }`}
                      >
                        {u}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Sonatel logo */}
          <div className="login-logo">
            <span>sonatel</span>
            <div className="bg-orange-custom w-8 h-8 rounded-sm ml-2"></div>
          </div>

          {/* Welcome text */}
          <div className="mb-8">
            <p className="text-sm text-gray-600">
              Bienvenue sur <span className="text-orange-custom font-bold">G-SECU</span>
            </p>
            <h1 className="text-3xl font-black mt-2 text-gray-900 tracking-tight">
              {isOnline ? "Se connecter" : "Connexion locale"}
            </h1>
          </div>

          {/* Login form */}
          <form onSubmit={handleLogin}>
            <div className="mb-5">
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2 ml-1">
                Identifiant ou Email
              </label>
              <input
                type="text"
                className={`w-full h-12 px-4 border rounded-xl focus:ring-2 outline-none transition-all bg-gray-50/50 ${emailHasOfflineSession
                  ? "border-amber-400 focus:ring-amber-200 focus:border-amber-500"
                  : "border-gray-200 focus:ring-[#F5821F]/20 focus:border-[#F5821F]"
                  }`}
                placeholder="prenom.nom@sonatel.sn"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                required
                autoComplete="email"
              />
              {emailHasOfflineSession && (
                <p className="text-[11px] text-amber-600 font-bold mt-1 ml-1 flex items-center gap-1">
                  <span>✓</span> Session locale disponible pour ce compte
                </p>
              )}
              {!isOnline && email && !emailHasOfflineSession && email.includes('@') && (
                <p className="text-[11px] text-red-500 font-bold mt-1 ml-1 flex items-center gap-1">
                  <span>✗</span> Aucune session locale pour cet email
                </p>
              )}
            </div>

            <div className="mb-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2 ml-1">
                Mot de passe
              </label>
              <input
                type="password"
                className="w-full h-12 px-4 border border-gray-100 rounded-xl focus:ring-2 focus:ring-[#F5821F]/20 focus:border-[#F5821F] outline-none transition-all bg-gray-50/50"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                required
                autoComplete="current-password"
              />
            </div>

            {isOnline && (
              <div className="text-right mb-6">
                <Link to="/forgot-password" className="text-orange-custom text-xs font-bold hover:underline">
                  Mot de passe oublié ?
                </Link>
              </div>
            )}

            {!isOnline && <div className="mb-6" />}

            <button
              type="submit"
              className="btn-login flex justify-center items-center shadow-lg shadow-orange-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-60 disabled:scale-100"
              disabled={isLoading || (!isOnline && !canLoginOffline)}
            >
              {isLoading ? (
                <div className="loader"></div>
              ) : !isOnline && !canLoginOffline ? (
                "CONNEXION NON DISPONIBLE"
              ) : (
                isOnline ? "SE CONNECTER" : "CONNEXION HORS-LIGNE"
              )}
            </button>

            {!isOnline && !canLoginOffline && (
              <p className="mt-3 text-center text-[11px] text-gray-500 leading-relaxed">
                Connectez-vous d'abord en ligne pour activer<br />
                la connexion hors-ligne sur cet appareil.
              </p>
            )}
          </form>

          {/* Status indicator */}
          <div className="mt-6 flex items-center justify-center gap-2">
            <span className={`h-2 w-2 rounded-full ${isOnline ? "bg-green-500" : "bg-amber-400"} animate-pulse`} />
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              {isOnline ? "En ligne" : "Hors ligne"}
            </span>
          </div>

          <p className="mt-4 text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-relaxed">
            © 2026 Direction de la sécurité <br /> Sonatel DG/SECU
          </p>
        </div>
      </div>

      <style>{`
        .bg-orange-custom {
          background-color: #F5821F;
        }
        .text-orange-custom {
          color: #F5821F;
        }
        .bg-building {
          background-image: url('https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRP4mWCL7fyetC2zp-AfbxM2q7_haesrAOc3A&s');
          background-size: cover;
          background-position: center;
        }
        .login-card {
          background-color: white;
          border-radius: 24px;
          box-shadow: 0 25px 50px -12px rgba(245, 130, 31, 0.15);
          padding: 2.5rem;
          width: 100%;
          max-width: 420px;
          border: 1px solid rgba(245, 130, 31, 0.1);
        }
        .login-logo {
          display: flex;
          align-items: center;
          margin-bottom: 2rem;
        }
        .login-logo span {
          color: #429e9d;
          font-size: 2rem;
          font-weight: 900;
          letter-spacing: -0.05em;
        }
        .btn-login {
          background-color: #F5821F;
          color: white;
          height: 3.5rem;
          border-radius: 14px;
          font-weight: 900;
          width: 100%;
          margin-top: 1rem;
          font-size: 0.875rem;
          letter-spacing: 0.1em;
        }
        .btn-login:disabled {
          background-color: #9ca3af;
        }
        .right-sidebar {
          position: absolute;
          top: 0;
          right: 0;
          width: 100%;
          height: 100%;
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 10;
          overflow-y: auto;
          padding: 2rem 1rem;
        }
        @media (min-width: 768px) {
          .right-sidebar {
            width: 50%;
            background-color: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(12px);
            border-left: 1px solid rgba(255, 255, 255, 0.3);
          }
        }
        .loader {
          border: 3px solid rgba(255,255,255,0.3);
          border-radius: 50%;
          border-top: 3px solid white;
          width: 24px;
          height: 24px;
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
