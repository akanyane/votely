/**
 * Serviço do Votely Live: junta config, cache e normalização num formato que
 * a interface consome. Só servidor.
 */
import { ELEICAO } from '@/config/election'
import { type Bancadas, montarBancadas } from '@/lib/live/bancadas'
import type { CargoLive, ResultadoCargo } from '@/lib/live/tipos'
import { type UF, UFS } from '@/lib/votely'
import { obterComCache } from './cache'
import { lerHistorico, type Snapshot, salvarSnapshot } from './historico'
import { ambienteTse } from './tse/ambiente'
import {
  obterEleicoes,
  obterResultadoArquivo,
  resolverAlvo,
} from './tse/eleicoes'

export type EstadoLive<T> =
  | { estado: 'aguardando' }
  | { estado: 'sem_segundo_turno' }
  | { estado: 'erro'; mensagem: string }
  | { estado: 'ok'; dados: T; obtidoEm: string; desatualizado: boolean }

export async function resultadoLive(
  cargo: CargoLive,
  abrangencia: UF | 'br',
  turno: 1 | 2 = ELEICAO.turno,
): Promise<EstadoLive<ResultadoCargo>> {
  try {
    const { dados: eleicoes } = await obterEleicoes()
    const alvo = resolverAlvo(eleicoes, cargo, abrangencia, turno)
    if (alvo.tipo !== 'arquivo') return { estado: alvo.tipo }
    const r = await obterResultadoArquivo(
      alvo.url,
      alvo.chave,
      cargo,
      salvarSnapshot,
    )
    return {
      estado: 'ok',
      dados: r.dados,
      obtidoEm: new Date(r.obtidoEm).toISOString(),
      desatualizado: r.desatualizado,
    }
  } catch (e) {
    console.error('[live]', cargo, abrangencia, e)
    return {
      estado: 'erro',
      mensagem: 'Não foi possível obter os dados do TSE agora.',
    }
  }
}

export type UfNoMapa = {
  uf: UF
  pctSecoes: number
  top: { sq: string; nome: string; partido: string; pct: number }[]
}

/** Presidente por UF, para o mapa: 27 arquivos, todos com o mesmo cache */
export async function mapaPresidente(): Promise<EstadoLive<UfNoMapa[]>> {
  const porUf = await Promise.all(
    UFS.map(async ([uf]) => [uf, await resultadoLive('pres', uf)] as const),
  )
  const primeiro = porUf.find(([, r]) => r.estado !== 'ok')?.[1]
  if (porUf.every(([, r]) => r.estado !== 'ok')) {
    return primeiro && primeiro.estado !== 'ok'
      ? primeiro
      : { estado: 'erro', mensagem: 'Sem dados' }
  }
  let obtidoEm = ''
  let desatualizado = false
  const dados: UfNoMapa[] = []
  for (const [uf, r] of porUf) {
    if (r.estado !== 'ok') {
      desatualizado = true
      continue
    }
    if (r.obtidoEm > obtidoEm) obtidoEm = r.obtidoEm
    desatualizado ||= r.desatualizado
    dados.push({
      uf,
      pctSecoes: r.dados.secoes.pct,
      top: r.dados.candidatos.slice(0, 3).map((c) => ({
        sq: c.sq,
        nome: c.nome,
        partido: c.partido,
        pct: c.pct,
      })),
    })
  }
  return { estado: 'ok', dados, obtidoEm, desatualizado }
}

export async function historicoLive(
  cargo: CargoLive,
  abrangencia: UF | 'br',
): Promise<Snapshot[]> {
  const r = await resultadoLive(cargo, abrangencia)
  if (r.estado !== 'ok') return []
  try {
    return await lerHistorico(
      r.dados.simulado,
      r.dados.turno,
      cargo,
      abrangencia,
    )
  } catch (e) {
    console.error('[historico]', e)
    return []
  }
}

/**
 * Soma nacional por partido (deputado federal, senado e governador das 27
 * UFs). São 81 arquivos; a soma fica no cache por 2 min, para que cada
 * instância não refaça tudo a cada visitante.
 */
const TTL_BANCADAS_MS = 2 * 60_000

export async function bancadasNacionais(): Promise<EstadoLive<Bancadas>> {
  try {
    const chave = `${ambienteTse().nome}:bancadas:t${ELEICAO.turno}`
    const r = await obterComCache<Bancadas>(
      chave,
      TTL_BANCADAS_MS,
      async () => {
        const ok = (x: EstadoLive<ResultadoCargo>) =>
          x.estado === 'ok' ? x.dados : null
        const porUf: Parameters<typeof montarBancadas>[0] = []
        // Em lotes de 9 UFs (27 arquivos), longe do limite de 100 req/s do TSE
        for (let i = 0; i < UFS.length; i += 9) {
          const lote = await Promise.all(
            UFS.slice(i, i + 9).map(async ([uf]) => {
              const [depfed, sen, gov] = await Promise.all([
                resultadoLive('depfed', uf),
                resultadoLive('sen', uf),
                resultadoLive('gov', uf),
              ])
              return { uf, depfed: ok(depfed), sen: ok(sen), gov: ok(gov) }
            }),
          )
          porUf.push(...lote)
        }
        if (porUf.every((u) => !u.depfed && !u.sen && !u.gov)) {
          throw new Error('nenhuma UF com dados')
        }
        return { dados: montarBancadas(porUf), versao: Date.now(), etag: null }
      },
    )
    return {
      estado: 'ok',
      dados: r.dados,
      obtidoEm: new Date(r.obtidoEm).toISOString(),
      desatualizado: r.desatualizado,
    }
  } catch (e) {
    console.error('[bancadas]', e)
    return {
      estado: 'erro',
      mensagem: 'Não foi possível obter os dados do TSE agora.',
    }
  }
}
