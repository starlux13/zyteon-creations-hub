import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Code2,
  Eye,
  Monitor,
  Plus,
  RefreshCw,
  Save,
  Send,
  Smartphone,
  Trash2,
  Rocket,
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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { MediaField } from "@/components/panel/MediaField";
import { usePanel } from "@/components/panel/panel-context";
import { PublicSite } from "@/components/site/PublicSite";
import { logAudit, useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  configOf,
  fetchActiveVersion,
  fetchMyDraft,
  fetchVersions,
  nextVersionNumber,
} from "@/lib/panel-data";
import type { DeviceKey, SiteConfig, ViewConfig } from "@/lib/site-config";

export const Route = createFileRoute("/_authenticated/panel/editor")({
  component: EditorPage,
});

function EditorPage() {
  const { user, isAdminManager } = useAuth();
  const { setDirty } = usePanel();
  const queryClient = useQueryClient();

  const activeQuery = useQuery({ queryKey: ["active-version"], queryFn: fetchActiveVersion });
  const versionsQuery = useQuery({ queryKey: ["versions"], queryFn: fetchVersions });
  const draftQuery = useQuery({
    queryKey: ["my-draft", user?.id],
    queryFn: () => fetchMyDraft(user!.id),
    enabled: !!user?.id,
  });

  const [config, setConfig] = useState<SiteConfig | null>(null);
  const [baseVersionId, setBaseVersionId] = useState<string | null>(null);
  const [device, setDevice] = useState<DeviceKey>("desktop");
  const [mode, setMode] = useState<"visual" | "code">("visual");
  const [codeText, setCodeText] = useState("");
  const [title, setTitle] = useState("Cambios de diseño");
  const [message, setMessage] = useState("");
  const [confirmSave, setConfirmSave] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const [versionName, setVersionName] = useState("");

  // Carga inicial: borrador propio si existe, si no la versión activa.
  useEffect(() => {
    if (config || activeQuery.isLoading || draftQuery.isLoading) return;
    const draft = draftQuery.data;
    const active = activeQuery.data;
    const initial = draft ? configOf(draft) : configOf(active);
    setConfig(initial);
    setBaseVersionId(draft?.base_version_id ?? active?.id ?? null);
    if (draft) {
      setTitle(draft.title);
      setMessage(draft.message);
    }
  }, [config, activeQuery.data, activeQuery.isLoading, draftQuery.data, draftQuery.isLoading]);

  useEffect(() => {
    if (config) setCodeText(JSON.stringify(config, null, 2));
  }, [config]);

  const outdated = useMemo(
    () => !!activeQuery.data && !!baseVersionId && activeQuery.data.id !== baseVersionId,
    [activeQuery.data, baseVersionId],
  );

  const update = (updater: (draft: SiteConfig) => SiteConfig) => {
    setConfig((prev) => (prev ? updater(structuredClone(prev)) : prev));
    setDirty(true);
  };

  const updateView = (updater: (view: ViewConfig) => void) =>
    update((draft) => {
      updater(draft[device]);
      return draft;
    });

  if (!config) {
    return <p className="text-muted-foreground">Cargando configuración de la web…</p>;
  }

  const view = config[device];

  const saveDraft = async () => {
    if (!user) return;
    const payload = {
      author_id: user.id,
      title,
      message,
      config: config as never,
      base_version_id: baseVersionId,
      status: "pending" as const,
      submitted: draftQuery.data?.submitted ?? false,
    };
    const existing = draftQuery.data;
    const { error } = existing
      ? await supabase.from("site_drafts").update(payload).eq("id", existing.id)
      : await supabase.from("site_drafts").insert(payload);
    if (error) {
      toast.error(error.message);
      return;
    }
    setDirty(false);
    await logAudit("draft_saved", { title });
    await queryClient.invalidateQueries({ queryKey: ["my-draft", user.id] });
    await queryClient.invalidateQueries({ queryKey: ["drafts"] });
    toast.success("Borrador guardado");
  };

  const submitDraft = async () => {
    if (!user) return;
    await saveDraft();
    const { data: current } = await supabase
      .from("site_drafts")
      .select("id")
      .eq("author_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!current) return;
    const { error } = await supabase
      .from("site_drafts")
      .update({ submitted: true, status: "pending" })
      .eq("id", current.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    await logAudit("draft_submitted", { title });
    await queryClient.invalidateQueries({ queryKey: ["drafts"] });
    toast.success("Enviado al buzón del Admin Manager");
  };

  const publishNow = async () => {
    if (!user || !isAdminManager) return;
    const number = nextVersionNumber(versionsQuery.data ?? []);
    await supabase.from("site_versions").update({ is_active: false }).eq("is_active", true);
    const { error } = await supabase.from("site_versions").insert({
      version_number: number,
      version_name: versionName || `Actualización ${number}`,
      config: config as never,
      is_active: true,
      published_by: user.id,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    setDirty(false);
    setPublishOpen(false);
    await logAudit("version_published", { number, name: versionName });
    await queryClient.invalidateQueries();
    toast.success(`Versión ${number} publicada en la web principal`);
  };

  const syncWithActive = () => {
    const active = activeQuery.data;
    if (!active) return;
    const activeConfig = configOf(active);
    // Se toma la web activa como base y se le sobreescriben mis cambios actuales.
    setConfig({ ...activeConfig, ...config });
    setBaseVersionId(active.id);
    setDirty(true);
    toast.success("Base actualizada con la versión activa, conservando tus cambios");
  };

  const applyCode = () => {
    try {
      const parsed = JSON.parse(codeText) as SiteConfig;
      setConfig(parsed);
      setDirty(true);
      toast.success("Código aplicado a la vista previa");
    } catch {
      toast.error("El JSON tiene un error de sintaxis");
    }
  };

  return (
    <div className="mx-auto max-w-[1500px] space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Editor de la web</h1>
          <p className="text-sm text-muted-foreground">
            Base: v{activeQuery.data?.version_number ?? "—"} ·{" "}
            {isAdminManager
              ? "puedes publicar directamente"
              : "tus cambios van al buzón de aprobación"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {outdated ? (
            <Button variant="outline" onClick={syncWithActive} className="border-warning/60">
              <RefreshCw className="mr-2 h-4 w-4" /> Actualizar base a la web actual
            </Button>
          ) : null}
          <Button variant="secondary" onClick={() => setConfirmSave(true)}>
            <Save className="mr-2 h-4 w-4" /> Guardar
          </Button>
          <Button variant="secondary" onClick={submitDraft}>
            <Send className="mr-2 h-4 w-4" /> Enviar a aprobación
          </Button>
          {isAdminManager ? (
            <Button className="bg-gradient-brand border-0" onClick={() => setPublishOpen(true)}>
              <Rocket className="mr-2 h-4 w-4" /> Publicar versión
            </Button>
          ) : null}
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <Tabs value={device} onValueChange={(v) => setDevice(v as DeviceKey)}>
          <TabsList>
            <TabsTrigger value="desktop">
              <Monitor className="mr-2 h-4 w-4" /> PC
            </TabsTrigger>
            <TabsTrigger value="mobile">
              <Smartphone className="mr-2 h-4 w-4" /> Celular
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <Tabs value={mode} onValueChange={(v) => setMode(v as "visual" | "code")}>
          <TabsList>
            <TabsTrigger value="visual">
              <Eye className="mr-2 h-4 w-4" /> Visual
            </TabsTrigger>
            <TabsTrigger value="code">
              <Code2 className="mr-2 h-4 w-4" /> Código
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <Badge variant="outline">
          Editando la personalización de {device === "desktop" ? "PC" : "celular"}
        </Badge>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,420px)_1fr]">
        <section className="space-y-4">
          {mode === "code" ? (
            <div className="surface-panel space-y-3 rounded-2xl p-4">
              <Label>Configuración en código (JSON)</Label>
              <Textarea
                value={codeText}
                onChange={(e) => setCodeText(e.target.value)}
                spellCheck={false}
                className="h-[540px] font-mono text-xs"
              />
              <Button onClick={applyCode} className="w-full">
                Aplicar a la vista previa
              </Button>
            </div>
          ) : (
            <Accordion type="multiple" defaultValue={["marca", "hero"]} className="space-y-3">
              <Item value="marca" label="Marca e identidad">
                <Field label="Nombre visual (grande)">
                  <Input
                    value={config.brand.name}
                    onChange={(e) =>
                      update((d) => {
                        d.brand.name = e.target.value;
                        return d;
                      })
                    }
                  />
                </Field>
                <Field label="Nombre legal / completo">
                  <Input
                    value={config.brand.legalName}
                    onChange={(e) =>
                      update((d) => {
                        d.brand.legalName = e.target.value;
                        return d;
                      })
                    }
                  />
                </Field>
                <Field label="Frase de marca">
                  <Input
                    value={config.brand.tagline}
                    onChange={(e) =>
                      update((d) => {
                        d.brand.tagline = e.target.value;
                        return d;
                      })
                    }
                  />
                </Field>
                <MediaField
                  kind="logo"
                  label="Logo de la agencia"
                  value={config.brand.logoUrl}
                  onChange={(url) =>
                    update((d) => {
                      d.brand.logoUrl = url;
                      return d;
                    })
                  }
                  hint="Se muestra en el encabezado (32 px) y en el hero (96 px de alto)"
                />
              </Item>

              <Item value="hero" label={`Hero con video — ${device === "desktop" ? "PC" : "Celular"}`}>
                <MediaField
                  kind="video"
                  label="Video de fondo"
                  value={view.hero.videoUrl}
                  onChange={(url) => updateView((v) => void (v.hero.videoUrl = url))}
                  hint="Sin audio, se reproduce en bucle automáticamente"
                />
                <Field label="Orientación del video">
                  <Tabs
                    value={view.hero.orientation}
                    onValueChange={(val) =>
                      updateView(
                        (v) => void (v.hero.orientation = val as "horizontal" | "vertical"),
                      )
                    }
                  >
                    <TabsList>
                      <TabsTrigger value="horizontal">Horizontal</TabsTrigger>
                      <TabsTrigger value="vertical">Vertical</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </Field>
                <Field label="Título principal">
                  <Input
                    value={view.hero.title}
                    onChange={(e) => updateView((v) => void (v.hero.title = e.target.value))}
                  />
                </Field>
                <Field label="Subtítulo">
                  <Textarea
                    value={view.hero.subtitle}
                    onChange={(e) => updateView((v) => void (v.hero.subtitle = e.target.value))}
                  />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Texto del botón">
                    <Input
                      value={view.hero.ctaLabel}
                      onChange={(e) => updateView((v) => void (v.hero.ctaLabel = e.target.value))}
                    />
                  </Field>
                  <Field label="Destino del botón">
                    <Input
                      value={view.hero.ctaHref}
                      onChange={(e) => updateView((v) => void (v.hero.ctaHref = e.target.value))}
                    />
                  </Field>
                </div>
                <Field label={`Oscurecer fondo: ${view.hero.overlay}%`}>
                  <Slider
                    value={[view.hero.overlay]}
                    min={0}
                    max={95}
                    step={5}
                    onValueChange={([val]) => updateView((v) => void (v.hero.overlay = val ?? 60))}
                  />
                </Field>
                <Toggle
                  label="Mostrar logo dentro del hero"
                  checked={view.hero.showLogo}
                  onChange={(val) => updateView((v) => void (v.hero.showLogo = val))}
                />
              </Item>

              <Item value="nosotros" label="Quiénes somos">
                <Toggle
                  label="Sección visible"
                  checked={view.about.visible}
                  onChange={(val) => updateView((v) => void (v.about.visible = val))}
                />
                <Field label="Título">
                  <Input
                    value={view.about.title}
                    onChange={(e) => updateView((v) => void (v.about.title = e.target.value))}
                  />
                </Field>
                <Field label="Texto">
                  <Textarea
                    className="min-h-28"
                    value={view.about.body}
                    onChange={(e) => updateView((v) => void (v.about.body = e.target.value))}
                  />
                </Field>
              </Item>

              <Item value="secciones" label="Secciones visibles en este dispositivo">
                <Toggle
                  label="Planes"
                  checked={view.sections.plans}
                  onChange={(val) => updateView((v) => void (v.sections.plans = val))}
                />
                <Toggle
                  label="Portafolio"
                  checked={view.sections.portfolio}
                  onChange={(val) => updateView((v) => void (v.sections.portfolio = val))}
                />
                <Toggle
                  label="Equipo"
                  checked={view.sections.team}
                  onChange={(val) => updateView((v) => void (v.sections.team = val))}
                />
              </Item>

              <Item value="planes" label={`Planes (${config.plans.length})`}>
                {config.plans.map((plan, index) => (
                  <div key={plan.id} className="space-y-3 rounded-xl border border-border p-3">
                    <div className="flex items-center justify-between">
                      <Input
                        value={plan.name}
                        onChange={(e) =>
                          update((d) => {
                            d.plans[index]!.name = e.target.value;
                            return d;
                          })
                        }
                        className="max-w-[60%]"
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() =>
                          update((d) => {
                            d.plans.splice(index, 1);
                            return d;
                          })
                        }
                        aria-label="Eliminar plan"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        value={plan.price}
                        placeholder="Precio"
                        onChange={(e) =>
                          update((d) => {
                            d.plans[index]!.price = e.target.value;
                            return d;
                          })
                        }
                      />
                      <Input
                        value={plan.period}
                        placeholder="Periodo"
                        onChange={(e) =>
                          update((d) => {
                            d.plans[index]!.period = e.target.value;
                            return d;
                          })
                        }
                      />
                    </div>
                    <Textarea
                      value={plan.features.join("\n")}
                      placeholder="Una característica por línea"
                      onChange={(e) =>
                        update((d) => {
                          d.plans[index]!.features = e.target.value.split("\n");
                          return d;
                        })
                      }
                    />
                    <Toggle
                      label="Destacado"
                      checked={plan.highlight}
                      onChange={(val) =>
                        update((d) => {
                          d.plans[index]!.highlight = val;
                          return d;
                        })
                      }
                    />
                  </div>
                ))}
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    update((d) => {
                      d.plans.push({
                        id: `plan-${Date.now()}`,
                        name: "Nuevo plan",
                        price: "$0",
                        period: "proyecto",
                        highlight: false,
                        features: ["Característica 1"],
                      });
                      return d;
                    })
                  }
                >
                  <Plus className="mr-2 h-4 w-4" /> Añadir plan
                </Button>
              </Item>

              <Item value="experiencias" label={`Experiencias de usuario (${config.experiences.length})`}>
                {config.experiences.map((exp, index) => (
                  <div key={exp.id} className="space-y-2 rounded-xl border border-border p-3">
                    <div className="flex gap-2">
                      <Input
                        value={exp.author}
                        placeholder="Nombre"
                        onChange={(e) =>
                          update((d) => {
                            d.experiences[index]!.author = e.target.value;
                            return d;
                          })
                        }
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() =>
                          update((d) => {
                            d.experiences.splice(index, 1);
                            return d;
                          })
                        }
                        aria-label="Eliminar experiencia"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <Input
                      value={exp.role}
                      placeholder="Cargo / empresa"
                      onChange={(e) =>
                        update((d) => {
                          d.experiences[index]!.role = e.target.value;
                          return d;
                        })
                      }
                    />
                    <Textarea
                      value={exp.quote}
                      placeholder="Testimonio"
                      onChange={(e) =>
                        update((d) => {
                          d.experiences[index]!.quote = e.target.value;
                          return d;
                        })
                      }
                    />
                  </div>
                ))}
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    update((d) => {
                      d.experiences.push({
                        id: `exp-${Date.now()}`,
                        author: "Cliente",
                        role: "Cargo",
                        quote: "Testimonio",
                      });
                      return d;
                    })
                  }
                >
                  <Plus className="mr-2 h-4 w-4" /> Añadir experiencia
                </Button>
              </Item>

              <Item value="vista" label="Vista general e idioma">
                <Field label="Idioma de la web">
                  <Tabs
                    value={config.language}
                    onValueChange={(val) =>
                      update((d) => {
                        d.language = val as "es" | "en";
                        return d;
                      })
                    }
                  >
                    <TabsList>
                      <TabsTrigger value="es">Español</TabsTrigger>
                      <TabsTrigger value="en">English</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </Field>
                <Field label="Fondo de la web (cuando no hay video)">
                  <Tabs
                    value={config.theme.background}
                    onValueChange={(val) =>
                      update((d) => {
                        d.theme.background = val as "grid" | "plain" | "aurora";
                        return d;
                      })
                    }
                  >
                    <TabsList>
                      <TabsTrigger value="grid">Rejilla</TabsTrigger>
                      <TabsTrigger value="plain">Plano</TabsTrigger>
                      <TabsTrigger value="aurora">Aurora</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </Field>
                <Field label="Correo de contacto">
                  <Input
                    value={config.contact.email}
                    onChange={(e) =>
                      update((d) => {
                        d.contact.email = e.target.value;
                        return d;
                      })
                    }
                  />
                </Field>
                <Toggle
                  label="Mostrar contacto"
                  checked={config.contact.visible}
                  onChange={(val) =>
                    update((d) => {
                      d.contact.visible = val;
                      return d;
                    })
                  }
                />
              </Item>

              <Item value="envio" label="Datos del envío a aprobación">
                <Field label="Título del cambio">
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} />
                </Field>
                <Field label="Nota para el Admin Manager">
                  <Textarea value={message} onChange={(e) => setMessage(e.target.value)} />
                </Field>
              </Item>
            </Accordion>
          )}
        </section>

        <section className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Eye className="h-4 w-4" /> Vista previa en tiempo real —{" "}
            {device === "desktop" ? "PC" : "Celular"}
          </div>
          <div
            className={`surface-panel overflow-hidden rounded-2xl ${device === "mobile" ? "mx-auto w-[390px]" : "w-full"}`}
          >
            <div className="h-[75vh] overflow-y-auto">
              <div className={device === "mobile" ? "w-[390px]" : ""}>
                <PreviewFrame config={config} device={device} />
              </div>
            </div>
          </div>
        </section>
      </div>

      <AlertDialog open={confirmSave} onOpenChange={setConfirmSave}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Seguro que quieres ejecutar esta acción?</AlertDialogTitle>
            <AlertDialogDescription>
              Se guardará toda la configuración actual en tu borrador. La web pública no cambia
              hasta que el Admin Manager publique una versión.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmSave(false);
                void saveDraft();
              }}
            >
              Sí, guardar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={publishOpen} onOpenChange={setPublishOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Publicar versión {nextVersionNumber(versionsQuery.data ?? [])}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Esta configuración pasará a la web principal. La versión anterior queda guardada para
              volver atrás en cualquier momento.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label>Nombre de la versión</Label>
            <Input
              value={versionName}
              onChange={(e) => setVersionName(e.target.value)}
              placeholder="Portfolio Update"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={publishNow}>Dar luz verde y publicar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function PreviewFrame({ config, device }: { config: SiteConfig; device: DeviceKey }) {
  // La vista previa fuerza el dispositivo elegido usando el config correspondiente.
  const forced: SiteConfig =
    device === "mobile" ? { ...config, desktop: config.mobile } : { ...config, mobile: config.desktop };
  return (
    <div className="pointer-events-none origin-top scale-[0.85]">
      <PublicSite
        data={{
          config: forced,
          versionName: "vista previa",
          versionNumber: "draft",
          projects: [],
          team: [],
        }}
      />
    </div>
  );
}

function Item({
  value,
  label,
  children,
}: {
  value: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <AccordionItem value={value} className="surface-panel rounded-2xl border px-4">
      <AccordionTrigger className="text-sm font-semibold">{label}</AccordionTrigger>
      <AccordionContent className="space-y-4 pb-4">{children}</AccordionContent>
    </AccordionItem>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
      <Label className="text-sm">{label}</Label>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
