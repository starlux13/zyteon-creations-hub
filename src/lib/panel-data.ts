import { supabase } from "@/integrations/supabase/client";
import { MEDIA_LIMITS, normalizeConfig, type SiteConfig } from "./site-config";

export type VersionRow = {
  id: string;
  version_number: string;
  version_name: string;
  config: unknown;
  is_active: boolean;
  published_by: string | null;
  created_at: string;
};

export type DraftRow = {
  id: string;
  author_id: string;
  title: string;
  message: string;
  config: unknown;
  base_version_id: string | null;
  status: "pending" | "approved" | "rejected" | "on_hold";
  submitted: boolean;
  review_note: string;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
};

export async function fetchActiveVersion(): Promise<VersionRow | null> {
  const { data } = await supabase
    .from("site_versions")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as VersionRow | null) ?? null;
}

export async function fetchVersions(): Promise<VersionRow[]> {
  const { data } = await supabase
    .from("site_versions")
    .select("*")
    .order("created_at", { ascending: false });
  return (data ?? []) as VersionRow[];
}

export async function fetchMyDraft(userId: string): Promise<DraftRow | null> {
  const { data } = await supabase
    .from("site_drafts")
    .select("*")
    .eq("author_id", userId)
    .in("status", ["pending", "on_hold"])
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as DraftRow | null) ?? null;
}

export async function fetchAllDrafts(): Promise<DraftRow[]> {
  const { data } = await supabase
    .from("site_drafts")
    .select("*")
    .order("updated_at", { ascending: false });
  return (data ?? []) as DraftRow[];
}

export function nextVersionNumber(versions: VersionRow[]): string {
  const numbers = versions
    .map((v) => Number.parseFloat(v.version_number))
    .filter((n) => Number.isFinite(n));
  const max = numbers.length ? Math.max(...numbers) : 0.9;
  return (Math.round((max + 0.1) * 10) / 10).toFixed(1);
}

export function configOf(row: { config: unknown } | null | undefined): SiteConfig {
  return normalizeConfig(row?.config);
}

export type MediaKind = keyof typeof MEDIA_LIMITS;

export async function validateAndUpload(
  file: File,
  kind: MediaKind,
): Promise<{ url: string } | { error: string }> {
  const limits = MEDIA_LIMITS[kind];
  if (!(limits.formats as readonly string[]).includes(file.type)) {
    return { error: `Formato no permitido. Usa: ${limits.formats.join(", ")}` };
  }
  if (file.size > limits.maxBytes) {
    return {
      error: `El archivo pesa ${(file.size / 1024 / 1024).toFixed(1)} MB y el máximo es ${(
        limits.maxBytes /
        1024 /
        1024
      ).toFixed(0)} MB`,
    };
  }
  if (kind === "video") {
    const duration = await readVideoDuration(file);
    if (duration && duration > MEDIA_LIMITS.video.maxSeconds) {
      return {
        error: `El video dura ${Math.round(duration)}s y el máximo son ${MEDIA_LIMITS.video.maxSeconds}s (3 min)`,
      };
    }
  }

  const { data: userData } = await supabase.auth.getUser();
  const ext = file.name.split(".").pop() ?? "bin";
  const path = `${userData.user?.id ?? "anon"}/${kind}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("site-media").upload(path, file, { upsert: true });
  if (error) return { error: error.message };

  const { data: signed } = await supabase.storage
    .from("site-media")
    .createSignedUrl(path, 60 * 60 * 24 * 365);
  if (!signed?.signedUrl) return { error: "No se pudo generar el enlace del archivo" };
  return { url: signed.signedUrl };
}

function readVideoDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    const url = URL.createObjectURL(file);
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(Number.isFinite(video.duration) ? video.duration : null);
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    video.src = url;
  });
}
