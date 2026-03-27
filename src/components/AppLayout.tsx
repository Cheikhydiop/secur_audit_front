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
  ClipboardList,
  Building,
  RefreshCw,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
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

const navItems = [
  { to: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard, mobileLabel: "Accueil" },
  { to: "/sites", label: "Sites", icon: Building, mobileLabel: "Sites" },
  { to: "/inspection", label: "Nouvelle Inspection", icon: ClipboardCheck, mobileLabel: "Inspection" },
  { to: "/actions", label: "Plans d'Actions", icon: ListChecks, mobileLabel: "Actions" },
  { to: "/planning", label: "Planning", icon: Calendar, mobileLabel: "Planning" },
  { to: "/logs", label: "Journal Logs", icon: History, role: "ADMIN", mobileLabel: "Logs" },
  { to: "/questionnaire", label: "Questionnaire", icon: ClipboardList, role: "INSPECTEUR", mobileLabel: "Questions" },
  { to: "/historique", label: "Historique", icon: Archive, mobileLabel: "Historique" },
  { to: "/users", label: "Utilisateurs", icon: Users, role: "ADMIN", mobileLabel: "Utilisateurs" },
  { to: "/admin-inspections", label: "Inspections", icon: ClipboardList, role: "ADMIN", mobileLabel: "Inspections" },
];

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
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const scrollRef = useRef<HTMLElement>(null);
  const { isOnline, isReachable } = useOnlineStatus();

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

  const filteredNavItems = navItems.filter(
    item => !item.role || (user && (item.role === user.role || (item.role === "ADMIN" && user.role === "SUPER_ADMIN")))
  );

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
          } hidden md:flex flex-col border-r border-gray-200 bg-white transition-all duration-300 z-30 shadow-sm`}
      >
        {/* Logo */}
        <div className="py-10 px-6 border-b border-gray-100 flex items-center justify-center bg-white">
          <Link to="/dashboard" className="flex items-center justify-center w-full" aria-label="Accueil - SmartAudit">
            <img
              src="/logo-sonatel.png"
              alt="Sonatel Logo"
              className={collapsed ? "h-11 w-auto" : "h-20 w-auto object-contain scale-110 transition-transform hover:scale-125"}
            />
          </Link>
        </div>

        {!collapsed && (
          <div className="px-4 py-8">
            <div className="px-5 py-4 bg-gradient-to-r from-orange-50 to-white border-2 border-sonatel-orange/30 rounded-2xl text-[18px] font-black text-sonatel-orange flex items-center justify-between group cursor-pointer hover:border-sonatel-orange/60 transition-all shadow-sm">
              <span>SmartAudit DG-SECU/Sonatel</span>
              <ChevronDown className="w-5 h-5 text-sonatel-orange" aria-hidden="true" />
            </div>
          </div>
        )}

        {/* Nav Items */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto" aria-label="Menu de navigation">
          {filteredNavItems.map((item) => {
            const isActive = location.pathname.startsWith(item.to);
            return (
              <NavLink
                key={item.to}
                to={item.to}
                aria-current={isActive ? "page" : undefined}
                className={`sonatel-menu-item rounded-xl ${isActive ? "active" : ""}`}
              >
                <item.icon className={`h-6 w-6 shrink-0 ${collapsed ? "" : "mr-4"}`} aria-hidden="true" />
                {!collapsed && <span>{item.label}</span>}
              </NavLink>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-gray-100 space-y-1">
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <NavLink
                  to="/parametres"
                  aria-current={location.pathname === "/parametres" ? "page" : undefined}
                  className={`sonatel-menu-item rounded-xl ${location.pathname === "/parametres" ? "active" : ""}`}
                >
                  <Settings className={`h-6 w-6 shrink-0 ${collapsed ? "" : "mr-4"}`} aria-hidden="true" />
                  {!collapsed && <span>Paramètres</span>}
                </NavLink>
              </TooltipTrigger>
              {collapsed && (
                <TooltipContent side="right" sideOffset={10} className="bg-gray-900 text-white px-4 py-2 rounded-lg shadow-xl">
                  <p className="text-sm font-semibold">Paramètres</p>
                </TooltipContent>
              )}
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={handleLogout}
                  aria-label="Déconnexion"
                  className="sonatel-menu-item rounded-xl w-full text-left text-destructive hover:bg-destructive/5 hover:text-destructive"
                >
                  <LogOut className={`h-6 w-6 shrink-0 ${collapsed ? "" : "mr-4"}`} aria-hidden="true" />
                  {!collapsed && <span>Déconnexion</span>}
                </button>
              </TooltipTrigger>
              {collapsed && (
                <TooltipContent side="right" sideOffset={10} className="bg-gray-900 text-white px-4 py-2 rounded-lg shadow-xl">
                  <p className="text-sm font-semibold">Déconnexion</p>
                </TooltipContent>
              )}
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setCollapsed(!collapsed)}
                  aria-label={collapsed ? "Développer la barre latérale" : "Réduire la barre latérale"}
                  aria-expanded={!collapsed}
                  className="sonatel-menu-item rounded-xl w-full text-left"
                >
                  <ChevronLeft
                    className={`h-6 w-6 shrink-0 transition-all duration-300 ${collapsed ? "rotate-180" : ""} ${collapsed ? "" : "mr-4"}`}
                    aria-hidden="true"
                  />
                  {!collapsed && <span>Réduire</span>}
                </button>
              </TooltipTrigger>
              {collapsed && (
                <TooltipContent side="right" sideOffset={10} className="bg-gray-900 text-white px-4 py-2 rounded-lg shadow-xl">
                  <p className="text-sm font-semibold">Développer</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
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

          <nav className="flex-1 p-4 space-y-1 overflow-y-auto" aria-label="Menu mobile">
            {filteredNavItems.map((item) => {
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
                </NavLink>
              );
            })}
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
