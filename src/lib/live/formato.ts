import type { StatusCandidato } from './tipos'

const inteiro = new Intl.NumberFormat('pt-BR')
const umaCasa = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})
const hora = new Intl.DateTimeFormat('pt-BR', {
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'America/Sao_Paulo',
})

/** 38.21 → "38,2%" */
export const fmtPct = (n: number) => `${umaCasa.format(n)}%`

/** 1234567 → "1.234.567" */
export const fmtNum = (n: number) => inteiro.format(n)

export const fmtVotos = (n: number) =>
  `${fmtNum(n)} ${n === 1 ? 'voto' : 'votos'}`

/** ISO → "20:14" no horário de Brasília */
export const fmtHora = (iso: string | null | undefined) =>
  iso ? hora.format(new Date(iso)) : '--:--'

export const ordinal = (pos: number) => `${pos}º`

export const ROTULO_STATUS: Record<StatusCandidato, string> = {
  eleito: 'Eleito',
  segundo_turno: 'Vai ao 2º turno',
  nao_eleito: 'Não eleito',
  suplente: 'Suplente',
}
