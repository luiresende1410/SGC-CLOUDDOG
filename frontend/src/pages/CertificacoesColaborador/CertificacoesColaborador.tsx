import React, { useState, useEffect, useCallback } from 'react'
import Table from '@cloudscape-design/components/table'
import Box from '@cloudscape-design/components/box'
import SpaceBetween from '@cloudscape-design/components/space-between'
import Button from '@cloudscape-design/components/button'
import Header from '@cloudscape-design/components/header'
import Modal from '@cloudscape-design/components/modal'
import Select from '@cloudscape-design/components/select'
import Alert from '@cloudscape-design/components/alert'
import FormField from '@cloudscape-design/components/form-field'
import Input from '@cloudscape-design/components/input'
import ExpandableSection from '@cloudscape-design/components/expandable-section'
import Badge from '@cloudscape-design/components/badge'
import Container from '@cloudscape-design/components/container'
import Grid from '@cloudscape-design/components/grid'
import PieChart from '@cloudscape-design/components/pie-chart'
import BarChart from '@cloudscape-design/components/bar-chart'
import { listarCertificacoes, criarCertificacao, excluirCertificacao, relatorioCertificacoes } from '../../api/certificacoes'
import { listarColaboradores } from '../../api/colaboradores'
import type { Certificacao, Colaborador } from '../../types'

const TIPOS_CERT = [
  { label: 'AWS', value: 'AWS' },
  { label: 'GCP', value: 'GCP' },
  { label: 'Azure', value: 'Azure' },
  { label: 'Datadog', value: 'Datadog' },
  { label: 'Terraform', value: 'Terraform' },
  { label: 'Kubernetes', value: 'Kubernetes' },
  { label: 'Docker', value: 'Docker' },
  { label: 'Linux', value: 'Linux' },
  { label: 'Outro', value: 'Outro' },
]

const NIVEIS_CERT = [
  { label: 'Foundational', value: 'Foundational' },
  { label: 'Associate', value: 'Associate' },
  { label: 'Professional', value: 'Professional' },
  { label: 'Specialty', value: 'Specialty' },
  { label: 'Expert', value: 'Expert' },
]

const BADGE_COLORS: Record<string, string> = {
  AWS: 'blue', GCP: 'green', Azure: 'blue', Datadog: 'grey', Terraform: 'grey', Kubernetes: 'blue',
}

const CORES_TIPO = ['#0972d3', '#1b660f', '#d91515', '#9469d6', '#d68f00', '#067f68', '#c33d69', '#2ea597']

const fmtDate = (d?: string) => d ? new Date(d + 'T00:00:00').toLocaleDateString('pt-BR') : '-'

interface CertPorTipo { tipo: string; quantidade: number }
interface CertPorDep { departamento: string; tipo: string; quantidade: number }

export default function CertificacoesColaborador() {
  const [certificacoes, setCertificacoes] = useState<Certificacao[]>([])
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([])
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  const [modalAberto, setModalAberto] = useState(false)
  const [colaboradorSelecionado, setColaboradorSelecionado] = useState<string>('')
  const [tipo, setTipo] = useState('')
  const [nivel, setNivel] = useState('')
  const [nome, setNome] = useState('')
  const [dataObtencao, setDataObtencao] = useState('')
  const [dataExpiracao, setDataExpiracao] = useState('')
  const [salvando, setSalvando] = useState(false)

  // Graficos
  const [totalCertificacoes, setTotalCertificacoes] = useState(0)
  const [certPorTipo, setCertPorTipo] = useState<CertPorTipo[]>([])
  const [certPorDep, setCertPorDep] = useState<CertPorDep[]>([])

  const carregar = useCallback(async () => {
    setLoading(true)
    setErro('')
    try {
      const [certResp, colabResp, relResp] = await Promise.all([
        listarCertificacoes(),
        listarColaboradores({ page_size: 100 }),
        relatorioCertificacoes(),
      ])
      setCertificacoes(certResp.data)
      setColaboradores(colabResp.data)
      setTotalCertificacoes(relResp.data.total)
      setCertPorTipo(relResp.data.por_tipo)
      setCertPorDep(relResp.data.por_departamento)
    } catch {
      setErro('Erro ao carregar certificacoes.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { carregar() }, [carregar])

  const limparForm = () => {
    setColaboradorSelecionado(''); setTipo(''); setNivel(''); setNome('')
    setDataObtencao(''); setDataExpiracao('')
  }

  const handleSalvar = async () => {
    if (!colaboradorSelecionado || !nome.trim()) return
    setSalvando(true)
    setErro('')
    try {
      await criarCertificacao({
        colaborador_id: Number(colaboradorSelecionado),
        nome: nome.trim(),
        tipo: tipo || undefined,
        nivel: nivel || undefined,
        data_obtencao: dataObtencao || undefined,
        data_expiracao: dataExpiracao || undefined,
      })
      setModalAberto(false)
      limparForm()
      carregar()
    } catch {
      setErro('Erro ao salvar certificacao.')
    } finally {
      setSalvando(false)
    }
  }

  const handleExcluir = async (id: number) => {
    try {
      await excluirCertificacao(id)
      carregar()
    } catch {
      setErro('Erro ao excluir certificacao.')
    }
  }

  const agrupado = colaboradores
    .filter((c) => certificacoes.some((cert) => cert.colaborador_id === c.id))
    .map((c) => ({
      colaborador: c,
      certs: certificacoes.filter((cert) => cert.colaborador_id === c.id),
    }))
    .sort((a, b) => a.colaborador.nome.localeCompare(b.colaborador.nome))

  const colabOptions = colaboradores.map((c) => ({ label: c.nome, value: String(c.id) }))

  // Dados para grafico de barras
  const depNames = [...new Set(certPorDep.map((d) => d.departamento))]
  const tiposUnicos = [...new Set(certPorDep.map((d) => d.tipo))]
  const barSeries = tiposUnicos.map((t, idx) => ({
    title: t,
    type: 'bar' as const,
    data: depNames.map((dep) => ({
      x: dep,
      y: certPorDep.find((d) => d.departamento === dep && d.tipo === t)?.quantidade || 0,
    })),
    color: CORES_TIPO[idx % CORES_TIPO.length],
  }))

  return (
    <>
      <SpaceBetween size="l">
        <Header
          variant="h1"
          counter={`(${certificacoes.length} certificacoes — ${agrupado.length} colaboradores)`}
          actions={
            <Button variant="primary" iconName="add-plus" onClick={() => setModalAberto(true)}>
              Nova Certificacao
            </Button>
          }
        >
          Certificacoes por Colaborador
        </Header>

        {erro && <Alert type="error" onDismiss={() => setErro('')}>{erro}</Alert>}

        {/* Graficos */}
        {certPorTipo.length > 0 && (
          <Grid gridDefinition={[{ colspan: { default: 12, m: 6 } }, { colspan: { default: 12, m: 6 } }]}>
            <Container header={<Header variant="h2" description="Distribuicao por provedor/tecnologia">Certificacoes por Tipo</Header>}>
              <PieChart
                data={certPorTipo.map((item, idx) => ({
                  title: item.tipo,
                  value: item.quantidade,
                  color: CORES_TIPO[idx % CORES_TIPO.length],
                }))}
                detailPopoverContent={(datum) => [
                  { key: 'Quantidade', value: datum.value.toString() },
                  { key: 'Percentual', value: `${((datum.value / totalCertificacoes) * 100).toFixed(1)}%` },
                ]}
                segmentDescription={(datum) => `${datum.value} certificacao${datum.value !== 1 ? 'es' : ''}`}
                size="medium"
                variant="donut"
                innerMetricDescription="certificacoes"
                innerMetricValue={totalCertificacoes.toString()}
                empty={<Box textAlign="center">Sem dados</Box>}
                noMatch={<Box textAlign="center">Sem resultados</Box>}
              />
            </Container>
            <Container header={<Header variant="h2" description="Quantidade por departamento e tipo">Certificacoes por Departamento</Header>}>
              {depNames.length > 0 ? (
                <BarChart
                  series={barSeries}
                  xDomain={depNames}
                  yTitle="Quantidade"
                  xTitle="Departamento"
                  stackedBars
                  horizontalBars
                  height={Math.max(200, depNames.length * 50)}
                  empty={<Box textAlign="center">Sem dados</Box>}
                  noMatch={<Box textAlign="center">Sem resultados</Box>}
                />
              ) : (
                <Box textAlign="center" padding="l">Sem dados de certificacoes por departamento.</Box>
              )}
            </Container>
          </Grid>
        )}

        {/* Lista por colaborador */}
        {loading ? (
          <Box textAlign="center" padding="l">Carregando...</Box>
        ) : agrupado.length === 0 ? (
          <Box textAlign="center" color="inherit" padding="l">
            <b>Nenhuma certificacao cadastrada</b>
          </Box>
        ) : (
          agrupado.map(({ colaborador, certs }) => (
            <ExpandableSection
              key={colaborador.id}
              headerText={`${colaborador.nome} (${certs.length})`}
              variant="container"
            >
              <Table
                items={certs}
                columnDefinitions={[
                  {
                    id: 'tipo', header: 'Tipo', width: 120,
                    cell: (c) => c.tipo ? <Badge color={(BADGE_COLORS[c.tipo] || 'grey') as any}>{c.tipo}</Badge> : '-',
                  },
                  { id: 'nivel', header: 'Nivel', width: 130, cell: (c) => c.nivel || '-' },
                  { id: 'nome', header: 'Certificacao', cell: (c) => c.nome },
                  { id: 'obtencao', header: 'Obtida em', width: 120, cell: (c) => fmtDate(c.data_obtencao) },
                  { id: 'expiracao', header: 'Expira em', width: 120, cell: (c) => fmtDate(c.data_expiracao) },
                  {
                    id: 'acoes', header: 'Acoes', width: 100,
                    cell: (c) => (
                      <Button variant="inline-link" onClick={() => handleExcluir(c.id)}>Remover</Button>
                    ),
                  },
                ]}
                variant="embedded"
              />
            </ExpandableSection>
          ))
        )}
      </SpaceBetween>

      <Modal
        visible={modalAberto}
        onDismiss={() => { setModalAberto(false); limparForm() }}
        header="Nova Certificacao"
        footer={
          <Box float="right">
            <SpaceBetween direction="horizontal" size="xs">
              <Button variant="link" onClick={() => { setModalAberto(false); limparForm() }}>Cancelar</Button>
              <Button variant="primary" loading={salvando} onClick={handleSalvar}
                disabled={!colaboradorSelecionado || !nome.trim()}>
                Salvar
              </Button>
            </SpaceBetween>
          </Box>
        }
      >
        <SpaceBetween size="m">
          <FormField label="Colaborador">
            <Select
              selectedOption={colabOptions.find((o) => o.value === colaboradorSelecionado) || null}
              options={colabOptions}
              placeholder="Selecione um colaborador"
              onChange={({ detail }) => setColaboradorSelecionado(detail.selectedOption.value || '')}
            />
          </FormField>
          <FormField label="Tipo (provedor)">
            <Select
              selectedOption={tipo ? { label: tipo, value: tipo } : null}
              options={TIPOS_CERT}
              placeholder="Selecione"
              onChange={({ detail }) => setTipo(detail.selectedOption.value || '')}
            />
          </FormField>
          <FormField label="Nivel">
            <Select
              selectedOption={nivel ? { label: nivel, value: nivel } : null}
              options={NIVEIS_CERT}
              placeholder="Selecione"
              onChange={({ detail }) => setNivel(detail.selectedOption.value || '')}
            />
          </FormField>
          <FormField label="Nome da certificacao" description="Ex: AWS Solutions Architect">
            <Input value={nome} onChange={({ detail }) => setNome(detail.value)} placeholder="Nome completo" />
          </FormField>
          <FormField label="Data de obtencao">
            <Input type="date" value={dataObtencao} onChange={({ detail }) => setDataObtencao(detail.value)} />
          </FormField>
          <FormField label="Data de expiracao">
            <Input type="date" value={dataExpiracao} onChange={({ detail }) => setDataExpiracao(detail.value)} />
          </FormField>
        </SpaceBetween>
      </Modal>
    </>
  )
}
