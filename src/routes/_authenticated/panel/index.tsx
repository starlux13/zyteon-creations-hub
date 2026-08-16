import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  FileStack,
  History,
  Inbox,
  MessagesSquare,
  NotebookPen,
  PanelsTopLeft,
  ScrollText,
  User,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { fetchActiveVersion, fetchAllDrafts } from "@/lib/panel-data";

export const Route = createFileRoute("/_authenticated/panel/")({
  component: PanelHome,
});

const CARDS = [
  {
    to: "/panel/editor",
    title: "Editor de la web",
    desc: "Edita marca, hero, planes y secciones con vista PC y móvil independientes.",
    icon: PanelsTopLeft,
  },
  {
    to: "/panel/buzon",
    title: "Buzón de aprobación",
    desc: "Revisa borradores: aprobar, rechazar o dejar pendiente.",
    icon: Inbox,
  },
  {
    to: "/panel/versiones",
    title: "Versiones",
    desc: "Historial desde la v1.0 con retorno inmediato a cualquier versión.",
    icon: History,
  },
  {
    to: "/panel/portafolio",
    title: "Portafolio",
    desc: "Carga proyectos con vista previa, compartir, copiar y eliminar.",
    icon: FileStack,
  },
  {
    to: "/panel/notas",
    title: "Notas",
    desc: "Bloc con formato tipo Word para tus ideas y pendientes.",
    icon: NotebookPen,
  },
  {
    to: "/panel/chat",
    title: "Chat del equipo",
    desc: "Sala grupal Zyteon Team y mensajes directos 1 a 1.",
    icon: MessagesSquare,
  },
  {
    to: "/panel/auditoria",
    title: "Auditoría",
    desc: "Quién cambió qué, cuándo y desde qué dispositivo.",
    icon: ScrollText,
  },
  { to: "/panel/perfil", title: "Mi perfil", desc: "Tu nombre, cargo, bio y foto.", icon: User },
] as const;

function PanelHome() {
  const { displayName, isAdminManager } = useAuth();
  const { data: active } = useQuery({ queryKey: ["active-version"], queryFn: fetchActiveVersion });
  const { data: drafts } = useQuery({ queryKey: ["drafts"], queryFn: fetchAllDrafts });

  const pending = (drafts ?? []).filter((d) => d.submitted && d.status === "pending").length;

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <header>
        <p className="text-sm text-muted-foreground">Hola,</p>
        <h1 className="font-display text-3xl font-bold">{displayName || "Integrante"}</h1>
        <div className="mt-3 flex flex-wrap gap-2">
          <Badge variant="secondary">
            Web en vivo: v{active?.version_number ?? "—"} · {active?.version_name ?? "sin versión"}
          </Badge>
          {isAdminManager ? (
            <Badge className="bg-gradient-brand border-0">
              {pending} borrador(es) esperando tu luz verde
            </Badge>
          ) : (
            <Badge variant="outline">Tus cambios se envían a revisión del Admin Manager</Badge>
          )}
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CARDS.map((card) => (
          <Link
            key={card.to}
            to={card.to}
            className="surface-panel group rounded-2xl p-5 transition-transform hover:-translate-y-1"
          >
            <card.icon className="h-6 w-6 text-primary" />
            <h2 className="mt-4 font-display text-lg font-semibold">{card.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{card.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
