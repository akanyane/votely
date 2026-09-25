import { useCallback, useSyncExternalStore } from 'react'

const STORAGE_KEY = 'votely-tema'

/**
 * Roda no <head> antes da pintura: aplica a escolha salva ou, no primeiro
 * acesso, o prefers-color-scheme. Evita piscar o tema errado.
 */
export const temaInicialScript = `(function(){try{var t=localStorage.getItem('${STORAGE_KEY}');if(t!=='dark'&&t!=='light'){t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}document.documentElement.classList.toggle('dark',t==='dark')}catch(e){}})()`

const listeners = new Set<() => void>()

function subscribe(cb: () => void) {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

const isDark = () => document.documentElement.classList.contains('dark')

export function useTema() {
  // No servidor não sabemos o tema; o ícone certo aparece após a hidratação
  const dark = useSyncExternalStore(subscribe, isDark, () => false)

  const alternar = useCallback(() => {
    const novo = !isDark()
    document.documentElement.classList.toggle('dark', novo)
    try {
      localStorage.setItem(STORAGE_KEY, novo ? 'dark' : 'light')
    } catch {}
    for (const cb of listeners) cb()
  }, [])

  return { dark, alternar }
}
