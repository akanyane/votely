/**
 * Formato próprio e enxuto que o servidor devolve ao navegador. É derivado
 * dos arquivos do TSE (EA20), mas nunca expõe o formato bruto deles.
 */

import type { UF } from '@/lib/votely'

export type CargoLive = 'pres' | 'gov' | 'sen' | 'depfed' | 'depest'

/** Só existe quando o próprio TSE indica; nunca é calculado pelo Votely. */
export type StatusCandidato =
  | 'eleito'
  | 'segundo_turno'
  | 'nao_eleito'
  | 'suplente'

export type CandidatoLive = {
  sq: string
  numero: string
  nome: string
  partido: string
  partidoNome: string
  /** Federação ou coligação, quando houver */
  agremiacao: string | null
  votos: number
  /** Percentual de votos válidos, como o TSE publica (0–100) */
  pct: number
  status: StatusCandidato | null
  /**
   * `e = "s"` do TSE numa apuração ainda parcial: para deputados, significa
   * "em posição de eleição" naquela totalização.
   */
  emPosicao: boolean
}

export type CadeirasAgremiacao = {
  nome: string
  composicao: string | null
  tipo: 'partido' | 'federacao'
  cadeiras: number
}

export type Andamento = 'nao_iniciada' | 'parcial' | 'finalizada'

export type ResultadoCargo = {
  cargo: CargoLive
  abrangencia: 'br' | UF
  turno: 1 | 2
  simulado: boolean
  /** ISO 8601 com fuso de Brasília; quando o TSE gerou o arquivo */
  geradoEm: string
  /** ISO 8601; hora da última totalização informada pelo TSE */
  totalizadoEm: string | null
  secoes: { total: number; totalizadas: number; pct: number }
  andamento: Andamento
  /** Totalização final (tf = "s") */
  final: boolean
  /** `dv = "n"`: votação ainda não pode ser divulgada (presidente antes das 17h) */
  votacaoLiberada: boolean
  vagas: number
  quociente: number | null
  /**
   * Majoritários: todos, por votos. Deputados: eleitos/em posição de eleição
   * e os mais votados (os demais só aparecem em `ranking`).
   */
  candidatos: CandidatoLive[]
  /** Só deputados: [número, votos, %] de todos, por votos (posição = índice + 1) */
  ranking: [string, number, number][] | null
  cadeiras: CadeirasAgremiacao[]
  totais: {
    validos: number
    brancos: { votos: number; pct: number }
    nulos: { votos: number; pct: number }
    abstencao: { votos: number; pct: number }
  }
  semEleitos: boolean
}

/** Envelope com metadados de cache */
export type Resposta<T> = {
  dados: T
  /** Quando o servidor do Votely conseguiu esses dados do TSE */
  obtidoEm: string
  /** A última tentativa de atualizar falhou; estes são os últimos dados válidos */
  desatualizado: boolean
}
