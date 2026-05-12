import client from './client'

export const relatorioColaboradores = (mes: number, ano: number) =>
  client.get('/relatorios/colaboradores', { params: { mes, ano } })

export const relatorioDepartamentos = (mes: number, ano: number) =>
  client.get('/relatorios/departamentos', { params: { mes, ano } })

export const exportarColaboradoresCSV = (mes: number, ano: number) =>
  client.get('/relatorios/colaboradores/csv', { params: { mes, ano }, responseType: 'blob' })

export const exportarDepartamentosCSV = (mes: number, ano: number) =>
  client.get('/relatorios/departamentos/csv', { params: { mes, ano }, responseType: 'blob' })
