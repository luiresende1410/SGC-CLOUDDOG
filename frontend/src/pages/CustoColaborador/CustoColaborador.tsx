import React, { useState, useEffect, useCallback } from 'react'
import Table from '@cloudscape-design/components/table'
import Box from '@cloudscape-design/components/box'
import SpaceBetween from '@cloudscape-design/components/space-between'
import Button from '@cloudscape-design/components/button'
import Header from '@cloudscape-design/components/header'
import Alert from '@cloudscape-design/components/alert'
import ExpandableSection from '@cloudscape-design/components/expandable-section'
import ContentLayout from '@cloudscape-design/components/content-layout'
import Badge from '@cloudscape-design/components/badge'
import PeriodFilter from '../../components/PeriodFilter/PeriodFilter'
import { relatorioColaboradores, exportarColaboradoresCSV } from '../../api/relatorios'
import { useFilterStore } from '../../store/filterStore'

interface ColaboradorCusto {
  id: number
  nome: string
  departamento: string
  cargo: string
  tipo_contrato: string
  total: number
  componentes: Record<string, number>
}

const formatBRL = (valor: number) =>
  valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

const toNumber = (v: unknown): number => {
  if (v === null || v === undefined) return 0
  const n = typeof v === 'string' ? parseFloat(v) : Number(v)
  return isNaN(n) ? 0 : n
}

const LABEL: Record<string, string> = {
  remuneracao: 'Remuneração',
  refeicao: 'Refeição',
  transporte: 'Transporte',
  seguro_saude: 'Seguro Saúde',
  seguro_vida: 'Seguro Vida',
  fgts: 'FGTS',
  gps: 'GPS',
  equipamentos: 'Equipamentos',
  escritorio: 'Escritório',
  ferias: 'Férias',
  decimo_terceiro: '13º Salário',
  fgts_rescisao: 'FGTS Rescisão',
  gps_rescisao: 'GPS Rescisão',
  multa_fgts: 'Multa FGTS',
}

export default function CustoColaborador() {
  const { mes, ano } = useFilterStore()
  const [dados, setDados] = useState<ColaboradorCusto[]>([])
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  const [expandidos, setExpandidos] = useState<Set<number>>(new Set())
  const [exportando, setExportando] = useState(false)

  const carregar = useCallback(async () => {
    setLoading(true)
    setErro('')
    try {
      const resp = await relatorioColaboradores(mes, ano)
      const raw: any[] = resp.data.colaboradores || []
      const parsed: ColaboradorCusto[] = raw.map((c) => ({
        id: c.id,
        nome: c.nome,
        departamento: c.departamento,
        cargo: c.cargo,
        tipo_contrato: c.tipo_contrato,
        total: toNumber(c.total),
        componentes: Object.fromEntries(
          Object.entries(c.componentes || {}).map(([k, v]) => [k, toNumber(v)])
        ),
      }))
      parsed.sort((a, b) => b.total - a.total)
      setDados(parsed)
    } catch {
      setErro('Erro ao carregar custos por colaborador.')
    } finally {
      setLoading(false)
    }
  }, [mes, ano])

  useEffect(() => {
    carregar()
  }, [carregar])

  const toggleExpandido = (id: number) => {
    setExpandidos((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleExportar = async () => {
    setExportando(true)
    try {
      const resp = await exportarColaboradoresCSV(mes, ano)
      const url = window.URL.createObjectURL(new Blob([resp.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `custos-colaboradores-${mes}-${ano}.csv`)
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
  const totalGeral = dados.reduce((acc, c) => acc + c.total, 0)

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
          Custos por Colaborador
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
              id: 'nome',
              header: 'Colaborador',
              cell: (c) => (
                <SpaceBetween direction="vertical" size="xxxs">
                  <Button variant="inline-link" onClick={() => toggleExpandido(c.id)}>
                    {c.nome}
                  </Button>
                  <Box variant="small" color="text-body-secondary">{c.cargo}</Box>
                </SpaceBetween>
              ),
              minWidth: 200,
            },
            {
              id: 'departamento',
              header: 'Departamento',
              cell: (c) => c.departamento,
            },
            {
              id: 'tipo',
              header: 'Contrato',
              cell: (c) => (
                <Badge color={c.tipo_contrato === 'CLT' ? 'blue' : 'grey'}>
                  {c.tipo_contrato}
                </Badge>
              ),
            },
            {
              id: 'total',
              header: 'Custo Total',
              cell: (c) => (
                <Box fontWeight="bold" color="text-status-info">
                  {formatBRL(c.total)}
                </Box>
              ),
              sortingField: 'total',
            },
            {
              id: 'detalhes',
              header: 'Componentes',
              cell: (c) => (
                <ExpandableSection
                  headerText={expandidos.has(c.id) ? 'Ocultar componentes' : 'Ver componentes'}
                  expanded={expandidos.has(c.id)}
                  onChange={() => toggleExpandido(c.id)}
                >
                  <div style={{ minWidth: 280 }}>
                    {Object.entries(c.componentes)
                      .filter(([, v]) => v > 0)
                      .sort(([, a], [, b]) => b - a)
                      .map(([tipo, valor]) => (
                        <div
                          key={tipo}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            padding: '3px 0',
                            borderBottom: '1px solid #e9ebed',
                          }}
                        >
                          <Box variant="small">
                            {LABEL[tipo] || tipo.replace(/_/g, ' ')}
                          </Box>
                          <Box variant="small" fontWeight="bold">
                            {formatBRL(valor)}
                          </Box>
                        </div>
                      ))}
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        padding: '6px 0 2px',
                        marginTop: 4,
                      }}
                    >
                      <Box variant="small" fontWeight="bold">Total</Box>
                      <Box variant="small" fontWeight="bold" color="text-status-info">
                        {formatBRL(c.total)}
                      </Box>
                    </div>
                  </div>
                </ExpandableSection>
              ),
            },
          ]}
          header={
            <Header
              counter={`(${dados.length})`}
              description={`Total: ${formatBRL(totalGeral)}`}
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

