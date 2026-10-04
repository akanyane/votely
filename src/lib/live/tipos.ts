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

/**
 * public/municipios/{UF}.json (scripts/municipios.ts): contorno de cada
 * município já como caminho SVG. [código TSE, nome, capital (1/0), caminho]
 * O BR.json usa o mesmo formato, com um estado por item.
 */
export type MunicipiosUf = {
  largura: number
  altura: number
  /** No BR.json: [sigla, nome, 0, caminho, posição da sigla] */
  municipios: [string, string, 0 | 1, string, [number, number]?][]
}

/**
 * public/municipios/BR-cidades.json (scripts/mapa-cidades-malha.ts): todos os
 * municípios numa só projeção. [código TSE, nome, UF, caminho]
 */
export type MalhaCidades = {
  largura: number
  altura: number
  cidades: [string, string, UF, string][]
  /** Contorno de cada estado, na mesma projeção: [sigla, caminho] */
  estados: [UF, string][]
}

/** % de seções apuradas de cada município de uma UF (EA15) */
export type ApuracaoMunicipios = {
  uf: UF
  geradoEm: string
  /** código TSE do município → % de seções totalizadas (0–100) */
  pct: Record<string, number>
}

/** Resultado de um cargo num município, só com o que o mapa mostra */
export type ResultadoMunicipio = {
  municipio: string
  pctSecoes: number
  votacaoLiberada: boolean
  totalizadoEm: string | null
  candidatos: Pick<CandidatoLive, 'sq' | 'nome' | 'partido' | 'votos' | 'pct'>[]
}

/**
 * Retrato do presidente em todas as cidades (scripts/mapa-cidades.ts), lido
 * pela página /live/map. Os candidatos vêm na ordem nacional; cada cidade
 * aponta para eles pelo índice.
 */
export type MapaCidades = {
  /** ISO; quando o retrato terminou de ser montado */
  geradoEm: string
  simulado: boolean
  /** % de seções apuradas no Brasil e hora da totalização nacional */
  pctBrasil: number
  totalizadoEm: string | null
  candidatos: { sq: string; nome: string; partido: string; numero: string }[]
  /**
   * código TSE → [índice do 1º, % do 1º, índice do 2º, % do 2º, % apurado].
   * Índice -1 quando não há 2º.
   */
  cidades: Record<string, [number, number, number, number, number]>
}
