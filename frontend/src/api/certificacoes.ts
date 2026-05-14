import client from './client'

export interface Certificacao {
  id: number
  colaborador_id: number
  tipo: string
  nome: string
  mes: number
  ano: number
}

export const listarCertificacoes = (colaborador_id?: number) =>
  client.get<Certificacao[]>('/certificacoes', { params: colaborador_id ? { colaborador_id } : {} })

export const criarCertificacao = (dados: Omit<Certificacao, 'id'>) =>
  client.post<Certificacao>('/certificacoes', dados)

export const atualizarCertificacao = (id: number, dados: Partial<Certificacao>) =>
  client.put<Certificacao>(`/certificacoes/${id}`, dados)

export const excluirCertificacao = (id: number) =>
  client.delete(`/certificacoes/${id}`)

export const relatorioPorTipo = () =>
  client.get<{tipo: string, total: number}[]>('/certificacoes/relatorio/por-tipo')

export const relatorioPorDepartamento = () =>
  client.get<{departamento: string, total: number, por_tipo: Record<string, number>}[]>('/certificacoes/relatorio/por-departamento')
