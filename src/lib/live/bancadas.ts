/**
 * Visão nacional por partido: soma os resultados das 27 UFs de deputado
 * federal, senado e governador. Só usa o que o TSE marca em cada arquivo
 * (eleito / em posição de eleição / 2º turno); o Votely não projeta nada.
 */
import type { UF } from '@/lib/votely'
import type { CadeirasAgremiacao, ResultadoCargo } from './tipos'

export type BancadaPartido = {
  partido: string
  partidoNome: string
  /** Eleitos na totalização final da UF (ou marcados como eleitos pelo TSE) */
  eleitos: number
  /** Em posição de eleição (deputados) ou à frente (senado/governo) numa apuração parcial */
  provisorios: number
  /** Governador: disputa o 2º turno */
  segundoTurno: number
}

export type CasaNacional = {
  vagas: number
  /** UFs com totalização final para o cargo */
  ufsFinais: number
  /** UFs com algum dado do TSE */
  ufsComDados: number
  /** UFs em que o TSE informou que não foi possível atribuir eleitos */
  ufsSemEleitos: number
  partidos: BancadaPartido[]
}

export type Bancadas = {
  camara: CasaNacional & {
    /** Cadeiras por partido ou federação, como o TSE distribui */
    agremiacoes: Omit<CadeirasAgremiacao, 'composicao'>[]
  }
  senado: CasaNacional
  governo: CasaNacional
}

type PorUf = (ResultadoCargo | null)[]

const total = (p: BancadaPartido) => p.eleitos + p.provisorios + p.segundoTurno

function ordenar(m: Map<string, BancadaPartido>) {
  return [...m.values()]
    .filter((p) => total(p) > 0)
    .sort(
      (a, b) =>
        b.eleitos + b.provisorios - (a.eleitos + a.provisorios) ||
        b.eleitos - a.eleitos ||
        b.segundoTurno - a.segundoTurno ||
        a.partido.localeCompare(b.partido, 'pt-BR'),
    )
}

function somar(
  m: Map<string, BancadaPartido>,
  c: { partido: string; partidoNome: string },
  campo: 'eleitos' | 'provisorios' | 'segundoTurno',
) {
  const p = m.get(c.partido) ?? {
    partido: c.partido,
    partidoNome: c.partidoNome,
    eleitos: 0,
    provisorios: 0,
    segundoTurno: 0,
  }
  p[campo]++
  m.set(c.partido, p)
}

const temDados = (r: ResultadoCargo) =>
  r.votacaoLiberada && (r.secoes.pct > 0 || r.final)

/** Deputado federal: eleitos e em posição de eleição, por partido */
export function somarCamara(ufs: PorUf): Bancadas['camara'] {
  const partidos = new Map<string, BancadaPartido>()
  const agrem = new Map<string, Omit<CadeirasAgremiacao, 'composicao'>>()
  let vagas = 0
  let ufsFinais = 0
  let ufsComDados = 0
  let ufsSemEleitos = 0
  for (const r of ufs) {
    if (!r) continue
    vagas += r.vagas
    if (!temDados(r)) continue
    ufsComDados++
    if (r.final) ufsFinais++
    if (r.semEleitos) ufsSemEleitos++
    for (const c of r.candidatos) {
      if (c.status === 'eleito') somar(partidos, c, 'eleitos')
      else if (c.emPosicao) somar(partidos, c, 'provisorios')
    }
    for (const a of r.cadeiras) {
      const atual = agrem.get(a.nome)
      if (atual) atual.cadeiras += a.cadeiras
      else
        agrem.set(a.nome, { nome: a.nome, tipo: a.tipo, cadeiras: a.cadeiras })
    }
  }
  return {
    vagas,
    ufsFinais,
    ufsComDados,
    ufsSemEleitos,
    partidos: ordenar(partidos),
    agremiacoes: [...agrem.values()].sort(
      (a, b) =>
        b.cadeiras - a.cadeiras || a.nome.localeCompare(b.nome, 'pt-BR'),
    ),
  }
}

/**
 * Senado e governador: na totalização final, quem o TSE marca; antes dela,
 * os `vagas` primeiros por votos (o arquivo já vem ordenado).
 */
export function somarMajoritario(ufs: PorUf): CasaNacional {
  const partidos = new Map<string, BancadaPartido>()
  let vagas = 0
  let ufsFinais = 0
  let ufsComDados = 0
  let ufsSemEleitos = 0
  for (const r of ufs) {
    if (!r) continue
    vagas += r.vagas
    if (!temDados(r)) continue
    ufsComDados++
    if (r.semEleitos) ufsSemEleitos++
    const eleitos = r.candidatos.filter((c) => c.status === 'eleito')
    const segundo = r.candidatos.filter((c) => c.status === 'segundo_turno')
    if (r.final) ufsFinais++
    if (eleitos.length || segundo.length) {
      for (const c of eleitos) somar(partidos, c, 'eleitos')
      for (const c of segundo) somar(partidos, c, 'segundoTurno')
    } else if (!r.final) {
      for (const c of r.candidatos.slice(0, r.vagas)) {
        if (c.votos > 0) somar(partidos, c, 'provisorios')
      }
    }
  }
  return {
    vagas,
    ufsFinais,
    ufsComDados,
    ufsSemEleitos,
    partidos: ordenar(partidos),
  }
}

export function montarBancadas(
  porUf: {
    uf: UF
    depfed: ResultadoCargo | null
    sen: ResultadoCargo | null
    gov: ResultadoCargo | null
  }[],
): Bancadas {
  return {
    camara: somarCamara(porUf.map((u) => u.depfed)),
    senado: somarMajoritario(porUf.map((u) => u.sen)),
    governo: somarMajoritario(porUf.map((u) => u.gov)),
  }
}
