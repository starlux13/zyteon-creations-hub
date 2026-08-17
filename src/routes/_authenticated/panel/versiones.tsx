import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { History, RotateCcw } from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { logAudit, useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { fetchVersions, type VersionRow } from "@/lib/panel-data";

export const Route = createFileRoute("/_authenticated/panel/versiones")({
  component: VersionesPage,
});

function VersionesPage() {
  const { isAdminManager } = useAuth();
  const queryClient = useQueryClient();
  const versionsQuery = useQuery({ queryKey: ["versions"], queryFn: fetchVersions });
  const [target, setTarget] = useState<VersionRow | null>(null);

  const rollback = async () => {
    if (!target) return;
    await supabase.from("site_versions").update({ is_active: false }).eq("is_active", true);
    const { error } = await supabase
      .from("site_versions")
      .update({ is_active: true })
      .eq("id", target.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    await logAudit("version_rollback", { to: target.version_number });
    setTarget(null);
    await queryClient.invalidateQueries();
    toast.success(`La web volvió a la versión ${target.version_number}`);
  };

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <header>
        <h1 className="font-display text-2xl font-bold">Historial de versiones</h1>
        <p className="text-sm text-muted-foreground">
          Cada publicación queda guardada desde la v1.0. Puedes volver a cualquier versión sin
          perder el historial.
        </p>
      </header>

      <div className="space-y-3">
        {(versionsQuery.data ?? []).map((version) => (
          <div key={version.id} className="surface-panel flex flex-wrap items-center gap-3 rounded-2xl p-4">
            <History className="h-5 w-5 text-primary" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold">
                v{version.version_number} · {version.version_name}
              </p>
              <p className="text-xs text-muted-foreground">
                Publicada el {new Date(version.created_at).toLocaleString()}
              </p>
            </div>
            {version.is_active ? (
              <Badge className="bg-gradient-brand border-0">En vivo</Badge>
            ) : isAdminManager ? (
              <Button size="sm" variant="secondary" onClick={() => setTarget(version)}>
                <RotateCcw className="mr-2 h-4 w-4" /> Volver a esta
              </Button>
            ) : (
              <Badge variant="outline">Archivada</Badge>
            )}
          </div>
        ))}
      </div>

      <AlertDialog open={!!target} onOpenChange={(open) => !open && setTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Seguro que quieres ejecutar esta acción?</AlertDialogTitle>
            <AlertDialogDescription>
              La web pública volverá a la versión {target?.version_number} ({target?.version_name}).
              Toda la información actual se conserva en el historial.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={rollback}>Sí, restaurar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
