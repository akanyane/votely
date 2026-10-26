import { createFileRoute } from '@tanstack/react-router'
import { PaginaLive } from '@/components/live/PaginaLive'
import { ELEICAO } from '@/config/election'
import { buscaLive } from '@/lib/live/busca'

// live_.classico: layout anterior do Live (todos os cargos e mapa por
// município), fora do layout do /live, que agora é o painel

export const Route = createFileRoute('/live_/classico')({
  validateSearch: buscaLive,
  head: () => ({
    meta: [
      { title: 'Votely Live · Todos os cargos' },
      {
        name: 'description',
        content:
          'Acompanhe a apuração das Eleições 2026 em tempo real, com dados oficiais do TSE: presidente, governador, senado e deputados.',
      },
      {
        property: 'og:title',
        content: 'Votely Live · Resultados das Eleições 2026',
      },
      {
        property: 'og:url',
        content: 'https://votely.akanyane.dev/live/classico',
      },
    ],
    links: [
      { rel: 'canonical', href: 'https://votely.akanyane.dev/live/classico' },
    ],
  }),
  component: Live,
})

function Live() {
  const navigate = Route.useNavigate()
  return (
    <PaginaLive
      turno={ELEICAO.turno}
      s={Route.useSearch()}
      onBusca={(mudanca) =>
        navigate({
          search: (atual) => ({ ...atual, ...mudanca }),
          replace: true,
          resetScroll: false,
        })
      }
    />
  )
}
