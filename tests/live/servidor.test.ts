import {
  afterEach,
  beforeEach,
  describe,
  expect,
  mock,
  setSystemTime,
  test,
} from 'bun:test'
import { _limparCache, obterComCache } from '@/server/cache'
import { resultadoLive } from '@/server/live'
import { _definirRedis } from '@/server/redis'
import { resolverAlvo } from '@/server/tse/eleicoes'
import { _reiniciarHttp, buscarTse, ErroTse } from '@/server/tse/http'
import { configEleicoesSchema } from '@/server/tse/schemas'
import { lerFixture, parcial, textoFixture } from '../fixtures/tse/cenarios'

const fetchOriginal = globalThis.fetch
let chamadas: string[] = []

/** fetch falso: responde com fixtures pelo nome do arquivo na URL */
function simularTse(
  respostas: Record<string, () => Response | Promise<Response>>,
) {
  globalThis.fetch = mock(async (url: string | URL | Request) => {
    const u = String(url)
    chamadas.push(u)
    const nome = u.split('/').pop() as string
    const r = respostas[nome]
    if (!r) return new Response('not found', { status: 404 })
    return r()
  }) as unknown as typeof fetch
}

const json = (corpo: unknown, headers: Record<string, string> = {}) =>
  new Response(typeof corpo === 'string' ? corpo : JSON.stringify(corpo), {
    status: 200,
    headers: { 'content-type': 'application/json', ...headers },
  })

beforeEach(() => {
  chamadas = []
  _limparCache()
  _reiniciarHttp()
  _definirRedis(null) // testes sem Redis; o cache em memória basta
  process.env.TSE_AMBIENTE = 'simulado'
})

afterEach(() => {
  globalThis.fetch = fetchOriginal
})

describe('URLs montadas só a partir do config', () => {
  const eleicoes = {
    ciclo: 'ele2026',
    simulado: true,
    dirResultado: '<base>/<ambiente>/<ciclo>/<cd_eleicao>/dados/<uf>',
    federal: {
      1: { cd: '21270', abr: [{ cd: 'br', cargos: ['1'] }] },
      2: null,
    },
    estadual: {
      1: {
        cd: '21272',
        abr: [{ cd: 'br', cargos: ['3', '5', '6', '7', '8'] }],
      },
      2: { cd: '21273', abr: [{ cd: 'sp', cargos: ['3'] }] },
    },
  }

  test('bate com a URL de exemplo publicada pelo TSE', () => {
    const a = resolverAlvo(eleicoes, 'gov', 'AC', 1)
    expect(a).toEqual({
      tipo: 'arquivo',
      url: 'https://resultados-sim.tse.jus.br/simulado/simulado2026/ele2026/21272/dados/ac/ac-c0003-e021272-u.json',
      chave: 'simulado:ac-c0003-e021272-u.json',
    })
  })
  test('presidente Brasil', () => {
    const a = resolverAlvo(eleicoes, 'pres', 'br', 1)
    expect(
      a.tipo === 'arquivo' &&
        a.url.endsWith('/21270/dados/br/br-c0001-e021270-u.json'),
    ).toBe(true)
  })
  test('DF usa Deputado Distrital (0008)', () => {
    const a = resolverAlvo(eleicoes, 'depest', 'DF', 1)
    expect(
      a.tipo === 'arquivo' && a.url.endsWith('df-c0008-e021272-u.json'),
    ).toBe(true)
  })
  test('2º turno: só UFs listadas no config; senado nunca', () => {
    expect(resolverAlvo(eleicoes, 'gov', 'SP', 2).tipo).toBe('arquivo')
    expect(resolverAlvo(eleicoes, 'gov', 'RJ', 2).tipo).toBe(
      'sem_segundo_turno',
    )
    expect(resolverAlvo(eleicoes, 'sen', 'SP', 2).tipo).toBe(
      'sem_segundo_turno',
    )
  })
  test('config sem eleições gerais: aguardando, sem montar URL', () => {
    expect(resolverAlvo(null, 'pres', 'br', 1).tipo).toBe('aguardando')
  })
})

describe('fluxo completo com o config real do simulado', () => {
  test('presidente e governador de SP', async () => {
    simularTse({
      'ele-c.json': () => json(textoFixture('ele-c.json')),
      'br-c0001-e021270-u.json': () =>
        json(textoFixture('br-c0001-e021270-u.json')),
      'sp-c0003-e021272-u.json': () =>
        json(textoFixture('sp-c0003-e021272-u.json')),
    })
    const pres = await resultadoLive('pres', 'br')
    const gov = await resultadoLive('gov', 'SP')
    expect(pres.estado).toBe('ok')
    expect(gov.estado).toBe('ok')
    // Nenhuma URL fora do padrão (nenhum 404 provocado)
    expect(chamadas.every((u) => !u.includes('undefined'))).toBe(true)
    expect(chamadas).toHaveLength(3)
  })

  test('config oficial ainda sem 2026 (formato 2024): aguardando, nenhum arquivo pedido', async () => {
    process.env.TSE_AMBIENTE = 'oficial'
    const cfg2024 = {
      dg: '12/05/2026',
      hg: '10:51:05',
      f: 'o',
      c: 'ele2024',
      arq: [
        { tp: 'u', dir: '<base>/<ambiente>/<ciclo>/<cd_eleicao>/dados/<uf>' },
      ],
      pl: [
        {
          cd: '452',
          dt: '06/10/2024',
          e: [{ cd: '619', t: '1', tp: '3', abr: [] }],
        },
      ],
    }
    simularTse({ 'ele-c.json': () => json(cfg2024) })
    expect((await resultadoLive('pres', 'br')).estado).toBe('aguardando')
    expect(chamadas).toHaveLength(1)
  })
})

describe('cache', () => {
  test('1.000 pedidos simultâneos = 1 requisição ao TSE', async () => {
    let n = 0
    const buscar = async () => {
      n++
      await new Promise((r) => setTimeout(r, 20))
      return { dados: 'x', versao: 1, etag: null }
    }
    await Promise.all(
      Array.from({ length: 1000 }, () => obterComCache('k', 30_000, buscar)),
    )
    expect(n).toBe(1)
  })

  test('dentro do TTL não busca de novo', async () => {
    let n = 0
    const buscar = async () => ({ dados: ++n, versao: n, etag: null })
    await obterComCache('k', 30_000, buscar)
    const r = await obterComCache('k', 30_000, buscar)
    expect(n).toBe(1)
    expect(r.dados).toBe(1)
  })

  test('TSE fora do ar: serve o último dado válido marcado como desatualizado', async () => {
    await obterComCache('k', 0, async () => ({
      dados: 'bom',
      versao: 1,
      etag: null,
    }))
    const r = await obterComCache('k', 0, async () => {
      throw new ErroTse('HTTP 503', 503)
    })
    expect(r).toMatchObject({ dados: 'bom', desatualizado: true })
  })

  test('TSE fora do ar sem nenhum dado anterior: erro', async () => {
    await expect(
      obterComCache('k', 0, async () => {
        throw new ErroTse('HTTP 503', 503)
      }),
    ).rejects.toThrow('HTTP 503')
  })

  test('versão mais antiga (arquivos dessincronizados) não substitui a nova', async () => {
    await obterComCache('k', 0, async () => ({
      dados: 'v10',
      versao: 10,
      etag: null,
    }))
    const r = await obterComCache('k', 0, async () => ({
      dados: 'v9',
      versao: 9,
      etag: null,
    }))
    expect(r.dados).toBe('v10')
  })

  test('304 (ETag) mantém os dados', async () => {
    await obterComCache('k', 0, async () => ({
      dados: 'a',
      versao: 1,
      etag: '"x"',
    }))
    const r = await obterComCache('k', 0, async (anterior) => {
      expect(anterior?.etag).toBe('"x"')
      return 'nao_modificado'
    })
    expect(r).toMatchObject({ dados: 'a', desatualizado: false })
  })

  test('arquivo malformado não derruba: mantém o último válido', async () => {
    simularTse({
      'ele-c.json': () => json(textoFixture('ele-c.json')),
      'sp-c0003-e021272-u.json': () =>
        json(textoFixture('sp-c0003-e021272-u.json')),
    })
    const antes = await resultadoLive('gov', 'SP')
    expect(antes).toMatchObject({ estado: 'ok', desatualizado: false })

    // 31 s depois, a nova versão chega truncada (JSON inválido)
    setSystemTime(new Date(Date.now() + 31_000))
    simularTse({
      'ele-c.json': () => json(textoFixture('ele-c.json')),
      'sp-c0003-e021272-u.json': () => json('{"ele":"21272","carg":[{'),
    })
    const depois = await resultadoLive('gov', 'SP')
    setSystemTime()
    expect(depois).toMatchObject({ estado: 'ok', desatualizado: true })
    if (depois.estado === 'ok' && antes.estado === 'ok') {
      expect(depois.dados.candidatos).toEqual(antes.dados.candidatos)
    }
  })
})

describe('cliente HTTP do TSE', () => {
  test('rede fora do ar vira ErroTse', async () => {
    globalThis.fetch = mock(async () => {
      throw new TypeError('fetch failed')
    }) as unknown as typeof fetch
    await expect(buscarTse('https://x/a.json')).rejects.toBeInstanceOf(ErroTse)
  })

  test('após falha, a mesma URL entra em recuo (não martela o TSE)', async () => {
    let n = 0
    globalThis.fetch = mock(async () => {
      n++
      return new Response('erro', { status: 503 })
    }) as unknown as typeof fetch
    await expect(buscarTse('https://x/b.json')).rejects.toThrow('HTTP 503')
    await expect(buscarTse('https://x/b.json')).rejects.toThrow('recuo')
    expect(n).toBe(1)
  })

  test('403 (possível bloqueio) pausa todas as URLs', async () => {
    globalThis.fetch = mock(
      async () => new Response('', { status: 403 }),
    ) as unknown as typeof fetch
    await expect(buscarTse('https://x/c.json')).rejects.toThrow('HTTP 403')
    await expect(buscarTse('https://x/outra.json')).rejects.toThrow('pausado')
  })

  test('ritmo: no máximo ~8 requisições por segundo', async () => {
    const horarios: number[] = []
    globalThis.fetch = mock(async () => {
      horarios.push(Date.now())
      return json({})
    }) as unknown as typeof fetch
    const inicio = Date.now()
    await Promise.all(
      Array.from({ length: 16 }, (_, i) => buscarTse(`https://x/r${i}.json`)),
    )
    // 8 fichas iniciais + 8 recarregadas a 8/s ≈ 1 s
    expect(Date.now() - inicio).toBeGreaterThanOrEqual(850)
  })

  test('envia If-None-Match e trata 304', async () => {
    let enviado: string | null = null
    globalThis.fetch = mock(async (_u: unknown, init?: RequestInit) => {
      enviado = new Headers(init?.headers).get('if-none-match')
      return new Response(null, { status: 304 })
    }) as unknown as typeof fetch
    expect(await buscarTse('https://x/d.json', '"abc"')).toEqual({
      tipo: 'nao_modificado',
    })
    expect(enviado).toBe('"abc"')
  })
})

describe('fixture de config', () => {
  test('simulado: códigos das eleições e 2º turno', () => {
    const cfg = configEleicoesSchema.parse(lerFixture('ele-c.json'))
    const e = cfg.pl.flatMap((p) => p.e)
    expect(e.find((x) => x.tp === '8')).toMatchObject({
      cd: '21270',
      cdt2: '21271',
    })
    expect(e.find((x) => x.tp === '1')).toMatchObject({
      cd: '21272',
      cdt2: '21273',
    })
  })
  test('parcial preserva 13 candidatos', () => {
    expect(parcial('br-c0001-e021270-u.json').carg[0].agr).toHaveLength(13)
  })
})
