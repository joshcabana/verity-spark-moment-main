import { lazy, Suspense, type ReactNode } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";

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

const AppRoutes = () => (
  <Suspense fallback={<FullScreenLoader />}>
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/auth" element={<PublicRoute><Auth /></PublicRoute>} />
      <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
      <Route path="/lobby" element={<ProtectedRoute><Lobby /></ProtectedRoute>} />
      <Route path="/call" element={<ProtectedRoute><VideoCall /></ProtectedRoute>} />
      <Route path="/match" element={<ProtectedRoute><MatchDecision /></ProtectedRoute>} />
      <Route path="/sparks" element={<ProtectedRoute><SparkHistory /></ProtectedRoute>} />
      <Route path="/tokens" element={<ProtectedRoute><TokenShop /></ProtectedRoute>} />
      <Route path="/shop" element={<ProtectedRoute><TokenShop /></ProtectedRoute>} />
      <Route path="/transparency" element={<Transparency />} />
      <Route path="/chat/:matchId" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
      <Route path="/appeals" element={<ProtectedRoute><Appeal /></ProtectedRoute>} />
      <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  </Suspense>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
