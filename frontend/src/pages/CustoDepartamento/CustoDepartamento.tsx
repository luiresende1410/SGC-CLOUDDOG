import React, { useState, useEffect, useCallback } from 'react'
import Table from '@cloudscape-design/components/table'
import Box from '@cloudscape-design/components/box'
import SpaceBetween from '@cloudscape-design/components/space-between'
import Button from '@cloudscape-design/components/button'
import Header from '@cloudscape-design/components/header'
import Alert from '@cloudscape-design/components/alert'
import ContentLayout from '@cloudscape-design/components/content-layout'
import ExpandableSection from '@cloudscape-design/components/expandable-section'
import PeriodFilter from '../../components/PeriodFilter/PeriodFilter'
import { relatorioDepartamentos, exportarDepartamentosCSV } from '../../api/relatorios'
import { useFilterStore } from '../../store/filterStore'

interface DepartamentoCusto {
  id: number
  nome: string
  total: number
  quantidade_colaboradores: number
}

const formatBRL = (valor: number) =>
  valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

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

  const carregar = useCallback(async () => {
    setLoading(true)
    setErro('')
    try {
      const resp = await relatorioDepartamentos(mes, ano)
      const raw: any[] = resp.data.departamentos || []
      const parsed: DepartamentoCusto[] = raw
        .map((d) => ({
          id: d.id,
          nome: d.nome,
          total: toNumber(d.total),
          quantidade_colaboradores: d.num_colaboradores ?? d.colaboradores?.length ?? 0,
        }))
        .sort((a, b) => b.total - a.total)
      setDados(parsed)
    } catch {
      setErro('Erro ao carregar custos por departamento.')
    } finally {
      setLoading(false)
    }
  }, [mes, ano])

  useEffect(() => {
    carregar()
  }, [carregar])

  const handleExportar = async () => {
    setExportando(true)
    try {
      const resp = await exportarDepartamentosCSV(mes, ano)
      const url = window.URL.createObjectURL(new Blob([resp.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `custos-departamentos-${mes}-${ano}.csv`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch {
      setErro('Erro ao exportar CSV.')
    } finally {
      setExportando(false)
    }
  }

  const meses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
  const totalGeral = dados.reduce((acc, d) => acc + d.total, 0)

  return (
    <ContentLayout
      header={
        <Header
          variant="h1"
          description={`Total do período: ${formatBRL(totalGeral)}`}
          actions={
            <Button loading={exportando} onClick={handleExportar} iconName="download">
              Exportar CSV
            </Button>
          }
        >
          Custos por Departamento
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

        {!loading && dados.length === 0 && !erro && (
          <Alert type="info">
            Nenhum registro de custo encontrado para {meses[mes - 1]}/{ano}.
          </Alert>
        )}

        <Table
          loading={loading}
          loadingText="Carregando custos..."
          items={dados}
          columnDefinitions={[
            {
              id: 'rank',
              header: '#',
              cell: (_, i) => (
                <Box color="text-body-secondary" fontWeight="bold">
                  {(i ?? 0) + 1}
                </Box>
              ),
              width: 50,
            },
            {
              id: 'nome',
              header: 'Departamento',
              cell: (d) => <Box fontWeight="bold">{d.nome}</Box>,
              sortingField: 'nome',
            },
            {
              id: 'colaboradores',
              header: 'Colaboradores',
              cell: (d) => d.quantidade_colaboradores,
              sortingField: 'quantidade_colaboradores',
            },
            {
              id: 'total',
              header: 'Custo Total',
              cell: (d) => (
                <Box fontWeight="bold" color="text-status-info">
                  {formatBRL(d.total)}
                </Box>
              ),
              sortingField: 'total',
            },
            {
              id: 'media',
              header: 'Custo Médio',
              cell: (d) =>
                d.quantidade_colaboradores > 0
                  ? formatBRL(d.total / d.quantidade_colaboradores)
                  : '-',
            },
            {
              id: 'participacao',
              header: '% do Total',
              cell: (d) => {
                const pct = totalGeral > 0 ? (d.total / totalGeral) * 100 : 0
                return (
                  <SpaceBetween direction="vertical" size="xxxs">
                    <Box variant="small">{pct.toFixed(1)}%</Box>
                    <div style={{ background: '#e9ebed', borderRadius: 4, height: 6, width: 80 }}>
                      <div
                        style={{
                          background: '#0972d3',
                          borderRadius: 4,
                          height: 6,
                          width: `${pct}%`,
                        }}
                      />
                    </div>
                  </SpaceBetween>
                )
              },
            },
          ]}
          header={
            <Header
              counter={`(${dados.length})`}
              description={`Total geral: ${formatBRL(totalGeral)}`}
            >
              {meses[mes - 1]}/{ano}
            </Header>
          }
          empty={
            <Box textAlign="center" color="inherit">
              <b>Sem dados para o período</b>
            </Box>
          }
        />
      </SpaceBetween>
    </ContentLayout>
  )
}
