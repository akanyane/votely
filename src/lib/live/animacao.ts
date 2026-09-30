import { useEffect, useRef, useState } from 'react'

const semMovimento = () =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/**
 * Conta do valor anterior até o novo quando os dados atualizam. Na primeira
 * exibição e com "reduzir movimento" ligado, mostra o valor direto.
 */
export function useNumeroAnimado(valor: number, duracaoMs = 600) {
  const [exibido, setExibido] = useState(valor)
  const anterior = useRef(valor)

  useEffect(() => {
    const de = anterior.current
    anterior.current = valor
    if (de === valor || semMovimento()) {
      setExibido(valor)
      return
    }
    const inicio = performance.now()
    let quadro = 0
    const passo = (agora: number) => {
      const t = Math.min(1, (agora - inicio) / duracaoMs)
      const suave = 1 - (1 - t) ** 3 // desacelera no fim
      setExibido(de + (valor - de) * suave)
      if (t < 1) quadro = requestAnimationFrame(passo)
    }
    quadro = requestAnimationFrame(passo)
    return () => cancelAnimationFrame(quadro)
  }, [valor, duracaoMs])

  return exibido
}

export type MudancaPosicao = { de: number; para: number } | null

/**
 * Lembra a posição anterior e devolve a mudança mais recente, que some
 * sozinha depois de `duracaoMs` (≈ duas atualizações da página).
 */
export function useMudancaPosicao(
  pos: number,
  duracaoMs = 60_000,
): MudancaPosicao {
  const anterior = useRef(pos)
  const [mudanca, setMudanca] = useState<MudancaPosicao>(null)

  useEffect(() => {
    const de = anterior.current
    anterior.current = pos
    if (de === pos) return
    setMudanca({ de, para: pos })
    const t = setTimeout(() => setMudanca(null), duracaoMs)
    return () => clearTimeout(t)
  }, [pos, duracaoMs])

  return mudanca
}
