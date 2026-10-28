/**
 * Acesso ao Portal de Dados Abertos do TSE, compartilhado pelos scripts que
 * leem os boletins de urna por seção (presidios.ts e secoes.ts).
 *
 * Os arquivos são achados pela API CKAN do portal (nada de URL montada na
 * mão) e baixados do cdn.tse.jus.br com curl.
 */
import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { rename } from 'node:fs/promises'

const CKAN = 'https://dadosabertos.tse.jus.br/api/3/action/package_show?id='

// Mesmos headers de scripts/fotos.ts: o Akamai do cdn.tse.jus.br responde 403
// para o fetch do Bun/Node e para curl sem cara de navegador.
const CURL_HEADERS = [
  'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
  'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language: pt-BR,pt;q=0.9',
  'Connection: keep-alive',
  'Upgrade-Insecure-Requests: 1',
]

export async function recursos(pacote: string) {
  const r = await fetch(CKAN + pacote)
  if (!r.ok) throw new Error(`${pacote}: HTTP ${r.status}`)
  const j = (await r.json()) as {
    result: { resources: { name: string; url: string }[] }
  }
  return j.result.resources
}

export async function baixar(url: string, destino: string) {
  if (existsSync(destino)) return
  execFileSync(
    'curl',
    [
      '--http1.1',
      '--fail',
      '--silent',
      '--show-error',
      '--retry',
      '3',
      ...CURL_HEADERS.flatMap((h) => ['-H', h]),
      '-o',
      `${destino}.part`,
      url,
    ],
    { stdio: ['ignore', 'ignore', 'inherit'] },
  )
  await rename(`${destino}.part`, destino)
}

/** Divide uma linha do CSV do TSE (";" e aspas opcionais). */
export function campos(linha: string) {
  const out: string[] = []
  let atual = ''
  let aspas = false
  for (let i = 0; i < linha.length; i++) {
    const c = linha[i]
    if (c === '"') {
      if (aspas && linha[i + 1] === '"') {
        atual += '"'
        i++
      } else aspas = !aspas
    } else if (c === ';' && !aspas) {
      out.push(atual)
      atual = ''
    } else atual += c
  }
  out.push(atual)
  return out
}

/**
 * Linhas de um CSV dentro do zip, já filtradas pelo grep (bem mais rápido
 * que passar GBs pelo JS). O cabeçalho sempre passa.
 */
export async function* linhas(zip: string, arquivo: string, filtro: string) {
  const unzip = Bun.spawn(['unzip', '-p', zip, arquivo], { stderr: 'inherit' })
  const grep = Bun.spawn(
    ['grep', '-a', '-F', '-e', '"DT_GERACAO"', '-e', filtro],
    { stdin: unzip.stdout, stderr: 'inherit' },
  )
  const dec = new TextDecoder('latin1')
  let resto = ''
  for await (const pedaco of grep.stdout) {
    resto += dec.decode(pedaco, { stream: true })
    const partes = resto.split('\n')
    resto = partes.pop() ?? ''
    for (const l of partes) if (l) yield l.replace(/\r$/, '')
  }
  if (resto) yield resto
  if ((await unzip.exited) !== 0) throw new Error(`unzip falhou: ${zip}`)
}

export function semAcento(s: string) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '')
}
