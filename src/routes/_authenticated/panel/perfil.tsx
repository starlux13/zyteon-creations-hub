import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Save } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MediaField } from "@/components/panel/MediaField";
import { usePanel } from "@/components/panel/panel-context";
import { logAudit, useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/panel/perfil")({
  component: PerfilPage,
});

function PerfilPage() {
  const { user, role } = useAuth();
  const { setDirty } = usePanel();
  const queryClient = useQueryClient();

  const profileQuery = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, display_name, title, bio, avatar_url, email")
        .eq("id", user!.id)
        .maybeSingle();
      return data;
    },
  });

  const [displayName, setDisplayName] = useState("");
  const [title, setTitle] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    const profile = profileQuery.data;
    if (!profile) return;
    setDisplayName(profile.display_name);
    setTitle(profile.title);
    setBio(profile.bio);
    setAvatarUrl(profile.avatar_url);
  }, [profileQuery.data]);

  const save = async () => {
    if (!user) return;
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: displayName, title, bio, avatar_url: avatarUrl })
      .eq("id", user.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setDirty(false);
    await logAudit("profile_updated", { display_name: displayName });
    await queryClient.invalidateQueries();
    toast.success("Perfil actualizado (se refleja en la web pública)");
  };

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Mi perfil</h1>
          <p className="text-sm text-muted-foreground">
            Lo que edites aquí se muestra en la sección de equipo de la web.
          </p>
        </div>
        <Badge variant="outline">{role === "admin_manager" ? "Admin Manager" : "Editor"}</Badge>
      </header>

      <div className="surface-panel space-y-4 rounded-2xl p-5">
        <div className="space-y-2">
          <Label>Nombre visible</Label>
          <Input
            value={displayName}
            onChange={(e) => {
              setDisplayName(e.target.value);
              setDirty(true);
            }}
          />
        </div>
        <div className="space-y-2">
          <Label>Cargo</Label>
          <Input
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              setDirty(true);
            }}
          />
        </div>
        <div className="space-y-2">
          <Label>Bio</Label>
          <Textarea
            value={bio}
            className="min-h-28"
            onChange={(e) => {
              setBio(e.target.value);
              setDirty(true);
            }}
          />
        </div>
        <MediaField
          kind="logo"
          label="Foto o avatar"
          value={avatarUrl}
          onChange={(url) => {
            setAvatarUrl(url);
            setDirty(true);
          }}
          hint="Se recorta en círculo, ideal cuadrada"
        />
        <Button onClick={save} className="bg-gradient-brand border-0">
          <Save className="mr-2 h-4 w-4" /> Guardar perfil
        </Button>
      </div>
    </div>
  );
}
