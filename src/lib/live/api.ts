/**
 * Server functions do Votely Live. O navegador nunca fala com o TSE: chama
 * estas funções (GET, cacheáveis na CDN), que usam o cache do servidor.
 */
import { createServerFn } from '@tanstack/react-start'
import { setResponseHeaders } from '@tanstack/react-start/server'
import { z } from 'zod'
import { UFS } from '@/lib/votely'
import {
  bancadasNacionais,
  historicoLive,
  mapaPresidente,
  resultadoLive,
} from '@/server/live'
import { apuracaoMunicipios, resultadoMunicipio } from '@/server/municipios'

const ufSchema = z.enum(UFS.map(([uf]) => uf) as [string, ...string[]])

const entradaCargo = z.object({
  cargo: z.enum(['pres', 'gov', 'sen', 'depfed', 'depest']),
  uf: ufSchema.optional(),
  /** Padrão: turno atual (src/config/election.ts) */
  turno: z.union([z.literal(1), z.literal(2)]).optional(),
})

/**
 * Na noite da apuração, a CDN absorve o pico: cada URL vai ao servidor no
 * máximo a cada ~30 s por região; o navegador guarda por 15 s.
 */
function cacheavel(ok: boolean) {
  setResponseHeaders(
    new Headers({
      'Cache-Control': ok
        ? 'public, max-age=15, s-maxage=30, stale-while-revalidate=60'
        : 'public, max-age=5, s-maxage=10',
    }),
  )
}

export const buscarResultado = createServerFn({ method: 'GET' })
  .validator(entradaCargo)
  .handler(async ({ data }) => {
    // Presidente sem UF = Brasil; demais cargos exigem UF
    const abrangencia = data.cargo === 'pres' && !data.uf ? 'br' : data.uf
    if (!abrangencia) throw new Error('UF obrigatória para este cargo')
    const r = await resultadoLive(data.cargo, abrangencia as never, data.turno)
    cacheavel(r.estado === 'ok' && !r.desatualizado)
    return r
  })

export const buscarMapa = createServerFn({ method: 'GET' }).handler(
  async () => {
    const r = await mapaPresidente()
    cacheavel(r.estado === 'ok' && !r.desatualizado)
    return r
  },
)

export const buscarBancadas = createServerFn({ method: 'GET' }).handler(
  async () => {
    const r = await bancadasNacionais()
    cacheavel(r.estado === 'ok' && !r.desatualizado)
    return r
  },
)

export const buscarHistorico = createServerFn({ method: 'GET' })
  .validator(entradaCargo)
  .handler(async ({ data }) => {
    const abrangencia = data.cargo === 'pres' && !data.uf ? 'br' : data.uf
    if (!abrangencia) return []
    const r = await historicoLive(data.cargo, abrangencia as never)
    cacheavel(true)
    return r
  })

export const buscarApuracaoMunicipios = createServerFn({ method: 'GET' })
  .validator(z.object({ uf: ufSchema }))
  .handler(async ({ data }) => {
    const r = await apuracaoMunicipios(data.uf as never)
    cacheavel(r.estado === 'ok' && !r.desatualizado)
    return r
  })

export const buscarResultadoMunicipio = createServerFn({ method: 'GET' })
  .validator(
    entradaCargo.extend({
      uf: ufSchema,
      municipio: z.string().regex(/^\d{5}$/),
    }),
  )
  .handler(async ({ data }) => {
    const r = await resultadoMunicipio(
      data.cargo,
      data.uf as never,
      data.municipio,
      data.turno,
    )
    cacheavel(r.estado === 'ok' && !r.desatualizado)
    return r
  })
