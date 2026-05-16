import React, { useState, useEffect, useCallback } from 'react'
import Table from '@cloudscape-design/components/table'
import Box from '@cloudscape-design/components/box'
import SpaceBetween from '@cloudscape-design/components/space-between'
import Button from '@cloudscape-design/components/button'
import Header from '@cloudscape-design/components/header'
import Modal from '@cloudscape-design/components/modal'
import Badge from '@cloudscape-design/components/badge'
import TextFilter from '@cloudscape-design/components/text-filter'
import Select from '@cloudscape-design/components/select'
import Pagination from '@cloudscape-design/components/pagination'
import Alert from '@cloudscape-design/components/alert'
import FormField from '@cloudscape-design/components/form-field'
import Input from '@cloudscape-design/components/input'
import Textarea from '@cloudscape-design/components/textarea'
import ColumnLayout from '@cloudscape-design/components/column-layout'
import ColaboradorForm from '../../components/ColaboradorForm/ColaboradorForm'
import CertificacoesColaborador from '../../components/CertificacoesColaborador/CertificacoesColaborador'
import { listarColaboradores, inativarColaborador, listarHistorico } from '../../api/colaboradores'
import { listarDepartamentos } from '../../api/departamentos'
import type { Colaborador, Departamento, HistoricoColaborador } from '../../types'

const PAGE_SIZE = 20

const EVENTO_LABEL: Record<string, { label: string; color: string }> = {
  admissao:         { label: 'Admissao',          color: 'green' },
  promocao:         { label: 'Promocao',           color: 'blue' },
  ajuste_salarial:  { label: 'Ajuste Salarial',    color: 'blue' },
  mudanca_cargo:    { label: 'Mudanca de Cargo',   color: 'grey' },
  mudanca_depto:    { label: 'Mudanca de Depto',   color: 'grey' },
  mudanca_contrato: { label: 'Mudanca Contrato',   color: 'grey' },
  inativacao:       { label: 'Inativacao',         color: 'red' },
  reativacao:       { label: 'Reativacao',         color: 'green' },
  observacao:       { label: 'Observacao',         color: 'grey' },
}

const fmtDate = (d?: string) => d ? new Date(d + 'T00:00:00').toLocaleDateString('pt-BR') : '-'

export default function Colaboradores() {
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([])
  const [departamentos, setDepartamentos] = useState<Departamento[]>([])
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  const [busca, setBusca] = useState('')
  const [depFiltro, setDepFiltro] = useState('')
  const [pagina, setPagina] = useState(1)
  const [total, setTotal] = useState(0)
  const [modalAberto, setModalAberto] = useState(false)
  const [colaboradorEditando, setColaboradorEditando] = useState<Colaborador | undefined>()

  // Inativar com data
  const [modalInativar, setModalInativar] = useState<Colaborador | null>(null)
  const [dataInativacao, setDataInativacao] = useState('')
  const [obsInativacao, setObsInativacao] = useState('')
  const [inativando, setInativando] = useState(false)

  // Historico
  const [modalHistorico, setModalHistorico] = useState<Colaborador | null>(null)
  const [historico, setHistorico] = useState<HistoricoColaborador[]>([])
  const [loadingHistorico, setLoadingHistorico] = useState(false)

  // Certificacoes
  const [modalCerts, setModalCerts] = useState<Colaborador | null>(null)

  const carregar = useCallback(async () => {
    setLoading(true)
    setErro('')
    try {
      const params: any = { page: 1, page_size: 100, ativo: true }
      if (busca) params.q = busca
      if (depFiltro) params.departamento_id = Number(depFiltro)
      const resp = await listarColaboradores(params)
      setColaboradores(resp.data)
      setTotal(resp.data.length)
    } catch {
      setErro('Erro ao carregar colaboradores.')
    } finally {
      setLoading(false)
    }
  }, [busca, depFiltro, pagina])

  useEffect(() => { carregar() }, [carregar])
  useEffect(() => {
    listarDepartamentos().then((r) => setDepartamentos(r.data)).catch(() => {})
  }, [])

  const abrirHistorico = async (c: Colaborador) => {
    setModalHistorico(c)
    setLoadingHistorico(true)
    try {
      const resp = await listarHistorico(c.id)
      setHistorico(resp.data)
    } catch {
      setHistorico([])
    } finally {
      setLoadingHistorico(false)
    }
  }

  const handleInativar = async () => {
    if (!modalInativar) return
    setInativando(true)
    try {
      await inativarColaborador(
        modalInativar.id,
        dataInativacao || undefined,
        obsInativacao || undefined
      )
      setModalInativar(null)
      setDataInativacao('')
      setObsInativacao('')
      carregar()
    } catch {
      setErro('Erro ao inativar colaborador.')
    } finally {
      setInativando(false)
    }
  }

  const depOptions = [
    { label: 'Todos os departamentos', value: '' },
    ...departamentos.map((d) => ({ label: d.nome, value: String(d.id) })),
  ]

  return (
    <>
      <Table
        loading={loading}
        loadingText="Carregando colaboradores..."
        items={colaboradores.slice((pagina - 1) * PAGE_SIZE, pagina * PAGE_SIZE)}
        columnDefinitions={[
          {
            id: 'nome',
            header: 'Nome',
            cell: (c) => (
              <SpaceBetween direction="vertical" size="xxxs">
                <span>{c.nome}</span>
                <Box variant="small" color="text-body-secondary">{c.matricula}</Box>
              </SpaceBetween>
            ),
            sortingField: 'nome',
          },
          { id: 'departamento', header: 'Departamento', cell: (c) => (c as any).departamento_nome || c.departamento || '-' },
          {
            id: 'cargo',
            header: 'Cargo / Nivel',
            cell: (c) => (
              <SpaceBetween direction="vertical" size="xxxs">
                <span>{c.cargo}</span>
                {c.nivel && <Box variant="small" color="text-body-secondary">{c.nivel}</Box>}
              </SpaceBetween>
            ),
          },
          { id: 'tipo_contrato', header: 'Contrato', cell: (c) => (
            <Badge color={c.tipo_contrato === 'CLT' ? 'blue' : 'grey'}>{c.tipo_contrato}</Badge>
          )},
          {
            id: 'admissao',
            header: 'Admissao',
            cell: (c) => (
              <SpaceBetween direction="vertical" size="xxxs">
                <Box variant="small">{fmtDate(c.data_admissao)}</Box>
                {c.data_inativacao && (
                  <Box variant="small" color="text-status-error">
                    Saida: {fmtDate(c.data_inativacao)}
                  </Box>
                )}
              </SpaceBetween>
            ),
          },
          {
            id: 'ativo',
            header: 'Status',
            cell: (c) => (
              <Badge color={c.ativo ? 'green' : 'grey'}>{c.ativo ? 'Ativo' : 'Inativo'}</Badge>
            ),
          },
          {
            id: 'acoes',
            header: 'Acoes',
            cell: (c) => (
              <SpaceBetween direction="horizontal" size="xs">
                <Button variant="inline-link" onClick={() => { setColaboradorEditando(c); setModalAberto(true) }}>Editar</Button>
                <Button variant="inline-link" onClick={() => setModalCerts(c)}>Certs</Button>
                <Button variant="inline-link" onClick={() => abrirHistorico(c)}>Historico</Button>
                {c.ativo && <Button variant='inline-link' onClick={() => { setDataInativacao(new Date().toISOString().split('T')[0]); setObsInativacao(''); setModalInativar(c); }}>Inativar</Button>}
              </SpaceBetween>
            ),
          },
        ]}
        header={
          <Header
            variant="awsui-h1-sticky"
            counter={`(${total})`}
            actions={
              <Button variant="primary" iconName="add-plus"
                onClick={() => { setColaboradorEditando(undefined); setModalAberto(true) }}>
                Novo Colaborador
              </Button>
            }
          >
            Colaboradores
          </Header>
        }
        filter={
          <SpaceBetween direction="horizontal" size="m">
            <TextFilter
              filteringText={busca}
              filteringPlaceholder="Buscar por nome ou matricula"
              onChange={({ detail }) => { setBusca(detail.filteringText); setPagina(1) }}
            />
            <Select
              selectedOption={depOptions.find((o) => o.value === depFiltro) || depOptions[0]}
              options={depOptions}
              onChange={({ detail }) => { setDepFiltro(detail.selectedOption.value || ''); setPagina(1) }}
            />
          </SpaceBetween>
        }
        pagination={
          <Pagination
            currentPageIndex={pagina}
            pagesCount={Math.max(1, Math.ceil(total / PAGE_SIZE))}
            onChange={({ detail }) => setPagina(detail.currentPageIndex)}
          />
        }
        empty={<Box textAlign="center" color="inherit"><b>Nenhum colaborador encontrado</b></Box>}
      />

      {erro && <Alert type="error" onDismiss={() => setErro('')}>{erro}</Alert>}

      {/* Modal editar/criar */}
      <Modal
        visible={modalAberto}
        onDismiss={() => setModalAberto(false)}
        header={colaboradorEditando ? 'Editar Colaborador' : 'Novo Colaborador'}
        size="medium"
      >
        <ColaboradorForm
          colaborador={colaboradorEditando}
          onSuccess={() => { setModalAberto(false); carregar() }}
          onCancel={() => setModalAberto(false)}
        />
      </Modal>

      {/* Modal certificacoes */}
      <Modal
        visible={!!modalCerts}
        onDismiss={() => setModalCerts(null)}
        header={`Certificacoes — ${modalCerts?.nome}`}
        size="large"
      >
        {modalCerts && (
          <CertificacoesColaborador
            colaboradorId={modalCerts.id}
            colaboradorNome={modalCerts.nome}
          />
        )}
      </Modal>

      {/* Modal inativar com data */}
      <Modal
        visible={!!modalInativar}
        onDismiss={() => setModalInativar(null)}
        header={`Inativar — ${modalInativar?.nome}`}
        footer={
          <Box float="right">
            <SpaceBetween direction="horizontal" size="xs">
              <Button variant="link" onClick={() => setModalInativar(null)}>Cancelar</Button>
              <Button variant="primary" loading={inativando} onClick={handleInativar}>
                Confirmar Inativacao
              </Button>
            </SpaceBetween>
          </Box>
        }
      >
        <SpaceBetween size="m">
          <Alert type="warning">
            O historico de custos de <strong>{modalInativar?.nome}</strong> sera preservado.
          </Alert>
          <FormField label="Data de saida" description="Data efetiva do desligamento">
            <Input
              type="date"
              value={dataInativacao}
              onChange={({ detail }) => setDataInativacao(detail.value)}
            />
          </FormField>
          <FormField label="Observacao (opcional)">
            <Textarea
              value={obsInativacao}
              onChange={({ detail }) => setObsInativacao(detail.value)}
              placeholder="Ex: Pedido de demissao, fim de contrato..."
              rows={2}
            />
          </FormField>
        </SpaceBetween>
      </Modal>

      {/* Modal historico */}
      <Modal
        visible={!!modalHistorico}
        onDismiss={() => setModalHistorico(null)}
        header={`Historico — ${modalHistorico?.nome}`}
        size="large"
      >
        {loadingHistorico ? (
          <Box textAlign="center" padding="l">Carregando historico...</Box>
        ) : historico.length === 0 ? (
          <Alert type="info">Nenhum evento registrado.</Alert>
        ) : (
          <SpaceBetween size="s">
            {historico.map((ev) => {
              const meta = EVENTO_LABEL[ev.tipo_evento] || { label: ev.tipo_evento, color: 'grey' }
              return (
                <div key={ev.id} style={{ borderLeft: '3px solid #0972d3', paddingLeft: 12 }}>
                  <SpaceBetween direction="horizontal" size="xs">
                    <Badge color={meta.color as any}>{meta.label}</Badge>
                    <Box variant="small" color="text-body-secondary">{fmtDate(ev.data_evento)}</Box>
                  </SpaceBetween>
                  <ColumnLayout columns={2} variant="text-grid">
                    {ev.cargo_anterior && ev.cargo_novo && ev.cargo_anterior !== ev.cargo_novo && (
                      <>
                        <div><Box variant="small" color="text-body-secondary">Cargo anterior</Box><span>{ev.cargo_anterior} {ev.nivel_anterior || ''}</span></div>
                        <div><Box variant="small" color="text-body-secondary">Cargo novo</Box><span>{ev.cargo_novo} {ev.nivel_novo || ''}</span></div>
                      </>
                    )}
                    {ev.departamento_anterior && ev.departamento_novo && ev.departamento_anterior !== ev.departamento_novo && (
                      <>
                        <div><Box variant="small" color="text-body-secondary">Depto anterior</Box><span>{ev.departamento_anterior}</span></div>
                        <div><Box variant="small" color="text-body-secondary">Depto novo</Box><span>{ev.departamento_novo}</span></div>
                      </>
                    )}
                    {ev.tipo_contrato_anterior && ev.tipo_contrato_novo && ev.tipo_contrato_anterior !== ev.tipo_contrato_novo && (
                      <>
                        <div><Box variant="small" color="text-body-secondary">Contrato anterior</Box><span>{ev.tipo_contrato_anterior}</span></div>
                        <div><Box variant="small" color="text-body-secondary">Contrato novo</Box><span>{ev.tipo_contrato_novo}</span></div>
                      </>
                    )}
                    {ev.cargo_novo && !ev.cargo_anterior && (
                      <div><Box variant="small" color="text-body-secondary">Cargo</Box><span>{ev.cargo_novo} {ev.nivel_novo || ''}</span></div>
                    )}
                  </ColumnLayout>
                  {ev.observacao && (
                    <Box variant="small" color="text-body-secondary" padding={{ top: 'xxs' }}>
                      {ev.observacao}
                    </Box>
                  )}
                </div>
              )
            })}
          </SpaceBetween>
        )}
      </Modal>
    </>
  )
}
