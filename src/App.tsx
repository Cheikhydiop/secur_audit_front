import React, { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AppLayout from "./components/AppLayout";
import LoginPage from "./pages/LoginPage";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import { AuthProvider } from "./contexts/AuthContext";
import { SocketProvider } from "./contexts/SocketContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { PWABanner } from "./components/PWABanner";

const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const InspectionPage = lazy(() => import("./pages/InspectionPage"));
const ActionsPage = lazy(() => import("./pages/ActionsPage"));
const HistoriquePage = lazy(() => import("./pages/HistoriquePage"));
const ParametresPage = lazy(() => import("./pages/ParametresPage"));
const PlanningPage = lazy(() => import("./pages/PlanningPage"));
const LogsPage = lazy(() => import("./pages/LogsPage"));
const GestionUtilisateursPage = lazy(() => import("./pages/GestionUtilisateursPage"));
const ActivateAccountPage = lazy(() => import("./pages/ActivateAccountPage"));
const DeviceVerification = lazy(() => import("./pages/DeviceVerification"));
const EmailVerification = lazy(() => import("./pages/EmailVerification"));
const NotificationsPage = lazy(() => import("./pages/NotificationsPage"));
const QuestionnaireBuilderPage = lazy(() => import("./pages/QuestionnaireBuilderPage"));
const AdminInspectionsPage = lazy(() => import("./pages/AdminInspectionsPage"));
const HelpPage = lazy(() => import("./pages/Help"));
const ForcePasswordChange = lazy(() => import("./pages/ForcePasswordChange"));
const NotFound = lazy(() => import("./pages/NotFound"));
const SitesPage = lazy(() => import("./pages/SitesPage"));
const DetailSite = lazy(() => import("./pages/DetailSite"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      retry: (failureCount, error: any) => {
        if (error?.status === 401 || error?.status === 403) return false;
        return failureCount < 2;
      },
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10_000),
    },
    mutations: {
      retry: false,
    },
  },
});

const PageLoader = () => (
  <div className="flex h-[80vh] w-full items-center justify-center">
    <div className="flex flex-col items-center gap-4">
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-sonatel-orange border-t-transparent" />
      <span className="text-[10px] font-black uppercase tracking-[0.3em] text-sonatel-orange animate-pulse">
        Chargement intelligent
      </span>
    </div>
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <SocketProvider>
        <TooltipProvider>
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            {/* ✅ translate="no" bloque Google Translate et toutes les extensions
                qui modifient le DOM et causent le removeChild crash */}
            <div translate="no" className="contents">
              <Toaster />
              <Sonner />
              <PWABanner />

              <Suspense fallback={<PageLoader />}>
                <Routes>
                  <Route path="/" element={<Navigate to="/login" replace />} />
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="/device-verification" element={<DeviceVerification />} />
                  <Route path="/verify-email" element={<EmailVerification />} />
                  <Route path="/activate/:token" element={<ActivateAccountPage />} />
                  <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
                    <Route path="/dashboard" element={<DashboardPage />} />
                    <Route path="/inspection" element={<InspectionPage />} />
                    <Route path="/actions" element={<ActionsPage />} />
                    <Route path="/plans-actions" element={<Navigate to="/actions" replace />} />
                    <Route path="/historique/:id?" element={<HistoriquePage />} />
                    <Route path="/planning" element={<PlanningPage />} />
                    <Route path="/notifications" element={<NotificationsPage />} />
                    <Route path="/logs" element={<LogsPage />} />
                    <Route path="/users" element={
                      <ProtectedRoute allowedRoles={["ADMIN", "SUPER_ADMIN"]}>
                        <GestionUtilisateursPage />
                      </ProtectedRoute>
                    } />
                    <Route path="/parametres" element={<ParametresPage />} />
                    <Route path="/questionnaire" element={
                      <ProtectedRoute allowedRoles={["ADMIN", "SUPER_ADMIN"]}>
                        <QuestionnaireBuilderPage />
                      </ProtectedRoute>
                    } />
                    <Route path="/admin-inspections" element={
                      <ProtectedRoute allowedRoles={["ADMIN", "SUPER_ADMIN"]}>
                        <AdminInspectionsPage />
                      </ProtectedRoute>
                    } />
                    <Route path="/sites" element={<SitesPage />} />
                    <Route path="/sites/:siteId" element={<DetailSite />} />
                    <Route path="/sites/:siteId/Details" element={<DetailSite />} />
                    <Route path="/Services/:siteId/Details" element={<DetailSite />} />
                    <Route path="/help" element={<HelpPage />} />
                    <Route path="/force-password-change" element={<ForcePasswordChange />} />
                  </Route>
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </div>
          </BrowserRouter>
        </TooltipProvider>
      </SocketProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;