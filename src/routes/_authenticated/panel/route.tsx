import { useEffect, useRef, useState } from "react";
import {
  createFileRoute,
  Link,
  Outlet,
  useNavigate,
  useRouterState,
} from "@tanstack/react-router";
import {
  FileStack,
  History,
  Inbox,
  LayoutDashboard,
  LogOut,
  MessagesSquare,
  NotebookPen,
  PanelsTopLeft,
  ScrollText,
  ShieldAlert,
  User,
} from "lucide-react";
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
import { PanelProvider, usePanel } from "@/components/panel/panel-context";
import { useAuth, logAudit } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/panel")({
  component: () => (
    <PanelProvider>
      <PanelLayout />
    </PanelProvider>
  ),
});

const NAV = [
  { to: "/panel", label: "Inicio", icon: LayoutDashboard, exact: true },
  { to: "/panel/editor", label: "Editor de la web", icon: PanelsTopLeft },
  { to: "/panel/buzon", label: "Buzón de aprobación", icon: Inbox },
  { to: "/panel/versiones", label: "Versiones", icon: History },
  { to: "/panel/portafolio", label: "Portafolio", icon: FileStack },
  { to: "/panel/notas", label: "Notas", icon: NotebookPen },
  { to: "/panel/chat", label: "Chat del equipo", icon: MessagesSquare },
  { to: "/panel/auditoria", label: "Auditoría", icon: ScrollText },
  { to: "/panel/perfil", label: "Mi perfil", icon: User },
] as const;

const MAX_BACK_ATTEMPTS = 5;

function PanelLayout() {
  const { displayName, isAdminManager, role, loading } = useAuth();
  const { dirty, setDirty, registerBackAttempt, resetBackAttempts, backAttempts } = usePanel();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [confirmLeave, setConfirmLeave] = useState(false);
  const history = useRef<string[]>([]);

  // Historial interno del panel: "atrás" nunca salta a la web pública.
  useEffect(() => {
    const last = history.current[history.current.length - 1];
    if (last !== pathname) history.current.push(pathname);
    if (history.current.length > 30) history.current.shift();
  }, [pathname]);

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!dirty) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  const forceReauth = async (reason: string) => {
    await logAudit("ids_forced_reauth", { reason });
    await supabase.auth.signOut();
    toast.warning("Por seguridad debes ingresar nuevamente a tu cuenta.");
    void navigate({ to: "/auth" });
  };

  const goBack = () => {
    const attempts = registerBackAttempt();
    if (attempts > MAX_BACK_ATTEMPTS) {
      void forceReauth("navegacion_atras_repetida");
      return;
    }
    if (dirty) {
      setConfirmLeave(true);
      return;
    }
    stepBack();
  };

  const stepBack = () => {
    history.current.pop();
    const previous = history.current[history.current.length - 1] ?? "/panel";
    void navigate({ to: previous });
  };

  // Intercepta el "atrás" del navegador dentro del panel.
  useEffect(() => {
    const onPopState = (e: PopStateEvent) => {
      if (!pathname.startsWith("/panel")) return;
      e.preventDefault();
      window.history.pushState(null, "", window.location.href);
      goBack();
    };
    window.history.pushState(null, "", window.location.href);
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, dirty]);

  const signOut = async () => {
    await logAudit("sign_out");
    await supabase.auth.signOut();
    void navigate({ to: "/" });
  };

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar p-4 lg:flex">
        <Link to="/" className="font-display text-xl font-bold">
          <span className="text-gradient-brand">ZYTEON</span>
        </Link>
        <p className="mt-1 truncate text-xs text-muted-foreground">
          {loading ? "…" : displayName}
        </p>
        <Badge variant={isAdminManager ? "default" : "secondary"} className="mt-3 w-fit text-[10px]">
          {isAdminManager ? "ADMIN MANAGER" : role === "editor" ? "EDITOR" : "SIN ROL"}
        </Badge>

        <nav className="mt-6 flex-1 space-y-1">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={resetBackAttempts}
              activeOptions={{ exact: "exact" in item ? item.exact : false }}
              activeProps={{
                className: "bg-sidebar-accent text-sidebar-accent-foreground",
              }}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent/60 hover:text-foreground"
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </nav>

        {backAttempts > 2 ? (
          <p className="mb-3 flex items-start gap-2 rounded-lg bg-warning/10 p-2 text-[11px] text-warning">
            <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            IDS activo: {backAttempts}/{MAX_BACK_ATTEMPTS} intentos de retroceso.
          </p>
        ) : null}

        <Button variant="ghost" size="sm" onClick={signOut} className="justify-start">
          <LogOut className="mr-2 h-4 w-4" /> Salir
        </Button>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-border/60 bg-background/80 px-4 backdrop-blur-xl">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={goBack}>
              ← Atrás
            </Button>
            {dirty ? (
              <Badge variant="outline" className="border-warning/50 text-warning">
                Cambios sin guardar
              </Badge>
            ) : null}
          </div>
          <div className="flex items-center gap-2 lg:hidden">
            <Button asChild variant="ghost" size="sm">
              <Link to="/panel">Menú</Link>
            </Button>
            <Button variant="ghost" size="icon" onClick={signOut} aria-label="Salir">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>

        <main className="min-w-0 flex-1 p-4 sm:p-6">
          <Outlet />
        </main>
      </div>

      <AlertDialog open={confirmLeave} onOpenChange={setConfirmLeave}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Seguro que quieres ejecutar esta acción?</AlertDialogTitle>
            <AlertDialogDescription>
              Tienes cambios de la web sin guardar. Si sales ahora se perderán y volverás a la
              pantalla anterior del panel.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Seguir editando</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setDirty(false);
                setConfirmLeave(false);
                stepBack();
              }}
            >
              Salir sin guardar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogFooter>
      </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
