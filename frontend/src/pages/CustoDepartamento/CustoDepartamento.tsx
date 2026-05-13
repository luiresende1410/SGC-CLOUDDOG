import React, { useState, useEffect, useCallback } from 'react'
import Table from '@cloudscape-design/components/table'
import Box from '@cloudscape-design/components/box'
import SpaceBetween from '@cloudscape-design/components/space-between'
import Button from '@cloudscape-design/components/button'
import Header from '@cloudscape-design/components/header'
import Alert from '@cloudscape-design/components/alert'
import Badge from '@cloudscape-design/components/badge'
import ContentLayout from '@cloudscape-design/components/content-layout'
import PeriodFilter from '../../components/PeriodFilter/PeriodFilter'
import { relatorioDepartamentos, exportarDepartamentosCSV } from '../../api/relatorios'
import { useFilterStore } from '../../store/filterStore'

interface ColaboradorCusto { id: number; nome: string; cargo: string; tipo_contrato: string; total: number }
interface DepartamentoCusto {
  id: number; nome: string; total: number; quantidade_colaboradores: number
  colaboradores: ColaboradorCusto[]; budget_mensal?: number | null
}

const formatBRL = (valor: number) => valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const toNumber = (v: unknown): number => {
  if (v === null || v === undefined) return 0
  const n = typeof v === 'string' ? parseFloat(v) : Number(v)
  return isNaN(n) ? 0 : n
}

export default function CustoDepartamento() {
  const { mes, ano } = useFilterStore()
  const [dados, setDados] = useState<DepartamentoCusto[]>([])
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  const [exportando, setExportando] = useState(false)
  const [expandidos, setExpandidos] = useState<Set<number>>(new Set())

  const carregar = useCallback(async () => {
    setLoading(true); setErro('')
    try {
      const resp = await relatorioDepartamentos(mes, ano)
      const raw: any[] = resp.data.departamentos || []
      setDados(raw.map((d) => ({
        id: d.id, nome: d.nome, total: toNumber(d.total),
        quantidade_colaboradores: d.num_colaboradores ?? d.colaboradores?.length ?? 0,
        budget_mensal: d.budget_mensal ? toNumber(d.budget_mensal) : null,
        colaboradores: (d.colaboradores || []).map((c: any) => ({
          id: c.id, nome: c.nome, cargo: c.cargo, tipo_contrato: c.tipo_contrato, total: toNumber(c.total),
        })).sort((a: ColaboradorCusto, b: ColaboradorCusto) => b.total - a.total),
      })).sort((a, b) => b.total - a.total))
    } catch { setErro('Erro ao carregar custos por departamento.') }
    finally { setLoading(false) }
  }, [mes, ano])

  useEffect(() => { carregar() }, [carregar])

  const toggleExpandir = (id: number) => {
    setExpandidos(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  const handleExportar = async () => {
    setExportando(true)
    try {
      const resp = await exportarDepartamentosCSV(mes, ano)
      const url = window.URL.createObjectURL(new Blob([resp.data]))
      const link = document.createElement('a')
      link.href = url; link.setAttribute('download', `custos-departamentos-${mes}-${ano}.csv`)
      document.body.appendChild(link); link.click(); link.remove()
      window.URL.revokeObjectURL(url)
    } catch { setErro('Erro ao exportar CSV.') }
    finally { setExportando(false) }
  }

  const meses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
  const totalGeral = dados.reduce((acc, d) => acc + d.total, 0)

  return (
    <ContentLayout
      header={
        <Header variant="h1" description={`Total do período: ${formatBRL(totalGeral)}`}
          actions={<Button loading={exportando} onClick={handleExportar} iconName="download">Exportar CSV</Button>}>
          Custos por Departamento
        </Header>
      }
    >
      <SpaceBetween size="l">
        <PeriodFilter />
        {erro && <Alert type="error" onDismiss={() => setErro('')}>{erro}</Alert>}
        {!loading && dados.length === 0 && !erro && (
          <Alert type="info">Nenhum registro de custo encontrado para {meses[mes - 1]}/{ano}.</Alert>
        )}
        {loading ? <Box textAlign="center" padding="xl">Carregando custos...</Box> : (
          <SpaceBetween size="s">
            {dados.map((dep, i) => {
              const pct = totalGeral > 0 ? (dep.total / totalGeral) * 100 : 0
              const expandido = expandidos.has(dep.id)
              const temBudget = dep.budget_mensal && dep.budget_mensal > 0
              const acimaBudget = temBudget && dep.total > dep.budget_mensal!
              const pctBudget = temBudget ? (dep.total / dep.budget_mensal!) * 100 : 0

              return (
                <div key={dep.id} style={{ border: `1px solid ${acimaBudget ? '#d91515' : '#e9ebed'}`, borderRadius: 8, overflow: 'hidden' }}>
                  <div
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: expandido ? '#f0f4ff' : '#fff', cursor: 'pointer', userSelect: 'none' }}
                    onClick={() => toggleExpandir(dep.id)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <Box color="text-body-secondary" fontWeight="bold">#{i + 1}</Box>
                      <Box fontWeight="bold" fontSize="heading-s">{dep.nome}</Box>
                      <Box variant="small" color="text-body-secondary">
                        {dep.quantidade_colaboradores} colaborador{dep.quantidade_colaboradores !== 1 ? 'es' : ''}
                      </Box>
                      {temBudget && (
                        acimaBudget
                          ? <Badge color="red">Acima do budget ({pctBudget.toFixed(0)}%)</Badge>
                          : <Badge color="green">Dentro do budget ({pctBudget.toFixed(0)}%)</Badge>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
                      <div style={{ textAlign: 'right' }}>
                        <Box fontWeight="bold" color={acimaBudget ? 'text-status-error' : 'text-status-info'}>{formatBRL(dep.total)}</Box>
                        {temBudget && (
                          <Box variant="small" color="text-body-secondary">Budget: {formatBRL(dep.budget_mensal!)}</Box>
                        )}
                        <Box variant="small" color="text-body-secondary">{pct.toFixed(1)}% do total</Box>
                      </div>
                      <Box color="text-body-secondary">{expandido ? '▲' : '▼'}</Box>
                    </div>
                  </div>

                  {/* Barra de progresso — budget ou % do total */}
                  {temBudget ? (
                    <div style={{ background: '#e9ebed', height: 6 }}>
                      <div style={{
                        background: acimaBudget ? '#d91515' : '#037f0c',
                        height: 6,
                        width: `${Math.min(pctBudget, 100)}%`,
                        transition: 'width 0.4s ease',
                      }} />
                    </div>
                  ) : (
                    <div style={{ background: '#e9ebed', height: 4 }}>
                      <div style={{ background: '#0972d3', height: 4, width: `${pct}%`, transition: 'width 0.4s ease' }} />
                    </div>
                  )}

                  {expandido && (
                    <div style={{ padding: '0 16px 16px' }}>
                      <Table
                        items={dep.colaboradores}
                        columnDefinitions={[
                          { id: 'nome', header: 'Colaborador', cell: (c) => <Box fontWeight="bold">{c.nome}</Box> },
                          { id: 'cargo', header: 'Cargo', cell: (c) => c.cargo },
                          { id: 'tipo', header: 'Tipo', cell: (c) => <Box color={c.tipo_contrato === 'PJ' ? 'text-status-warning' : 'text-status-success'}>{c.tipo_contrato}</Box> },
                          { id: 'total', header: 'Custo Total', cell: (c) => <Box fontWeight="bold" color="text-status-info">{formatBRL(c.total)}</Box> },
                          {
                            id: 'pct', header: '% do Depto',
                            cell: (c) => {
                              const p = dep.total > 0 ? (c.total / dep.total) * 100 : 0
                              return (
                                <SpaceBetween direction="vertical" size="xxxs">
                                  <Box variant="small">{p.toFixed(1)}%</Box>
                                  <div style={{ background: '#e9ebed', borderRadius: 4, height: 4, width: 60 }}>
                                    <div style={{ background: '#0972d3', borderRadius: 4, height: 4, width: `${p}%` }} />
                                  </div>
                                </SpaceBetween>
                              )
                            },
                          },
                        ]}
                        empty={<Box textAlign="center">Sem colaboradores</Box>}
                        variant="embedded"
                      />
                    </div>
                  )}
                </div>
              )
            })}
          </SpaceBetween>
        )}
      </SpaceBetween>
    </ContentLayout>
  )
}
