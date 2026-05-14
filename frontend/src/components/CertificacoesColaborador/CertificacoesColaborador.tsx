import React, { useState, useEffect } from 'react'
import Table from '@cloudscape-design/components/table'
import Button from '@cloudscape-design/components/button'
import Header from '@cloudscape-design/components/header'
import Modal from '@cloudscape-design/components/modal'
import FormField from '@cloudscape-design/components/form-field'
import Input from '@cloudscape-design/components/input'
import Select from '@cloudscape-design/components/select'
import SpaceBetween from '@cloudscape-design/components/space-between'
import Box from '@cloudscape-design/components/box'
import Badge from '@cloudscape-design/components/badge'
import Alert from '@cloudscape-design/components/alert'
import ColumnLayout from '@cloudscape-design/components/column-layout'
import { listarCertificacoes, criarCertificacao, excluirCertificacao } from '../../api/certificacoes'
import type { Certificacao } from '../../types'

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

const fmtDate = (d?: string) => d ? new Date(d + 'T00:00:00').toLocaleDateString('pt-BR') : '-'

interface Props {
  colaboradorId: number
  colaboradorNome: string
}

export default function CertificacoesColaborador({ colaboradorId, colaboradorNome }: Props) {
  const [certificacoes, setCertificacoes] = useState<Certificacao[]>([])
  const [loading, setLoading] = useState(false)
  const [modalAberto, setModalAberto] = useState(false)
  const [erro, setErro] = useState('')
  const [tipo, setTipo] = useState('')
  const [nivel, setNivel] = useState('')
  const [nome, setNome] = useState('')
  const [dataObtencao, setDataObtencao] = useState('')
  const [dataExpiracao, setDataExpiracao] = useState('')
  const [salvando, setSalvando] = useState(false)

  const carregar = async () => {
    setLoading(true)
    try {
      const resp = await listarCertificacoes({ colaborador_id: colaboradorId })
      setCertificacoes(resp.data)
    } catch {
      setErro('Erro ao carregar certificacoes.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { carregar() }, [colaboradorId])

  const limparForm = () => {
    setTipo(''); setNivel(''); setNome(''); setDataObtencao(''); setDataExpiracao('')
  }

  const handleSalvar = async () => {
    if (!tipo || !nivel || !nome) {
      setErro('Preencha tipo, nivel e nome da certificacao.')
      return
    }
    setSalvando(true)
    setErro('')
    try {
      await criarCertificacao({
        colaborador_id: colaboradorId,
        tipo, nivel, nome,
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

  return (
    <>
      <Table
        loading={loading}
        loadingText="Carregando certificacoes..."
        items={certificacoes}
        columnDefinitions={[
          {
            id: 'tipo', header: 'Tipo',
            cell: (c) => <Badge color={(BADGE_COLORS[c.tipo] || 'grey') as any}>{c.tipo}</Badge>,
          },
          { id: 'nivel', header: 'Nivel', cell: (c) => c.nivel },
          { id: 'nome', header: 'Certificacao', cell: (c) => c.nome },
          { id: 'obtencao', header: 'Obtida em', cell: (c) => fmtDate(c.data_obtencao) },
          { id: 'expiracao', header: 'Expira em', cell: (c) => fmtDate(c.data_expiracao) },
          {
            id: 'acoes', header: 'Acoes',
            cell: (c) => (
              <Button variant="inline-link" onClick={() => handleExcluir(c.id)}>Remover</Button>
            ),
          },
        ]}
        header={
          <Header
            variant="h3"
            counter={`(${certificacoes.length})`}
            actions={
              <Button variant="primary" iconName="add-plus" onClick={() => setModalAberto(true)}>
                Adicionar Certificacao
              </Button>
            }
          >
            Certificacoes — {colaboradorNome}
          </Header>
        }
        empty={<Box textAlign="center"><b>Nenhuma certificacao registrada</b></Box>}
      />

      {erro && <Alert type="error" onDismiss={() => setErro('')}>{erro}</Alert>}

      <Modal
        visible={modalAberto}
        onDismiss={() => { setModalAberto(false); limparForm() }}
        header="Nova Certificacao"
        footer={
          <Box float="right">
            <SpaceBetween direction="horizontal" size="xs">
              <Button variant="link" onClick={() => { setModalAberto(false); limparForm() }}>Cancelar</Button>
              <Button variant="primary" loading={salvando} onClick={handleSalvar}>Salvar</Button>
            </SpaceBetween>
          </Box>
        }
      >
        <SpaceBetween size="m">
          <ColumnLayout columns={2}>
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
          </ColumnLayout>
          <FormField label="Nome da certificacao" description="Ex: AWS Solutions Architect">
            <Input value={nome} onChange={({ detail }) => setNome(detail.value)} placeholder="Nome completo" />
          </FormField>
          <ColumnLayout columns={2}>
            <FormField label="Data de obtencao">
              <Input type="date" value={dataObtencao} onChange={({ detail }) => setDataObtencao(detail.value)} />
            </FormField>
            <FormField label="Data de expiracao">
              <Input type="date" value={dataExpiracao} onChange={({ detail }) => setDataExpiracao(detail.value)} />
            </FormField>
          </ColumnLayout>
        </SpaceBetween>
      </Modal>
    </>
  )
}
