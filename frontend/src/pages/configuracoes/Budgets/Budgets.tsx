import React, { useState, useEffect, useCallback } from 'react'
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
import PeriodFilter from '../../../components/PeriodFilter/PeriodFilter'
import { useFilterStore } from '../../../store/filterStore'
import { listarBudgets, criarBudget, atualizarBudget, excluirBudget, comparacaoBudget, copiarBudgets } from '../../../api/budgets'
import type { BudgetDepartamento, BudgetComparacao } from '../../../api/budgets'
import { listarDepartamentos } from '../../../api/departamentos'

const formatBRL = (valor: number) => valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

interface Departamento { id: number; nome: string }

export default function Budgets() {
  const { mes, ano } = useFilterStore()
  const [budgets, setBudgets] = useState<BudgetDepartamento[]>([])
  const [comparacao, setComparacao] = useState<BudgetComparacao[]>([])
  const [departamentos, setDepartamentos] = useState<Departamento[]>([])
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)

  // Modal criar
  const [modalCriar, setModalCriar] = useState(false)
  const [criarDeptId, setCriarDeptId] = useState('')
  const [criarValor, setCriarValor] = useState('')

  // Modal editar
  const [editando, setEditando] = useState<BudgetDepartamento | null>(null)
  const [editarValor, setEditarValor] = useState('')

  // Modal copiar
  const [modalCopiar, setModalCopiar] = useState(false)
  const [copiarMesDest, setCopiarMesDest] = useState('')
  const [copiarAnoDest, setCopiarAnoDest] = useState('')

  const carregar = useCallback(async () => {
    setLoading(true)
    setErro('')
    try {
      const [bResp, cResp] = await Promise.all([
        listarBudgets({ mes, ano }),
        comparacaoBudget(mes, ano),
      ])
      setBudgets(bResp.data)
      setComparacao(cResp.data)
    } catch {
      setErro('Erro ao carregar budgets.')
    } finally {
      setLoading(false)
    }
  }, [mes, ano])

  const carregarDepts = async () => {
    try {
      const resp = await listarDepartamentos()
      setDepartamentos(resp.data)
    } catch {}
  }

  useEffect(() => { carregar() }, [carregar])
  useEffect(() => { carregarDepts() }, [])

  const handleCriar = async () => {
    if (!criarDeptId || !criarValor) return
    const valor = parseFloat(criarValor.replace(',', '.'))
    if (isNaN(valor)) { setErro('Valor invalido.'); return }
    setSalvando(true)
    try {
      await criarBudget({ departamento_id: parseInt(criarDeptId), mes, ano, valor })
      setModalCriar(false)
      setCriarDeptId(''); setCriarValor('')
      carregar()
    } catch (e: any) {
      setErro(e?.response?.data?.detail || 'Erro ao criar budget.')
    } finally { setSalvando(false) }
  }

  const handleEditar = async () => {
    if (!editando) return
    const valor = parseFloat(editarValor.replace(',', '.'))
    if (isNaN(valor)) { setErro('Valor invalido.'); return }
    setSalvando(true)
    try {
      await atualizarBudget(editando.id, valor)
      setEditando(null)
      carregar()
    } catch { setErro('Erro ao atualizar budget.') }
    finally { setSalvando(false) }
  }

  const handleExcluir = async (id: number) => {
    try { await excluirBudget(id); carregar() }
    catch { setErro('Erro ao excluir budget.') }
  }

  const handleCopiar = async () => {
    if (!copiarMesDest || !copiarAnoDest) return
    setSalvando(true)
    try {
      await copiarBudgets(mes, ano, parseInt(copiarMesDest), parseInt(copiarAnoDest))
      setModalCopiar(false)
      setCopiarMesDest(''); setCopiarAnoDest('')
      carregar()
    } catch (e: any) {
      setErro(e?.response?.data?.detail || 'Erro ao copiar budgets.')
    } finally { setSalvando(false) }
  }

  const getDeptNome = (id: number) => departamentos.find(d => d.id === id)?.nome || `Dept #${id}`

  const deptsSemBudget = departamentos.filter(d => !budgets.find(b => b.departamento_id === d.id))

  const meses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

  return (
    <ContentLayout header={<Header variant="h1">Budget por Departamento</Header>}>
      <SpaceBetween size="l">
        <PeriodFilter />
        {erro && <Alert type="error" onDismiss={() => setErro('')}>{erro}</Alert>}

        {/* Comparacao */}
        <Table
          loading={loading}
          loadingText="Carregando..."
          items={comparacao}
          header={
            <Header
              counter={`(${comparacao.length})`}
              actions={
                <SpaceBetween direction="horizontal" size="xs">
                  <Button onClick={() => setModalCopiar(true)} iconName="copy">Copiar para outro mes</Button>
                  <Button variant="primary" iconName="add-plus" onClick={() => setModalCriar(true)}>Definir Budget</Button>
                </SpaceBetween>
              }
            >
              Comparacao: Budget vs Custo Real - {meses[mes - 1]}/{ano}
            </Header>
          }
          columnDefinitions={[
            { id: 'dept', header: 'Departamento', cell: (item) => <Box fontWeight="bold">{item.departamento_nome}</Box> },
            {
              id: 'budget', header: 'Budget',
              cell: (item) => item.budget ? formatBRL(item.budget) : <Badge color="grey">Nao definido</Badge>,
            },
            {
              id: 'custo', header: 'Custo Real',
              cell: (item) => <Box fontWeight="bold">{formatBRL(item.custo_real)}</Box>,
            },
            {
              id: 'diferenca', header: 'Diferenca',
              cell: (item) => {
                if (item.diferenca === null) return '-'
                const cor = item.diferenca >= 0 ? 'text-status-success' : 'text-status-error'
                return <Box color={cor} fontWeight="bold">{formatBRL(item.diferenca)}</Box>
              },
            },
            {
              id: 'percentual', header: '% Uso',
              cell: (item) => {
                if (item.percentual_uso === null) return '-'
                const cor = item.percentual_uso <= 100 ? 'text-status-success' : 'text-status-error'
                return <Box color={cor} fontWeight="bold">{item.percentual_uso.toFixed(1)}%</Box>
              },
            },
            {
              id: 'status', header: 'Status',
              cell: (item) => {
                if (item.status === 'acima') return <Badge color="red">Acima</Badge>
                if (item.status === 'abaixo') return <Badge color="green">Dentro</Badge>
                return <Badge color="grey">Sem budget</Badge>
              },
            },
            {
              id: 'barra', header: '',
              cell: (item) => {
                if (!item.percentual_uso) return null
                const pct = Math.min(item.percentual_uso, 100)
                const cor = item.percentual_uso <= 80 ? '#037f0c' : item.percentual_uso <= 100 ? '#f89256' : '#d91515'
                return (
                  <div style={{ background: '#e9ebed', borderRadius: 4, height: 8, width: 80 }}>
                    <div style={{ background: cor, borderRadius: 4, height: 8, width: `${pct}%` }} />
                  </div>
                )
              },
            },
          ]}
          empty={<Box textAlign="center">Nenhum dado para o periodo selecionado.</Box>}
        />

        {/* Tabela de budgets definidos */}
        <Table
          items={budgets}
          header={<Header counter={`(${budgets.length})`}>Budgets Definidos - {meses[mes - 1]}/{ano}</Header>}
          columnDefinitions={[
            { id: 'dept', header: 'Departamento', cell: (b) => getDeptNome(b.departamento_id) },
            { id: 'valor', header: 'Valor', cell: (b) => <Box fontWeight="bold">{formatBRL(b.valor)}</Box> },
            {
              id: 'acoes', header: 'Acoes',
              cell: (b) => (
                <SpaceBetween direction="horizontal" size="xs">
                  <Button variant="inline-link" onClick={() => { setEditando(b); setEditarValor(String(b.valor)) }}>Editar</Button>
                  <Button variant="inline-link" onClick={() => handleExcluir(b.id)}>Excluir</Button>
                </SpaceBetween>
              ),
            },
          ]}
          empty={<Box textAlign="center">Nenhum budget definido para este periodo.</Box>}
        />
      </SpaceBetween>

      {/* Modal criar */}
      <Modal
        visible={modalCriar}
        onDismiss={() => setModalCriar(false)}
        header="Definir Budget"
        footer={
          <Box float="right">
            <SpaceBetween direction="horizontal" size="xs">
              <Button variant="link" onClick={() => setModalCriar(false)}>Cancelar</Button>
              <Button variant="primary" loading={salvando} onClick={handleCriar}
                disabled={!criarDeptId || !criarValor}>Salvar</Button>
            </SpaceBetween>
          </Box>
        }
      >
        <SpaceBetween size="m">
          <FormField label="Departamento">
            <Select
              selectedOption={criarDeptId ? { label: getDeptNome(parseInt(criarDeptId)), value: criarDeptId } : null}
              options={deptsSemBudget.map(d => ({ label: d.nome, value: String(d.id) }))}
              onChange={({ detail }) => setCriarDeptId(detail.selectedOption.value || '')}
              placeholder="Selecione o departamento"
            />
          </FormField>
          <FormField label="Valor do Budget (R$)" description={`Para ${meses[mes - 1]}/${ano}`}>
            <Input value={criarValor} onChange={({ detail }) => setCriarValor(detail.value)} type="number" placeholder="0.00" />
          </FormField>
        </SpaceBetween>
      </Modal>

      {/* Modal editar */}
      <Modal
        visible={!!editando}
        onDismiss={() => setEditando(null)}
        header={`Editar Budget: ${editando ? getDeptNome(editando.departamento_id) : ''}`}
        footer={
          <Box float="right">
            <SpaceBetween direction="horizontal" size="xs">
              <Button variant="link" onClick={() => setEditando(null)}>Cancelar</Button>
              <Button variant="primary" loading={salvando} onClick={handleEditar}>Salvar</Button>
            </SpaceBetween>
          </Box>
        }
      >
        <FormField label="Novo valor (R$)">
          <Input value={editarValor} onChange={({ detail }) => setEditarValor(detail.value)} type="number" />
        </FormField>
      </Modal>

      {/* Modal copiar */}
      <Modal
        visible={modalCopiar}
        onDismiss={() => setModalCopiar(false)}
        header={`Copiar budgets de ${meses[mes - 1]}/${ano} para outro periodo`}
        footer={
          <Box float="right">
            <SpaceBetween direction="horizontal" size="xs">
              <Button variant="link" onClick={() => setModalCopiar(false)}>Cancelar</Button>
              <Button variant="primary" loading={salvando} onClick={handleCopiar}
                disabled={!copiarMesDest || !copiarAnoDest}>Copiar</Button>
            </SpaceBetween>
          </Box>
        }
      >
        <SpaceBetween size="m">
          <FormField label="Mes destino">
            <Select
              selectedOption={copiarMesDest ? { label: meses[parseInt(copiarMesDest) - 1], value: copiarMesDest } : null}
              options={meses.map((m, i) => ({ label: m, value: String(i + 1) }))}
              onChange={({ detail }) => setCopiarMesDest(detail.selectedOption.value || '')}
            />
          </FormField>
          <FormField label="Ano destino">
            <Input value={copiarAnoDest} onChange={({ detail }) => setCopiarAnoDest(detail.value)} type="number" placeholder="2025" />
          </FormField>
        </SpaceBetween>
      </Modal>
    </ContentLayout>
  )
}
