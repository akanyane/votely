import { createFileRoute, redirect } from '@tanstack/react-router'
import { Painel } from '@/components/painel/Painel'
import { buscaLive } from '@/lib/live/busca'

// Painel do 1º turno (resultado final e histórico da apuração de 04/10)
export const Route = createFileRoute('/live_/1-turno')({
  validateSearch: buscaLive,
  // Links com cargo/UF eram da página com todos os cargos
  beforeLoad: ({ search }) => {
    if (search.aba || search.uf || search.dep) {
      throw redirect({ to: '/live/1-turno/classico', search, replace: true })
    }
  },
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
  component: () => <Painel turno={1} />,
})
