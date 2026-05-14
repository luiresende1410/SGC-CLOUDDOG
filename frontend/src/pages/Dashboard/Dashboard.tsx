import React, { useState, useEffect } from 'react'
import ContentLayout from '@cloudscape-design/components/content-layout'
import Header from '@cloudscape-design/components/header'
import Grid from '@cloudscape-design/components/grid'
import Container from '@cloudscape-design/components/container'
import Box from '@cloudscape-design/components/box'
import SpaceBetween from '@cloudscape-design/components/space-between'
import Alert from '@cloudscape-design/components/alert'
import Spinner from '@cloudscape-design/components/spinner'
import Table from '@cloudscape-design/components/table'
import PeriodFilter from '../../components/PeriodFilter/PeriodFilter'
import CertificacoesDashboard from './CertificacoesDashboard'
import CertificacoesDashboard from './CertificacoesDashboard'
import { relatorioColaboradores, relatorioDepartamentos } from '../../api/relatorios'
import { useFilterStore } from '../../store/filterStore'

const formatBRL = (valor: number) =>
  valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

const toNumber = (v: unknown): number => {
  if (v === null || v === undefined) return 0
  const n = typeof v === 'string' ? parseFloat(v) : Number(v)
  return isNaN(n) ? 0 : n
}

interface StatCardProps {
  title: string; value: string; subtitle?: string; loading: boolean; color?: string
}

function StatCard({ title, value, subtitle, loading, color }: StatCardProps) {
  return (
    <Container>
      <SpaceBetween size="xs">
        <Box variant="awsui-key-label" color="text-body-secondary">{title}</Box>
        {loading ? <Box padding={{ top: 's' }}><Spinner size="normal" /></Box> : (
          <>
            <Box variant="h1" fontSize="heading-xl" fontWeight="bold" color={color as any}>{value}</Box>
            {subtitle && <Box variant="small" color="text-body-secondary">{subtitle}</Box>}
          </>
        )}
      </SpaceBetween>
    </Container>
  )
}

interface ColaboradorDep { nome: string; cargo: string; tipo_contrato: string; total: number }
interface DepCusto { id: number; nome: string; total: number; quantidade: number; colaboradores: ColaboradorDep[] }
interface MesCusto { label: string; total: number; colaboradores: number }

const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

function getMesesAnteriores(mes: number, ano: number) {
  const result = []
  for (let i = 2; i >= 0; i--) {
    let m = mes - i, a = ano
    if (m <= 0) { m += 12; a -= 1 }
    result.push({ mes: m, ano: a })
  }
  return result
}

export default function Dashboard() {
  const { mes, ano } = useFilterStore()
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  const [totalColaboradores, setTotalColaboradores] = useState(0)
  const [totalCusto, setTotalCusto] = useState(0)
  const [totalDepartamentos, setTotalDepartamentos] = useState(0)
  const [mediaCusto, setMediaCusto] = useState(0)
  const [topDeps, setTopDeps] = useState<DepCusto[]>([])
  const [expandidos, setExpandidos] = useState<Set<number>>(new Set())
  const [historicoMeses, setHistoricoMeses] = useState<MesCusto[]>([])
  const [loadingHistorico, setLoadingHistorico] = useState(false)

  useEffect(() => {
    const carregar = async () => {
      setLoading(true); setErro('')
      try {
        const [respColab, respDep] = await Promise.all([
          relatorioColaboradores(mes, ano),
          relatorioDepartamentos(mes, ano),
        ])
        const colaboradores: any[] = respColab.data.colaboradores || []
        const departamentos: any[] = respDep.data.departamentos || []
        const custo = colaboradores.reduce((acc: number, c: any) => acc + toNumber(c.total), 0)
        const qtd = colaboradores.length
        setTotalColaboradores(qtd); setTotalCusto(custo)
        setTotalDepartamentos(departamentos.length); setMediaCusto(qtd > 0 ? custo / qtd : 0)
        setTopDeps(departamentos.map((d: any) => ({
          id: d.id,
          nome: d.nome,
          total: toNumber(d.total),
          quantidade: d.num_colaboradores ?? d.colaboradores?.length ?? 0,
          colaboradores: (d.colaboradores || []).map((c: any) => ({
            nome: c.nome, cargo: c.cargo,
            tipo_contrato: c.tipo_contrato, total: toNumber(c.total),
          })).sort((a: ColaboradorDep, b: ColaboradorDep) => b.total - a.total),
        })).sort((a: DepCusto, b: DepCusto) => b.total - a.total))
      } catch { setErro('Erro ao carregar dados do dashboard.') }
      finally { setLoading(false) }
    }
    carregar()
  }, [mes, ano])

  useEffect(() => {
    const carregarHistorico = async () => {
      setLoadingHistorico(true)
      try {
        const periodos = getMesesAnteriores(mes, ano)
        const resultados = await Promise.all(
          periodos.map(p => relatorioColaboradores(p.mes, p.ano).catch(() => null))
        )
        setHistoricoMeses(resultados.map((resp, i) => {
          const p = periodos[i]
          const colabs: any[] = resp?.data?.colaboradores || []
          return {
            label: `${MESES[p.mes - 1]}/${p.ano}`,
            total: colabs.reduce((acc: number, c: any) => acc + toNumber(c.total), 0),
            colaboradores: colabs.length,
          }
        }))
      } catch {} finally { setLoadingHistorico(false) }
    }
    carregarHistorico()
  }, [mes, ano])

  const toggleExpandir = (id: number) => {
    setExpandidos(prev => {
      const novo = new Set(prev)
      if (novo.has(id)) novo.delete(id)
      else novo.add(id)
      return novo
    })
  }

  const periodoLabel = `${MESES[mes - 1]}/${ano}`
  const maxHistorico = Math.max(...historicoMeses.map(m => m.total), 1)

  return (
    <ContentLayout header={<Header variant="h1" description={`Visão geral dos custos de colaboradores — ${periodoLabel}`}>Dashboard</Header>}>
      <SpaceBetween size="l">
        <PeriodFilter />
        {erro && <Alert type="error" onDismiss={() => setErro('')}>{erro}</Alert>}

        <Grid gridDefinition={[
          { colspan: { default: 12, s: 6, m: 3 } }, { colspan: { default: 12, s: 6, m: 3 } },
          { colspan: { default: 12, s: 6, m: 3 } }, { colspan: { default: 12, s: 6, m: 3 } },
        ]}>
          <StatCard title="Colaboradores com custo" value={totalColaboradores.toString()} subtitle={periodoLabel} loading={loading} />
          <StatCard title="Custo total no período" value={formatBRL(totalCusto)} subtitle={`${totalColaboradores} colaboradores`} loading={loading} color="text-status-info" />
          <StatCard title="Departamentos ativos" value={totalDepartamentos.toString()} subtitle={periodoLabel} loading={loading} />
          <StatCard title="Custo médio por colaborador" value={formatBRL(mediaCusto)} subtitle="média do período" loading={loading} />
        </Grid>

        {/* Gráfico 3 meses */}
        <Container header={<Header variant="h2" description="Comparativo de custo total nos últimos 3 meses">Evolução de Custos</Header>}>
          {loadingHistorico ? <Box textAlign="center" padding="l"><Spinner /></Box> : (
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 24, padding: '16px 8px', height: 220 }}>
              {historicoMeses.map((m, i) => {
                const altura = maxHistorico > 0 ? (m.total / maxHistorico) * 150 : 0
                const isAtual = i === historicoMeses.length - 1
                return (
                  <div key={m.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                    <Box variant="small" color="text-body-secondary" fontWeight={isAtual ? 'bold' : 'normal'}>{formatBRL(m.total)}</Box>
                    <div style={{ width: '100%', height: altura, background: isAtual ? '#0972d3' : '#b0c4de', borderRadius: '4px 4px 0 0', transition: 'height 0.4s ease', minHeight: m.total > 0 ? 4 : 0 }} />
                    <Box variant="small" fontWeight={isAtual ? 'bold' : 'normal'} color={isAtual ? 'text-status-info' : 'text-body-secondary'}>{m.label}</Box>
                    <Box variant="small" color="text-body-secondary">{m.colaboradores} colab.</Box>
                  </div>
                )
              })}
            </div>
          )}
        </Container>

        {/* Departamentos com expansão */}
        {!loading && topDeps.length > 0 && (
          <Container header={<Header variant="h2" description="Clique para expandir e ver colaboradores">Custos por Departamento — {periodoLabel}</Header>}>
            <SpaceBetween size="xs">
              {topDeps.map((dep, i) => {
                const pct = totalCusto > 0 ? (dep.total / totalCusto) * 100 : 0
                const expandido = expandidos.has(dep.id)
                return (
                  <div key={dep.id} style={{ border: '1px solid #e9ebed', borderRadius: 8, overflow: 'hidden' }}>
                    <div
                      style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', background: expandido ? '#f0f4ff' : '#fff', cursor: 'pointer', userSelect: 'none' }}
                      onClick={() => toggleExpandir(dep.id)}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Box variant="small" color="text-body-secondary" fontWeight="bold">#{i + 1}</Box>
                        <Box fontWeight="bold">{dep.nome}</Box>
                        <Box variant="small" color="text-body-secondary">{dep.quantidade} colaborador{dep.quantidade !== 1 ? 'es' : ''}</Box>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <div style={{ textAlign: 'right' }}>
                          <Box fontWeight="bold" color="text-status-info">{formatBRL(dep.total)}</Box>
                          <Box variant="small" color="text-body-secondary">{pct.toFixed(1)}% do total</Box>
                        </div>
                        <Box color="text-body-secondary">{expandido ? '▲' : '▼'}</Box>
                      </div>
                    </div>
                    <div style={{ background: '#e9ebed', height: 4 }}>
                      <div style={{ background: '#0972d3', height: 4, width: `${pct}%`, transition: 'width 0.4s ease' }} />
                    </div>
                    {expandido && (
                      <div style={{ padding: '0 16px 12px' }}>
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
                              }
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
          </Container>
        )}

        {!loading && totalColaboradores === 0 && !erro && (
          <Alert type="info">Nenhum registro de custo encontrado para {periodoLabel}. Importe dados ou ajuste o período.</Alert>
        )}
      </SpaceBetween>
    </ContentLayout>
  )
}
