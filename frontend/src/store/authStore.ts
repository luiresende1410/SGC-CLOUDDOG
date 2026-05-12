import { create } from 'zustand'
import type { Usuario } from '../types'

interface AuthState {
  token: string | null
  usuario: Usuario | null
  login: (token: string, usuario: Usuario) => void
  logout: () => void
  isAuthenticated: () => boolean
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  usuario: null,
  login: (token, usuario) => set({ token, usuario }),
  logout: () => set({ token: null, usuario: null }),
  isAuthenticated: () => get().token !== null,
}))
