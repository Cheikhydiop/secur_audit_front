import React, { useState, useEffect, useRef } from "react";
import { NavLink, useLocation, Link, Outlet } from "react-router-dom";
import ErrorBoundary from "./ErrorBoundary";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { OfflineSyncService } from "@/services/OfflineSyncService";
import { OfflineQueueService } from "@/services/OfflineQueueService";
import {
  LayoutDashboard,
  ClipboardCheck,
  ListChecks,
  Archive,
  Settings,
  LogOut,
  ChevronLeft,
  Menu,
  Bell,
  User,
  ChevronDown,
  Calendar,
  History,
  Users,
  Building,
  RefreshCw,
  X,
  AlertCircle,
  AlertTriangle,
  Star,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { dashboardService, DashboardKpis } from "@/services/DashboardService";
import { CommandPalette } from "./CommandPalette";
import { Breadcrumbs } from "./Breadcrumbs";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { useSocket } from "@/contexts/SocketContext";
import { NotificationDropdown } from "./NotificationDropdown";

// Items visibles dans la bottom nav mobile (max 5 pour confort)
const mobileBottomItems = [
  { to: "/dashboard", label: "Accueil", icon: LayoutDashboard },
  { to: "/sites", label: "Sites", icon: Building },
  { to: "/inspection", label: "Inspecter", icon: ClipboardCheck },
  { to: "/actions", label: "Actions", icon: ListChecks },
  { to: "/planning", label: "Planning", icon: Calendar },
];

export default function AppLayout({ children }: { children?: React.ReactNode }) {
  const { user, logout } = useAuth();
  const { unreadCount } = useSocket();
  const [collapsed, setCollapsed] = useState(() => {
    const saved = localStorage.getItem("sidebar-collapsed");
    // Par défaut réduit si l'écran est petit (inférieur à 1280px)
    if (saved === null) return window.innerWidth < 1280;
    return JSON.parse(saved);
  });

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [kpis, setKpis] = useState<DashboardKpis | null>(null);
  const location = useLocation();
  const scrollRef = useRef<HTMLElement>(null);
  const { isOnline, isReachable } = useOnlineStatus();

  // Sauvegarder l'état dans le localStorage
  useEffect(() => {
    localStorage.setItem("sidebar-collapsed", JSON.stringify(collapsed));
  }, [collapsed]);

  // Gestion intelligente de la taille au redimensionnement
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setCollapsed(false); // Mode mobile : on remet à false pour que le drawer soit plein
      } else if (window.innerWidth < 1280) {
        setCollapsed(true); // Auto-réduction sur tablettes/petits laptops
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleLogout = async () => {
    await logout();
  };

  const getInitials = (name: string) => {
    return name?.split(" ").map(n => n[0]).join("").toUpperCase().substring(0, 2) || "??";
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo(0, 0);
    }
    // Ferme le menu mobile lors de la navigation
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Sync automatique au retour en ligne
  useEffect(() => {
    const checkAndSync = async () => {
      if (isReachable) {
        try {
          const queueCount = await OfflineQueueService.getQueueCount();
          if (queueCount > 0) {
            toast.info(`Connexion rétablie : Synchronisation de ${queueCount} audits en attente...`, {
              icon: <RefreshCw className="w-4 h-4 animate-spin" />,
              duration: 5000
            });
            await OfflineSyncService.syncAll();
          }
        } catch (err) {
          console.warn("[AppLayout] Sync check failed:", err);
        }
      }
    };
    checkAndSync();
  }, [isReachable]);

  useEffect(() => {
    const fetchKpis = async () => {
      try {
        const response = await dashboardService.getEnhancedKpis();
        if (response.data && !response.error) {
          setKpis(response.data);
        }
      } catch (error) {
        console.error("Failed to fetch sidebar KPIs", error);
      }
    };
    fetchKpis();
  }, []);

  interface NavItem {
    to: string;
    label: string;
    icon: any;
    role?: string;
    badge?: "dot" | "count";
    value?: number;
  }

  const navSections: { title: string; items: NavItem[] }[] = [
    {
      title: "PRINCIPAL",
      items: [
        { to: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
        { to: "/sites", label: "Sites", icon: Building },
        { to: "/non-conformites-critiques", label: "NC Critiques", icon: AlertCircle, badge: "dot", value: kpis?.nbNonConformitesCritiques || 0 },
      ]
    },
    {
      title: "ACTIVITÉ",
      items: [
        { to: "/inspection", label: "Nouvelle inspection", icon: ClipboardCheck },
        { to: "/actions", label: "Plans d'actions", icon: ListChecks, badge: "count", value: kpis?.nbPlanActionsTotal || 0 },
        { to: "/planning", label: "Planning", icon: Calendar },
        { to: "/historique", label: "Historique", icon: History },
      ]
    },
    {
      title: "SYSTÈME",
      items: [
        { to: "/parametres", label: "Paramètres", icon: Settings },
        { to: "/users", label: "Utilisateurs", icon: Users, role: "ADMIN" },
        { to: "/logs", label: "Journal Logs", icon: History, role: "ADMIN" },
      ]
    }
  ];

  const filteredNavSections = navSections.map(section => ({
    ...section,
    items: section.items.filter(
      item => !item.role || (user && (item.role === user.role || (item.role === "ADMIN" && user.role === "SUPER_ADMIN")))
    )
  })).filter(section => section.items.length > 0);

  return (
    <div className="flex h-screen overflow-hidden bg-sonatel-light-bg/30">
      {/* ♿ Skip navigation link for keyboard users */}
      <a href="#main-content" className="skip-link">
        Aller au contenu principal
      </a>

      {/* ─── Sidebar Desktop ─── */}
      <aside
        aria-label="Navigation principale"
        className={`${collapsed ? "w-20" : "w-64"
          } hidden md:flex flex-col bg-white border-r border-gray-200 transition-all duration-300 z-30 shadow-sm relative`}
      >
        {/* Floating Toggle Button (Smarter & More Accessible) */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-20 z-50 w-6 h-6 bg-white border border-gray-200 rounded-full flex items-center justify-center shadow-md hover:border-sonatel-orange hover:text-sonatel-orange transition-all cursor-pointer group hover:scale-110 active:scale-95"
          aria-label={collapsed ? "Développer le menu" : "Réduire le menu"}
        >
          <ChevronLeft className={`w-3.5 h-3.5 transition-transform duration-300 ${collapsed ? "rotate-180" : ""}`} />
        </button>

        {/* Official Logo Section */}
        <div className="py-8 px-6 border-b border-gray-50 flex items-center justify-center bg-white">
          <Link to="/dashboard" className="flex items-center justify-center w-full" aria-label="Accueil - SmartAudit">
            <img
              src="/logo-sonatel.png"
              alt="Sonatel Logo"
              className={collapsed ? "h-10 w-auto" : "h-16 w-auto object-contain transition-transform hover:scale-105"}
            />
          </Link>
        </div>

        {!collapsed && (
          <div className="px-4 pt-6">
            <div className="px-5 py-3.5 bg-gradient-to-r from-orange-50/50 to-white border border-sonatel-orange/10 rounded-2xl text-[14px] font-black text-sonatel-orange flex items-center justify-between group cursor-pointer hover:border-sonatel-orange/30 transition-all shadow-sm">
              <span className="truncate">SmartAudit DG-SECU/Sonatel</span>
              <ChevronDown className="w-4 h-4 text-sonatel-orange" aria-hidden="true" />
            </div>
          </div>
        )}

        <nav className="flex-1 px-3 py-4 space-y-2 overflow-y-auto scrollbar-hide" aria-label="Menu de navigation">
          {filteredNavSections.map((section) => (
            <div key={section.title}>
              {!collapsed && (
                <div className="sidebar-section-title">
                  {section.title}
                </div>
              )}
              <div className="space-y-1 mt-1">
                {section.items.map((item) => {
                  const isActive = location.pathname.startsWith(item.to);
                  const content = (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      aria-current={isActive ? "page" : undefined}
                      className={`sonatel-menu-item rounded-xl transition-all group ${isActive ? "active" : ""}`}
                    >
                      <item.icon className={`h-5 w-5 shrink-0 transition-colors ${isActive ? "text-sonatel-orange" : "group-hover:text-sonatel-orange"} ${collapsed ? "mx-auto" : "mr-4"}`} aria-hidden="true" />
                      {!collapsed && (
                        <>
                          <span className={isActive ? "text-sonatel-orange" : ""}>{item.label}</span>
                          {item.badge === "dot" && item.value > 0 && <div className="sidebar-badge-dot" />}
                          {item.badge === "count" && item.value > 0 && (
                            <div className="sidebar-badge-count">
                              {item.value}
                            </div>
                          )}
                        </>
                      )}
                      {collapsed && item.badge === "dot" && item.value > 0 && (
                        <div className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
                      )}
                    </NavLink>
                  );

                  if (collapsed) {
                    return (
                      <Tooltip key={item.to} delayDuration={0}>
                        <TooltipTrigger asChild>
                          <div className="relative">{content}</div>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="bg-sonatel-orange text-white border-none font-bold shadow-lg">
                          <p>{item.label}</p>
                        </TooltipContent>
                      </Tooltip>
                    );
                  }

                  return content;
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Sidebar Footer - Profile Section Updated for Light Theme */}
        <div className="mt-auto border-t border-gray-100 bg-gray-50/50">
          <div className={`p-4 flex items-center ${collapsed ? 'justify-center' : 'justify-between'} group`}>
            {collapsed ? (
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <div className="w-10 h-10 rounded-xl bg-sonatel-orange flex-shrink-0 flex items-center justify-center text-white font-black text-sm shadow-md cursor-pointer">
                    {getInitials(user?.name || "??")}
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right" className="bg-gray-900 text-white border-none font-bold">
                  <div className="flex flex-col">
                    <span>{user?.name}</span>
                    <span className="text-[10px] text-sonatel-orange uppercase">{user?.role}</span>
                  </div>
                </TooltipContent>
              </Tooltip>
            ) : (
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="w-10 h-10 rounded-xl bg-sonatel-orange flex-shrink-0 flex items-center justify-center text-white font-black text-sm shadow-md shadow-orange-500/10">
                  {getInitials(user?.name || "??")}
                </div>
                <div className="flex flex-col overflow-hidden text-left">
                  <span className="text-gray-900 font-bold text-sm truncate">{user?.name}</span>
                  <span className="text-sonatel-orange text-[10px] font-bold uppercase tracking-wider">{user?.role}</span>
                </div>
              </div>
            )}

            {!collapsed && (
              <button
                onClick={handleLogout}
                className="p-2 rounded-lg hover:bg-red-50 text-red-500 transition-colors"
                title="Déconnexion"
              >
                <LogOut className="h-5 w-5" />
              </button>
            )}
          </div>

        </div>
      </aside>

      {/* ─── Main Content Area ─── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">

        {/* Header / Topbar */}
        <header
          className="sticky top-0 z-20 h-14 md:h-20 bg-white border-b border-gray-200 flex items-center justify-between px-3 md:px-6 transition-all duration-300 shadow-sm"
          role="banner"
        >
          {/* Mobile: Hamburger (pour le drawer étendu) */}
          <button
            className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Ouvrir le menu de navigation"
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-drawer"
          >
            <Menu className="w-6 h-6 text-gray-600" aria-hidden="true" />
          </button>

          {/* Search Bar - Desktop Only */}
          <div className="hidden md:flex flex-1 max-w-md ml-4">
            <CommandPalette />
          </div>

          {/* Logo centré mobile */}
          <div className="flex-1 md:hidden flex justify-center">
            <img src="/logo-sonatel.png" alt="Logo Sonatel" className="h-8 w-auto" />
          </div>

          {/* Profil + Notifications */}
          <div className="flex items-center gap-1 md:gap-4">
            <NotificationDropdown />

            <div className="h-6 w-[1px] bg-gray-200 mx-1 md:mx-2" aria-hidden="true" />

            <div
              className="flex items-center gap-2 md:gap-4 pl-2 md:pl-4 cursor-pointer hover:opacity-80 transition-opacity"
              aria-label={`Profil de ${user?.name} — ${user?.role}`}
              role="button"
              tabIndex={0}
            >
              <div className="text-right hidden sm:block">
                <div className="text-sm md:text-[18px] font-black text-gray-900 leading-none" aria-label={`Nom : ${user?.name?.split(" ")[0]}`}>
                  {user?.name?.split(" ")[0]}
                </div>
                <div className="text-[10px] md:text-[12px] font-bold text-sonatel-orange uppercase tracking-widest mt-0.5 opacity-90 leading-none">
                  {user?.role?.substring(0, 10)}
                </div>
              </div>
              <div
                className="w-9 h-9 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-sonatel-orange shadow-lg shadow-orange-500/20 flex items-center justify-center text-white font-black text-sm md:text-lg border-2 border-white"
                aria-hidden="true"
              >
                {getInitials(user?.name || "??")}
              </div>
            </div>
          </div>
        </header>

        {/* Bandeau hors-ligne */}
        {!isReachable && (
          <div
            role="alert"
            aria-live="assertive"
            className="bg-red-600 text-white text-center text-[10px] md:text-xs font-bold py-1.5 px-4 z-50 flex items-center justify-center gap-2 animate-pulse"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-white inline-block" aria-hidden="true" />
            <span>Serveur injoignable — mode hors ligne actif</span>
          </div>
        )}

        {/* ─── Page Content ─── */}
        <main
          id="main-content"
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-3 md:p-8 bg-gray-50/50 scrollbar-stable main-content-mobile"
          tabIndex={-1}
        >
          <ErrorBoundary resetKey={location.pathname}>
            <div className="mb-4">
              <Breadcrumbs />
            </div>
            {children || <Outlet />}
          </ErrorBoundary>
        </main>
      </div>

      {/* ─── Mobile Sidebar Drawer (navigation complète) ─── */}
      <div
        id="mobile-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Menu de navigation"
        className={`fixed inset-0 z-50 md:hidden transition-opacity duration-300 ${mobileMenuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />

        {/* Drawer */}
        <aside
          className={`absolute left-0 top-0 bottom-0 w-[280px] bg-white shadow-2xl transition-transform duration-300 ease-out flex flex-col ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full"}`}
        >
          <div className="p-5 border-b flex items-center justify-between bg-white">
            <img src="/logo-sonatel.png" alt="Logo Sonatel" className="h-10 w-auto" />
            <button
              onClick={() => setMobileMenuOpen(false)}
              aria-label="Fermer le menu"
              className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5 text-gray-600" aria-hidden="true" />
            </button>
          </div>

          {/* User info in drawer */}
          <div className="px-5 py-4 bg-gradient-to-r from-orange-50 to-white border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-sonatel-orange flex items-center justify-center text-white font-black text-sm shadow-md" aria-hidden="true">
                {getInitials(user?.name || "??")}
              </div>
              <div>
                <div className="font-black text-gray-900 text-base leading-tight">{user?.name}</div>
                <div className="text-[11px] font-bold text-sonatel-orange uppercase tracking-widest">{user?.role}</div>
              </div>
            </div>
          </div>

          <nav className="flex-1 p-4 space-y-6 overflow-y-auto" aria-label="Menu mobile">
            {filteredNavSections.map((section) => (
              <div key={`mobile-sec-${section.title}`}>
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-4 mb-2">
                  {section.title}
                </div>
                <div className="space-y-1">
                  {section.items.map((item) => {
                    const isActive = location.pathname.startsWith(item.to);
                    return (
                      <NavLink
                        key={`mobile-${item.to}`}
                        to={item.to}
                        onClick={() => setMobileMenuOpen(false)}
                        aria-current={isActive ? "page" : undefined}
                        className={`flex items-center px-4 py-3 rounded-xl font-bold transition-all min-h-[48px] ${isActive ? "bg-sonatel-orange text-white shadow-md" : "text-gray-600 hover:bg-orange-50 hover:text-sonatel-orange"}`}
                      >
                        <item.icon className="w-5 h-5 mr-4 shrink-0" aria-hidden="true" />
                        <span>{item.label}</span>
                        {item.badge === "dot" && item.value > 0 && <div className="w-2 h-2 rounded-full bg-red-500 ml-auto" />}
                        {item.badge === "count" && item.value > 0 && (
                          <div className="px-2 py-0.5 rounded-full bg-white text-sonatel-orange text-[10px] font-bold ml-auto border border-sonatel-orange/20">
                            {item.value}
                          </div>
                        )}
                      </NavLink>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          <div className="p-4 border-t border-gray-100 space-y-1 safe-bottom">
            <NavLink
              to="/parametres"
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center px-4 py-3 rounded-xl font-bold transition-all min-h-[48px] ${location.pathname === "/parametres" ? "bg-sonatel-orange text-white" : "text-gray-600 hover:bg-orange-50"}`}
            >
              <Settings className="w-5 h-5 mr-4 shrink-0" aria-hidden="true" />
              <span>Paramètres</span>
            </NavLink>
            <button
              onClick={() => { setMobileMenuOpen(false); handleLogout(); }}
              aria-label="Se déconnecter"
              className="flex items-center w-full px-4 py-3 rounded-xl font-bold text-red-600 hover:bg-red-50 transition-all min-h-[48px]"
            >
              <LogOut className="w-5 h-5 mr-4 shrink-0" aria-hidden="true" />
              <span>Déconnexion</span>
            </button>
          </div>
        </aside>
      </div>

      {/* ─── Mobile Bottom Navigation Bar ─── */}
      <nav
        className="mobile-bottom-nav md:hidden"
        aria-label="Navigation rapide"
      >
        <div className="flex items-stretch h-16">
          {mobileBottomItems
            .filter(item => {
              // Affiche tous les items généraux (sans restriction de rôle)
              return true;
            })
            .slice(0, 5)
            .map((item, idx) => {
              const isActive = location.pathname.startsWith(item.to);
              return (
                <NavLink
                  key={`bottomnav-${item.to}`}
                  to={item.to}
                  aria-current={isActive ? "page" : undefined}
                  aria-label={item.label}
                  className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-all duration-200 relative animate-slide-up-sm
                    ${isActive
                      ? "text-sonatel-orange"
                      : "text-gray-400 hover:text-gray-600"
                    }`}
                  style={{ animationDelay: `${idx * 30}ms` }}
                >
                  {/* Indicator bar */}
                  {isActive && (
                    <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-sonatel-orange rounded-full" aria-hidden="true" />
                  )}
                  <item.icon
                    className={`w-5 h-5 transition-transform duration-200 ${isActive ? "scale-110" : ""}`}
                    aria-hidden="true"
                  />
                  <span className={`text-[10px] font-bold leading-none ${isActive ? "font-black" : ""}`}>
                    {item.label}
                  </span>
                </NavLink>
              );
            })}
          {/* Bouton "Plus" pour accéder au drawer */}
          <button
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Plus d'options de navigation"
            className="flex-1 flex flex-col items-center justify-center gap-0.5 text-gray-400 hover:text-gray-600 transition-colors relative"
          >
            <Menu className="w-5 h-5" aria-hidden="true" />
            <span className="text-[10px] font-bold leading-none">Plus</span>
            {/* Notification badge */}
            {unreadCount > 0 && (
              <span
                className="absolute top-2 right-1/4 bg-red-500 text-white text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center"
                aria-label={`${unreadCount} notification${unreadCount > 1 ? "s" : ""} non lue${unreadCount > 1 ? "s" : ""}`}
              >
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>
        </div>
      </nav>
    </div>
  );
}
