import type { Turno } from '@/config/election'
import { isUf, type UF, type Votos, votosVazios } from './votely'

export const STORAGE_KEY = 'votely-colinha'

export type ColinhaSalva = { uf: UF; v: Votos; turno: Turno }

/** Colinha salva neste aparelho (mesmo domínio), ou null */
export function lerColinha(): ColinhaSalva | null {
  try {
    const salva = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')
    if (!salva || !isUf(salva.uf)) return null
    return {
      uf: salva.uf,
      v: { ...votosVazios(), ...salva.v },
      // Colinhas salvas antes de existir o campo são do 1º turno
      turno: salva.turno === 2 ? 2 : 1,
    }
  } catch {
    return null
  }
}

export function salvarColinha(c: ColinhaSalva) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(c))
}
