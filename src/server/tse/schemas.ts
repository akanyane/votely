/**
 * Validação dos arquivos do TSE (docs/tse). Tolerante de propósito: o TSE
 * publica números como texto, com vírgula decimal, e alguns campos só
 * aparecem em certas fases. Campos desconhecidos são ignorados.
 */
import { z } from 'zod'

/** "59,351118968", "100", 42 → número; ausente ou inválido → undefined */
export function numero(v: unknown): number | undefined {
  if (typeof v === 'number') return Number.isFinite(v) ? v : undefined
  if (typeof v !== 'string' || v.trim() === '') return undefined
  const s = v.trim()
  // Só trata "." como milhar quando há vírgula decimal; "59.35" continua 59,35
  const n = Number(s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s)
  return Number.isFinite(n) ? n : undefined
}

// Valores que o TSE manda como texto ou número
const txt = z.union([z.string(), z.number()]).transform(String)
const txtOpt = txt.optional()

// ---------- EA11: configuração de eleições (ele-c.json) ----------

const cargoCfg = z.object({ cd: txt, ds: txtOpt, tp: txtOpt })

const abrCfg = z.object({
  cd: txt,
  cp: z.array(cargoCfg).optional().default([]),
})

const eleicaoCfg = z.object({
  cd: txt,
  cdt2: txtOpt,
  nm: txtOpt,
  t: txt,
  tp: txt,
  abr: z.array(abrCfg).optional().default([]),
})

export const configEleicoesSchema = z.object({
  dg: txtOpt,
  hg: txtOpt,
  idg: txtOpt,
  f: txtOpt,
  // Formato até 2024: ciclo no topo. Formato 2026: ciclo por pleito.
  c: txtOpt,
  arq: z
    .array(z.object({ tp: txt, dir: txt }))
    .optional()
    .default([]),
  pl: z.array(
    z.object({
      cd: txt,
      c: txtOpt,
      dt: txtOpt,
      e: z.array(eleicaoCfg),
    }),
  ),
})

export type ConfigEleicoes = z.infer<typeof configEleicoesSchema>

// ---------- EA20: resultado unificado ----------

const candidatoRaw = z.object({
  n: txt,
  sqcand: txtOpt,
  nmu: txtOpt,
  nm: txtOpt,
  e: txtOpt,
  st: txtOpt,
  vap: txtOpt,
  pvap: txtOpt,
  pvapn: txtOpt,
})

const partidoRaw = z.object({
  n: txtOpt,
  sg: txtOpt,
  nm: txtOpt,
  // "Caso não haja candidato no partido, esse elemento pode ser suprimido"
  cand: z.array(candidatoRaw).optional().default([]),
})

const agremiacaoRaw = z.object({
  n: txtOpt,
  nm: txtOpt,
  tp: txtOpt,
  com: txtOpt,
  vag: txtOpt,
  par: z.array(partidoRaw).optional().default([]),
})

const cargoRaw = z.object({
  cd: txt,
  nmn: txtOpt,
  nv: txtOpt,
  qe: txtOpt,
  agr: z.array(agremiacaoRaw).optional().default([]),
})

const contagem = z.record(z.string(), z.unknown()).optional().default({})

export const resultadoSchema = z.object({
  ele: txt,
  t: txt,
  f: txtOpt,
  tpabr: txtOpt,
  cdabr: txtOpt,
  dg: txt,
  hg: txt,
  idg: txtOpt,
  dv: txtOpt,
  dt: txtOpt,
  ht: txtOpt,
  tf: txtOpt,
  and: txtOpt,
  md: txtOpt,
  esae: txtOpt,
  carg: z.array(cargoRaw).min(1),
  s: contagem,
  e: contagem,
  v: contagem,
})

export type ResultadoRaw = z.infer<typeof resultadoSchema>
