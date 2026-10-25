import { createContext, useContext } from 'react'
import { ELEICAO, type Turno } from '@/config/election'

/**
 * Turno exibido pela página do Live. /live mostra o turno atual
 * (ELEICAO.turno); /live/1-turno guarda o 1º turno depois do 2º.
 */
const TurnoContext = createContext<Turno>(ELEICAO.turno)

export const TurnoProvider = TurnoContext.Provider

export const useTurno = () => useContext(TurnoContext)
