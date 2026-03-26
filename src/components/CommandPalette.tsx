import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
    Calculator,
    Calendar,
    CreditCard,
    Settings,
    Smile,
    User,
    Search,
    LayoutDashboard,
    ClipboardCheck,
    ListChecks,
    Archive,
    History,
    Users,
    MapPin,
    FileText,
    Shield,
    Activity
} from "lucide-react";
import {
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
    CommandShortcut,
} from "@/components/ui/command";
import { useAuth } from "@/contexts/AuthContext";
import { siteService } from "@/services/SiteService";
import { useDebounce } from "@/hooks/use-debounce";

export function CommandPalette() {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");
    const debouncedSearch = useDebounce(search, 300);
    const [sites, setSites] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const { user } = useAuth();

    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setOpen((open) => !open);
            }
        };

        document.addEventListener("keydown", down);
        return () => document.removeEventListener("keydown", down);
    }, []);

    useEffect(() => {
        if (debouncedSearch.length >= 2) {
            const fetchSites = async () => {
                setLoading(true);
                try {
                    const res = await siteService.quickSearch(debouncedSearch, 5);
                    if (res.data) setSites(res.data as any);
                } catch (error) {
                    console.error(error);
                } finally {
                    setLoading(false);
                }
            };
            fetchSites();
        } else {
            setSites([]);
        }
    }, [debouncedSearch]);

    const runCommand = (command: () => void) => {
        setOpen(false);
        command();
    };

    const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';

    return (
        <>
            <button
                onClick={() => setOpen(true)}
                className="flex items-center gap-2 px-4 h-11 bg-gray-50 border border-gray-200 rounded-2xl hover:bg-gray-100 transition-all text-gray-400 group"
            >
                <Search className="w-4 h-4 group-hover:text-sonatel-orange transition-colors" />
                <span className="text-sm font-bold mr-8">Recherche intelligente...</span>
                <kbd className="hidden md:inline-flex h-5 select-none items-center gap-1 rounded border bg-white px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                    <span className="text-xs">⌘</span><span>K</span>
                </kbd>
            </button>

            <CommandDialog open={open} onOpenChange={setOpen}>
                <CommandInput
                    placeholder="Tapez une commande ou recherchez..."
                    value={search}
                    onValueChange={setSearch}
                />
                <CommandList className="max-h-[70vh]">
                    <CommandEmpty>Aucun résultat trouvé.</CommandEmpty>

                    <CommandGroup heading="Navigation Rapide">
                        <CommandItem onSelect={() => runCommand(() => navigate("/dashboard"))}>
                            <LayoutDashboard className="mr-2 h-4 w-4 text-sonatel-orange" />
                            <span>Tableau de bord</span>
                        </CommandItem>
                        <CommandItem onSelect={() => runCommand(() => navigate("/inspection"))}>
                            <ClipboardCheck className="mr-2 h-4 w-4 text-sonatel-orange" />
                            <span>Nouvelle Inspection</span>
                        </CommandItem>
                        <CommandItem onSelect={() => runCommand(() => navigate("/actions"))}>
                            <ListChecks className="mr-2 h-4 w-4 text-sonatel-orange" />
                            <span>Plans d'Actions</span>
                        </CommandItem>
                        <CommandItem onSelect={() => runCommand(() => navigate("/planning"))}>
                            <Calendar className="mr-2 h-4 w-4 text-sonatel-orange" />
                            <span>Planning</span>
                        </CommandItem>
                        <CommandItem onSelect={() => runCommand(() => navigate("/historique"))}>
                            <Archive className="mr-2 h-4 w-4 text-sonatel-orange" />
                            <span>Historique</span>
                        </CommandItem>
                    </CommandGroup>

                    {isAdmin && (
                        <CommandGroup heading="Administration">
                            <CommandItem onSelect={() => runCommand(() => navigate("/users"))}>
                                <Users className="mr-2 h-4 w-4 text-sonatel-orange" />
                                <span>Gestion Utilisateurs</span>
                            </CommandItem>
                            <CommandItem onSelect={() => runCommand(() => navigate("/logs"))}>
                                <History className="mr-2 h-4 w-4 text-sonatel-orange" />
                                <span>Journal Logs</span>
                            </CommandItem>
                        </CommandGroup>
                    )}

                    {sites.length > 0 && (
                        <CommandGroup heading="Sites Sonatel">
                            {sites.map((site) => (
                                <CommandItem
                                    key={site.id}
                                    onSelect={() => runCommand(() => navigate(`/inspection?siteId=${site.id}&siteName=${encodeURIComponent(site.nom)}`))}
                                >
                                    <MapPin className="mr-2 h-4 w-4 text-sonatel-orange" />
                                    <div className="flex flex-col">
                                        <span className="font-black text-xs">{site.nom}</span>
                                        <span className="text-[10px] text-muted-foreground uppercase"><span>{site.zone}</span> • <span>{site.code}</span></span>
                                    </div>
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    )}

                    <CommandSeparator />

                    <CommandGroup heading="Paramètres">
                        <CommandItem onSelect={() => runCommand(() => navigate("/parametres"))}>
                            <User className="mr-2 h-4 w-4" />
                            <span>Mon Profil</span>
                            <CommandShortcut>⌘P</CommandShortcut>
                        </CommandItem>
                        <CommandItem onSelect={() => runCommand(() => navigate("/parametres"))}>
                            <Shield className="mr-2 h-4 w-4" />
                            <span>Sécurité & Accès</span>
                        </CommandItem>
                        <CommandItem onSelect={() => runCommand(() => { /* toggle theme if implemented */ })}>
                            <Settings className="mr-2 h-4 w-4" />
                            <span>Réglages de l'interface</span>
                        </CommandItem>
                    </CommandGroup>
                </CommandList>
            </CommandDialog>
        </>
    );
}
