import { z } from 'zod'
import { isUf, type UF } from '@/lib/votely'

/** Busca na URL das páginas do Live (/live e /live/1-turno) */
export const buscaLive = z.object({
  aba: z.enum(['pres', 'gov', 'sen', 'dep']).optional().catch(undefined),
  uf: z
    .string()
    .optional()
    .transform((v) =>
      v && isUf(v.toUpperCase()) ? (v.toUpperCase() as UF) : undefined,
    )
    .catch(undefined),
  dep: z.enum(['fed', 'est']).optional().catch(undefined),
})

export type BuscaLive = z.infer<typeof buscaLive>
