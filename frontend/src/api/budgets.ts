import client from './client'

export interface BudgetDepartamento {
  id: number
  departamento_id: number
  mes: number
  ano: number
  valor: number
}

export interface BudgetComparacao {
  departamento_id: number
  departamento_nome: string
  budget: number | null
  custo_real: number
  diferenca: number | null
  percentual_uso: number | null
  status: 'abaixo' | 'acima' | 'sem_budget'
}

export const listarBudgets = (params?: { mes?: number; ano?: number; departamento_id?: number }) =>
  client.get<BudgetDepartamento[]>('/budgets', { params })

export const criarBudget = (dados: { departamento_id: number; mes: number; ano: number; valor: number }) =>
  client.post<BudgetDepartamento>('/budgets', dados)

export const atualizarBudget = (id: number, valor: number) =>
  client.put<BudgetDepartamento>("/budgets/" + id, { valor })

export const excluirBudget = (id: number) =>
  client.delete("/budgets/" + id)

export const comparacaoBudget = (mes: number, ano: number) =>
  client.get<BudgetComparacao[]>('/budgets/comparacao', { params: { mes, ano } })

export const copiarBudgets = (mes_origem: number, ano_origem: number, mes_destino: number, ano_destino: number) =>
  client.post('/budgets/copiar', null, { params: { mes_origem, ano_origem, mes_destino, ano_destino } })
