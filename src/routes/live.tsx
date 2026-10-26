import { createFileRoute, redirect } from '@tanstack/react-router'
import { Painel } from '@/components/painel/Painel'
import { buscaLive } from '@/lib/live/busca'

export const Route = createFileRoute('/live')({
  validateSearch: buscaLive,
  // Links antigos com cargo/UF na URL (?aba=gov&uf=AM) eram do layout
  // anterior, que continua em /live/classico
  beforeLoad: ({ search }) => {
    if (search.aba || search.uf || search.dep) {
      throw redirect({ to: '/live/classico', search, replace: true })
    }
  },
  head: () => ({
    meta: [
      { title: 'Votely Live · Resultados das Eleições 2026' },
      {
        name: 'description',
        content:
          'Painel da apuração para presidente nas Eleições 2026, em tempo real, com dados oficiais do TSE: votos apurados, duelo, mapa por estado e evolução.',
      },
      {
        property: 'og:title',
        content: 'Votely Live · Resultados das Eleições 2026',
      },
      { property: 'og:url', content: 'https://votely.akanyane.dev/live' },
    ],
    links: [{ rel: 'canonical', href: 'https://votely.akanyane.dev/live' }],
  }),
  component: Painel,
})
