import client from './client'
import type { Usuario } from '../types'

export const listarUsuarios = () => client.get<Usuario[]>('/usuarios')

export const criarUsuario = (dados: { email: string; nome: string; senha: string }) =>
  client.post<Usuario>('/usuarios', dados)

export const atualizarUsuario = (id: number, dados: { nome?: string; email?: string }) =>
  client.put<Usuario>(`/usuarios/${id}`, dados)

export const inativarUsuario = (id: number) => client.patch<Usuario>(`/usuarios/${id}/inativar`)

export const resetSenha = (id: number, nova_senha: string) =>
  client.patch<Usuario>('/usuarios/' + id + '/reset-senha', { nova_senha })

export const alterarPerfil = (id: number, is_admin: boolean) =>
  client.patch<Usuario>('/usuarios/' + id + '/perfil', { is_admin })


export const excluirUsuario = (id: number) =>
  client.delete('/usuarios/' + id)

