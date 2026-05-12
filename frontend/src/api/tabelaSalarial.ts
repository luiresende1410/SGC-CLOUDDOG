import client from './client'
import type { TabelaSalarial } from '../types'

export const listarTabelaSalarial = (params?: { cargo?: string; ano?: number }) =>
  client.get<TabelaSalarial[]>('/tabela-salarial', { params })

export const criarEntradaSalarial = (dados: Omit<TabelaSalarial, 'id'>) =>
  client.post<TabelaSalarial>('/tabela-salarial', dados)

export const atualizarEntradaSalarial = (id: number, salario: number) =>
  client.put<TabelaSalarial>(`/tabela-salarial/${id}`, { salario })

export const excluirEntradaSalarial = (id: number) => client.delete(`/tabela-salarial/${id}`)
