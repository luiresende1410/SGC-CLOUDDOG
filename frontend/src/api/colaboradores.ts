import client from './client'
import type { Colaborador, HistoricoColaborador } from '../types'

export const listarColaboradores = (params?: {
  q?: string
  departamento_id?: number
  ativo?: boolean
  page?: number
  page_size?: number
}) => client.get<Colaborador[]>('/colaboradores', { params })

export const criarColaborador = (dados: Omit<Colaborador, 'id' | 'ativo' | 'departamento'>) =>
  client.post<Colaborador>('/colaboradores', dados)

export const atualizarColaborador = (id: number, dados: Partial<Colaborador>) =>
  client.put<Colaborador>(`/colaboradores/${id}`, dados)

export const inativarColaborador = (id: number, data_inativacao?: string, observacao?: string) =>
  client.patch<Colaborador>(`/colaboradores/${id}/inativar`, null, {
    params: { data_inativacao, observacao },
  })

export const listarHistorico = (id: number) =>
  client.get<HistoricoColaborador[]>(`/colaboradores/${id}/historico`)

export const adicionarEventoHistorico = (id: number, dados: Partial<HistoricoColaborador>) =>
  client.post<HistoricoColaborador>(`/colaboradores/${id}/historico`, dados)
