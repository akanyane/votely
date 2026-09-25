/**
 * Cenários de teste derivados dos arquivos reais do simulado do TSE
 * (tests/fixtures/tse/simulado, baixados em 25/09/2026, totalização final).
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const DIR = join(import.meta.dirname, 'simulado')

export const lerFixture = (nome: string): any =>
  JSON.parse(readFileSync(join(DIR, nome), 'utf8'))

export const textoFixture = (nome: string) =>
  readFileSync(join(DIR, nome), 'utf8')

type Transformar = (c: any) => void

function paraCadaCandidato(raw: any, fn: Transformar) {
  for (const carg of raw.carg)
    for (const agr of carg.agr)
      for (const par of agr.par) for (const c of par.cand ?? []) fn(c)
}

/** Final (como publicado): tf = s, and = f, st preenchido */
export const final = (nome: string) => lerFixture(nome)

/** Antes da apuração: zero votos, sem status */
export function zeroVotos(nome: string) {
  const raw = lerFixture(nome)
  Object.assign(raw, { tf: 'n', and: 'n', dt: '', ht: '' })
  delete raw.md
  delete raw.esae
  paraCadaCandidato(raw, (c) => {
    Object.assign(c, { vap: '0', pvap: '0,00', pvapn: '0', e: 'n' })
    delete c.st
  })
  Object.assign(raw.s, { st: '0', pst: '0,00', pstn: '0', snt: raw.s.ts })
  for (const k of Object.keys(raw.v)) raw.v[k] = '0'
  return raw
}

/**
 * Parcial: tf = n, and = p, votos reduzidos, `st` ausente (só existe na
 * totalização final). `md` opcional para simular "matematicamente definido".
 */
export function parcial(nome: string, opcoes: { md?: 'e' | 's' | 'n'; pct?: string } = {}) {
  const raw = lerFixture(nome)
  Object.assign(raw, { tf: 'n', and: 'p' })
  delete raw.esae
  if (opcoes.md) raw.md = opcoes.md
  else delete raw.md
  paraCadaCandidato(raw, (c) => {
    c.vap = String(Math.floor(Number(c.vap) / 2))
    delete c.st
  })
  Object.assign(raw.s, { pstn: opcoes.pct ?? '47,123456789', pst: '47,12' })
  return raw
}

/** Presidente antes das 17h: dv = n, votos zerados pelo TSE */
export function presidenteAntesDas17h() {
  const raw = parcial('br-c0001-e021270-u.json')
  raw.dv = 'n'
  return raw
}

/** Malformado: sem `carg` */
export function semCargos() {
  const raw = lerFixture('sp-c0003-e021272-u.json')
  delete raw.carg
  return raw
}
