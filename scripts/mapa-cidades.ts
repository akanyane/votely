/**
 * Monta o retrato do presidente em todas as cidades e grava no Redis, para a
 * página /live/map. Roda fora da Vercel (na máquina de quem acompanha a
 * apuração), em ritmo controlado: no máximo ~20 requisições/s ao TSE, e só
 * cidades que o próprio TSE lista no arquivo de acompanhamento da UF.
 *
 * Uso: TSE_AMBIENTE=oficial bun run mapa:cidades [--loop MIN] [--sem-redis]
 */
import { writeFile } from 'node:fs/promises'
import { Redis } from '@upstash/redis'
import { ELEICAO } from '../src/config/election'
import type { MapaCidades } from '../src/lib/live/tipos'
import { UFS } from '../src/lib/votely'
import { resultadoLive } from '../src/server/live'
import { chaveMapaCidades } from '../src/server/mapaCidades'
import {
  apuracaoMunicipios,
  resultadoMunicipio,
} from '../src/server/municipios'
import { _definirRedis } from '../src/server/redis'
import { ambienteTse } from '../src/server/tse/ambiente'

const args = process.argv.slice(2)
const iLoop = args.indexOf('--loop')
const loopMin = iLoop >= 0 ? Number(args[iLoop + 1] ?? 10) : 0
const semRedis = args.includes('--sem-redis')

// O cache de cada arquivo fica só na memória deste processo: gravar 5.570
// entradas no Redis custaria caro e ninguém mais as lê.
const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL
const token =
  process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN
_definirRedis(null)
const destino = !semRedis && url && token ? new Redis({ url, token }) : null
if (!semRedis && !destino)
  throw new Error('sem credenciais do Redis (use --sem-redis)')

const POR_SEGUNDO = 20
// O TSE responde em ~0,5–1 s: mais trabalhadores, mesmo teto por segundo
const TRABALHADORES = 20

async function retrato(): Promise<MapaCidades> {
  const t0 = Date.now()
  const br = await resultadoLive('pres', 'br')
  if (br.estado !== 'ok') throw new Error(`presidente BR: ${br.estado}`)
  const candidatos = br.dados.candidatos.map(
    ({ sq, nome, partido, numero }) => ({
      sq,
      nome,
      partido,
      numero,
    }),
  )
  const indice = new Map(candidatos.map((c, i) => [c.sq, i]))

  const fila: { uf: (typeof UFS)[number][0]; cd: string; pct: number }[] = []
  const cidades: MapaCidades['cidades'] = {}
  for (const [uf] of UFS) {
    const a = await apuracaoMunicipios(uf)
    if (a.estado !== 'ok') {
      console.error(`${uf}: acompanhamento ${a.estado}`)
      continue
    }
    for (const [cd, pct] of Object.entries(a.dados.pct)) {
      if (pct > 0) fila.push({ uf, cd, pct })
      else cidades[cd] = [-1, 0, -1, 0, 0]
    }
  }

  let feitos = 0
  let falhas = 0
  const intervalo = (1000 * TRABALHADORES) / POR_SEGUNDO
  await Promise.all(
    Array.from({ length: TRABALHADORES }, async () => {
      for (let item = fila.shift(); item; item = fila.shift()) {
        const inicio = Date.now()
        const r = await resultadoMunicipio('pres', item.uf, item.cd)
        if (r.estado === 'ok') {
          const [c1, c2] = r.dados.candidatos
          cidades[item.cd] = [
            c1 ? (indice.get(c1.sq) ?? -1) : -1,
            c1?.pct ?? 0,
            c2 ? (indice.get(c2.sq) ?? -1) : -1,
            c2?.pct ?? 0,
            r.dados.pctSecoes,
          ]
        } else falhas++
        if (++feitos % 500 === 0) console.log(`  ${feitos} cidades…`)
        const espera = intervalo - (Date.now() - inicio)
        if (espera > 0) await new Promise((res) => setTimeout(res, espera))
      }
    }),
  )
  console.log(
    `${Object.keys(cidades).length} cidades · ${feitos} buscadas · ${falhas} falhas · ${((Date.now() - t0) / 1000).toFixed(0)} s`,
  )
  // O total do Brasil lido de novo no fim, para combinar com as cidades
  const fim = await resultadoLive('pres', 'br')
  const total = fim.estado === 'ok' ? fim.dados : br.dados
  return {
    geradoEm: new Date().toISOString(),
    simulado: total.simulado,
    pctBrasil: total.secoes.pct,
    totalizadoEm: total.totalizadoEm,
    candidatos,
    cidades,
  }
}

const chave = chaveMapaCidades(ambienteTse().nome, ELEICAO.turno)
console.log(
  `ambiente: ${ambienteTse().nome} · destino: ${destino ? chave : 'só arquivo'}`,
)
for (;;) {
  const inicio = Date.now()
  try {
    const m = await retrato()
    const json = JSON.stringify(m)
    await writeFile('mapa-cidades.json', json)
    if (destino) await destino.set(chave, m, { ex: 7 * 24 * 3600 })
    console.log(
      `${new Date().toTimeString().slice(0, 8)} retrato gravado · ${(json.length / 1024).toFixed(0)} KB · BR ${m.pctBrasil.toFixed(1)}%`,
    )
  } catch (e) {
    console.error('falhou:', e instanceof Error ? e.message : e)
  }
  if (!loopMin) break
  const espera = loopMin * 60_000 - (Date.now() - inicio)
  if (espera > 0) await new Promise((r) => setTimeout(r, espera))
}
