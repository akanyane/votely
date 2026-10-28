import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { PaginaSecoes } from '@/components/secoes/PaginaSecoes'

// live_.secoes: página própria em /live/secoes, fora do layout do /live
export const Route = createFileRoute('/live_/secoes')({
  validateSearch: z.object({
    turno: z.literal(1).optional().catch(undefined),
  }),
  head: () => ({
    meta: [
      { title: 'Seções fora da curva · Votely Live' },
      {
        name: 'description',
        content:
          'Presidente seção por seção: as seções com 100% dos votos para um candidato, comparecimento quase total e outros extremos, dos boletins de urna do TSE.',
      },
    ],
    links: [
      { rel: 'canonical', href: 'https://votely.akanyane.dev/live/secoes' },
    ],
  }),
  component: () => <PaginaSecoes turno={Route.useSearch().turno ?? 2} />,
})
