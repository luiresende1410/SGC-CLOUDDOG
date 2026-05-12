import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface FilterState {
  mes: number
  ano: number
  setMes: (mes: number) => void
  setAno: (ano: number) => void
  setPeriodo: (mes: number, ano: number) => void
}

const now = new Date()

export const useFilterStore = create<FilterState>()(
  persist(
    (set) => ({
      mes: now.getMonth() + 1,
      ano: now.getFullYear(),
      setMes: (mes) => set({ mes }),
      setAno: (ano) => set({ ano }),
      setPeriodo: (mes, ano) => set({ mes, ano }),
    }),
    {
      name: 'clouddog-period-filter',
      storage: {
        getItem: (k) => sessionStorage.getItem(k),
        setItem: (k, v) => sessionStorage.setItem(k, v),
        removeItem: (k) => sessionStorage.removeItem(k),
      },
    }
  )
)
