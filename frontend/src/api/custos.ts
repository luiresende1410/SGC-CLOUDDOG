import client from './client'

export interface LancamentoCustoInput {
  colaborador_id: number
  mes: number
  ano: number
  salario_base?: number
  bonus_aws?: number
  bonus_prd?: number
  comissoes?: number
  hora_extra?: number
  refeicao?: number
  transporte?: number
  seguro_saude?: number
  seguro_vida?: number
}

export interface LancamentoCustoResponse {
  colaborador_id: number
  mes: number
  ano: number
  componentes: Record<string, string>
  total: string
}

export const previewCalculo = (dados: LancamentoCustoInput) =>
  client.post<LancamentoCustoResponse>('/custos/preview', dados)

export const lancarCusto = (dados: LancamentoCustoInput) =>
  client.post<LancamentoCustoResponse>('/custos/lancar', dados)

export const obterCusto = (colaborador_id: number, mes: number, ano: number) =>
  client.get(`/custos/${colaborador_id}/${mes}/${ano}`)

export const replicarMesAnterior = (colaborador_id: number, mes: number, ano: number) =>
  client.post<LancamentoCustoResponse>('/custos/replicar', null, {
    params: { colaborador_id, mes, ano },
  })

export const replicarTodosMesAnterior = (mes: number, ano: number) =>
  client.post('/custos/replicar-todos', null, { params: { mes, ano } })
