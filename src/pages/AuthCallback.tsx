import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Spinner } from "@/components/ui/primitives";
import { supabase } from "@/integrations/supabase/client";

/** Handles email confirmation / magic link redirects from Supabase Auth. */
export default function AuthCallback() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  useEffect(() => {
    const next = params.get("next") ?? "/onboarding";
    const code = params.get("code");
    (async () => {
      if (code) await supabase.auth.exchangeCodeForSession(code);
      navigate(next, { replace: true });
    })();
  }, [navigate, params]);
  return <div className="grid min-h-[60vh] place-items-center"><Spinner /></div>;
}
