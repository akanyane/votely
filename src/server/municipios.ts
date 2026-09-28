/**
 * Apuração por município, para o mapa do estado: % apurado de cada cidade
 * (1 arquivo EA15 por UF) e, sob demanda, o resultado de uma cidade.
 */
import { ELEICAO } from '@/config/election'
import type {
  ApuracaoMunicipios,
  CargoLive,
  ResultadoMunicipio,
} from '@/lib/live/tipos'
import type { UF } from '@/lib/votely'
import { obterComCache } from './cache'
import type { EstadoLive } from './live'
import {
  obterEleicoes,
  obterResultadoArquivo,
  resolverAcompanhamento,
  resolverAlvo,
  TTL_RESULTADO_MS,
} from './tse/eleicoes'
import { buscarTse, ErroTse } from './tse/http'
import { dataHoraBrasilia, versaoDoArquivo } from './tse/normalizar'
import { acompanhamentoSchema, numero } from './tse/schemas'

/** Resultado de uma cidade muda menos na tela; cache um pouco mais longo */
const TTL_MUNICIPIO_MS = 60_000
const CANDIDATOS_NO_MAPA = 5

export async function apuracaoMunicipios(
  uf: UF,
  turno: 1 | 2 = ELEICAO.turno,
): Promise<EstadoLive<ApuracaoMunicipios>> {
  try {
    const { dados: eleicoes } = await obterEleicoes()
    const alvo = resolverAcompanhamento(eleicoes, uf, turno)
    if (alvo.tipo !== 'arquivo') return { estado: alvo.tipo }
    const r = await obterComCache<ApuracaoMunicipios>(
      alvo.chave,
      TTL_RESULTADO_MS,
      async (anterior) => {
        const resp = await buscarTse(alvo.url, anterior?.etag)
        if (resp.tipo === 'nao_modificado') return 'nao_modificado'
        const raw = acompanhamentoSchema.safeParse(JSON.parse(resp.corpo))
        if (!raw.success)
          throw new ErroTse(`arquivo fora do formato em ${alvo.chave}`)
        const pct: Record<string, number> = {}
        for (const a of raw.data.abr) {
          if (a.tpabr !== 'mun' && a.tpabr !== 'mu') continue
          pct[a.cdabr] = numero(a.s.pstn ?? a.s.pst) ?? 0
        }
        return {
          dados: {
            uf,
            geradoEm:
              dataHoraBrasilia(raw.data.dg, raw.data.hg) ??
              new Date(0).toISOString(),
            pct,
          },
          versao: versaoDoArquivo(raw.data),
          etag: resp.etag,
        }
      },
    )
    return {
      estado: 'ok',
      dados: r.dados,
      obtidoEm: new Date(r.obtidoEm).toISOString(),
      desatualizado: r.desatualizado,
    }
  } catch (e) {
    console.error('[municipios]', uf, e)
    return { estado: 'erro', mensagem: 'Não foi possível obter os municípios.' }
  }
}

export async function resultadoMunicipio(
  cargo: CargoLive,
  uf: UF,
  municipio: string,
  turno: 1 | 2 = ELEICAO.turno,
): Promise<EstadoLive<ResultadoMunicipio>> {
  try {
    // Só monta a URL de municípios que o próprio TSE listou para a UF
    const apuracao = await apuracaoMunicipios(uf, turno)
    if (apuracao.estado !== 'ok') return apuracao
    if (!(municipio in apuracao.dados.pct)) {
      return { estado: 'erro', mensagem: 'Município não encontrado.' }
    }
    const { dados: eleicoes } = await obterEleicoes()
    const alvo = resolverAlvo(eleicoes, cargo, uf, turno, municipio)
    if (alvo.tipo !== 'arquivo') return { estado: alvo.tipo }
    const r = await obterResultadoArquivo(
      alvo.url,
      alvo.chave,
      cargo,
      undefined,
      TTL_MUNICIPIO_MS,
    )
    const d = r.dados
    return {
      estado: 'ok',
      dados: {
        municipio,
        pctSecoes: d.secoes.pct,
        votacaoLiberada: d.votacaoLiberada,
        totalizadoEm: d.totalizadoEm,
        candidatos: d.candidatos
          .slice(0, CANDIDATOS_NO_MAPA)
          .map(({ sq, nome, partido, votos, pct }) => ({
            sq,
            nome,
            partido,
            votos,
            pct,
          })),
      },
      obtidoEm: new Date(r.obtidoEm).toISOString(),
      desatualizado: r.desatualizado,
    }
  } catch (e) {
    console.error('[municipio]', cargo, uf, municipio, e)
    return { estado: 'erro', mensagem: 'Não foi possível obter a cidade.' }
  }
}
