import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin_manager" | "editor";

export type AuthState = {
  loading: boolean;
  session: Session | null;
  user: User | null;
  role: AppRole | null;
  isAdminManager: boolean;
  displayName: string;
};

export function useAuth(): AuthState {
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const load = async (nextSession: Session | null) => {
      if (!active) return;
      setSession(nextSession);
      if (!nextSession?.user) {
        setRole(null);
        setDisplayName("");
        setLoading(false);
        return;
      }
      const [roleRes, profileRes] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", nextSession.user.id).maybeSingle(),
        supabase
          .from("profiles")
          .select("display_name")
          .eq("id", nextSession.user.id)
          .maybeSingle(),
      ]);
      if (!active) return;
      setRole((roleRes.data?.role as AppRole | undefined) ?? null);
      setDisplayName(profileRes.data?.display_name ?? nextSession.user.email ?? "Integrante");
      setLoading(false);
    };

    supabase.auth.getSession().then(({ data }) => void load(data.session));

    const { data: sub } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === "TOKEN_REFRESHED") {
        setSession(nextSession);
        return;
      }
      void load(nextSession);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return {
    loading,
    session,
    user: session?.user ?? null,
    role,
    isAdminManager: role === "admin_manager",
    displayName,
  };
}

export async function logAudit(action: string, details: Record<string, unknown> = {}) {
  const { data } = await supabase.auth.getUser();
  if (!data.user) return;
  await supabase.from("audit_log").insert({
    user_id: data.user.id,
    action,
    details: details as never,
    user_agent: typeof navigator === "undefined" ? null : navigator.userAgent,
  });
}
