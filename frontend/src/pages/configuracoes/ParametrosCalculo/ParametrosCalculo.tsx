import React, { useState, useEffect } from 'react'
import Table from '@cloudscape-design/components/table'
import Box from '@cloudscape-design/components/box'
import SpaceBetween from '@cloudscape-design/components/space-between'
import Button from '@cloudscape-design/components/button'
import Header from '@cloudscape-design/components/header'
import Modal from '@cloudscape-design/components/modal'
import FormField from '@cloudscape-design/components/form-field'
import Input from '@cloudscape-design/components/input'
import Select from '@cloudscape-design/components/select'
import Alert from '@cloudscape-design/components/alert'
import ContentLayout from '@cloudscape-design/components/content-layout'
import Badge from '@cloudscape-design/components/badge'
import { listarParametros, atualizarParametro, criarParametro, excluirParametro } from '../../../api/parametros'
import type { ParametroCalculo } from '../../../types'

const TIPO_VALOR_OPTIONS = [
  { label: 'Percentual (%)', value: 'percentual' },
  { label: 'Valor Fixo (R$)', value: 'fixo' },
  { label: 'Numerico (referencia)', value: 'numerico' },
]

const APLICA_A_OPTIONS = [
  { label: 'Todos', value: 'todos' },
  { label: 'Apenas CLT', value: 'CLT' },
  { label: 'Apenas PJ', value: 'PJ' },
]

const BADGE_TIPO: Record<string, { label: string; color: 'blue' | 'green' | 'grey' }> = {
  percentual: { label: '%', color: 'blue' },
  fixo:       { label: 'R$', color: 'green' },
  numerico:   { label: 'Ref', color: 'grey' },
}

const formatarValor = (p: ParametroCalculo): string => {
  const v = Number(p.valor)
  if (p.tipo_valor === 'percentual') return `${(v * 100).toFixed(2)}%`
  if (p.tipo_valor === 'fixo') return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 4 })
}

export default function ParametrosCalculo() {
  const [parametros, setParametros] = useState<ParametroCalculo[]>([])
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  const [editando, setEditando] = useState<ParametroCalculo | null>(null)
  const [novoValor, setNovoValor] = useState('')
  const [salvando, setSalvando] = useState(false)

  // Criar
  const [modalCriar, setModalCriar] = useState(false)
  const [criarChave, setCriarChave] = useState('')
  const [criarValor, setCriarValor] = useState('')
  const [criarDescricao, setCriarDescricao] = useState('')
  const [criarTipo, setCriarTipo] = useState('fixo')
  const [criarAplica, setCriarAplica] = useState('todos')

  const carregar = async () => {
    setLoading(true)
    setErro('')
    try {
      const resp = await listarParametros()
      setParametros(resp.data)
    } catch {
      setErro('Erro ao carregar parametros.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { carregar() }, [])

  const abrirEditar = (p: ParametroCalculo) => {
    setEditando(p)
    if (p.tipo_valor === 'percentual') {
      setNovoValor(String((Number(p.valor) * 100).toFixed(4)))
    } else {
      setNovoValor(String(p.valor))
    }
  }

  const handleSalvar = async () => {
    if (!editando) return
    let valor = parseFloat(novoValor.replace(',', '.'))
    if (isNaN(valor)) { setErro('Valor invalido.'); return }
    if (editando.tipo_valor === 'percentual') valor = valor / 100
    setSalvando(true)
    try {
      await atualizarParametro(editando.id, valor)
      setEditando(null)
      carregar()
    } catch {
      setErro('Erro ao salvar parametro.')
    } finally {
      setSalvando(false)
    }
  }

  const handleCriar = async () => {
    if (!criarChave.trim() || !criarValor.trim()) return
    let valor = parseFloat(criarValor.replace(',', '.'))
    if (isNaN(valor)) { setErro('Valor invalido.'); return }
    if (criarTipo === 'percentual') valor = valor / 100
    setSalvando(true)
    try {
      await criarParametro({
        chave: criarChave.trim().toUpperCase(),
        valor,
        descricao: criarDescricao.trim() || undefined,
        tipo_valor: criarTipo,
        aplica_a: criarAplica,
      })
      setModalCriar(false)
      setCriarChave(''); setCriarValor(''); setCriarDescricao('')
      setCriarTipo('fixo'); setCriarAplica('todos')
      carregar()
    } catch (e: any) {
      setErro(e?.response?.data?.detail || 'Erro ao criar parametro.')
    } finally {
      setSalvando(false)
    }
  }

  const handleExcluir = async (id: number) => {
    try {
      await excluirParametro(id)
      carregar()
    } catch {
      setErro('Erro ao excluir parametro.')
    }
  }

  const limparCriar = () => {
    setModalCriar(false)
    setCriarChave(''); setCriarValor(''); setCriarDescricao('')
    setCriarTipo('fixo'); setCriarAplica('todos')
  }

  return (
    <ContentLayout header={<Header variant="h1">Parametros de Calculo</Header>}>
      <SpaceBetween size="l">
        {erro && <Alert type="error" onDismiss={() => setErro('')}>{erro}</Alert>}

        <Table
          loading={loading}
          loadingText="Carregando parametros..."
          items={parametros}
          columnDefinitions={[
            {
              id: 'chave', header: 'Parametro',
              cell: (p) => <Box fontWeight="bold">{p.chave}</Box>,
            },
            { id: 'descricao', header: 'Descricao', cell: (p) => p.descricao || '-' },
            {
              id: 'tipo', header: 'Tipo',
              cell: (p) => {
                const meta = BADGE_TIPO[p.tipo_valor || 'numerico'] || BADGE_TIPO.numerico
                return <Badge color={meta.color}>{meta.label}</Badge>
              },
            },
            {
              id: 'aplica', header: 'Aplica a',
              cell: (p) => p.aplica_a === 'todos' ? 'Todos' : p.aplica_a,
            },
            {
              id: 'valor', header: 'Valor',
              cell: (p) => <Box fontWeight="bold">{formatarValor(p)}</Box>,
            },
            {
              id: 'acoes', header: 'Acoes',
              cell: (p) => (
                <SpaceBetween direction="horizontal" size="xs">
                  <Button variant="inline-link" onClick={() => abrirEditar(p)}>Editar</Button>
                  <Button variant="inline-link" onClick={() => handleExcluir(p.id)}>Excluir</Button>
                </SpaceBetween>
              ),
            },
          ]}
          header={
            <Header
              counter={`(${parametros.length})`}
              actions={
                <Button variant="primary" iconName="add-plus" onClick={() => setModalCriar(true)}>
                  Novo Parametro
                </Button>
              }
            >
              Parametros
            </Header>
          }
          empty={<Box textAlign="center" color="inherit"><b>Nenhum parametro encontrado</b></Box>}
        />
      </SpaceBetween>

      {/* Modal editar */}
      <Modal
        visible={!!editando}
        onDismiss={() => setEditando(null)}
        header={`Editar: ${editando?.chave}`}
        footer={
          <Box float="right">
            <SpaceBetween direction="horizontal" size="xs">
              <Button variant="link" onClick={() => setEditando(null)}>Cancelar</Button>
              <Button variant="primary" loading={salvando} onClick={handleSalvar}>Salvar</Button>
            </SpaceBetween>
          </Box>
        }
      >
        <SpaceBetween size="m">
          <FormField
            label={editando?.tipo_valor === 'percentual' ? 'Valor (%)' : editando?.tipo_valor === 'fixo' ? 'Valor (R$)' : 'Valor'}
            description={editando?.tipo_valor === 'percentual' ? 'Informe em % (ex: 8 para 8%)' : editando?.tipo_valor === 'fixo' ? 'Informe em reais (ex: 343.27)' : ''}
          >
            <Input value={novoValor} onChange={({ detail }) => setNovoValor(detail.value)} type="number" />
          </FormField>
          {editando && (
            <Box variant="small" color="text-body-secondary">
              Valor atual: <strong>{formatarValor(editando)}</strong>
            </Box>
          )}
        </SpaceBetween>
      </Modal>

      {/* Modal criar */}
      <Modal
        visible={modalCriar}
        onDismiss={limparCriar}
        header="Novo Parametro"
        footer={
          <Box float="right">
            <SpaceBetween direction="horizontal" size="xs">
              <Button variant="link" onClick={limparCriar}>Cancelar</Button>
              <Button variant="primary" loading={salvando} onClick={handleCriar}
                disabled={!criarChave.trim() || !criarValor.trim()}>
                Criar
              </Button>
            </SpaceBetween>
          </Box>
        }
      >
        <SpaceBetween size="m">
          <FormField label="Chave (nome do parametro)" description="Ex: VALE_CULTURA, PLANO_ODONTO">
            <Input value={criarChave} onChange={({ detail }) => setCriarChave(detail.value)} placeholder="NOME_DO_PARAMETRO" />
          </FormField>
          <FormField label="Tipo do valor">
            <Select
              selectedOption={TIPO_VALOR_OPTIONS.find((o) => o.value === criarTipo) || TIPO_VALOR_OPTIONS[1]}
              options={TIPO_VALOR_OPTIONS}
              onChange={({ detail }) => setCriarTipo(detail.selectedOption.value || 'fixo')}
            />
          </FormField>
          <FormField label="Aplica a">
            <Select
              selectedOption={APLICA_A_OPTIONS.find((o) => o.value === criarAplica) || APLICA_A_OPTIONS[0]}
              options={APLICA_A_OPTIONS}
              onChange={({ detail }) => setCriarAplica(detail.selectedOption.value || 'todos')}
            />
          </FormField>
          <FormField
            label={criarTipo === 'percentual' ? 'Valor (%)' : criarTipo === 'fixo' ? 'Valor (R$)' : 'Valor'}
            description={criarTipo === 'percentual' ? 'Informe em % (ex: 8 para 8%)' : criarTipo === 'fixo' ? 'Informe em reais' : ''}
          >
            <Input value={criarValor} onChange={({ detail }) => setCriarValor(detail.value)} type="number" placeholder="0.00" />
          </FormField>
          <FormField label="Descricao (opcional)">
            <Input value={criarDescricao} onChange={({ detail }) => setCriarDescricao(detail.value)} placeholder="Descricao do parametro" />
          </FormField>
        </SpaceBetween>
      </Modal>
    </ContentLayout>
  )
}
