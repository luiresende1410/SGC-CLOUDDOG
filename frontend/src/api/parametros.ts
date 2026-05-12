import client from './client'
import type { ParametroCalculo } from '../types'

export const listarParametros = () => client.get<ParametroCalculo[]>('/parametros')

export const atualizarParametro = (id: number, valor: number, descricao?: string) =>
  client.put<ParametroCalculo>(`/parametros/${id}`, { valor, descricao })
