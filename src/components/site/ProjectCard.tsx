import { useState } from "react";
import { Copy, ExternalLink, MoreVertical, Share2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { PublicProject } from "@/lib/public-site.functions";
import { TEXT } from "@/lib/site-config";

type Props = {
  project: PublicProject;
  lang: "es" | "en";
  onRemove?: (id: string) => void;
};

export function ProjectCard({ project, lang, onRemove }: Props) {
  const t = TEXT[lang];
  const [failed, setFailed] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(project.url);
    toast.success("URL copiada");
  };

  const share = async () => {
    const nav = navigator as Navigator & {
      share?: (data: { title: string; url: string }) => Promise<void>;
    };
    if (nav.share) {
      await nav.share({ title: project.title, url: project.url });
      return;
    }
    await copy();
  };

  return (
    <article className="group surface-panel relative overflow-hidden rounded-2xl transition-transform duration-300 hover:-translate-y-1">
      <a
        href={project.url}
        target="_blank"
        rel="noreferrer noopener"
        className="block"
        aria-label={`${t.openSite}: ${project.title}`}
      >
        <div className="relative aspect-[16/10] overflow-hidden bg-muted">
          {project.image_url && !failed ? (
            <img
              src={project.image_url}
              alt={`Vista previa de ${project.title}`}
              loading="lazy"
              onError={() => setFailed(true)}
              className="h-full w-full object-cover object-top"
            />
          ) : (
            <iframe
              src={project.url}
              title={`Vista previa de ${project.title}`}
              loading="lazy"
              sandbox="allow-scripts allow-same-origin"
              className="pointer-events-none h-[200%] w-[200%] origin-top-left scale-50 border-0"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/10 to-transparent opacity-70" />
        </div>
        <div className="p-5">
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-primary">
            {project.platform}
          </div>
          <h3 className="mt-2 text-lg font-semibold">{project.title}</h3>
          {project.description ? (
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{project.description}</p>
          ) : null}
        </div>
      </a>

      <div className="absolute bottom-4 right-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="icon"
              variant="secondary"
              className="h-9 w-9 rounded-full"
              aria-label="Opciones del proyecto"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <a href={project.url} target="_blank" rel="noreferrer noopener">
                <ExternalLink className="mr-2 h-4 w-4" /> {t.openSite}
              </a>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={copy}>
              <Copy className="mr-2 h-4 w-4" /> {t.copyUrl}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={share}>
              <Share2 className="mr-2 h-4 w-4" /> {t.share}
            </DropdownMenuItem>
            {onRemove ? (
              <DropdownMenuItem
                onClick={() => onRemove(project.id)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" /> {t.remove}
              </DropdownMenuItem>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </article>
  );
}
