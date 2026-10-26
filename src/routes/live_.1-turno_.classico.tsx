import { createFileRoute } from '@tanstack/react-router'
import { PaginaLive } from '@/components/live/PaginaLive'
import { buscaLive } from '@/lib/live/busca'

// Todos os cargos do 1º turno (layout anterior), em /live/1-turno/classico
export const Route = createFileRoute('/live_/1-turno_/classico')({
  validateSearch: buscaLive,
  head: () => ({
    meta: [
      { title: 'Votely Live · 1º turno, todos os cargos' },
      {
        name: 'description',
        content:
          'Resultado do 1º turno das Eleições 2026 (4 de outubro), com dados oficiais do TSE: presidente, governador, senado e deputados.',
      },
      {
        property: 'og:title',
        content: 'Votely Live · 1º turno, todos os cargos',
      },
      {
        property: 'og:url',
        content: 'https://votely.akanyane.dev/live/1-turno/classico',
      },
    ],
    links: [
      {
        rel: 'canonical',
        href: 'https://votely.akanyane.dev/live/1-turno/classico',
      },
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
