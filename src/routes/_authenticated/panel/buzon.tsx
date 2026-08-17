import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Clock, Eye, X } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PublicSite } from "@/components/site/PublicSite";
import { logAudit, useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  configOf,
  fetchAllDrafts,
  fetchVersions,
  nextVersionNumber,
  type DraftRow,
} from "@/lib/panel-data";
import type { DeviceKey, SiteConfig } from "@/lib/site-config";

export const Route = createFileRoute("/_authenticated/panel/buzon")({
  component: BuzonPage,
});

const STATUS_LABEL: Record<DraftRow["status"], string> = {
  pending: "Pendiente",
  approved: "Aprobado",
  rejected: "Rechazado",
  on_hold: "En espera",
};

function BuzonPage() {
  const { user, isAdminManager } = useAuth();
  const queryClient = useQueryClient();
  const draftsQuery = useQuery({ queryKey: ["drafts"], queryFn: fetchAllDrafts });
  const versionsQuery = useQuery({ queryKey: ["versions"], queryFn: fetchVersions });

  const [selected, setSelected] = useState<DraftRow | null>(null);
  const [device, setDevice] = useState<DeviceKey>("desktop");
  const [note, setNote] = useState("");
  const [versionName, setVersionName] = useState("");
  const [approveOpen, setApproveOpen] = useState(false);

  const drafts = (draftsQuery.data ?? []).filter((d) => d.submitted);

  const setStatus = async (draft: DraftRow, status: DraftRow["status"]) => {
    const { error } = await supabase
      .from("site_drafts")
      .update({
        status,
        review_note: note,
        reviewed_by: user?.id ?? null,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", draft.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    await logAudit("draft_review", { draft: draft.id, status });
    await queryClient.invalidateQueries({ queryKey: ["drafts"] });
    toast.success(`Borrador marcado como ${STATUS_LABEL[status].toLowerCase()}`);
  };

  const approveAndPublish = async () => {
    if (!selected || !user) return;
    const number = nextVersionNumber(versionsQuery.data ?? []);
    await supabase.from("site_versions").update({ is_active: false }).eq("is_active", true);
    const { error } = await supabase.from("site_versions").insert({
      version_number: number,
      version_name: versionName || selected.title,
      config: selected.config as never,
      is_active: true,
      published_by: user.id,
      source_draft_id: selected.id,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    await setStatus(selected, "approved");
    setApproveOpen(false);
    await logAudit("version_published", { number, from_draft: selected.id });
    await queryClient.invalidateQueries();
    toast.success(`Versión ${number} publicada`);
  };

  if (!isAdminManager) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <h1 className="font-display text-2xl font-bold">Estado de tus envíos</h1>
        {(draftsQuery.data ?? []).map((draft) => (
          <div key={draft.id} className="surface-panel rounded-2xl p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="font-semibold">{draft.title}</p>
              <Badge variant="outline">{STATUS_LABEL[draft.status]}</Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{draft.message}</p>
            {draft.review_note ? (
              <p className="mt-2 text-sm text-primary">Nota del admin: {draft.review_note}</p>
            ) : null}
          </div>
        ))}
        {!(draftsQuery.data ?? []).length ? (
          <p className="text-muted-foreground">Aún no has enviado borradores.</p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1400px] space-y-5">
      <header>
        <h1 className="font-display text-2xl font-bold">Buzón de aprobación</h1>
        <p className="text-sm text-muted-foreground">
          Solo tú das luz verde. Ningún cambio llega a la web sin tu aprobación.
        </p>
      </header>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,380px)_1fr]">
        <div className="space-y-3">
          {drafts.map((draft) => (
            <button
              key={draft.id}
              onClick={() => {
                setSelected(draft);
                setNote(draft.review_note);
                setVersionName(draft.title);
              }}
              className={`surface-panel w-full rounded-2xl p-4 text-left transition ${
                selected?.id === draft.id ? "ring-2 ring-primary" : ""
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold">{draft.title}</p>
                <Badge variant="outline">{STATUS_LABEL[draft.status]}</Badge>
              </div>
              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{draft.message}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                Actualizado {new Date(draft.updated_at).toLocaleString()}
              </p>
            </button>
          ))}
          {!drafts.length ? (
            <p className="text-muted-foreground">No hay borradores enviados.</p>
          ) : null}
        </div>

        <div className="space-y-4">
          {selected ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <Tabs value={device} onValueChange={(v) => setDevice(v as DeviceKey)}>
                  <TabsList>
                    <TabsTrigger value="desktop">PC</TabsTrigger>
                    <TabsTrigger value="mobile">Celular</TabsTrigger>
                  </TabsList>
                </Tabs>
                <Badge variant="secondary">
                  <Eye className="mr-1 h-3 w-3" /> Así quedaría la web
                </Badge>
              </div>

              <div
                className={`surface-panel overflow-hidden rounded-2xl ${device === "mobile" ? "mx-auto w-[390px]" : ""}`}
              >
                <div className="h-[60vh] overflow-y-auto">
                  <Preview config={configOf(selected)} device={device} />
                </div>
              </div>

              <div className="surface-panel space-y-3 rounded-2xl p-4">
                <div className="space-y-2">
                  <Label>Nota de revisión</Label>
                  <Textarea value={note} onChange={(e) => setNote(e.target.value)} />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button className="bg-gradient-brand border-0" onClick={() => setApproveOpen(true)}>
                    <Check className="mr-2 h-4 w-4" /> Aprobar y publicar
                  </Button>
                  <Button variant="secondary" onClick={() => void setStatus(selected, "on_hold")}>
                    <Clock className="mr-2 h-4 w-4" /> Dejar pendiente
                  </Button>
                  <Button variant="ghost" onClick={() => void setStatus(selected, "rejected")}>
                    <X className="mr-2 h-4 w-4" /> Rechazar
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <p className="text-muted-foreground">Selecciona un borrador para revisarlo.</p>
          )}
        </div>
      </div>

      <AlertDialog open={approveOpen} onOpenChange={setApproveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Publicar como versión {nextVersionNumber(versionsQuery.data ?? [])}
            </AlertDialogTitle>
            <AlertDialogDescription>
              La web principal cambiará a esta configuración. La versión actual queda guardada en el
              historial para volver atrás.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label>Nombre de la versión</Label>
            <Input value={versionName} onChange={(e) => setVersionName(e.target.value)} />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={approveAndPublish}>Sí, dar luz verde</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Preview({ config, device }: { config: SiteConfig; device: DeviceKey }) {
  const forced: SiteConfig =
    device === "mobile"
      ? { ...config, desktop: config.mobile }
      : { ...config, mobile: config.desktop };
  return (
    <div className="pointer-events-none origin-top scale-[0.85]">
      <PublicSite
        data={{
          config: forced,
          versionName: "revisión",
          versionNumber: "draft",
          projects: [],
          team: [],
        }}
      />
    </div>
  );
}
