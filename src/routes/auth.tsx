import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Acceso del equipo — ZYTEON" },
      {
        name: "description",
        content: "Área privada de ZYTEON: acceso exclusivo para los tres fundadores de la agencia.",
      },
      { property: "og:title", content: "Acceso del equipo — ZYTEON" },
      { property: "og:description", content: "Área privada del equipo fundador de ZYTEON." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) void navigate({ to: "/panel" });
    });
  }, [navigate]);

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    void navigate({ to: "/panel" });
  };

  const signUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName || email.split("@")[0] },
        emailRedirectTo: `${window.location.origin}/panel`,
      },
    });
    setLoading(false);
    if (error) {
      toast.error(
        error.message.includes("3 cuentas")
          ? "El equipo ZYTEON ya tiene sus 3 cuentas registradas."
          : error.message,
      );
      return;
    }
    toast.success("Cuenta creada. Revisa tu correo si se pide confirmación.");
    void navigate({ to: "/panel" });
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center px-4">
      <div className="bg-tech-grid absolute inset-0 opacity-40" />
      <div className="absolute left-1/2 top-0 h-72 w-72 -translate-x-1/2 rounded-full bg-primary/20 blur-3xl" />
      <div className="surface-panel relative z-10 w-full max-w-md rounded-2xl p-8">
        <Link to="/" className="font-display text-2xl font-bold">
          <span className="text-gradient-brand">ZYTEON</span>
        </Link>
        <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
          <ShieldCheck className="h-4 w-4 text-primary" /> Acceso restringido al equipo fundador
        </p>

        <Tabs defaultValue="signin" className="mt-7">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signin">Ingresar</TabsTrigger>
            <TabsTrigger value="signup">Registrar cuenta</TabsTrigger>
          </TabsList>

          <TabsContent value="signin">
            <form onSubmit={signIn} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Correo</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
              </div>
              <Button type="submit" disabled={loading} className="bg-gradient-brand w-full border-0">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Entrar al panel"}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="signup">
            <form onSubmit={signUp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre visible</Label>
                <Input
                  id="name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="STARLUX - Luis Prada"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email2">Correo</Label>
                <Input
                  id="email2"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password2">Contraseña</Label>
                <Input
                  id="password2"
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Solo se permiten 3 cuentas. La primera en registrarse queda como{" "}
                <span className="text-primary">Admin Manager</span>.
              </p>
              <Button type="submit" disabled={loading} className="w-full" variant="secondary">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Crear cuenta"}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}
