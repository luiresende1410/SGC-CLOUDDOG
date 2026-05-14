import client from './client'
import type { Certificacao } from '../types'

export const listarCertificacoes = () =>
  client.get<Certificacao[]>('/certificacoes')

export const listarCertificacoesPorColaborador = (colaboradorId: number) =>
  client.get<Certificacao[]>(`/certificacoes/colaborador/${colaboradorId}`)

export const criarCertificacao = (dados: { colaborador_id: number; nome: string }) =>
  client.post<Certificacao>('/certificacoes', dados)

export const excluirCertificacao = (id: number) =>
  client.delete(`/certificacoes/${id}`)

export const relatorioCertificacoes = () =>
  client.get<{ total: number; por_tipo: Record<string, number>; por_departamento: Record<string, number> }>('/certificacoes/relatorio')
