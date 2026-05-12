import React, { useState, useEffect } from 'react'
import Table from '@cloudscape-design/components/table'
import Box from '@cloudscape-design/components/box'
import SpaceBetween from '@cloudscape-design/components/space-between'
import Button from '@cloudscape-design/components/button'
import Header from '@cloudscape-design/components/header'
import Modal from '@cloudscape-design/components/modal'
import FormField from '@cloudscape-design/components/form-field'
import Input from '@cloudscape-design/components/input'
import Alert from '@cloudscape-design/components/alert'
import ContentLayout from '@cloudscape-design/components/content-layout'
import Select from '@cloudscape-design/components/select'
import {
  listarTabelaSalarial,
  criarEntradaSalarial,
  atualizarEntradaSalarial,
  excluirEntradaSalarial,
} from '../../../api/tabelaSalarial'
import type { TabelaSalarial } from '../../../types'

const formatBRL = (valor: number) =>
  valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

const anoAtual = new Date().getFullYear()
const anosOptions = Array.from({ length: 5 }, (_, i) => ({
  label: String(anoAtual - i),
  value: String(anoAtual - i),
}))

export default function TabelaSalarialPage() {
  const [itens, setItens] = useState<TabelaSalarial[]>([])
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  const [modalAberto, setModalAberto] = useState(false)
  const [editando, setEditando] = useState<TabelaSalarial | null>(null)
  const [form, setForm] = useState({ cargo: '', nivel: '', ano: String(anoAtual), salario: '' })
  const [salvando, setSalvando] = useState(false)
  const [filtroCargo, setFiltroCargo] = useState('')
  const [filtroAno, setFiltroAno] = useState(String(anoAtual))

  const carregar = async () => {
    setLoading(true)
    setErro('')
    try {
      const params: any = {}
      if (filtroCargo) params.cargo = filtroCargo
      if (filtroAno) params.ano = Number(filtroAno)
      const resp = await listarTabelaSalarial(params)
      setItens(resp.data)
    } catch {
      setErro('Erro ao carregar tabela salarial.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregar()
  }, [filtroCargo, filtroAno])

  const abrirNovo = () => {
    setEditando(null)
    setForm({ cargo: '', nivel: '', ano: String(anoAtual), salario: '' })
    setModalAberto(true)
  }

  const abrirEditar = (item: TabelaSalarial) => {
    setEditando(item)
    setForm({ cargo: item.cargo, nivel: item.nivel, ano: String(item.ano), salario: String(item.salario) })
    setModalAberto(true)
  }

  const handleSalvar = async () => {
    const salario = parseFloat(form.salario.replace(',', '.'))
    if (!form.cargo || !form.nivel || isNaN(salario)) {
      setErro('Preencha todos os campos corretamente.')
      return
    }
    setSalvando(true)
    try {
      if (editando) {
        await atualizarEntradaSalarial(editando.id, salario)
      } else {
        await criarEntradaSalarial({
          cargo: form.cargo,
          nivel: form.nivel,
          ano: Number(form.ano),
          salario,
        })
      }
      setModalAberto(false)
      carregar()
    } catch {
      setErro('Erro ao salvar entrada salarial.')
    } finally {
      setSalvando(false)
    }
  }

  const handleExcluir = async (id: number) => {
    if (!window.confirm('Deseja excluir esta entrada?')) return
    try {
      await excluirEntradaSalarial(id)
      carregar()
    } catch {
      setErro('Erro ao excluir entrada.')
    }
  }

  return (
    <ContentLayout header={<Header variant="h1">Tabela Salarial</Header>}>
      <SpaceBetween size="l">
        {erro && (
          <Alert type="error" onDismiss={() => setErro('')}>
            {erro}
          </Alert>
        )}
        <Table
          loading={loading}
          loadingText="Carregando..."
          items={itens}
          columnDefinitions={[
            { id: 'cargo', header: 'Cargo', cell: (i) => i.cargo, sortingField: 'cargo' },
            { id: 'nivel', header: 'Nivel', cell: (i) => i.nivel },
            { id: 'ano', header: 'Ano', cell: (i) => i.ano },
            { id: 'salario', header: 'Salario', cell: (i) => formatBRL(i.salario), sortingField: 'salario' },
            {
              id: 'acoes',
              header: 'Acoes',
              cell: (i) => (
                <SpaceBetween direction="horizontal" size="xs">
                  <Button variant="inline-link" onClick={() => abrirEditar(i)}>Editar</Button>
                  <Button variant="inline-link" onClick={() => handleExcluir(i.id)}>Excluir</Button>
                </SpaceBetween>
              ),
            },
          ]}
          header={
            <Header
              counter={`(${itens.length})`}
              actions={<Button variant="primary" onClick={abrirNovo}>Nova Entrada</Button>}
            >
              Tabela Salarial
            </Header>
          }
          filter={
            <SpaceBetween direction="horizontal" size="m">
              <Input
                value={filtroCargo}
                onChange={({ detail }) => setFiltroCargo(detail.value)}
                placeholder="Filtrar por cargo"
              />
              <Select
                selectedOption={anosOptions.find((o) => o.value === filtroAno) || anosOptions[0]}
                options={anosOptions}
                onChange={({ detail }) => setFiltroAno(detail.selectedOption.value || '')}
              />
            </SpaceBetween>
          }
          empty={
            <Box textAlign="center" color="inherit">
              <b>Nenhuma entrada encontrada</b>
            </Box>
          }
        />
      </SpaceBetween>

      <Modal
        visible={modalAberto}
        onDismiss={() => setModalAberto(false)}
        header={editando ? 'Editar Entrada' : 'Nova Entrada'}
        footer={
          <Box float="right">
            <SpaceBetween direction="horizontal" size="xs">
              <Button variant="link" onClick={() => setModalAberto(false)}>Cancelar</Button>
              <Button variant="primary" loading={salvando} onClick={handleSalvar}>Salvar</Button>
            </SpaceBetween>
          </Box>
        }
      >
        <SpaceBetween size="m">
          <FormField label="Cargo">
            <Input value={form.cargo} onChange={({ detail }) => setForm({ ...form, cargo: detail.value })} disabled={!!editando} />
          </FormField>
          <FormField label="Nivel">
            <Input value={form.nivel} onChange={({ detail }) => setForm({ ...form, nivel: detail.value })} disabled={!!editando} />
          </FormField>
          <FormField label="Ano">
            <Input type="number" value={form.ano} onChange={({ detail }) => setForm({ ...form, ano: detail.value })} disabled={!!editando} />
          </FormField>
          <FormField label="Salario (R$)">
            <Input type="number" value={form.salario} onChange={({ detail }) => setForm({ ...form, salario: detail.value })} />
          </FormField>
        </SpaceBetween>
      </Modal>
    </ContentLayout>
  )
}
