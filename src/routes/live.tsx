import { createFileRoute } from '@tanstack/react-router'
import { PaginaLive } from '@/components/live/PaginaLive'
import { ELEICAO } from '@/config/election'
import { buscaLive } from '@/lib/live/busca'

export const Route = createFileRoute('/live')({
  validateSearch: buscaLive,
  head: () => ({
    meta: [
      { title: 'Votely Live · Resultados das Eleições 2026' },
      {
        name: 'description',
        content:
          'Acompanhe a apuração das Eleições 2026 em tempo real, com dados oficiais do TSE: presidente, governador, senado e deputados.',
      },
      {
        property: 'og:title',
        content: 'Votely Live · Resultados das Eleições 2026',
      },
      { property: 'og:url', content: 'https://votely.akanyane.dev/live' },
    ],
    links: [{ rel: 'canonical', href: 'https://votely.akanyane.dev/live' }],
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
