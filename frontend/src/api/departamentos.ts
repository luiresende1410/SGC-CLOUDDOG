import client from './client'
import type { Departamento } from '../types'

export const listarDepartamentos = () => client.get<Departamento[]>('/departamentos')

export const criarDepartamento = (nome: string) =>
  client.post<Departamento>('/departamentos', { nome })

export const atualizarDepartamento = (id: number, nome: string) =>
  client.put<Departamento>(`/departamentos/${id}`, { nome })

export const excluirDepartamento = (id: number) => client.delete(`/departamentos/${id}`)
