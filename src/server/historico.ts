/**
 * O TSE não guarda o histórico parcial da apuração. A cada nova versão do
 * resultado de presidente e governador, guardamos um snapshot enxuto num
 * sorted set do Redis (score = horário da totalização).
 */
import type { CargoLive, ResultadoCargo } from '@/lib/live/tipos'
import { redis } from './redis'

export type Snapshot = {
  /** ISO do horário da totalização */
  t: string
  /** % de seções totalizadas */
  p: number
  /** [sq, votos, pct] por candidato */
  c: [string, number, number][]
}

const chaveHistorico = (
  simulado: boolean,
  turno: number,
  cargo: CargoLive,
  abrangencia: string,
) =>
  `votely:hist:v1:${simulado ? 'sim' : 'ofi'}:t${turno}:${cargo}:${abrangencia.toLowerCase()}`

export function comHistorico(cargo: CargoLive) {
  return cargo === 'pres' || cargo === 'gov'
}

export async function salvarSnapshot(r: ResultadoCargo) {
  const db = redis()
  if (!db || !comHistorico(r.cargo) || r.andamento === 'nao_iniciada') return
  if (!r.votacaoLiberada) return
  // Presidente: só o nacional (os arquivos por UF servem ao mapa)
  if (r.cargo === 'pres' && r.abrangencia !== 'br') return
  const t = r.totalizadoEm ?? r.geradoEm
  const snap: Snapshot = {
    t,
    p: r.secoes.pct,
    c: r.candidatos.map((c) => [c.sq, c.votos, c.pct]),
  }
  await db.zadd(chaveHistorico(r.simulado, r.turno, r.cargo, r.abrangencia), {
    score: Date.parse(t),
    member: JSON.stringify(snap),
  })
}

export async function lerHistorico(
  simulado: boolean,
  turno: number,
  cargo: CargoLive,
  abrangencia: string,
): Promise<Snapshot[]> {
  const db = redis()
  if (!db || !comHistorico(cargo)) return []
  const itens = await db.zrange<string[]>(
    chaveHistorico(simulado, turno, cargo, abrangencia),
    0,
    -1,
  )
  // O SDK pode já desserializar o JSON
  return itens.map(
    (i) => (typeof i === 'string' ? JSON.parse(i) : i) as Snapshot,
  )
}
