import React, { useState, useEffect } from "react";
import {
  Settings,
  Users,
  FileText,
  Shield,
  User,
  Bell,
  Globe,
  Database,
  Mail,
  Lock,
  Save,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertCircle,
  Smartphone,
  Cloud,
  FileDown,
  Video,
  ClipboardCheck,
  Eye,
  EyeOff,
  ChevronLeft as ChevronLeftIcon,
  Laptop,
  Loader2
} from "lucide-react";
import { QuestionnaireManager } from "@/components/QuestionnaireManager";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { authService } from "@/services/AuthService";
import { adminService } from "@/services/AdminService";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export default function ParametresPage() {
  const [isSaving, setIsSaving] = useState(false);
  const [selectedRubriqueId, setSelectedRubriqueId] = useState<string | null>(null);
  const [activeSessions, setActiveSessions] = useState<any[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [isLoadingTeam, setIsLoadingTeam] = useState(false);
  const { user } = useAuth();

  // Charger les membres de l'equipe
  const loadTeamMembers = async () => {
    setIsLoadingTeam(true);
    try {
      const res = await adminService.getUsers({ limit: 100 });
      if (res.data) setTeamMembers(res.data);
    } catch (error) {
      console.error("Erreur chargement equipe:", error);
    } finally {
      setIsLoadingTeam(false);
    }
  };

  useEffect(() => {
    loadTeamMembers();
  }, []);

  const loadSessions = async () => {
    setIsLoadingSessions(true);
    try {
      const res = await authService.getSessions();
      if (res.data) setActiveSessions(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoadingSessions(false);
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    try {
      const res = await authService.revokeSession(sessionId);
      if (!res.error) {
        toast.success("Session révoquée avec succès");
        loadSessions();
      } else {
        toast.error(res.error);
      }
    } catch (error) {
      toast.error("Erreur lors de la révocation");
    }
  };

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      toast.success("Paramètres enregistrés");
    }, 1000);
  };

  return (
    <div className="p-4 md:p-10 space-y-10 w-full animate-in fade-in duration-500">
      {/* Header Container */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2">
        <div className="space-y-1">
          <h1 className="text-3xl font-black tracking-tight text-gray-900 flex items-center gap-3">
            <Settings className="w-8 h-8 text-sonatel-orange" />
            Paramètres Plateforme
          </h1>
          <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">
            Configuration avancée et administration du système
          </p>
        </div>
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="bg-sonatel-orange hover:bg-orange-600 text-white font-black uppercase tracking-wider px-8 py-6 rounded-2xl shadow-lg shadow-orange-500/20"
        >
          {isSaving ? "Enregistrement..." : "Enregistrer les modifications"}
          {!isSaving && <Save className="ml-2 w-4 h-4" />}
        </Button>
      </div>

      <Tabs defaultValue="profil" className="space-y-8 w-full">
        {/* Navigation Tabs - Full Width Scrollable for Mobile */}
        <div className="bg-white p-2 rounded-3xl shadow-sm border border-gray-100 flex overflow-x-auto max-w-full">
          <TabsList className="bg-transparent h-auto gap-3 p-0">
            <TabsTrigger value="profil" className="rounded-2xl px-8 py-3.5 data-[state=active]:bg-sonatel-orange data-[state=active]:text-white font-black text-xs uppercase tracking-wider transition-all gap-2">
              <User className="w-4 h-4" /> Mon Profil
            </TabsTrigger>
            <TabsTrigger value="utilisateurs" className="rounded-2xl px-8 py-3.5 data-[state=active]:bg-sonatel-orange data-[state=active]:text-white font-black text-xs uppercase tracking-wider transition-all gap-2">
              <Users className="w-4 h-4" /> Utilisateurs
            </TabsTrigger>
            <TabsTrigger value="questionnaire" className="rounded-2xl px-8 py-3.5 data-[state=active]:bg-sonatel-orange data-[state=active]:text-white font-black text-xs uppercase tracking-wider transition-all gap-2">
              <FileText className="w-4 h-4" /> Questionnaire
            </TabsTrigger>
            <TabsTrigger value="securite" className="rounded-2xl px-8 py-3.5 data-[state=active]:bg-sonatel-orange data-[state=active]:text-white font-black text-xs uppercase tracking-wider transition-all gap-2">
              <Shield className="w-4 h-4" /> Sécurité
            </TabsTrigger>
            <TabsTrigger value="systeme" className="rounded-2xl px-8 py-3.5 data-[state=active]:bg-sonatel-orange data-[state=active]:text-white font-black text-xs uppercase tracking-wider transition-all gap-2">
              <Database className="w-4 h-4" /> Système
            </TabsTrigger>
          </TabsList>
        </div>

        {/* --- Mon Profil Content --- */}
        <TabsContent value="profil" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <Card className="lg:col-span-1 bg-white border-2 border-gray-100 rounded-3xl overflow-hidden shadow-sm">
              <CardContent className="p-8 flex flex-col items-center text-center">
                <div className="relative group">
                  <Avatar className="w-32 h-32 border-4 border-sonatel-orange/10 p-1 mb-6">
                    <AvatarFallback className="bg-sonatel-light-bg text-sonatel-orange font-black text-2xl uppercase">
                      {user?.name ? user.name.split(' ').map(n => n[0]).join('').slice(0, 2) : 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <button className="absolute bottom-6 right-0 bg-sonatel-orange text-white p-2 rounded-xl shadow-lg hover:scale-110 transition-transform">
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>
                <h3 className="text-xl font-black text-gray-900 leading-none">{user?.name || 'Utilisateur'}</h3>
                <p className="text-sm font-bold text-sonatel-orange mt-2 uppercase tracking-widest">{user?.entite || 'SEC'}</p>
                <Badge className="mt-4 bg-emerald-100 text-emerald-700 border-none font-black text-[10px] uppercase">{user?.role || 'INSPECTEUR'}</Badge>

                <Separator className="my-8 w-full opacity-50" />

                <div className="w-full space-y-4">
                  <div className="flex items-center gap-3 text-sm text-gray-600">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <span className="font-bold">{user?.email || 'email@sonatel.sn'}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-600">
                    <Smartphone className="w-4 h-4 text-muted-foreground" />
                    <span className="font-bold">{user?.phone || '+221 77 000 00 00'}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-600">
                    <Globe className="w-4 h-4 text-muted-foreground" />
                    <span className="font-bold">Sénégal</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2 bg-white border-2 border-gray-100 rounded-3xl shadow-sm">
              <CardHeader className="p-8 border-b border-gray-50">
                <CardTitle className="text-lg font-black text-gray-900 uppercase tracking-widest">Informations Personnelles</CardTitle>
                <CardDescription className="font-bold">Modifiez vos informations de contact et de profil.</CardDescription>
              </CardHeader>
              <CardContent className="p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="firstname" className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Prénom</Label>
                    <Input id="firstname" defaultValue={user?.name?.split(' ')[0] || ''} className="rounded-xl border-gray-200 h-12 font-bold focus:border-sonatel-orange focus:ring-sonatel-orange/10" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastname" className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Nom</Label>
                    <Input id="lastname" defaultValue={user?.name?.split(' ').slice(1).join(' ') || ''} className="rounded-xl border-gray-200 h-12 font-bold focus:border-sonatel-orange focus:ring-sonatel-orange/10" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Adresse Email</Label>
                    <Input id="email" defaultValue={user?.email || ''} className="rounded-xl border-gray-200 h-12 font-bold focus:border-sonatel-orange focus:ring-sonatel-orange/10" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Numéro de téléphone</Label>
                    <Input id="phone" defaultValue={user?.phone || ''} className="rounded-xl border-gray-200 h-12 font-bold focus:border-sonatel-orange focus:ring-sonatel-orange/10" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bio" className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Biographie locale / Note</Label>
                  <Input id="bio" placeholder="Responsable de la cybersécurité et de la protection physique des sites..." className="rounded-xl border-gray-200 h-12 font-bold focus:border-sonatel-orange focus:ring-sonatel-orange/10" />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* --- Utilisateurs Content --- */}
        <TabsContent value="utilisateurs" className="space-y-6">
          <Card className="bg-white border-2 border-gray-100 rounded-3xl overflow-hidden shadow-sm">
            <CardHeader className="p-8 border-b border-gray-50 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xl font-black text-gray-900 uppercase">Gestion de l'équipe</CardTitle>
                <CardDescription className="font-bold mt-1 tracking-tighterUppercase">Administrateurs et Inspecteurs de terrain</CardDescription>
              </div>
              <Button className="bg-sonatel-orange text-white font-black h-12 px-6 rounded-2xl gap-2 shadow-lg shadow-orange-500/20">
                <Plus className="w-5 h-5" /> Inviter un membre
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="text-left py-4 px-8 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Membre</th>
                      <th className="text-left py-4 px-8 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Rôle</th>
                      <th className="text-left py-4 px-8 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Statut</th>
                      <th className="text-left py-4 px-8 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Dernière Connexion</th>
                      <th className="py-4 px-8"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {isLoadingTeam ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center">
                          <Loader2 className="w-6 h-6 animate-spin mx-auto text-sonatel-orange" />
                        </td>
                      </tr>
                    ) : teamMembers.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-gray-500 font-bold">
                          Aucun membre trouvé
                        </td>
                      </tr>
                    ) : (
                      teamMembers.map((member: any) => (
                        <tr key={member.id} className="hover:bg-gray-50/50 transition-colors group">
                          <td className="py-5 px-8 flex items-center gap-3">
                            <Avatar className="w-10 h-10 shadow-sm border border-white">
                              <AvatarFallback className="bg-sonatel-light-bg text-sonatel-orange font-black text-xs uppercase">
                                {member.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2) || member.email?.[0] || 'U'}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-black text-gray-900 group-hover:text-sonatel-orange transition-colors">{member.name || member.email}</p>
                              <p className="text-[11px] font-bold text-muted-foreground">{member.email}</p>
                            </div>
                          </td>
                          <td className="py-5 px-8">
                            <Badge variant="outline" className="font-black text-[9px] uppercase tracking-wider text-gray-700 bg-white border-gray-200">
                              {member.role || 'INSPECTEUR'}
                            </Badge>
                          </td>
                          <td className="py-5 px-8">
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${member.isActive ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-gray-300'}`} />
                              <span className="text-xs font-black uppercase text-gray-700">{member.isActive ? 'Actif' : 'Inactif'}</span>
                            </div>
                          </td>
                          <td className="py-5 px-8 text-xs font-bold text-muted-foreground uppercase">
                            {member.lastConnection ? new Date(member.lastConnection).toLocaleDateString('fr-FR') : 'Jamais'}
                          </td>
                          <td className="py-5 px-8 text-right space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button className="p-2.5 rounded-xl bg-gray-50 text-gray-400 hover:text-sonatel-orange hover:bg-orange-50 transition-all shadow-sm">
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button className="p-2.5 rounded-xl bg-gray-50 text-gray-400 hover:text-destructive hover:bg-red-50 transition-all shadow-sm">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* --- Questionnaire Content --- */}
        <TabsContent value="questionnaire" className="space-y-6">
          <QuestionnaireManager />
        </TabsContent>

        {/* --- Sécurité Content --- */}
        <TabsContent value="securite" className="space-y-6">
          <Card className="bg-white border-2 border-gray-100 rounded-3xl shadow-sm">
            <CardHeader className="p-8 border-b border-gray-50">
              <CardTitle className="text-xl font-black text-gray-900 uppercase">Paramètres de compte et Sécurité</CardTitle>
              <CardDescription className="font-bold">Protégez votre compte et configurez les règles d'authentification.</CardDescription>
            </CardHeader>
            <CardContent className="p-8 space-y-8">
              <div className="space-y-6">
                <div className="flex items-center justify-between p-6 rounded-3xl bg-gray-50 border border-gray-100 group">
                  <div className="space-y-1">
                    <p className="font-black text-gray-900 uppercase text-xs tracking-wider">Authentification à deux facteurs (2FA)</p>
                    <p className="text-xs font-bold text-muted-foreground">Ajoutez une couche de sécurité supplémentaire à votre compte.</p>
                  </div>
                  <Switch className="data-[state=checked]:bg-sonatel-orange" />
                </div>

                <div className="flex items-center justify-between p-6 rounded-3xl bg-gray-50 border border-gray-100 group">
                  <div className="space-y-1">
                    <p className="font-black text-gray-900 uppercase text-xs tracking-wider">Verrouillage de session automatique</p>
                    <p className="text-xs font-bold text-muted-foreground">Déconnecte l'utilisateur après 15 minutes d'inactivité.</p>
                  </div>
                  <Switch defaultChecked className="data-[state=checked]:bg-sonatel-orange" />
                </div>
              </div>

              <div className="pt-4">
                <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-6">Changer le mot de passe</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label className="text-[9px] font-black uppercase text-muted-foreground">Mot de passe actuel</Label>
                    <Input type="password" placeholder="••••••••" className="rounded-xl border-gray-200 h-12 font-bold focus:border-sonatel-orange" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[9px] font-black uppercase text-muted-foreground">Nouveau mot de passe</Label>
                    <Input type="password" placeholder="••••••••" className="rounded-xl border-gray-200 h-12 font-bold focus:border-sonatel-orange" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[9px] font-black uppercase text-muted-foreground">Confirmer le mot de passe</Label>
                    <Input type="password" placeholder="••••••••" className="rounded-xl border-gray-200 h-12 font-bold focus:border-sonatel-orange" />
                  </div>
                </div>
              </div>

              <Separator className="my-8" />

              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Sessions actives</h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={loadSessions}
                    className="text-[10px] font-black uppercase text-sonatel-orange hover:bg-orange-50"
                  >
                    Actualiser
                  </Button>
                </div>

                <div className="space-y-4">
                  {isLoadingSessions ? (
                    <div className="flex justify-center py-8">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-sonatel-orange border-t-transparent" />
                    </div>
                  ) : activeSessions.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 italic text-sm font-bold">
                      <button onClick={loadSessions} className="underline decoration-sonatel-orange underline-offset-4">Charger les sessions</button>
                    </div>
                  ) : activeSessions.map((session) => (
                    <div key={session.id} className="flex items-center justify-between p-5 bg-white border border-gray-100 rounded-3xl shadow-sm hover:border-sonatel-orange/30 transition-all group">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-sonatel-light-bg flex items-center justify-center text-sonatel-orange">
                          {session.deviceType === 'MOBILE' ? <Smartphone className="w-6 h-6" /> : <Laptop className="w-6 h-6" />}
                        </div>
                        <div>
                          <p className="font-black text-sm text-gray-900 uppercase">
                            {session.deviceType === 'DESKTOP' ? 'Ordinateur' : session.deviceType === 'MOBILE' ? 'Mobile' : 'Appareil'}
                            {session.ipAddress && <span className="ml-2 text-[10px] font-black text-muted-foreground">• {session.ipAddress}</span>}
                          </p>
                          <p className="text-[10px] font-extrabold text-muted-foreground uppercase mt-1">
                            Connecté le {format(new Date(session.createdAt), "d MMMM yyyy 'à' HH:mm", { locale: fr })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {session.status === 'ACTIVE' && (
                          <Badge className="bg-emerald-100 text-emerald-700 border-none font-black text-[9px] uppercase">Actuelle</Badge>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRevokeSession(session.id)}
                          className="p-2 h-10 w-10 rounded-xl text-gray-400 hover:text-destructive hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* --- Système Content --- */}
        <TabsContent value="systeme" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card className="bg-white border-2 border-gray-100 rounded-3xl shadow-sm">
              <CardHeader className="p-8 border-b border-gray-50">
                <CardTitle className="text-xl font-black text-gray-900 uppercase">Notifications & Email</CardTitle>
              </CardHeader>
              <CardContent className="p-8 space-y-6">
                {[
                  { label: "Alertes Critiques", desc: "Notification immédiate lors d'un score < 40%", icon: AlertCircle },
                  { label: "Rapports Hebdomadaires", desc: "Envoi automatique d'un condensé PDF chaque lundi", icon: FileDown },
                  { label: "Nouveaux Plans d'Actions", desc: "Informer les responsables lors d'une nouvelle tâche", icon: ClipboardCheck },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-4 rounded-2xl hover:bg-gray-50 transition-colors group">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-sonatel-light-bg text-sonatel-orange flex items-center justify-center shrink-0">
                        <item.icon className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-black text-xs text-gray-900 uppercase tracking-wider">{item.label}</p>
                        <p className="text-[11px] font-bold text-muted-foreground">{item.desc}</p>
                      </div>
                    </div>
                    <Switch defaultChecked className="data-[state=checked]:bg-sonatel-orange scale-90" />
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="bg-white border-2 border-gray-100 rounded-3xl shadow-sm">
              <CardHeader className="p-8 border-b border-gray-50">
                <CardTitle className="text-xl font-black text-gray-900 uppercase">Synchronisation & Cloud</CardTitle>
              </CardHeader>
              <CardContent className="p-8 space-y-8">
                <div className="p-6 rounded-3xl bg-sonatel-light-bg border border-sonatel-orange/10 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-8 scale-150 opacity-10">
                    <Cloud className="w-16 h-16 text-sonatel-orange" />
                  </div>
                  <h4 className="text-sm font-black text-sonatel-orange uppercase tracking-[0.2em] mb-2">Statut Cloud</h4>
                  <div className="flex items-center gap-2 mb-4">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    <span className="text-xl font-black text-gray-900">Synchronisé</span>
                  </div>
                  <p className="text-xs font-bold text-gray-600 mb-6 max-w-[80%]">Votre base de données est sauvegardée sur les serveurs sécurisés Sonatel (Data Center de Thiès).</p>
                  <Button className="bg-white text-sonatel-orange border-2 border-sonatel-orange/20 font-black h-10 rounded-xl hover:bg-sonatel-orange hover:text-white transition-all">Forcer la synchronisation</Button>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center text-xs font-black uppercase text-muted-foreground tracking-widest">
                    <span>Espace stockage utilisé</span>
                    <span>1.4 GB / 10 GB</span>
                  </div>
                  <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-sonatel-orange w-[14%]" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div >
  );
}
