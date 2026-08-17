import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";

import { PublicSite } from "@/components/site/PublicSite";
import { getPublicSite } from "@/lib/public-site.functions";

const siteQuery = queryOptions({
  queryKey: ["public-site"],
  queryFn: () => getPublicSite(),
});

export const Route = createFileRoute("/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(siteQuery),
  head: () => ({
    meta: [
      { title: "ZYTEON — Agencia de diseño y desarrollo web" },
      {
        name: "description",
        content:
          "ZYTEON es una agencia de tres fundadores: diseño, desarrollo y estrategia para webs de alto impacto. Portafolio, planes y proyectos en vivo.",
      },
      { property: "og:title", content: "ZYTEON — Agencia de diseño y desarrollo web" },
      {
        property: "og:description",
        content: "ZYTEON es una agencia de tres fundadores: diseño, desarrollo y estrategia para webs de alto impacto. Portafolio, planes y proyectos en vivo.",
      },
    ],
  }),
  component: HomePage,
  errorComponent: () => (
    <div className="flex min-h-screen items-center justify-center p-6 text-center">
      <p className="text-muted-foreground">
        No pudimos cargar la configuración de la web. Intenta recargar.
      </p>
    </div>
  ),
});

function HomePage() {
  const { data } = useSuspenseQuery(siteQuery);
  return <PublicSite data={data} />;
}
