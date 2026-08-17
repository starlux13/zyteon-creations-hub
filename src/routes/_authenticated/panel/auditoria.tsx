import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/panel/auditoria")({
  component: AuditoriaPage,
});

type AuditRow = {
  id: string;
  user_id: string | null;
  action: string;
  details: Record<string, unknown>;
  user_agent: string | null;
  created_at: string;
};

function AuditoriaPage() {
  const logQuery = useQuery({
    queryKey: ["audit"],
    queryFn: async () => {
      const { data } = await supabase
        .from("audit_log")
        .select("id, user_id, action, details, user_agent, created_at")
        .order("created_at", { ascending: false })
        .limit(200);
      return (data ?? []) as AuditRow[];
    },
  });

  const profilesQuery = useQuery({
    queryKey: ["profiles"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id, display_name");
      return (data ?? []) as { id: string; display_name: string }[];
    },
  });

  const nameOf = (id: string | null) =>
    (profilesQuery.data ?? []).find((p) => p.id === id)?.display_name ?? "Sistema";

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <header>
        <h1 className="font-display text-2xl font-bold">Auditoría y seguridad</h1>
        <p className="text-sm text-muted-foreground">
          Registro de cada acción: quién la hizo, cuándo y desde qué dispositivo. Incluye eventos de
          seguridad como reingresos forzados por navegación sospechosa.
        </p>
      </header>

      <div className="space-y-2">
        {(logQuery.data ?? []).map((entry) => (
          <div key={entry.id} className="surface-panel flex flex-wrap items-center gap-3 rounded-xl p-3">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <Badge variant="outline" className="font-mono text-xs">
              {entry.action}
            </Badge>
            <span className="text-sm font-medium">{nameOf(entry.user_id)}</span>
            <span className="text-xs text-muted-foreground">
              {new Date(entry.created_at).toLocaleString()}
            </span>
            {Object.keys(entry.details ?? {}).length ? (
              <span className="w-full truncate font-mono text-xs text-muted-foreground">
                {JSON.stringify(entry.details)}
              </span>
            ) : null}
          </div>
        ))}
        {!(logQuery.data ?? []).length ? (
          <p className="text-muted-foreground">Sin actividad registrada todavía.</p>
        ) : null}
      </div>
    </div>
  );
}
