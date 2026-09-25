export const UFS = [
  ['AC', 'Acre'],
  ['AL', 'Alagoas'],
  ['AP', 'Amapá'],
  ['AM', 'Amazonas'],
  ['BA', 'Bahia'],
  ['CE', 'Ceará'],
  ['DF', 'Distrito Federal'],
  ['ES', 'Espírito Santo'],
  ['GO', 'Goiás'],
  ['MA', 'Maranhão'],
  ['MT', 'Mato Grosso'],
  ['MS', 'Mato Grosso do Sul'],
  ['MG', 'Minas Gerais'],
  ['PA', 'Pará'],
  ['PB', 'Paraíba'],
  ['PR', 'Paraná'],
  ['PE', 'Pernambuco'],
  ['PI', 'Piauí'],
  ['RJ', 'Rio de Janeiro'],
  ['RN', 'Rio Grande do Norte'],
  ['RS', 'Rio Grande do Sul'],
  ['RO', 'Rondônia'],
  ['RR', 'Roraima'],
  ['SC', 'Santa Catarina'],
  ['SP', 'São Paulo'],
  ['SE', 'Sergipe'],
  ['TO', 'Tocantins'],
] as const

export type UF = (typeof UFS)[number][0]

export const nomeUf = (uf: string) => UFS.find(([s]) => s === uf)?.[1] ?? ''
export const isUf = (v: unknown): v is UF => UFS.some(([s]) => s === v)

/** Grupo de candidatos no JSON; as duas vagas de senador usam o mesmo grupo */
export type Pool = 'depfed' | 'depest' | 'sen' | 'gov' | 'pres'

export type CargoId = 'depfed' | 'depest' | 'sen1' | 'sen2' | 'gov' | 'pres'

export type Cargo = {
  id: CargoId
  label: string
  digitos: number
  pool: Pool
  vaga?: string
}

/** Na ordem da urna */
export const CARGOS: Cargo[] = [
  { id: 'depfed', label: 'Deputado Federal', digitos: 4, pool: 'depfed' },
  { id: 'depest', label: 'Deputado Estadual', digitos: 5, pool: 'depest' },
  { id: 'sen1', label: 'Senador', digitos: 3, pool: 'sen', vaga: '1ª vaga' },
  { id: 'sen2', label: 'Senador', digitos: 3, pool: 'sen', vaga: '2ª vaga' },
  { id: 'gov', label: 'Governador', digitos: 2, pool: 'gov' },
  { id: 'pres', label: 'Presidente', digitos: 2, pool: 'pres' },
]

export const tituloCargo = (c: Cargo, uf: string) =>
  c.id === 'depest' && uf === 'DF' ? 'Deputado Distrital' : c.label

export const tituloCompleto = (c: Cargo, uf: string) =>
  tituloCargo(c, uf) + (c.vaga ? ` · ${c.vaga}` : '')

export type Candidato = {
  sq: string
  numero: string
  nome: string
  sigla: string
  partido: string
  sit?: 'sub_judice' | 'indeferido'
}

export type CandidatosUF = Record<Pool, Candidato[]>

export type Voto = { digits: string; branco: boolean }

export type Votos = Record<CargoId, Voto>

export const votosVazios = (): Votos => ({
  depfed: { digits: '', branco: false },
  depest: { digits: '', branco: false },
  sen1: { digits: '', branco: false },
  sen2: { digits: '', branco: false },
  gov: { digits: '', branco: false },
  pres: { digits: '', branco: false },
})

export const normalizar = (t: string) =>
  t
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')

const CONECTIVOS = new Set(['DA', 'DAS', 'DE', 'DI', 'DO', 'DOS', 'E'])

export function iniciais(nome: string) {
  const partes = nome
    .trim()
    .toUpperCase()
    .split(/\s+/)
    .filter((p) => p && !p.endsWith('.') && !CONECTIVOS.has(p))
  if (partes.length === 0) return '?'
  if (partes.length === 1) return partes[0].slice(0, 2)
  return partes[0][0] + partes[partes.length - 1][0]
}

/** Resultado da consulta de um cargo, derivado dos dígitos + dados da UF */
export type Consulta =
  | { status: 'branco' }
  | { status: 'vazio' }
  | { status: 'carregando' }
  | { status: 'encontrado'; candidato: Candidato }
  | { status: 'nao_encontrado' }

export function consultar(
  cargo: Cargo,
  voto: Voto,
  dados: CandidatosUF | undefined,
): Consulta {
  if (voto.branco) return { status: 'branco' }
  if (voto.digits.length < cargo.digitos) return { status: 'vazio' }
  if (!dados) return { status: 'carregando' }
  const candidato = dados[cargo.pool].find((c) => c.numero === voto.digits)
  return candidato
    ? { status: 'encontrado', candidato }
    : { status: 'nao_encontrado' }
}
