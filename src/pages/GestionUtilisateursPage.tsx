import React, { useState, useEffect } from "react";
import {
    Users,
    UserPlus,
    Mail,
    Shield,
    CheckCircle2,
    XCircle,
    MoreVertical,
    Search,
    Filter,
    RefreshCcw,
    ShieldAlert,
    ShieldCheck,
    Zap,
    Send,
    Bell,
    CheckCircle,
    Info,
    AlertTriangle,
    Megaphone
} from "lucide-react";
import { adminService } from "@/services/AdminService";
import { authService, User } from "@/services/AuthService";
import { notificationService, NotificationType } from "@/services/NotificationService";
import { toast } from "sonner";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

export default function GestionUtilisateursPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [roleFilter, setRoleFilter] = useState("ALL");

    // Create Modal State
    const [isInviteOpen, setIsInviteOpen] = useState(false);
    const [newEmail, setNewEmail] = useState("");
    const [newName, setNewName] = useState("");
    const [newRole, setNewRole] = useState("INSPECTEUR");
    const [newEntite, setNewEntite] = useState("SEC");
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Message Modal State
    const [isMessageOpen, setIsMessageOpen] = useState(false);
    const [messageData, setMessageData] = useState({
        userId: "",
        userName: "",
        title: "",
        message: "",
        type: "INFO" as NotificationType,
        isBroadcast: false
    });

    const fetchUsers = async () => {
        setIsLoading(true);
        try {
            const res = await adminService.getUsers({
                search: searchTerm,
                role: roleFilter === "ALL" ? undefined : roleFilter
            });
            if (res.data) {
                setUsers(res.data);
            }
        } catch (error) {
            toast.error("Erreur lors du chargement des utilisateurs");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, [roleFilter]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        fetchUsers();
    };

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const res = await authService.invite(newEmail, newName, newRole, newEntite);
            if (res.error) {
                toast.error(res.error);
            } else {
                toast.success(`Invitation envoyée à ${newEmail}`);
                setIsInviteOpen(false);
                setNewEmail("");
                setNewName("");
                setNewEntite("SEC");
                fetchUsers(); // Refresh list
            }
        } catch (error: any) {
            toast.error(error.message || "Erreur lors de l'envoi de l'invitation");
        } finally {
            setIsSubmitting(false);
        }
    };

    const toggleUserStatus = async (userId: string, currentStatus: boolean) => {
        try {
            const res = await adminService.updateUserStatus(userId, !currentStatus);

            if (res.data) {
                toast.success(`Statut de l'utilisateur mis à jour`);
                fetchUsers();
            } else {
                toast.error(res.error || "Erreur de mise à jour");
            }
        } catch (error) {
            toast.error("Erreur lors de la modification du statut");
        }
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            if (messageData.isBroadcast) {
                await notificationService.broadcastAdminNotification({
                    title: messageData.title,
                    message: messageData.message,
                    type: messageData.type
                });
                toast.success("Message de diffusion envoyé à tous les utilisateurs");
            } else {
                await notificationService.sendAdminNotification({
                    userId: messageData.userId,
                    title: messageData.title,
                    message: messageData.message,
                    type: messageData.type
                });
                toast.success(`Message envoyé à ${messageData.userName}`);
            }
            setIsMessageOpen(false);
            setMessageData({ userId: "", userName: "", title: "", message: "", type: "INFO", isBroadcast: false });
        } catch (error: any) {
            toast.error(error.message || "Erreur lors de l'envoi du message");
        } finally {
            setIsSubmitting(false);
        }
    };

    const openTargetedMessage = (user: User) => {
        setMessageData({
            userId: user.id,
            userName: user.name,
            title: "",
            message: "",
            type: "INFO",
            isBroadcast: false
        });
        setIsMessageOpen(true);
    };

    const openBroadcastMessage = () => {
        setMessageData({
            userId: "",
            userName: "Tous les utilisateurs",
            title: "",
            message: "",
            type: "INFO",
            isBroadcast: true
        });
        setIsMessageOpen(true);
    };

    const getRoleBadge = (role: string) => {
        switch (role) {
            case "ADMIN":
                return <Badge className="bg-destructive/10 text-destructive border-destructive/20 font-black px-3 py-1 rounded-lg flex items-center gap-1.5"><ShieldAlert className="w-3.5 h-3.5" /> ADMIN</Badge>;
            case "INSPECTEUR":
                return <Badge className="bg-sonatel-orange/10 text-sonatel-orange border-sonatel-orange/20 font-black px-3 py-1 rounded-lg flex items-center gap-1.5"><Zap className="w-3.5 h-3.5" /> INSPECTEUR</Badge>;
            case "DIRIGEANT":
                return <Badge className="bg-orange-50 text-orange-600 border-orange-100 font-black px-3 py-1 rounded-lg flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5" /> DIRECTION</Badge>;
            default:
                return <Badge variant="outline">{role}</Badge>;
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-700 pb-20">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-2">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-sonatel-orange rounded-2xl shadow-lg shadow-orange-500/20 text-white">
                            <Users className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black text-gray-900 tracking-tight">Utilisateurs</h1>
                            <p className="text-xs font-black text-sonatel-orange uppercase tracking-[0.2em] opacity-80">
                                Gestion des accès & invitations DG/SECU
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <Button
                        onClick={openBroadcastMessage}
                        variant="outline"
                        className="h-14 px-8 rounded-2xl border-2 border-gray-100 font-black text-sm tracking-widest flex items-center gap-3 transition-all hover:bg-sonatel-orange/5 hover:border-sonatel-orange/20 text-gray-600"
                    >
                        <Megaphone className="w-5 h-5 text-sonatel-orange" /> DIFFUSION
                    </Button>

                    <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
                        <DialogTrigger asChild>
                            <Button className="bg-sonatel-orange hover:bg-sonatel-orange/90 text-white h-14 px-8 rounded-2xl font-black text-sm tracking-widest shadow-xl shadow-orange-500/20 flex items-center gap-3 transition-all hover:scale-[1.02] active:scale-[0.98]">
                                <UserPlus className="w-5 h-5" /> INVITER UN UTILISATEUR
                            </Button>
                        </DialogTrigger>
                        {/* Invitation Dialog Content ... */}
                        <DialogContent className="sm:max-w-[480px] rounded-[2rem] border-2">
                            <form onSubmit={handleInvite}>
                                <DialogHeader>
                                    <DialogTitle className="text-2xl font-black flex items-center gap-3">
                                        <div className="p-2 bg-sonatel-orange/10 rounded-xl text-sonatel-orange">
                                            <Mail className="w-5 h-5" />
                                        </div>
                                        Nouvelle Invitation
                                    </DialogTitle>
                                    <DialogDescription className="text-gray-500 font-medium">
                                        Envoyez une invitation par email pour rejoindre la plateforme d'audit.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="grid gap-6 py-8">
                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Nom complet</label>
                                        <Input
                                            placeholder="Prénom Nom"
                                            value={newName}
                                            onChange={(e) => setNewName(e.target.value)}
                                            className="h-12 rounded-xl border-gray-200 focus:ring-sonatel-orange"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Adresse Email Professionnelle</label>
                                        <Input
                                            type="email"
                                            placeholder="nom.prenom@sonatel.sn"
                                            value={newEmail}
                                            onChange={(e) => setNewEmail(e.target.value)}
                                            className="h-12 rounded-xl border-gray-200 focus:ring-sonatel-orange"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Rôle Système</label>
                                        <Select value={newRole} onValueChange={setNewRole}>
                                            <SelectTrigger className="h-12 rounded-xl border-gray-200">
                                                <SelectValue placeholder="Sélectionner un rôle" />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-xl border-2">
                                                <SelectItem value="INSPECTEUR">Inspecteur (Audit terrain)</SelectItem>
                                                <SelectItem value="ADMIN">Administrateur (Gestion complète)</SelectItem>
                                                <SelectItem value="DIRIGEANT">Direction (Consultation uniquement)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Entité</label>
                                        <Select value={newEntite} onValueChange={setNewEntite}>
                                            <SelectTrigger className="h-12 rounded-xl border-gray-200">
                                                <SelectValue placeholder="Sélectionner une entité" />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-xl border-2">
                                                <SelectItem value="SEC">SEC (Sécurité)</SelectItem>
                                                <SelectItem value="CPS">CPS (Management)</SelectItem>
                                                <SelectItem value="SUR">SUR (Sûreté)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        onClick={() => setIsInviteOpen(false)}
                                        className="rounded-xl font-bold"
                                    >
                                        Annuler
                                    </Button>
                                    <Button
                                        type="submit"
                                        className="bg-sonatel-orange hover:bg-sonatel-orange/90 text-white rounded-xl font-black px-8 h-12"
                                        disabled={isSubmitting}
                                    >
                                        {isSubmitting ? "ENVOI..." : "ENVOYER L'INVITATION"}
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>

                    {/* Message Dialog */}
                    <Dialog open={isMessageOpen} onOpenChange={setIsMessageOpen}>
                        <DialogContent className="sm:max-w-[550px] rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden">
                            <form onSubmit={handleSendMessage}>
                                <div className="p-8 space-y-6">
                                    <DialogHeader>
                                        <DialogTitle className="text-2xl font-black flex items-center gap-4">
                                            <div className="p-3 bg-orange-50 rounded-2xl text-sonatel-orange">
                                                {messageData.isBroadcast ? <Megaphone className="w-6 h-6" /> : <Send className="w-6 h-6" />}
                                            </div>
                                            <div>
                                                <p className="text-sm font-black text-sonatel-orange uppercase tracking-widest leading-none mb-1">
                                                    {messageData.isBroadcast ? "Diffusion Globale" : "Message Ciblé"}
                                                </p>
                                                {messageData.isBroadcast ? "Informer tout le réseau" : `Informer ${messageData.userName}`}
                                            </div>
                                        </DialogTitle>
                                    </DialogHeader>

                                    <div className="space-y-6 py-2">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Objet de la notification</label>
                                            <Input
                                                placeholder="Ex: Maintenance du système, Nouveau protocole..."
                                                value={messageData.title}
                                                onChange={(e) => setMessageData({ ...messageData, title: e.target.value })}
                                                className="h-14 rounded-2xl border-gray-100 bg-gray-50 focus:bg-white font-bold"
                                                required
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Type de Message</label>
                                                <Select
                                                    value={messageData.type}
                                                    onValueChange={(val: NotificationType) => setMessageData({ ...messageData, type: val })}
                                                >
                                                    <SelectTrigger className="h-14 rounded-2xl border-gray-100 bg-gray-50 font-bold">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent className="rounded-2xl border-2">
                                                        <SelectItem value="INFO" className="font-bold py-3"><div className="flex items-center gap-2"><Info className="w-4 h-4 text-sonatel-orange" /> Information</div></SelectItem>
                                                        <SelectItem value="SUCCESS" className="font-bold py-3"><div className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-emerald-500" /> Succès</div></SelectItem>
                                                        <SelectItem value="WARNING" className="font-bold py-3"><div className="flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-amber-500" /> Alerte</div></SelectItem>
                                                        <SelectItem value="ERROR" className="font-bold py-3"><div className="flex items-center gap-2"><XCircle className="w-4 h-4 text-red-500" /> Important / Erreur</div></SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="flex items-center justify-center bg-gray-50 rounded-2xl border border-gray-100 p-4">
                                                <div className="text-center">
                                                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-tighter leading-none mb-1">Impact</p>
                                                    <p className="text-[11px] font-black text-gray-900 uppercase">
                                                        {messageData.isBroadcast ? "Tout le personnel" : "Individuel"}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Message (Brève description)</label>
                                            <textarea
                                                placeholder="Contenu du message..."
                                                value={messageData.message}
                                                onChange={(e) => setMessageData({ ...messageData, message: e.target.value })}
                                                className="w-full min-h-[120px] p-4 rounded-2xl border-gray-100 bg-gray-50 focus:bg-white font-medium text-sm outline-none focus:ring-2 ring-sonatel-orange/5 transition-all"
                                                required
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-gray-50/80 p-6 flex justify-end gap-3 border-t border-gray-100">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        onClick={() => setIsMessageOpen(false)}
                                        className="rounded-xl font-bold h-12"
                                    >
                                        Annuler
                                    </Button>
                                    <Button
                                        type="submit"
                                        className="bg-sonatel-orange hover:bg-orange-600 text-white rounded-xl font-black px-8 h-12 shadow-lg shadow-orange-500/20 flex items-center gap-2"
                                        disabled={isSubmitting}
                                    >
                                        <Send className="w-4 h-4" /> {isSubmitting ? "ENVOI..." : "ENVOYER LE MESSAGE"}
                                    </Button>
                                </div>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>

            </div>

            {/* Filters Section */}
            <Card className="border-2 border-gray-100 rounded-[2rem] shadow-sm overflow-hidden">
                <CardContent className="p-6">
                    <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4">
                        <div className="relative flex-1 group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-sonatel-orange transition-colors" />
                            <Input
                                placeholder="Rechercher par nom ou email..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-12 h-14 rounded-2xl border-gray-100 bg-gray-50/50 focus:bg-white focus:ring-sonatel-orange/10 transition-all font-medium"
                            />
                        </div>
                        <div className="flex gap-4">
                            <Select value={roleFilter} onValueChange={setRoleFilter}>
                                <SelectTrigger className="w-[180px] h-14 rounded-2xl border-gray-100 bg-gray-50/50 font-bold">
                                    <div className="flex items-center gap-2">
                                        <Filter className="w-4 h-4 text-gray-400" />
                                        <SelectValue placeholder="Rôle" />
                                    </div>
                                </SelectTrigger>
                                <SelectContent className="rounded-xl border-2">
                                    <SelectItem value="ALL">Tous les rôles</SelectItem>
                                    <SelectItem value="ADMIN">Administrateurs</SelectItem>
                                    <SelectItem value="INSPECTEUR">Inspecteurs</SelectItem>
                                    <SelectItem value="DIRIGEANT">Direction</SelectItem>
                                </SelectContent>
                            </Select>
                            <Button
                                onClick={fetchUsers}
                                variant="outline"
                                className="h-14 w-14 rounded-2xl border-gray-100 bg-gray-50/50 hover:bg-white hover:text-sonatel-orange"
                            >
                                <RefreshCcw className={`w-5 h-5 ${isLoading ? "animate-spin" : ""}`} />
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>

            {/* Users Table */}
            <Card className="border-2 border-gray-100 rounded-[2.5rem] shadow-sm overflow-hidden bg-white">
                <Table>
                    <TableHeader className="bg-gray-50/50 h-16">
                        <TableRow className="hover:bg-transparent border-gray-100">
                            <TableHead className="w-[300px] pl-8 text-[11px] font-black uppercase tracking-widest text-gray-400">Collaborateur</TableHead>
                            <TableHead className="text-[11px] font-black uppercase tracking-widest text-gray-400">Email</TableHead>
                            <TableHead className="text-[11px] font-black uppercase tracking-widest text-gray-400">Rôle</TableHead>
                            <TableHead className="text-[11px] font-black uppercase tracking-widest text-gray-400 text-center">Statut Compte</TableHead>
                            <TableHead className="text-[11px] font-black uppercase tracking-widest text-gray-400 text-right pr-8">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <TableRow key={i} className="animate-pulse border-gray-50">
                                    <TableCell className="pl-8 py-6"><div className="h-4 bg-gray-100 rounded-full w-32" /></TableCell>
                                    <TableCell><div className="h-4 bg-gray-100 rounded-full w-48" /></TableCell>
                                    <TableCell><div className="h-6 bg-gray-100 rounded-lg w-24" /></TableCell>
                                    <TableCell className="flex justify-center"><div className="h-4 bg-gray-100 rounded-full w-20" /></TableCell>
                                    <TableCell className="text-right pr-8"><div className="h-8 bg-gray-100 rounded-lg w-8 ml-auto" /></TableCell>
                                </TableRow>
                            ))
                        ) : users.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-64 text-center">
                                    <div className="flex flex-col items-center justify-center space-y-3 grayscale opacity-40">
                                        <Users className="w-12 h-12" />
                                        <p className="font-black text-gray-500 uppercase tracking-widest text-xs">Aucun utilisateur trouvé</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            users.map((user) => (
                                <TableRow key={user.id} className="group hover:bg-orange-50/30 border-gray-100 transition-colors">
                                    <TableCell className="pl-8 py-6">
                                        <div className="flex items-center gap-4 text-left">
                                            <div className="w-10 h-10 rounded-xl bg-orange-100 text-sonatel-orange flex items-center justify-center font-black text-xs border-2 border-white shadow-sm">
                                                {user.name?.split(" ").map(n => n[0]).join("").toUpperCase().substring(0, 2)}
                                            </div>
                                            <div className="flex flex-col text-left">
                                                <span className="font-black text-gray-900 text-sm">{user.name}</span>
                                                {(user as any).invitationStatus === 'PENDING' && (
                                                    <span className="text-[9px] font-black text-sonatel-orange uppercase tracking-wider mt-0.5">Invitation en attente</span>
                                                )}
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="font-bold text-gray-500 text-sm text-left">{user.email}</TableCell>
                                    <TableCell className="text-left">{getRoleBadge(user.role)}</TableCell>
                                    <TableCell className="text-center">
                                        {(user as any).isActive ? (
                                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 text-[10px] font-black uppercase tracking-wider">
                                                <CheckCircle2 className="w-3.5 h-3.5" /> Actif
                                            </div>
                                        ) : (
                                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 text-red-600 border border-red-100 text-[10px] font-black uppercase tracking-wider">
                                                <XCircle className="w-3.5 h-3.5" /> Suspendu
                                            </div>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right pr-8">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" className="h-10 w-10 p-0 rounded-xl hover:bg-orange-100 hover:text-sonatel-orange">
                                                    <MoreVertical className="h-5 w-5" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="rounded-2xl w-56 p-2 border-2 shadow-xl">
                                                <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest text-sonatel-orange p-3">Options Administration</DropdownMenuLabel>
                                                <DropdownMenuItem
                                                    className="rounded-xl font-bold py-3 cursor-pointer"
                                                    onClick={() => openTargetedMessage(user)}
                                                >
                                                    <Send className="w-4 h-4 mr-2 text-sonatel-orange" /> Envoyer un message
                                                </DropdownMenuItem>
                                                <DropdownMenuItem className="rounded-xl font-bold py-3 cursor-pointer">
                                                    <Shield className="w-4 h-4 mr-2" /> Modifier les permissions
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    className="rounded-xl font-bold py-3 cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10"
                                                    onClick={() => toggleUserStatus(user.id, (user as any).isActive)}
                                                >
                                                    {(user as any).isActive ? (
                                                        <><XCircle className="w-4 h-4 mr-2" /> Suspendre le compte</>
                                                    ) : (
                                                        <><CheckCircle2 className="w-4 h-4 mr-2" /> Réactiver le compte</>
                                                    )}
                                                </DropdownMenuItem>
                                                {(user as any).invitationStatus === 'PENDING' && (
                                                    <>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem
                                                            className="rounded-xl font-bold py-3 cursor-pointer text-sonatel-orange"
                                                            onClick={async () => {
                                                                try {
                                                                    await adminService.resendInvitation(user.id);
                                                                    toast.success("Invitation renvoyée avec succès");
                                                                } catch (e) {
                                                                    toast.error("Échec du renvoi de l'invitation");
                                                                }
                                                            }}
                                                        >
                                                            <RefreshCcw className="w-4 h-4 mr-2" /> Renvoyer l'email
                                                        </DropdownMenuItem>
                                                    </>
                                                )}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </Card>
        </div>
    );
}
