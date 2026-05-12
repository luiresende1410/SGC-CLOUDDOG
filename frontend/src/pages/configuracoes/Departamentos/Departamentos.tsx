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
import {
  listarDepartamentos,
  criarDepartamento,
  atualizarDepartamento,
  excluirDepartamento,
} from '../../../api/departamentos'
import type { Departamento } from '../../../types'

export default function Departamentos() {
  const [departamentos, setDepartamentos] = useState<Departamento[]>([])
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  const [modalAberto, setModalAberto] = useState(false)
  const [editando, setEditando] = useState<Departamento | null>(null)
  const [nome, setNome] = useState('')
  const [salvando, setSalvando] = useState(false)

  const carregar = async () => {
    setLoading(true)
    setErro('')
    try {
      const resp = await listarDepartamentos()
      setDepartamentos(resp.data)
    } catch {
      setErro('Erro ao carregar departamentos.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregar()
  }, [])

  const abrirNovo = () => {
    setEditando(null)
    setNome('')
    setModalAberto(true)
  }

  const abrirEditar = (dep: Departamento) => {
    setEditando(dep)
    setNome(dep.nome)
    setModalAberto(true)
  }

  const handleSalvar = async () => {
    if (!nome.trim()) {
      setErro('Informe o nome do departamento.')
      return
    }
    setSalvando(true)
    try {
      if (editando) {
        await atualizarDepartamento(editando.id, nome.trim())
      } else {
        await criarDepartamento(nome.trim())
      }
      setModalAberto(false)
      carregar()
    } catch {
      setErro('Erro ao salvar departamento.')
    } finally {
      setSalvando(false)
    }
  }

  const handleExcluir = async (id: number) => {
    if (!window.confirm('Deseja excluir este departamento?')) return
    try {
      await excluirDepartamento(id)
      carregar()
    } catch {
      setErro('Erro ao excluir departamento. Verifique se nao ha colaboradores vinculados.')
    }
  }

  return (
    <ContentLayout header={<Header variant="h1">Departamentos</Header>}>
      <SpaceBetween size="l">
        {erro && (
          <Alert type="error" onDismiss={() => setErro('')}>
            {erro}
          </Alert>
        )}
        <Table
          loading={loading}
          loadingText="Carregando departamentos..."
          items={departamentos}
          columnDefinitions={[
            { id: 'id', header: 'ID', cell: (d) => d.id },
            { id: 'nome', header: 'Nome', cell: (d) => d.nome, sortingField: 'nome' },
            {
              id: 'acoes',
              header: 'Acoes',
              cell: (d) => (
                <SpaceBetween direction="horizontal" size="xs">
                  <Button variant="inline-link" onClick={() => abrirEditar(d)}>Editar</Button>
                  <Button variant="inline-link" onClick={() => handleExcluir(d.id)}>Excluir</Button>
                </SpaceBetween>
              ),
            },
          ]}
          header={
            <Header
              counter={`(${departamentos.length})`}
              actions={<Button variant="primary" onClick={abrirNovo}>Novo Departamento</Button>}
            >
              Departamentos
            </Header>
          }
          empty={
            <Box textAlign="center" color="inherit">
              <b>Nenhum departamento cadastrado</b>
            </Box>
          }
        />
      </SpaceBetween>

      <Modal
        visible={modalAberto}
        onDismiss={() => setModalAberto(false)}
        header={editando ? 'Editar Departamento' : 'Novo Departamento'}
        footer={
          <Box float="right">
            <SpaceBetween direction="horizontal" size="xs">
              <Button variant="link" onClick={() => setModalAberto(false)}>Cancelar</Button>
              <Button variant="primary" loading={salvando} onClick={handleSalvar}>Salvar</Button>
            </SpaceBetween>
          </Box>
        }
      >
        <FormField label="Nome do departamento">
          <Input
            value={nome}
            onChange={({ detail }) => setNome(detail.value)}
            placeholder="Ex: Engenharia"
          />
        </FormField>
      </Modal>
    </ContentLayout>
  )
}
