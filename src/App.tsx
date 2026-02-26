import { lazy, Suspense, type ReactNode } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { AnimatePresence, motion } from "framer-motion";
import { ErrorBoundary } from "@/components/ErrorBoundary";

const Landing = lazy(() => import("./pages/Landing"));
const Auth = lazy(() => import("./pages/Auth"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const Lobby = lazy(() => import("./pages/Lobby"));
const VideoCall = lazy(() => import("./pages/VideoCall"));
const MatchDecision = lazy(() => import("./pages/MatchDecision"));
const SparkHistory = lazy(() => import("./pages/SparkHistory"));
const TokenShop = lazy(() => import("./pages/TokenShop"));
const Transparency = lazy(() => import("./pages/Transparency"));
const Chat = lazy(() => import("./pages/Chat"));
const Profile = lazy(() => import("./pages/Profile"));
const Appeal = lazy(() => import("./pages/Appeal"));
const SparkAnalytics = lazy(() => import("./pages/SparkAnalytics"));
const Admin = lazy(() => import("./pages/Admin"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const FullScreenLoader = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return <FullScreenLoader />;
  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
};

const PublicRoute = ({ children }: { children: ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return <FullScreenLoader />;
  if (user) return <Navigate to="/lobby" replace />;
  return <>{children}</>;
};

const PageWrapper = ({ children }: { children: ReactNode }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.98 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0, scale: 1.02 }}
    transition={{ duration: 0.3, ease: "easeInOut" }}
    className="w-full min-h-screen"
  >
    {children}
  </motion.div>
);

const AppRoutes = () => {
  const location = useLocation();
  
  return (
    <Suspense fallback={<FullScreenLoader />}>
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<PageWrapper><Landing /></PageWrapper>} />
          <Route path="/auth" element={<PageWrapper><PublicRoute><Auth /></PublicRoute></PageWrapper>} />
          <Route path="/onboarding" element={<PageWrapper><ProtectedRoute><Onboarding /></ProtectedRoute></PageWrapper>} />
          <Route path="/lobby" element={<PageWrapper><ProtectedRoute><Lobby /></ProtectedRoute></PageWrapper>} />
          <Route path="/call" element={<PageWrapper><ProtectedRoute><VideoCall /></ProtectedRoute></PageWrapper>} />
          <Route path="/match" element={<PageWrapper><ProtectedRoute><MatchDecision /></ProtectedRoute></PageWrapper>} />
          <Route path="/sparks" element={<PageWrapper><ProtectedRoute><SparkHistory /></ProtectedRoute></PageWrapper>} />
          <Route path="/tokens" element={<PageWrapper><ProtectedRoute><TokenShop /></ProtectedRoute></PageWrapper>} />
          <Route path="/shop" element={<PageWrapper><ProtectedRoute><TokenShop /></ProtectedRoute></PageWrapper>} />
          <Route path="/transparency" element={<PageWrapper><Transparency /></PageWrapper>} />
          <Route path="/chat/:matchId" element={<PageWrapper><ProtectedRoute><Chat /></ProtectedRoute></PageWrapper>} />
          <Route path="/profile" element={<PageWrapper><ProtectedRoute><Profile /></ProtectedRoute></PageWrapper>} />
          <Route path="/analytics" element={<PageWrapper><ProtectedRoute><SparkAnalytics /></ProtectedRoute></PageWrapper>} />
          <Route path="/appeals" element={<PageWrapper><ProtectedRoute><Appeal /></ProtectedRoute></PageWrapper>} />
          <Route path="/admin" element={<PageWrapper><ProtectedRoute><Admin /></ProtectedRoute></PageWrapper>} />
          <Route path="*" element={<PageWrapper><NotFound /></PageWrapper>} />
        </Routes>
      </AnimatePresence>
    </Suspense>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ErrorBoundary>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </ErrorBoundary>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
