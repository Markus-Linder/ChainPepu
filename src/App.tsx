import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { I18nProvider } from "@/lib/i18n/client";
import { ToastProvider } from "@/components/ui/toast";
import { Shell } from "@/components/layout/Shell";
import Landing from "@/pages/Landing";
import Pricing from "@/pages/Pricing";
import Login from "@/pages/Login";
import AuthCallback from "@/pages/AuthCallback";
import Onboarding from "@/pages/Onboarding";
import CreaturePage from "@/pages/CreaturePage";
import Dashboard from "@/pages/Dashboard";
import Arena from "@/pages/Arena";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 10_000, retry: 1 } } });

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <AuthProvider>
          <ToastProvider>
            <BrowserRouter>
              <Shell>
                <Routes>
                  <Route path="/" element={<Landing />} />
                  <Route path="/pricing" element={<Pricing />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/auth/callback" element={<AuthCallback />} />
                  <Route path="/onboarding" element={<Onboarding />} />
                  <Route path="/c/:slug" element={<CreaturePage />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/arena" element={<Arena />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Shell>
            </BrowserRouter>
          </ToastProvider>
        </AuthProvider>
      </I18nProvider>
    </QueryClientProvider>
  );
}
