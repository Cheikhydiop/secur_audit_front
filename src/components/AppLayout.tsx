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
  Search,
  Mail,
  User,
  Shield,
  ChevronDown,
  Calendar,
  History,
  Users,
  FileQuestion,
  ClipboardList,
  Building,
  ChevronRight,
  RefreshCw,
  Wifi,
  WifiOff
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
  { to: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
  { to: "/sites", label: "Sites", icon: Building },
  { to: "/inspection", label: "Nouvelle Inspection", icon: ClipboardCheck },
  { to: "/actions", label: "Plans d'Actions", icon: ListChecks },
  { to: "/planning", label: "Planning", icon: Calendar },
  { to: "/logs", label: "Journal Logs", icon: History, role: "ADMIN" },
  { to: "/questionnaire", label: "Questionnaire", icon: ClipboardList, role: "INSPECTEUR" },
  { to: "/historique", label: "Historique", icon: Archive },
  { to: "/users", label: "Utilisateurs", icon: Users, role: "ADMIN" },
  { to: "/admin-inspections", label: "Inspections", icon: ClipboardList, role: "ADMIN" },
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
  }, [location.pathname]);

  // 🔄 Gestion de la synchronisation automatique lors du retour en ligne
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

  return (
    <div className="flex h-screen overflow-hidden bg-sonatel-light-bg/30">
      {/* Sidebar - Desktop */}
      <aside
        className={`${collapsed ? "w-20" : "w-64"
          } hidden md:flex flex-col border-r border-gray-200 bg-white transition-all duration-300 z-30 shadow-sm`}
      >
        {/* Sidebar Logo Section */}
        <div className="py-10 px-6 border-b border-gray-100 flex items-center justify-center bg-white">
          <Link to="/dashboard" className="flex items-center justify-center w-full">
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
              <ChevronDown className="w-5 h-5 text-sonatel-orange" />
            </div>
          </div>
        )}

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems
            .filter(item => !item.role || (user && (item.role === user.role || (item.role === 'ADMIN' && user.role === 'SUPER_ADMIN'))))
            .map((item) => {
              const isActive = location.pathname.startsWith(item.to);
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={`sonatel-menu-item rounded-xl ${isActive ? "active" : ""}`}
                >
                  <item.icon key={`sidebar-icon-${item.to}`} className={`h-6 w-6 ${collapsed ? "" : "mr-4"}`} />
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
                  className={`sonatel-menu-item rounded-xl ${location.pathname === "/parametres" ? "active" : ""}`}
                >
                  <Settings key="sidebar-settings" className={`h-6 w-6 ${collapsed ? "" : "mr-4"}`} />
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
                  className="sonatel-menu-item rounded-xl w-full text-left text-destructive hover:bg-destructive/5 hover:text-destructive"
                >
                  <LogOut key="sidebar-logout" className={`h-6 w-6 ${collapsed ? "" : "mr-4"}`} />
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
                  className="sonatel-menu-item rounded-xl w-full text-left"
                >
                  <ChevronLeft key="sidebar-toggle" className={`h-6 w-6 transition-all duration-300 ${collapsed ? "rotate-180" : ""} ${collapsed ? "" : "mr-4"}`} />
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

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Header / Navbar */}
        <header className="sticky top-0 z-20 h-16 md:h-20 bg-white border-b border-gray-200 flex items-center justify-between px-4 md:px-6 transition-all duration-300 shadow-sm">
          {/* Mobile Menu Toggle */}
          <button
            className="md:hidden p-2 rounded-lg hover:bg-gray-100"
            onClick={() => setMobileMenuOpen(true)}
          >
            <Menu className="w-6 h-6 text-gray-600" />
          </button>

          {/* Search Bar - Desktop Only */}
          <div className="hidden md:flex flex-1 max-w-md ml-4">
            <CommandPalette />
          </div>

          <div className="flex-1 md:hidden flex justify-center">
            <img src="/logo-sonatel.png" alt="Logo" className="h-8 w-auto" />
          </div>

          {/* Action Icons & Profile */}
          <div className="flex items-center gap-1 md:gap-4">
            <NotificationDropdown />

            <div className="h-6 w-[1px] bg-gray-200 mx-1 md:mx-2" />

            <div className="flex items-center gap-2 md:gap-4 pl-2 md:pl-4 cursor-pointer hover:opacity-80 transition-opacity">
              <div className="text-right hidden sm:block">
                <div className="text-sm md:text-[18px] font-black text-gray-900 leading-none"><span>{user?.name?.split(" ")[0]}</span></div>
                <div className="text-[10px] md:text-[12px] font-bold text-sonatel-orange uppercase tracking-widest mt-0.5 opacity-90 leading-none">
                  <span>{user?.role?.substring(0, 10)}</span>
                </div>
              </div>
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-sonatel-orange shadow-lg shadow-orange-500/20 flex items-center justify-center text-white font-black text-sm md:text-lg border-2 border-white">
                <span>{getInitials(user?.name || "??")}</span>
              </div>
            </div>
          </div>
        </header>

        {/* Bandeau hors-ligne */}
        {!isReachable && (
          <div className="bg-red-600 text-white text-center text-[10px] md:text-xs font-bold py-1 px-4 z-50 flex items-center justify-center gap-2 animate-pulse">
            <span className="h-1.5 w-1.5 rounded-full bg-white inline-block" />
            <span>Serveur injoignable</span>
          </div>
        )}

        {/* Page Content */}
        <main
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-3 md:p-8 bg-gray-50/50 scrollbar-stable"
        >
          <ErrorBoundary resetKey={location.pathname}>
            <div className="mb-4">
              <Breadcrumbs />
            </div>
            {children || <Outlet />}
          </ErrorBoundary>
        </main>
      </div>

      {/* Mobile Sidebar - Drawer */}
      <div
        className={`fixed inset-0 z-50 md:hidden transition-opacity duration-300 ${mobileMenuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={() => setMobileMenuOpen(false)}
        />

        {/* Drawer Content */}
        <aside
          className={`absolute left-0 top-0 bottom-0 w-[280px] bg-white shadow-2xl transition-transform duration-300 ease-out flex flex-col ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full"}`}
        >
          <div className="p-6 border-b flex items-center justify-between">
            <img src="/logo-sonatel.png" alt="Logo" className="h-12 w-auto" />
            <button onClick={() => setMobileMenuOpen(false)} className="p-2 rounded-full hover:bg-gray-100">
              <ChevronLeft className="w-6 h-6" />
            </button>
          </div>

          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            {navItems
              .filter(item => !item.role || (user && (item.role === user.role || (item.role === 'ADMIN' && user.role === 'SUPER_ADMIN'))))
              .map((item) => {
                const isActive = location.pathname.startsWith(item.to);
                return (
                  <NavLink
                    key={`mobile-${item.to}`}
                    to={item.to}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center px-4 py-3 rounded-xl font-bold transition-all ${isActive ? "bg-sonatel-orange text-white" : "text-gray-600 hover:bg-orange-50"}`}
                  >
                    <item.icon className="w-5 h-5 mr-4" />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
          </nav>

          <div className="p-4 border-t space-y-2">
            <button
              onClick={() => { setMobileMenuOpen(false); handleLogout(); }}
              className="flex items-center w-full px-4 py-3 rounded-xl font-bold text-red-600 hover:bg-red-50 transition-all"
            >
              <LogOut className="w-5 h-5 mr-4" />
              <span>Déconnexion</span>
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
