import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/integrations/supabase/types";
import { normalizeConfig, type SiteConfig } from "./site-config";

export type PublicProject = {
  id: string;
  title: string;
  description: string;
  url: string;
  image_url: string | null;
  platform: string;
};

export type PublicMember = {
  id: string;
  display_name: string;
  title: string;
  bio: string;
  avatar_url: string | null;
};

export type PublicSiteData = {
  config: SiteConfig;
  versionName: string;
  versionNumber: string;
  projects: PublicProject[];
  team: PublicMember[];
};

export const getPublicSite = createServerFn({ method: "GET" }).handler(
  async (): Promise<PublicSiteData> => {
    const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
    const supabase = createClient<Database>(process.env["SUPABASE_URL"]!, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (input, init) => {
          const h = new Headers(init?.headers);
          if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) {
            h.delete("Authorization");
          }
          h.set("apikey", key);
          return fetch(input, { ...init, headers: h });
        },
      },
    });

    const [versionRes, projectsRes, teamRes] = await Promise.all([
      supabase
        .from("site_versions")
        .select("version_name, version_number, config")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("portfolio_projects")
        .select("id, title, description, url, image_url, platform")
        .eq("visible", true)
        .order("sort_order", { ascending: true }),
      supabase.from("profiles").select("id, display_name, title, bio, avatar_url"),
    ]);

    return {
      config: normalizeConfig(versionRes.data?.config),
      versionName: versionRes.data?.version_name ?? "Lanzamiento ZYTEON",
      versionNumber: versionRes.data?.version_number ?? "1.0",
      projects: projectsRes.data ?? [],
      team: teamRes.data ?? [],
    };
  },
);
