import { createFileRoute, Link } from '@tanstack/react-router'
import { ChevronLeftIcon } from 'lucide-react'
import { MapaCidadesBrasil } from '@/components/live/MapaCidadesBrasil'

// live_.map: página própria em /live/map, fora do layout do /live
export const Route = createFileRoute('/live_/map')({
  head: () => ({
    meta: [
      { title: 'Mapa por cidade · Votely Live' },
      {
        name: 'description',
        content:
          'Presidente: o partido do candidato mais votado em cada cidade do Brasil, com dados oficiais do TSE.',
      },
    ],
    links: [{ rel: 'canonical', href: 'https://votely.akanyane.dev/live/map' }],
  }),
  component: PaginaMapa,
})

function PaginaMapa() {
  return (
    <div className="mx-auto max-w-[1400px] px-4 pt-3 lg:px-10 lg:pt-6">
      <header className="flex flex-wrap items-center justify-between gap-2 pt-1 pb-4">
        <Link
          to="/live"
          className="flex min-h-12 items-center gap-0.5 pr-2 text-[17px] font-bold text-accent-foreground no-underline hover:opacity-80"
        >
          <ChevronLeftIcon className="size-[22px]" strokeWidth={2.6} />
          Votely Live
        </Link>
      </header>
      <h1 className="text-[28px] leading-[1.15] font-extrabold">
        Presidente · quem vence em cada cidade
      </h1>
      <p className="mt-1 mb-5 text-[16px] text-pretty text-muted-foreground">
        Cada cidade tem a cor do partido do candidato mais votado nela até
        agora. Resultado parcial até o fim da totalização.
      </p>
      <MapaCidadesBrasil />
      <footer className="mt-10 border-t border-border px-1 pt-6 pb-9 text-[16px] text-muted-foreground">
        <p>
          Dados oficiais do TSE; malha dos municípios do IBGE. O Votely não é um
          serviço oficial da Justiça Eleitoral.
        </p>
      </footer>
    </div>
  )
}
