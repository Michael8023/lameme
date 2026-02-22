import React from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import HomePage from "./pages/HomePage";
import TimerPage from "./pages/TimerPage";
import CalendarPage from "./pages/CalendarPage";
import HistoryPage from "./pages/HistoryPage";
import SalaryPage from "./pages/SalaryPage";
import BottomNav from "./components/BottomNav";
import AuthPage from "./pages/AuthPage";
import MyPage from "./pages/MyPage";
import { supabase } from "./lib/supabase";
import { usePoopStore } from "./store";
import type { Session } from "@supabase/supabase-js";

function AppShell() {
  const location = useLocation();
  const [session, setSession] = React.useState<Session | null>(null);
  const [loading, setLoading] = React.useState(true);
  const { hydrateFromCloud, resetForSignOut, cloudLoading } = usePoopStore();

  React.useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const nextSession = data.session ?? null;
      setSession(nextSession);
      if (!nextSession) {
        resetForSignOut();
      }
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (!nextSession) {
        resetForSignOut();
      }
    });

    return () => sub.subscription.unsubscribe();
  }, [resetForSignOut]);

  React.useEffect(() => {
    if (!session) return;
    hydrateFromCloud().catch(() => {
      // Errors are displayed in pages if needed.
    });
  }, [session, hydrateFromCloud]);

  if (loading || (!!session && cloudLoading)) {
    return <div className="min-h-screen grid place-items-center text-gray-500">加载中...</div>;
  }

  const isAuthed = !!session;
  const isAuthPage = location.pathname === "/auth";

  const protectedRoute = (element: React.ReactElement) =>
    isAuthed ? element : <Navigate to="/auth" replace />;

  return (
    <>
      <div className={isAuthed ? "pb-24" : ""}>
        <Routes>
          <Route path="/auth" element={isAuthed ? <Navigate to="/" replace /> : <AuthPage />} />
          <Route path="/" element={protectedRoute(<HomePage />)} />
          <Route path="/timer" element={protectedRoute(<TimerPage />)} />
          <Route path="/calendar" element={protectedRoute(<CalendarPage />)} />
          <Route path="/history" element={protectedRoute(<HistoryPage />)} />
          <Route path="/salary" element={protectedRoute(<SalaryPage />)} />
          <Route path="/me" element={protectedRoute(<MyPage />)} />
          <Route path="*" element={<Navigate to={isAuthed ? "/" : "/auth"} replace />} />
        </Routes>
      </div>
      {isAuthed && !isAuthPage && <BottomNav />}
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  );
}

export default App;
