import client from './client'
import type { Usuario } from '../types'

export const login = (email: string, senha: string) =>
  client.post<{ access_token: string; token_type: string; expires_in: number }>('/auth/login', { email, senha })

export const logout = () => client.post('/auth/logout')

export const getMe = () => client.get<Usuario>('/auth/me')
