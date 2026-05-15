import client from './client'
import type { ParametroCalculo } from '../types'

export const listarParametros = () => client.get<ParametroCalculo[]>('/parametros')

export const criarParametro = (dados: {
  chave: string
  valor: number
  descricao?: string
  tipo_valor?: string
  aplica_a?: string
}) => client.post<ParametroCalculo>('/parametros', dados)

export const atualizarParametro = (id: number, valor: number, descricao?: string) =>
  client.put<ParametroCalculo>(`/parametros/${id}`, { valor, descricao })

export const excluirParametro = (id: number) =>
  client.delete(`/parametros/${id}`)
