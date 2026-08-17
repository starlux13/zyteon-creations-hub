import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MediaField } from "@/components/panel/MediaField";
import { logAudit, useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/panel/portafolio")({
  component: PortafolioPage,
});

type ProjectRow = {
  id: string;
  title: string;
  description: string;
  url: string;
  image_url: string | null;
  platform: string;
  sort_order: number;
  visible: boolean;
  created_by: string | null;
};

async function fetchProjects(): Promise<ProjectRow[]> {
  const { data } = await supabase
    .from("portfolio_projects")
    .select("*")
    .order("sort_order", { ascending: true });
  return (data ?? []) as ProjectRow[];
}

function PortafolioPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const projectsQuery = useQuery({ queryKey: ["portfolio"], queryFn: fetchProjects });

  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const [platform, setPlatform] = useState("lovable");
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["portfolio"] });

  const create = async () => {
    if (!title.trim() || !url.trim()) {
      toast.error("El título y la URL son obligatorios");
      return;
    }
    const { error } = await supabase.from("portfolio_projects").insert({
      title,
      description,
      url,
      platform,
      image_url: imageUrl,
      created_by: user?.id ?? null,
      sort_order: (projectsQuery.data?.length ?? 0) + 1,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    await logAudit("portfolio_created", { title, url });
    setTitle("");
    setUrl("");
    setDescription("");
    setImageUrl(null);
    await refresh();
    toast.success("Proyecto agregado al portafolio");
  };

  const toggleVisible = async (project: ProjectRow) => {
    await supabase
      .from("portfolio_projects")
      .update({ visible: !project.visible })
      .eq("id", project.id);
    await refresh();
  };

  const remove = async (project: ProjectRow) => {
    const { error } = await supabase.from("portfolio_projects").delete().eq("id", project.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    await logAudit("portfolio_deleted", { title: project.title });
    await refresh();
    toast.success("Proyecto eliminado");
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header>
        <h1 className="font-display text-2xl font-bold">Portafolio</h1>
        <p className="text-sm text-muted-foreground">
          Cada proyecto se muestra en la web con vista previa de la página y acciones de compartir,
          copiar y eliminar.
        </p>
      </header>

      <div className="surface-panel grid gap-4 rounded-2xl p-5 md:grid-cols-2">
        <div className="space-y-3">
          <div className="space-y-2">
            <Label>Nombre del proyecto</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>URL de la web</Label>
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://miproyecto.lovable.app"
            />
          </div>
          <div className="space-y-2">
            <Label>Plataforma</Label>
            <Input value={platform} onChange={(e) => setPlatform(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Descripción</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <Button onClick={create} className="bg-gradient-brand border-0">
            <Plus className="mr-2 h-4 w-4" /> Agregar proyecto
          </Button>
        </div>
        <MediaField
          kind="cover"
          label="Portada del proyecto (opcional)"
          value={imageUrl}
          onChange={setImageUrl}
          hint="Si la dejas vacía, la tarjeta mostrará la web en vivo dentro del recuadro"
        />
      </div>

      <div className="grid gap-3">
        {(projectsQuery.data ?? []).map((project) => (
          <div key={project.id} className="surface-panel flex flex-wrap items-center gap-3 rounded-2xl p-4">
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{project.title}</p>
              <p className="truncate text-xs text-muted-foreground">{project.url}</p>
            </div>
            <Button size="sm" variant="secondary" onClick={() => void toggleVisible(project)}>
              {project.visible ? (
                <>
                  <Eye className="mr-2 h-4 w-4" /> Visible
                </>
              ) : (
                <>
                  <EyeOff className="mr-2 h-4 w-4" /> Oculto
                </>
              )}
            </Button>
            <Button size="icon" variant="ghost" onClick={() => void remove(project)} aria-label="Eliminar">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
