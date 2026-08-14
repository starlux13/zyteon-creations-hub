import { Link } from "@tanstack/react-router";
import { ArrowRight, Check, Mail, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import type { PublicSiteData } from "@/lib/public-site.functions";
import { TEXT, type ViewConfig } from "@/lib/site-config";
import { ProjectCard } from "./ProjectCard";

export function PublicSite({ data }: { data: PublicSiteData }) {
  const isMobile = useIsMobile();
  const { config, projects, team } = data;
  const view: ViewConfig = isMobile ? config.mobile : config.desktop;
  const t = TEXT[config.language];

  return (
    <div className="min-h-screen bg-background">
      <header className="fixed inset-x-0 top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            {config.brand.logoUrl ? (
              <img
                src={config.brand.logoUrl}
                alt={`Logo de ${config.brand.name}`}
                className="h-8 w-8 object-contain"
              />
            ) : (
              <span className="bg-gradient-brand flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold text-primary-foreground">
                Z
              </span>
            )}
            <span className="font-display text-lg font-bold tracking-tight">
              {config.brand.name}
            </span>
          </div>
          <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
            <a href="#nosotros" className="transition-colors hover:text-foreground">
              {view.about.title}
            </a>
            <a href="#planes" className="transition-colors hover:text-foreground">
              {t.services}
            </a>
            <a href="#portafolio" className="transition-colors hover:text-foreground">
              {t.portfolio}
            </a>
          </nav>
          <Button asChild size="sm" variant="secondary">
            <Link to="/auth">{t.login}</Link>
          </Button>
        </div>
      </header>

      <section className="relative flex min-h-[92vh] items-center justify-center overflow-hidden">
        {view.hero.videoUrl ? (
          <video
            key={view.hero.videoUrl}
            src={view.hero.videoUrl}
            autoPlay
            muted
            loop
            playsInline
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="bg-tech-grid absolute inset-0 opacity-70" />
        )}
        <div
          className="absolute inset-0 bg-background"
          style={{ opacity: view.hero.overlay / 100 }}
        />
        <div className="absolute -top-40 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-primary/20 blur-3xl" />

        <div className="relative z-10 mx-auto max-w-4xl px-4 text-center">
          {view.hero.showLogo && config.brand.logoUrl ? (
            <img
              src={config.brand.logoUrl}
              alt={`Logo de ${config.brand.name}`}
              className="mx-auto mb-8 h-24 object-contain"
            />
          ) : null}
          <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs uppercase tracking-[0.25em] text-primary">
            <Sparkles className="h-3.5 w-3.5" /> {config.brand.legalName}
          </p>
          <h1 className="font-display text-6xl font-bold leading-[0.95] sm:text-7xl md:text-8xl">
            <span className="text-gradient-brand">{view.hero.title}</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base text-muted-foreground sm:text-lg">
            {view.hero.subtitle}
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg" className="bg-gradient-brand glow-ring border-0">
              <a href={view.hero.ctaHref}>
                {view.hero.ctaLabel} <ArrowRight className="ml-2 h-4 w-4" />
              </a>
            </Button>
            {config.contact.visible ? (
              <Button asChild size="lg" variant="outline">
                <a href={`mailto:${config.contact.email}`}>
                  <Mail className="mr-2 h-4 w-4" /> {t.contact}
                </a>
              </Button>
            ) : null}
          </div>
        </div>
      </section>

      {view.about.visible ? (
        <section id="nosotros" className="mx-auto max-w-5xl px-4 py-24">
          <h2 className="font-display text-3xl font-bold sm:text-4xl">{view.about.title}</h2>
          <p className="mt-5 max-w-3xl text-lg leading-relaxed text-muted-foreground">
            {view.about.body}
          </p>
          <p className="mt-4 text-sm uppercase tracking-widest text-primary">
            {config.brand.tagline}
          </p>
        </section>
      ) : null}

      {view.sections.plans ? (
        <section id="planes" className="border-y border-border/60 bg-surface/40 py-24">
          <div className="mx-auto max-w-6xl px-4">
            <h2 className="font-display text-3xl font-bold sm:text-4xl">{t.services}</h2>
            <p className="mt-2 text-muted-foreground">{t.servicesLead}</p>
            <div className="mt-12 grid gap-6 md:grid-cols-3">
              {config.plans.map((plan) => (
                <div
                  key={plan.id}
                  className={`surface-panel rounded-2xl p-7 ${plan.highlight ? "glow-ring border-primary/40" : ""}`}
                >
                  {plan.highlight ? (
                    <span className="mb-4 inline-block rounded-full bg-primary/15 px-3 py-1 text-xs uppercase tracking-widest text-primary">
                      Recomendado
                    </span>
                  ) : null}
                  <h3 className="font-display text-xl font-bold">{plan.name}</h3>
                  <p className="mt-3 flex items-end gap-2">
                    <span className="font-display text-3xl font-bold">{plan.price}</span>
                    <span className="pb-1 text-xs text-muted-foreground">/ {plan.period}</span>
                  </p>
                  <ul className="mt-6 space-y-3 text-sm">
                    {plan.features.map((f) => (
                      <li key={f} className="flex gap-2 text-muted-foreground">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {view.sections.portfolio ? (
        <section id="portafolio" className="mx-auto max-w-6xl px-4 py-24">
          <h2 className="font-display text-3xl font-bold sm:text-4xl">{t.portfolio}</h2>
          <p className="mt-2 text-muted-foreground">{t.portfolioLead}</p>
          {projects.length === 0 ? (
            <p className="mt-10 rounded-xl border border-dashed border-border p-10 text-center text-muted-foreground">
              Aún no hay proyectos publicados. Cárgalos desde el panel interno.
            </p>
          ) : (
            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {projects.map((project) => (
                <ProjectCard key={project.id} project={project} lang={config.language} />
              ))}
            </div>
          )}
        </section>
      ) : null}

      {config.experiences.length ? (
        <section className="border-t border-border/60 bg-surface/40 py-24">
          <div className="mx-auto max-w-6xl px-4">
            <h2 className="font-display text-3xl font-bold sm:text-4xl">{t.experiences}</h2>
            <div className="mt-10 grid gap-6 md:grid-cols-2">
              {config.experiences.map((exp) => (
                <blockquote key={exp.id} className="surface-panel rounded-2xl p-7">
                  <p className="text-lg leading-relaxed">“{exp.quote}”</p>
                  <footer className="mt-5 text-sm text-muted-foreground">
                    <span className="font-semibold text-foreground">{exp.author}</span> · {exp.role}
                  </footer>
                </blockquote>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {view.sections.team && team.length ? (
        <section className="mx-auto max-w-6xl px-4 py-24">
          <h2 className="font-display text-3xl font-bold sm:text-4xl">{t.team}</h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 md:grid-cols-3">
            {team.map((member) => (
              <div key={member.id} className="surface-panel rounded-2xl p-6">
                {member.avatar_url ? (
                  <img
                    src={member.avatar_url}
                    alt={member.display_name}
                    className="h-16 w-16 rounded-full object-cover"
                  />
                ) : (
                  <div className="bg-gradient-brand flex h-16 w-16 items-center justify-center rounded-full font-display text-xl font-bold text-primary-foreground">
                    {member.display_name.slice(0, 1).toUpperCase()}
                  </div>
                )}
                <h3 className="mt-4 text-lg font-semibold">{member.display_name}</h3>
                <p className="text-sm text-primary">{member.title}</p>
                {member.bio ? (
                  <p className="mt-2 text-sm text-muted-foreground">{member.bio}</p>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <footer className="border-t border-border/60 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 text-sm text-muted-foreground sm:flex-row">
          <span>
            © {new Date().getFullYear()} {config.brand.legalName}
          </span>
          <span className="font-mono text-xs">
            v{data.versionNumber} · {data.versionName}
          </span>
        </div>
      </footer>
    </div>
  );
}
