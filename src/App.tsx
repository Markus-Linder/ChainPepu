import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabaseReady } from "@/lib/supabase";
import Landing from "@/pages/Landing";
import Auth from "@/pages/Auth";
import Dashboard from "@/pages/Dashboard";
import NewScan from "@/pages/NewScan";
import ScanDetail from "@/pages/ScanDetail";
import SetupNotice from "@/pages/SetupNotice";

export default function App() {
  const { session, loading } = useAuth();

  if (!supabaseReady) return <SetupNotice />;

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Loading…</div>;
  }

  return (
    <Routes>
      <Route path="/" element={session ? <Navigate to="/app" replace /> : <Landing />} />
      <Route path="/login" element={session ? <Navigate to="/app" replace /> : <Auth />} />
      <Route path="/app" element={session ? <Dashboard /> : <Navigate to="/login" replace />} />
      <Route path="/app/new" element={session ? <NewScan /> : <Navigate to="/login" replace />} />
      <Route path="/app/scan/:id" element={session ? <ScanDetail /> : <Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
