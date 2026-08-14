export type Orientation = "horizontal" | "vertical";

export type HeroConfig = {
  videoUrl: string | null;
  orientation: Orientation;
  title: string;
  subtitle: string;
  ctaLabel: string;
  ctaHref: string;
  showLogo: boolean;
  /** Opacidad de la capa oscura sobre el video, 0-100 */
  overlay: number;
};

export type AboutConfig = {
  title: string;
  body: string;
  visible: boolean;
};

export type SectionsConfig = {
  plans: boolean;
  portfolio: boolean;
  team: boolean;
};

export type ViewConfig = {
  hero: HeroConfig;
  about: AboutConfig;
  sections: SectionsConfig;
};

export type PlanConfig = {
  id: string;
  name: string;
  price: string;
  period: string;
  highlight: boolean;
  features: string[];
};

export type ExperienceConfig = {
  id: string;
  author: string;
  role: string;
  quote: string;
};

export type SiteConfig = {
  brand: {
    name: string;
    legalName: string;
    logoUrl: string | null;
    tagline: string;
  };
  language: "es" | "en";
  theme: { background: "grid" | "plain" | "aurora"; accent: string };
  desktop: ViewConfig;
  mobile: ViewConfig;
  plans: PlanConfig[];
  experiences: ExperienceConfig[];
  contact: { email: string; whatsapp: string; visible: boolean };
};

export type DeviceKey = "desktop" | "mobile";

/** Límites técnicos de los medios no estructurados. */
export const MEDIA_LIMITS = {
  video: {
    maxSeconds: 180,
    maxBytes: 50 * 1024 * 1024,
    formats: ["video/mp4", "video/webm"],
    recommended: {
      horizontal: "1920 x 1080 px (16:9)",
      vertical: "1080 x 1920 px (9:16)",
    },
  },
  logo: {
    maxBytes: 2 * 1024 * 1024,
    formats: ["image/png", "image/svg+xml", "image/webp"],
    recommended: "512 x 512 px, fondo transparente (SVG ideal)",
  },
  cover: {
    maxBytes: 4 * 1024 * 1024,
    formats: ["image/png", "image/jpeg", "image/webp"],
    recommended: "1200 x 750 px (16:10)",
  },
} as const;

export const defaultSiteConfig: SiteConfig = {
  brand: {
    name: "ZYTEON",
    legalName: "Agencia Zyteon",
    logoUrl: null,
    tagline: "Ingeniería digital para marcas que no pasan desapercibidas",
  },
  language: "es",
  theme: { background: "grid", accent: "cian" },
  desktop: {
    hero: {
      videoUrl: null,
      orientation: "horizontal",
      title: "ZYTEON",
      subtitle: "Diseñamos, desarrollamos y desplegamos experiencias web de alto impacto.",
      ctaLabel: "Ver portafolio",
      ctaHref: "#portafolio",
      showLogo: true,
      overlay: 60,
    },
    about: {
      title: "Quiénes somos",
      body: "Somos tres fundadores obsesionados con el detalle: diseño, desarrollo y estrategia en un mismo equipo.",
      visible: true,
    },
    sections: { plans: true, portfolio: true, team: true },
  },
  mobile: {
    hero: {
      videoUrl: null,
      orientation: "vertical",
      title: "ZYTEON",
      subtitle: "Webs de alto impacto, hechas a medida.",
      ctaLabel: "Ver portafolio",
      ctaHref: "#portafolio",
      showLogo: true,
      overlay: 70,
    },
    about: {
      title: "Quiénes somos",
      body: "Tres fundadores: diseño, desarrollo y estrategia.",
      visible: true,
    },
    sections: { plans: true, portfolio: true, team: true },
  },
  plans: [
    {
      id: "esencial",
      name: "Esencial",
      price: "$450.000",
      period: "proyecto",
      highlight: false,
      features: [
        "Landing page de una sección",
        "Diseño responsive",
        "Formulario de contacto",
        "Entrega en 7 días",
      ],
    },
    {
      id: "profesional",
      name: "Profesional",
      price: "$1.200.000",
      period: "proyecto",
      highlight: true,
      features: [
        "Hasta 5 secciones",
        "Identidad visual aplicada",
        "SEO base + analítica",
        "Panel editable",
        "Soporte 30 días",
      ],
    },
    {
      id: "elite",
      name: "Élite",
      price: "A medida",
      period: "por acuerdo",
      highlight: false,
      features: [
        "Aplicación web completa",
        "Backend y base de datos",
        "Integraciones y automatizaciones",
        "Soporte prioritario",
      ],
    },
  ],
  experiences: [
    {
      id: "e1",
      author: "Cliente piloto",
      role: "Emprendedor",
      quote: "El proceso fue claro y el resultado superó lo que imaginaba.",
    },
  ],
  contact: { email: "hola@zyteon.com", whatsapp: "", visible: true },
};

/** Rellena huecos para que un config guardado nunca rompa la vista. */
export function normalizeConfig(raw: unknown): SiteConfig {
  const base = defaultSiteConfig;
  if (!raw || typeof raw !== "object") return base;
  const input = raw as Partial<SiteConfig>;
  const view = (key: DeviceKey): ViewConfig => ({
    hero: { ...base[key].hero, ...(input[key]?.hero ?? {}) },
    about: { ...base[key].about, ...(input[key]?.about ?? {}) },
    sections: { ...base[key].sections, ...(input[key]?.sections ?? {}) },
  });
  return {
    brand: { ...base.brand, ...(input.brand ?? {}) },
    language: input.language ?? base.language,
    theme: { ...base.theme, ...(input.theme ?? {}) },
    desktop: view("desktop"),
    mobile: view("mobile"),
    plans: Array.isArray(input.plans) && input.plans.length ? input.plans : base.plans,
    experiences: Array.isArray(input.experiences) ? input.experiences : base.experiences,
    contact: { ...base.contact, ...(input.contact ?? {}) },
  };
}

export const TEXT = {
  es: {
    services: "Nuestros planes",
    servicesLead: "Tres formas de trabajar con nosotros.",
    portfolio: "Portafolio",
    portfolioLead: "Proyectos desplegados y en vivo.",
    team: "El equipo",
    experiences: "Experiencias de usuario",
    contact: "Hablemos",
    openSite: "Abrir sitio",
    copyUrl: "Copiar URL",
    share: "Compartir",
    remove: "Eliminar",
    panel: "Panel",
    login: "Ingresar",
  },
  en: {
    services: "Our plans",
    servicesLead: "Three ways to work with us.",
    portfolio: "Portfolio",
    portfolioLead: "Live, deployed projects.",
    team: "The team",
    experiences: "User experiences",
    contact: "Let's talk",
    openSite: "Open site",
    copyUrl: "Copy URL",
    share: "Share",
    remove: "Remove",
    panel: "Panel",
    login: "Sign in",
  },
} as const;
