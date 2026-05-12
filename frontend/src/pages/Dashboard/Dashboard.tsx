import React, { useState, useEffect } from 'react'
import ContentLayout from '@cloudscape-design/components/content-layout'
import Header from '@cloudscape-design/components/header'
import Grid from '@cloudscape-design/components/grid'
import Container from '@cloudscape-design/components/container'
import Box from '@cloudscape-design/components/box'
import SpaceBetween from '@cloudscape-design/components/space-between'
import Alert from '@cloudscape-design/components/alert'
import Spinner from '@cloudscape-design/components/spinner'
import ColumnLayout from '@cloudscape-design/components/column-layout'
import PeriodFilter from '../../components/PeriodFilter/PeriodFilter'
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
  title: string
  value: string
  subtitle?: string
  loading: boolean
  color?: string
}

function StatCard({ title, value, subtitle, loading, color }: StatCardProps) {
  return (
    <Container>
      <SpaceBetween size="xs">
        <Box variant="awsui-key-label" color="text-body-secondary">
          {title}
        </Box>
        {loading ? (
          <Box padding={{ top: 's' }}>
            <Spinner size="normal" />
          </Box>
        ) : (
          <>
            <Box
              variant="h1"
              fontSize="heading-xl"
              fontWeight="bold"
              color={color as any}
            >
              {value}
            </Box>
            {subtitle && (
              <Box variant="small" color="text-body-secondary">
                {subtitle}
              </Box>
            )}
          </>
        )}
      </SpaceBetween>
    </Container>
  )
}

interface DepCusto {
  nome: string
  total: number
  quantidade: number
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

  useEffect(() => {
    const carregar = async () => {
      setLoading(true)
      setErro('')
      try {
        const [respColab, respDep] = await Promise.all([
          relatorioColaboradores(mes, ano),
          relatorioDepartamentos(mes, ano),
        ])
        const colaboradores: any[] = respColab.data.colaboradores || []
        const departamentos: any[] = respDep.data.departamentos || []

        const custo = colaboradores.reduce(
          (acc: number, c: any) => acc + toNumber(c.total),
          0
        )
        const qtd = colaboradores.length

        setTotalColaboradores(qtd)
        setTotalCusto(custo)
        setTotalDepartamentos(departamentos.length)
        setMediaCusto(qtd > 0 ? custo / qtd : 0)

        const deps: DepCusto[] = departamentos
          .map((d: any) => ({
            nome: d.nome,
            total: toNumber(d.total),
            quantidade: d.num_colaboradores ?? d.colaboradores?.length ?? 0,
          }))
          .sort((a, b) => b.total - a.total)
          .slice(0, 5)
        setTopDeps(deps)
      } catch {
        setErro('Erro ao carregar dados do dashboard.')
      } finally {
        setLoading(false)
      }
    }
    carregar()
  }, [mes, ano])

  const meses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
  const periodoLabel = `${meses[mes - 1]}/${ano}`

  return (
    <ContentLayout
      header={
        <Header
          variant="h1"
          description={`Visão geral dos custos de colaboradores — ${periodoLabel}`}
        >
          Dashboard
        </Header>
      }
    >
      <SpaceBetween size="l">
        <PeriodFilter />

        {erro && (
          <Alert type="error" onDismiss={() => setErro('')}>
            {erro}
          </Alert>
        )}

        {/* Cards de resumo */}
        <Grid
          gridDefinition={[
            { colspan: { default: 12, s: 6, m: 3 } },
            { colspan: { default: 12, s: 6, m: 3 } },
            { colspan: { default: 12, s: 6, m: 3 } },
            { colspan: { default: 12, s: 6, m: 3 } },
          ]}
        >
          <StatCard
            title="Colaboradores com custo"
            value={totalColaboradores.toString()}
            subtitle={periodoLabel}
            loading={loading}
          />
          <StatCard
            title="Custo total no período"
            value={formatBRL(totalCusto)}
            subtitle={`${totalColaboradores} colaboradores`}
            loading={loading}
            color="text-status-info"
          />
          <StatCard
            title="Departamentos ativos"
            value={totalDepartamentos.toString()}
            subtitle={periodoLabel}
            loading={loading}
          />
          <StatCard
            title="Custo médio por colaborador"
            value={formatBRL(mediaCusto)}
            subtitle="média do período"
            loading={loading}
          />
        </Grid>

        {/* Ranking de departamentos */}
        {!loading && topDeps.length > 0 && (
          <Container
            header={
              <Header variant="h2" description="Ordenado por custo total">
                Custos por Departamento — {periodoLabel}
              </Header>
            }
          >
            <ColumnLayout columns={1} borders="horizontal">
              {topDeps.map((dep, i) => {
                const pct = totalCusto > 0 ? (dep.total / totalCusto) * 100 : 0
                return (
                  <div key={dep.nome} style={{ padding: '8px 0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Box
                          variant="small"
                          color="text-body-secondary"
                          fontWeight="bold"
                        >
                          #{i + 1}
                        </Box>
                        <Box fontWeight="bold">{dep.nome}</Box>
                        <Box variant="small" color="text-body-secondary">
                          {dep.quantidade} colaborador{dep.quantidade !== 1 ? 'es' : ''}
                        </Box>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <Box fontWeight="bold" color="text-status-info">
                          {formatBRL(dep.total)}
                        </Box>
                        <Box variant="small" color="text-body-secondary">
                          {pct.toFixed(1)}% do total
                        </Box>
                      </div>
                    </div>
                    {/* Barra de progresso */}
                    <div style={{ background: '#e9ebed', borderRadius: 4, height: 6 }}>
                      <div
                        style={{
                          background: '#0972d3',
                          borderRadius: 4,
                          height: 6,
                          width: `${pct}%`,
                          transition: 'width 0.4s ease',
                        }}
                      />
                    </div>
                  </div>
                )
              })}
            </ColumnLayout>
          </Container>
        )}

        {!loading && totalColaboradores === 0 && !erro && (
          <Alert type="info">
            Nenhum registro de custo encontrado para {periodoLabel}. Importe dados ou ajuste o período.
          </Alert>
        )}
      </SpaceBetween>
    </ContentLayout>
  )
}
