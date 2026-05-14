import client from './client'
import type { Certificacao } from '../types'

export const listarCertificacoes = (params?: { colaborador_id?: number }) =>
  client.get<Certificacao[]>('/certificacoes', { params })

export const listarCertificacoesPorColaborador = (colaboradorId: number) =>
  client.get<Certificacao[]>(`/certificacoes/colaborador/${colaboradorId}`)

export const criarCertificacao = (dados: {
  colaborador_id: number
  nome: string
  tipo?: string
  nivel?: string
  data_obtencao?: string
  data_expiracao?: string
}) => client.post<Certificacao>('/certificacoes', dados)

export const excluirCertificacao = (id: number) =>
  client.delete(`/certificacoes/${id}`)

export const relatorioCertificacoes = () =>
  client.get<{ total: number; por_tipo: { tipo: string; quantidade: number }[]; por_departamento: { departamento: string; tipo: string; quantidade: number }[] }>('/certificacoes/relatorio')
