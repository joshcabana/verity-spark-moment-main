import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import ThemeToggle from "@/components/ThemeToggle";

const Landing = lazy(() => import("./pages/Landing"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Terms = lazy(() => import("./pages/Terms"));
const Transparency = lazy(() => import("./pages/Transparency"));
const Safety = lazy(() => import("./pages/Safety"));
const AppAuthed = lazy(() => import("./AppAuthed"));

const FullScreenLoader = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

const App = () => (
  <BrowserRouter>
    <ThemeToggle className="fixed right-4 top-[max(1rem,env(safe-area-inset-top))] z-[120]" />
    <Suspense fallback={<FullScreenLoader />}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/transparency" element={<Transparency />} />
        <Route path="/safety" element={<Safety />} />
        <Route path="/post-spark/:matchId" element={<AppAuthed />} />
        <Route path="/*" element={<AppAuthed />} />
      </Routes>
    </Suspense>
  </BrowserRouter>
);

export default App;
