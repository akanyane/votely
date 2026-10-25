import { createFileRoute, Link } from '@tanstack/react-router'
import { ChevronLeftIcon } from 'lucide-react'
import { z } from 'zod'
import { MapaCidadesBrasil } from '@/components/live/MapaCidadesBrasil'
import { ELEICAO } from '@/config/election'
import { TurnoProvider } from '@/lib/live/turno'

// live_.map: página própria em /live/map, fora do layout do /live
export const Route = createFileRoute('/live_/map')({
  // ?turno=1 guarda o mapa do 1º turno depois do 2º
  validateSearch: z.object({
    turno: z.literal(1).optional().catch(undefined),
  }),
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
  const turno = Route.useSearch().turno ?? ELEICAO.turno
  const outro = ELEICAO.turno === 2
  return (
    <TurnoProvider value={turno}>
      <div className="mx-auto max-w-[1400px] px-4 pt-3 lg:px-10 lg:pt-6">
        <header className="flex flex-wrap items-center justify-between gap-2 pt-1 pb-4">
          <Link
            to={turno === 1 && outro ? '/live/1-turno' : '/live'}
            className="flex min-h-12 items-center gap-0.5 pr-2 text-[17px] font-bold text-accent-foreground no-underline hover:opacity-80"
          >
            <ChevronLeftIcon className="size-[22px]" strokeWidth={2.6} />
            Votely Live
          </Link>
          {outro && (
            <Link
              to="/live/map"
              search={turno === 1 ? {} : { turno: 1 }}
              className="flex min-h-12 items-center px-2 text-[17px] font-bold text-accent-foreground no-underline hover:opacity-80"
            >
              {turno === 1 ? 'Ver o 2º turno' : 'Ver o 1º turno'}
            </Link>
          )}
        </header>
        <h1 className="text-[28px] leading-[1.15] font-extrabold">
          Presidente · quem vence em cada cidade
        </h1>
        {outro && (
          <p className="mt-1 text-[17px] font-bold">
            {turno === 1
              ? '1º turno · 4 de outubro'
              : '2º turno · 25 de outubro'}
          </p>
        )}
        <p className="mt-1 mb-5 text-[16px] text-pretty text-muted-foreground">
          Cada cidade tem a cor do partido do candidato mais votado nela até
          agora. Resultado parcial até o fim da totalização.
        </p>
        <MapaCidadesBrasil />
        <footer className="mt-10 border-t border-border px-1 pt-6 pb-9 text-[16px] text-muted-foreground">
          <p>
            Dados oficiais do TSE; malha dos municípios do IBGE. O Votely não é
            um serviço oficial da Justiça Eleitoral.
          </p>
        </footer>
      </div>
    </TurnoProvider>
  )
}
