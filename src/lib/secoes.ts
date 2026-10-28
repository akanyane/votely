/**
 * Formato do arquivo public/dados/secoes-t<turno>.json, gerado por
 * scripts/secoes.ts a partir dos boletins de urna (dados abertos do TSE) e
 * lido pela página /live/secoes.
 */

/** Por que a seção entrou na lista */
export type Marca =
  /** 100% dos votos válidos num só candidato */
  | 'cem'
  /** 95% ou mais dos válidos num só candidato, com 50+ votos válidos */
  | 'quase'
  /** comparecimento de 97% ou mais, com 50+ aptos */
  | 'comparecimento'
  /** 25% ou mais dos eleitores liberados sem biometria, com 50+ votantes */
  | 'biometria'
  /** urna que não foi apurada normalmente (substituída, votação manual…) */
  | 'urna'

/** Tipo do local, pelo cadastro e pelo nome: explica boa parte dos extremos */
export type Categoria =
  | 'indigena'
  | 'prisional'
  | 'exterior'
  | 'quilombola'
  | 'assentamento'
  | 'comum'

export type Candidato = {
  numero: string
  nome: string
  partido: string
  votos: number
}

export type SecaoMarcada = {
  uf: string
  municipio: string
  zona: number
  secao: number
  local: string
  categoria: Categoria
  lat: number | null
  lon: number | null
  aptos: number
  comparecimento: number
  /** Votos de a e b (os dois primeiros, pelo número) e dos demais */
  a: number
  b: number
  outros: number
  brancos: number
  nulos: number
  /** Eleitores liberados sem biometria (QT_ELEI_BIOM_SEM_HABILITACAO) */
  biometria: number
  urna: string
  /** Hora local da urna, "HH:MM" */
  abertura: string
  encerramento: string
  /** Candidato com 95%+ ou 100% dos válidos: 'a', 'b' ou o número dele */
  lider: string | null
  marcas: Marca[]
}

export type ResumoUf = {
  uf: string
  secoes: number
  aptos: number
  comparecimento: number
  a: number
  b: number
  outros: number
  brancos: number
  nulos: number
  cemA: number
  cemB: number
  quaseA: number
  quaseB: number
}

export type AnaliseSecoes = {
  turno: 1 | 2
  geradoEm: string
  /** Data/hora de geração dos boletins pelo TSE (DT_GERACAO do arquivo) */
  dataTse: string
  /** a tem o menor número na urna (mesma regra de cor do painel) */
  a: Candidato
  b: Candidato
  /** UFs cujo boletim ainda não estava publicado quando o script rodou */
  faltando: string[]
  total: Omit<ResumoUf, 'uf'>
  porUf: ResumoUf[]
  /**
   * Quantas seções dão a% dos válidos para a, de 0 a 100 (índice = % inteiro,
   * arredondado para baixo; 100 só com 100% exato). "grandes" conta só as
   * seções com 100+ votos válidos.
   */
  faixas: { todas: number[]; grandes: number[] }
  secoes: SecaoMarcada[]
}
