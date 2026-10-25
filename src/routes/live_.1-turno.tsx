import { createFileRoute } from '@tanstack/react-router'
import { PaginaLive } from '@/components/live/PaginaLive'
import { buscaLive } from '@/lib/live/busca'

// live_.1-turno: página própria em /live/1-turno, fora do layout do /live
export const Route = createFileRoute('/live_/1-turno')({
  validateSearch: buscaLive,
  head: () => ({
    meta: [
      { title: 'Votely Live · Resultado do 1º turno das Eleições 2026' },
      {
        name: 'description',
        content:
          'Resultado do 1º turno das Eleições 2026 (4 de outubro), com dados oficiais do TSE: presidente, governador, senado e deputados.',
      },
      {
        property: 'og:title',
        content: 'Votely Live · Resultado do 1º turno das Eleições 2026',
      },
      {
        property: 'og:url',
        content: 'https://votely.akanyane.dev/live/1-turno',
      },
    ],
    links: [
      { rel: 'canonical', href: 'https://votely.akanyane.dev/live/1-turno' },
    ],
  }),
  component: Live,
})

function Live() {
  const navigate = Route.useNavigate()
  return (
    <PaginaLive
      turno={1}
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
