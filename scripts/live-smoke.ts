/**
 * Teste de fumaça do Votely Live contra o TSE de verdade (simulado por
 * padrão) e o Redis configurado no .env.local.
 *
 * Uso: bun run live:smoke [--uf SP]
 *      TSE_AMBIENTE=oficial bun run live:smoke
 *
 * Faz poucas requisições (config + ~5 arquivos + 27 do mapa), dentro do
 * ritmo do cliente HTTP (8 req/s).
 */

import type { UF } from '../src/lib/votely'
import { comandosRedis } from '../src/server/cache'
import {
  historicoLive,
  mapaPresidente,
  resultadoLive,
} from '../src/server/live'
import { redis } from '../src/server/redis'

const i = process.argv.indexOf('--uf')
const uf = ((i > 0 ? process.argv[i + 1] : 'SP') ?? 'SP').toUpperCase() as UF

console.log(
  `ambiente: ${process.env.TSE_AMBIENTE ?? 'simulado'} · redis: ${redis() ? 'sim' : 'não'} · UF ${uf}\n`,
)

const t0 = Date.now()
for (const [cargo, abr] of [
  ['pres', 'br'],
  ['gov', uf],
  ['sen', uf],
  ['depfed', uf],
  ['depest', uf],
] as const) {
  const r = await resultadoLive(cargo, abr)
  if (r.estado !== 'ok') {
    console.log(`${cargo.padEnd(6)} ${abr}: ${r.estado}`)
    continue
  }
  const d = r.dados
  const top = d.candidatos
    .slice(0, 2)
    .map(
      (c) =>
        `${c.nome} (${c.partido}) ${c.pct.toFixed(2)}%${c.status ? ` [${c.status}]` : ''}`,
    )
    .join(' · ')
  const tamanho = (JSON.stringify(d).length / 1024).toFixed(0)
  console.log(
    `${cargo.padEnd(6)} ${abr}: ${d.secoes.pct}% seções · ${d.candidatos.length} cand · ${d.cadeiras.length} agremiações c/ cadeiras · ${tamanho} KB · ${top}`,
  )
}

const mapa = await mapaPresidente()
console.log(
  `\nmapa: ${mapa.estado === 'ok' ? `${mapa.dados.length} UFs` : mapa.estado}`,
)
console.log(
  `historico pres: ${(await historicoLive('pres', 'br')).length} snapshots`,
)

const t1 = Date.now()
await resultadoLive('pres', 'br')
console.log(
  `\n1ª rodada: ${t1 - t0} ms · 2ª leitura (cache): ${Date.now() - t1} ms · comandos Redis: ${comandosRedis}`,
)
