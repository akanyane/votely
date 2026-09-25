/**
 * Descobre, a partir do ele-c.json (EA11), os códigos das eleições gerais e
 * monta as URLs dos arquivos de resultado. Nenhuma URL é montada sem que o
 * config confirme eleição, abrangência e cargo: 404 repetidos podem bloquear
 * o IP no TSE.
 */
import type { CargoLive, ResultadoCargo } from '@/lib/live/tipos'
import type { UF } from '@/lib/votely'
import { obterComCache, type Resultado } from '../cache'
import { ambienteTse, urlConfig, urlDoPadrao } from './ambiente'
import { buscarTse, ErroTse } from './http'
import { normalizarResultado, versaoDoArquivo } from './normalizar'
import {
  type ConfigEleicoes,
  configEleicoesSchema,
  resultadoSchema,
} from './schemas'

// Tipos de eleição (EA11): 8 = Federal ordinária, 1 = Estadual ordinária
const TIPO_FEDERAL = '8'
const TIPO_ESTADUAL = '1'

const CODIGO_CARGO: Record<CargoLive, string> = {
  pres: '1',
  gov: '3',
  sen: '5',
  depfed: '6',
  depest: '7', // DF usa 8 (Deputado Distrital)
}

export const codigoCargo = (cargo: CargoLive, uf: UF | 'br') =>
  cargo === 'depest' && uf === 'DF' ? '8' : CODIGO_CARGO[cargo]

type Eleicao = { cd: string; abr: { cd: string; cargos: string[] }[] }

export type EleicoesGerais = {
  ciclo: string
  simulado: boolean
  dirResultado: string
  federal: Record<1 | 2, Eleicao | null>
  estadual: Record<1 | 2, Eleicao | null>
}

const TTL_CONFIG_MS = 5 * 60_000
export const TTL_RESULTADO_MS = 30_000

function extrairEleicoesGerais(cfg: ConfigEleicoes): EleicoesGerais | null {
  const dirResultado = cfg.arq.find((a) => a.tp === 'u')?.dir
  if (!dirResultado) return null

  for (const pl of cfg.pl) {
    const ciclo = pl.c ?? cfg.c ?? ''
    const t1Fed = pl.e.find((e) => e.tp === TIPO_FEDERAL && e.t === '1')
    const t1Est = pl.e.find((e) => e.tp === TIPO_ESTADUAL && e.t === '1')
    if (!t1Fed || !t1Est || !ciclo) continue

    const porCodigo = (cd?: string) => {
      const e = cd
        ? cfg.pl.flatMap((p) => p.e).find((x) => x.cd === cd)
        : undefined
      return e
        ? {
            cd: e.cd,
            abr: e.abr.map((a) => ({
              cd: a.cd.toLowerCase(),
              cargos: a.cp.map((c) => String(Number(c.cd))),
            })),
          }
        : null
    }

    return {
      ciclo,
      simulado: cfg.f === 's',
      dirResultado,
      federal: { 1: porCodigo(t1Fed.cd), 2: porCodigo(t1Fed.cdt2) },
      estadual: { 1: porCodigo(t1Est.cd), 2: porCodigo(t1Est.cdt2) },
    }
  }
  return null
}

/** null = o TSE ainda não publicou as eleições gerais no config */
export async function obterEleicoes(): Promise<
  Resultado<EleicoesGerais | null>
> {
  const amb = ambienteTse()
  return obterComCache(
    `${amb.nome}:config`,
    TTL_CONFIG_MS,
    async (anterior) => {
      const r = await buscarTse(urlConfig(amb), anterior?.etag)
      if (r.tipo === 'nao_modificado') return 'nao_modificado'
      const json = JSON.parse(r.corpo)
      const cfg = configEleicoesSchema.safeParse(json)
      if (!cfg.success) throw new ErroTse('ele-c.json fora do formato esperado')
      return {
        dados: extrairEleicoesGerais(cfg.data),
        versao: Number(cfg.data.idg) || Date.now(),
        etag: r.etag,
      }
    },
  )
}

export type Alvo =
  | { tipo: 'arquivo'; url: string; chave: string }
  | { tipo: 'aguardando' }
  | { tipo: 'sem_segundo_turno' }

/** Resolve qual arquivo EA20 corresponde a cargo + abrangência + turno */
export function resolverAlvo(
  el: EleicoesGerais | null,
  cargo: CargoLive,
  abrangencia: UF | 'br',
  turno: 1 | 2,
): Alvo {
  if (!el) return { tipo: 'aguardando' }
  if (turno === 2 && cargo !== 'pres' && cargo !== 'gov') {
    return { tipo: 'sem_segundo_turno' }
  }
  const eleicao = cargo === 'pres' ? el.federal[turno] : el.estadual[turno]
  if (!eleicao)
    return turno === 2 ? { tipo: 'sem_segundo_turno' } : { tipo: 'aguardando' }

  const uf = abrangencia === 'br' ? 'br' : abrangencia.toLowerCase()
  const cod = codigoCargo(cargo, abrangencia)
  // 1º turno: abrangência "br" cobre todas as UFs. 2º turno estadual: uma
  // abrangência por UF que tem 2º turno (EA11).
  const abr =
    eleicao.abr.find((a) => a.cd === uf) ??
    eleicao.abr.find((a) => a.cd === 'br')
  if (!abr?.cargos.includes(cod)) {
    return turno === 2 ? { tipo: 'sem_segundo_turno' } : { tipo: 'aguardando' }
  }

  const amb = ambienteTse()
  const cd6 = eleicao.cd.padStart(6, '0')
  const arquivo = `${uf}-c${cod.padStart(4, '0')}-e${cd6}-u.json`
  const url = urlDoPadrao(
    el.dirResultado,
    {
      base: amb.base,
      ambiente: amb.ambiente,
      ciclo: el.ciclo,
      cd_eleicao: eleicao.cd,
      uf,
    },
    arquivo,
  )
  return { tipo: 'arquivo', url, chave: `${amb.nome}:${arquivo}` }
}

export async function obterResultadoArquivo(
  url: string,
  chave: string,
  cargo: CargoLive,
  aoAtualizar?: (novo: ResultadoCargo) => Promise<void>,
): Promise<Resultado<ResultadoCargo>> {
  return obterComCache<ResultadoCargo>(
    chave,
    TTL_RESULTADO_MS,
    async (anterior) => {
      const r = await buscarTse(url, anterior?.etag)
      if (r.tipo === 'nao_modificado') return 'nao_modificado'
      let json: unknown
      try {
        json = JSON.parse(r.corpo)
      } catch {
        throw new ErroTse(`JSON inválido em ${chave}`)
      }
      const raw = resultadoSchema.safeParse(json)
      if (!raw.success) throw new ErroTse(`arquivo fora do formato em ${chave}`)
      const dados = normalizarResultado(raw.data, cargo)
      const versao = versaoDoArquivo(raw.data)
      if (aoAtualizar && (!anterior || versao > anterior.versao)) {
        await aoAtualizar(dados).catch((e) => console.error('[historico]', e))
      }
      return { dados, versao, etag: r.etag }
    },
  )
}
