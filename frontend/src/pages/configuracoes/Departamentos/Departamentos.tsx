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
import Badge from '@cloudscape-design/components/badge'
import ContentLayout from '@cloudscape-design/components/content-layout'
import { listarDepartamentos, criarDepartamento, atualizarDepartamento, excluirDepartamento } from '../../../api/departamentos'

interface Departamento { id: number; nome: string; budget_mensal?: number | null }

const formatBRL = (v: number | null | undefined) =>
  v ? v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '-'

export default function Departamentos() {
  const [departamentos, setDepartamentos] = useState<Departamento[]>([])
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')
  const [modal, setModal] = useState<'novo' | 'editar' | 'excluir' | null>(null)
  const [alvo, setAlvo] = useState<Departamento | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [nome, setNome] = useState('')
  const [budget, setBudget] = useState('')

  const carregar = async () => {
    setLoading(true)
    try {
      const resp = await listarDepartamentos()
      setDepartamentos(resp.data)
    } catch { setErro('Erro ao carregar departamentos.') }
    finally { setLoading(false) }
  }

  useEffect(() => { carregar() }, [])

  const fechar = () => { setModal(null); setAlvo(null); setErro('') }

  const abrir = (tipo: 'novo' | 'editar' | 'excluir', d?: Departamento) => {
    setErro('')
    setAlvo(d || null)
    if (tipo === 'novo') { setNome(''); setBudget('') }
    if (tipo === 'editar' && d) { setNome(d.nome); setBudget(d.budget_mensal ? String(d.budget_mensal) : '') }
    setModal(tipo)
  }

  const handleSalvar = async () => {
    if (!nome.trim()) { setErro('Informe o nome do departamento.'); return }
    setSalvando(true)
    const budgetVal = budget ? parseFloat(budget.replace(',', '.')) : null
    try {
      if (modal === 'novo') {
        await criarDepartamento({ nome: nome.trim(), budget_mensal: budgetVal })
        setSucesso('Departamento criado.')
      } else if (modal === 'editar' && alvo) {
        await atualizarDepartamento(alvo.id, { nome: nome.trim(), budget_mensal: budgetVal })
        setSucesso('Departamento atualizado.')
      }
      fechar(); carregar()
    } catch (e: any) {
      setErro(e?.response?.data?.detail || 'Erro ao salvar.')
    } finally { setSalvando(false) }
  }

  const handleExcluir = async () => {
    if (!alvo) return
    setSalvando(true)
    try {
      await excluirDepartamento(alvo.id)
      setSucesso('Departamento excluido.')
      fechar(); carregar()
    } catch (e: any) {
      setErro(e?.response?.data?.detail || 'Erro ao excluir.')
    } finally { setSalvando(false) }
  }

  return (
    <ContentLayout header={<Header variant="h1">Departamentos</Header>}>
      <SpaceBetween size="l">
        {erro && <Alert type="error" onDismiss={() => setErro('')}>{erro}</Alert>}
        {sucesso && <Alert type="success" onDismiss={() => setSucesso('')}>{sucesso}</Alert>}

        <Table
          loading={loading}
          loadingText="Carregando..."
          items={departamentos}
          columnDefinitions={[
            { id: 'nome', header: 'Nome', cell: (d) => <Box fontWeight="bold">{d.nome}</Box>, sortingField: 'nome' },
            {
              id: 'budget', header: 'Budget Mensal',
              cell: (d) => d.budget_mensal
                ? <Box color="text-status-success" fontWeight="bold">{formatBRL(d.budget_mensal)}</Box>
                : <Badge color="grey">Não definido</Badge>
            },
            {
              id: 'acoes', header: 'Acoes',
              cell: (d) => (
                <SpaceBetween direction="horizontal" size="xs">
                  <Button variant="inline-link" onClick={() => abrir('editar', d)}>Editar</Button>
                  <Button variant="inline-link" onClick={() => abrir('excluir', d)}>Excluir</Button>
                </SpaceBetween>
              ),
            },
          ]}
          header={
            <Header counter={`(${departamentos.length})`} actions={
              <Button variant="primary" iconName="add-plus" onClick={() => abrir('novo')}>Novo Departamento</Button>
            }>
              Departamentos
            </Header>
          }
          empty={<Box textAlign="center"><b>Nenhum departamento</b></Box>}
        />
      </SpaceBetween>

      <Modal
        visible={modal === 'novo' || modal === 'editar'}
        onDismiss={fechar}
        header={modal === 'novo' ? 'Novo Departamento' : `Editar — ${alvo?.nome}`}
        footer={
          <Box float="right">
            <SpaceBetween direction="horizontal" size="xs">
              <Button variant="link" onClick={fechar}>Cancelar</Button>
              <Button variant="primary" loading={salvando} onClick={handleSalvar}>Salvar</Button>
            </SpaceBetween>
          </Box>
        }
      >
        <SpaceBetween size="m">
          {erro && <Alert type="error">{erro}</Alert>}
          <FormField label="Nome">
            <Input value={nome} onChange={({ detail }) => setNome(detail.value)} placeholder="Nome do departamento" />
          </FormField>
          <FormField label="Budget Mensal (R$)" description="Limite de custo mensal para este departamento (opcional)">
            <Input
              type="number"
              value={budget}
              onChange={({ detail }) => setBudget(detail.value)}
              placeholder="Ex: 50000"
            />
          </FormField>
        </SpaceBetween>
      </Modal>

      <Modal
        visible={modal === 'excluir'}
        onDismiss={fechar}
        header="Excluir Departamento"
        footer={
          <Box float="right">
            <SpaceBetween direction="horizontal" size="xs">
              <Button variant="link" onClick={fechar}>Cancelar</Button>
              <Button variant="primary" loading={salvando} onClick={handleExcluir}>Excluir</Button>
            </SpaceBetween>
          </Box>
        }
      >
        {erro && <Alert type="error">{erro}</Alert>}
        Deseja excluir o departamento <strong>{alvo?.nome}</strong>?
      </Modal>
    </ContentLayout>
  )
}
