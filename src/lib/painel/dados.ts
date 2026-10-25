/**
 * Cálculos do painel da apuração (/live/painel). Tudo deriva dos dados do
 * TSE; o que é estimativa (votos que faltam, virada possível) é sempre
 * apresentado como tal. Quem venceu só vem do status do próprio TSE.
 */

import type { CandidatoLive, ResultadoCargo } from '@/lib/live/tipos'
import { nomeUf, type UF } from '@/lib/votely'
import type { Snapshot } from '@/server/historico'
import type { UfNoMapa } from '@/server/live'

export type Regiao = 'Norte' | 'Nordeste' | 'Centro-Oeste' | 'Sudeste' | 'Sul'

export const REGIOES: Regiao[] = [
  'Norte',
  'Nordeste',
  'Centro-Oeste',
  'Sudeste',
  'Sul',
]

/** Mapa em ladrilhos: [coluna, linha, região] de cada UF numa grade 7×7 */
export const GRADE: Record<UF, [number, number, Regiao]> = {
  RR: [3, 1, 'Norte'],
  AP: [5, 1, 'Norte'],
  AM: [2, 2, 'Norte'],
  PA: [4, 2, 'Norte'],
  MA: [5, 2, 'Nordeste'],
  CE: [6, 2, 'Nordeste'],
  RN: [7, 2, 'Nordeste'],
  AC: [1, 3, 'Norte'],
  RO: [2, 3, 'Norte'],
  MT: [3, 3, 'Centro-Oeste'],
  TO: [4, 3, 'Norte'],
  PI: [5, 3, 'Nordeste'],
  PE: [6, 3, 'Nordeste'],
  PB: [7, 3, 'Nordeste'],
  MS: [3, 4, 'Centro-Oeste'],
  GO: [4, 4, 'Centro-Oeste'],
  DF: [5, 4, 'Centro-Oeste'],
  BA: [6, 4, 'Nordeste'],
  AL: [7, 4, 'Nordeste'],
  PR: [3, 5, 'Sul'],
  SP: [4, 5, 'Sudeste'],
  MG: [5, 5, 'Sudeste'],
  ES: [6, 5, 'Sudeste'],
  SE: [7, 5, 'Nordeste'],
  SC: [3, 6, 'Sul'],
  RJ: [5, 6, 'Sudeste'],
  RS: [3, 7, 'Sul'],
}

export type Lado = 'a' | 'b'

/**
 * Os dois primeiros, com lado fixo pelo número na urna (o de menor número
 * fica à esquerda, em azul), para a cor não trocar quando a liderança troca.
 */
export function duelo(r: ResultadoCargo) {
  const [x, y] = r.candidatos
  if (!x || !y) return null
  const [a, b] = Number(x.numero) <= Number(y.numero) ? [x, y] : [y, x]
  return { a, b }
}
export type Duelo = NonNullable<ReturnType<typeof duelo>>

const MINUSCULAS = new Set(['da', 'de', 'do', 'das', 'dos', 'e'])

/** "FLAVIO BOLSONARO" → "Flavio Bolsonaro" */
export const nomeCurto = (c: Pick<CandidatoLive, 'nome'>) =>
  c.nome
    .toLowerCase()
    .split(' ')
    .map((p, i) =>
      i > 0 && MINUSCULAS.has(p) ? p : p.charAt(0).toUpperCase() + p.slice(1),
    )
    .join(' ')

export type UfPainel = {
  uf: UF
  nome: string
  regiao: Regiao
  col: number
  row: number
  /** Fração das seções totalizadas (0–1) */
  p: number
  final: boolean
  aPct: number
  bPct: number
  aV: number
  bV: number
  validos: number
  comparecimento: number
  margemPct: number
  margemVotos: number
  lider: Lado | null
  /** Estimativa de votos válidos que faltam, pelo ritmo das seções */
  restam: number | null
  viradaPossivel: boolean
}

export function ufsPainel(mapa: UfNoMapa[], d: Duelo): UfPainel[] {
  return mapa.map((m) => {
    const [col, row, regiao] = GRADE[m.uf]
    const ca = m.top.find((c) => c.sq === d.a.sq)
    const cb = m.top.find((c) => c.sq === d.b.sq)
    const aV = ca?.votos ?? 0
    const bV = cb?.votos ?? 0
    const p = m.pctSecoes / 100
    const restam = m.final ? 0 : p > 0 ? (m.validos * (1 - p)) / p : null
    const margemVotos = Math.abs(aV - bV)
    return {
      uf: m.uf,
      nome: nomeUf(m.uf),
      regiao,
      col,
      row,
      p,
      final: m.final,
      aPct: ca?.pct ?? 0,
      bPct: cb?.pct ?? 0,
      aV,
      bV,
      validos: m.validos,
      comparecimento: m.comparecimento,
      margemPct: Math.abs((ca?.pct ?? 0) - (cb?.pct ?? 0)),
      margemVotos,
      lider: aV === bV ? null : aV > bV ? 'a' : 'b',
      restam,
      viradaPossivel: !m.final && (restam === null || margemVotos < restam),
    }
  })
}

export function porRegiao(ufs: UfPainel[]) {
  const total = ufs.reduce((s, u) => s + u.comparecimento, 0)
  return REGIOES.map((regiao) => {
    const rs = ufs.filter((u) => u.regiao === regiao)
    const aV = rs.reduce((s, u) => s + u.aV, 0)
    const bV = rs.reduce((s, u) => s + u.bV, 0)
    const validos = rs.reduce((s, u) => s + u.validos, 0)
    const comp = rs.reduce((s, u) => s + u.comparecimento, 0)
    // Comparecimento esperado da região, projetado pelo % de seções de cada UF
    const esperado = rs.reduce(
      (s, u) => s + (u.p > 0 ? u.comparecimento / u.p : 0),
      0,
    )
    return {
      regiao,
      ufs: rs.map((u) => u.uf),
      aPct: validos ? (aV / validos) * 100 : 0,
      bPct: validos ? (bV / validos) * 100 : 0,
      lider: (aV === bV ? null : aV > bV ? 'a' : 'b') as Lado | null,
      apurado: esperado ? (comp / esperado) * 100 : 0,
      participacao: total ? (comp / total) * 100 : 0,
      liderados: {
        a: rs.filter((u) => u.lider === 'a').length,
        b: rs.filter((u) => u.lider === 'b').length,
      },
    }
  })
}

export type TagEvento = 'VIRADA' | 'CONCLUÍDO' | 'APURAÇÃO' | 'NACIONAL'

export type Evento = { id: string; t: number; tag: TagEvento; texto: string }

const pp = (n: number) => n.toFixed(2).replace('.', ',')

/** Ponto do histórico com o % de cada lado do duelo */
export type PontoSerie = {
  t: number
  p: number
  a: number
  b: number
  votos: number
}

export function serie(snaps: Snapshot[], d: Duelo): PontoSerie[] {
  return snaps.map((s) => {
    const pct = (sq: string) => s.c.find((c) => c[0] === sq)?.[2] ?? 0
    return {
      t: Date.parse(s.t),
      p: s.p,
      a: pct(d.a.sq),
      b: pct(d.b.sq),
      votos: s.c.reduce((soma, c) => soma + c[1], 0),
    }
  })
}

/** Marcos nacionais (a cada 10% apurado) e trocas de liderança no histórico */
export function eventosDoHistorico(pontos: PontoSerie[], d: Duelo): Evento[] {
  const ev: Evento[] = []
  let marco = 0
  for (let i = 0; i < pontos.length; i++) {
    const x = pontos[i]
    const novoMarco = Math.floor(x.p / 10) * 10
    if (novoMarco > marco) {
      marco = novoMarco
      ev.push({
        id: `nac-${marco}`,
        t: x.t,
        tag: 'NACIONAL',
        texto: `Apuração nacional atinge ${marco}% das urnas. Diferença de ${pp(Math.abs(x.a - x.b))} p.p.`,
      })
    }
    const ant = pontos[i - 1]
    if (
      ant &&
      Math.sign(ant.a - ant.b) !== Math.sign(x.a - x.b) &&
      x.a !== x.b
    ) {
      const [frente, atras] = x.a > x.b ? [d.a, d.b] : [d.b, d.a]
      ev.push({
        id: `vira-${x.t}`,
        t: x.t,
        tag: 'VIRADA',
        texto: `${nomeCurto(frente)} passa ${nomeCurto(atras)} com ${pp(x.p)}% das urnas apuradas.`,
      })
    }
  }
  return ev
}

/** O que mudou nas UFs entre duas atualizações vistas nesta sessão */
export function eventosEntre(
  antes: UfPainel[],
  depois: UfPainel[],
  d: Duelo,
  agora: number,
): Evento[] {
  const ev: Evento[] = []
  for (const u of depois) {
    const v = antes.find((x) => x.uf === u.uf)
    if (!v) continue
    const nome = (l: Lado) => nomeCurto(l === 'a' ? d.a : d.b)
    if (v.lider && u.lider && v.lider !== u.lider) {
      ev.push({
        id: `vira-${u.uf}-${agora}`,
        t: agora,
        tag: 'VIRADA',
        texto: `${u.nome} vira para ${nome(u.lider)} com ${Math.round(u.p * 100)}% apurado.`,
      })
    }
    if (u.final && !v.final && u.lider) {
      ev.push({
        id: `fim-${u.uf}`,
        t: agora,
        tag: 'CONCLUÍDO',
        texto: `${u.nome} conclui a apuração: ${nome(u.lider)} vence no estado.`,
      })
    } else if (u.p >= 0.9 && v.p < 0.9) {
      ev.push({
        id: `90-${u.uf}`,
        t: agora,
        tag: 'APURAÇÃO',
        texto: `${u.nome} passa de 90% das urnas apuradas.`,
      })
    }
  }
  return ev
}
