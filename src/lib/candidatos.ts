import { useEffect, useState } from 'react'
import type { CandidatosUF, UF } from './votely'

const cache = new Map<UF, Promise<CandidatosUF>>()

function carregar(uf: UF) {
  let p = cache.get(uf)
  if (!p) {
    // Gerado por scripts/candidatos.ts
    p = fetch(`/data/${uf}.json`).then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      return r.json() as Promise<CandidatosUF>
    })
    p.catch(() => cache.delete(uf)) // permite tentar de novo
    cache.set(uf, p)
  }
  return p
}

export type EstadoCandidatos =
  | { status: 'carregando'; dados?: undefined }
  | { status: 'erro'; dados?: undefined; tentarDeNovo: () => void }
  | { status: 'pronto'; dados: CandidatosUF }

export function useCandidatos(uf: UF | ''): EstadoCandidatos | undefined {
  const [estado, setEstado] = useState<{
    uf: UF
    dados?: CandidatosUF
    erro?: boolean
  }>()
  const [tentativa, setTentativa] = useState(0)

  // biome-ignore lint/correctness/useExhaustiveDependencies: `tentativa` refaz o fetch no "Tentar de novo"
  useEffect(() => {
    if (!uf) return
    let ativo = true
    carregar(uf).then(
      (dados) => ativo && setEstado({ uf, dados }),
      () => ativo && setEstado({ uf, erro: true }),
    )
    return () => {
      ativo = false
    }
  }, [uf, tentativa])

  if (!uf) return undefined
  if (estado?.uf !== uf) return { status: 'carregando' }
  if (estado.dados) return { status: 'pronto', dados: estado.dados }
  if (estado.erro) {
    return {
      status: 'erro',
      tentarDeNovo: () => {
        setEstado(undefined)
        setTentativa((t) => t + 1)
      },
    }
  }
  return { status: 'carregando' }
}
