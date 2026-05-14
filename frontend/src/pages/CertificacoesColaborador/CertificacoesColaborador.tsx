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
import { listarCertificacoes, criarCertificacao, excluirCertificacao } from '../../api/certificacoes'
import { listarColaboradores } from '../../api/colaboradores'
import type { Certificacao, Colaborador } from '../../types'

export default function CertificacoesColaborador() {
  const [certificacoes, setCertificacoes] = useState<Certificacao[]>([])
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([])
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  const [modalAberto, setModalAberto] = useState(false)
  const [novoNome, setNovoNome] = useState('')
  const [colaboradorSelecionado, setColaboradorSelecionado] = useState<string>('')

  const carregar = useCallback(async () => {
    setLoading(true)
    setErro('')
    try {
      const [certResp, colabResp] = await Promise.all([
        listarCertificacoes(),
        listarColaboradores(),
      ])
      setCertificacoes(certResp.data)
      setColaboradores(colabResp.data)
    } catch {
      setErro('Erro ao carregar certificacoes.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { carregar() }, [carregar])

  const handleCriar = async () => {
    if (!colaboradorSelecionado || !novoNome.trim()) return
    try {
      await criarCertificacao({ colaborador_id: Number(colaboradorSelecionado), nome: novoNome.trim() })
      setModalAberto(false)
      setNovoNome('')
      setColaboradorSelecionado('')
      carregar()
    } catch {
      setErro('Erro ao criar certificacao.')
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

  const colabOptions = colaboradores.map((c) => ({ label: c.nome, value: String(c.id) }))

  return (
    <>
      <SpaceBetween size="l">
        <Header
          variant="h1"
          actions={
            <Button variant="primary" iconName="add-plus" onClick={() => setModalAberto(true)}>
              Nova Certificacao
            </Button>
          }
        >
          Certificacoes por Colaborador
        </Header>

        {erro && <Alert type="error" onDismiss={() => setErro('')}>{erro}</Alert>}

        {loading ? (
          <Box textAlign="center" padding="l">Carregando...</Box>
        ) : agrupado.length === 0 ? (
          <Box textAlign="center" color="inherit" padding="l">
            <b>Nenhuma certificacao cadastrada</b>
          </Box>
        ) : (
          agrupado.map(({ colaborador, certs }) => (
            <Table
              key={colaborador.id}
              items={certs}
              columnDefinitions={[
                { id: 'nome', header: 'Certificacao', cell: (c) => c.nome },
                {
                  id: 'acoes',
                  header: 'Acoes',
                  cell: (c) => (
                    <Button variant="inline-link" onClick={() => handleExcluir(c.id)}>
                      Remover
                    </Button>
                  ),
                  width: 120,
                },
              ]}
              header={
                <Header variant="h3" counter={`(${certs.length})`}>
                  {colaborador.nome}
                </Header>
              }
              variant="embedded"
            />
          ))
        )}
      </SpaceBetween>

      <Modal
        visible={modalAberto}
        onDismiss={() => setModalAberto(false)}
        header="Nova Certificacao"
        footer={
          <Box float="right">
            <SpaceBetween direction="horizontal" size="xs">
              <Button variant="link" onClick={() => setModalAberto(false)}>Cancelar</Button>
              <Button variant="primary" onClick={handleCriar} disabled={!colaboradorSelecionado || !novoNome.trim()}>
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
          <FormField label="Nome da Certificacao">
            <Input
              value={novoNome}
              onChange={({ detail }) => setNovoNome(detail.value)}
              placeholder="Ex: AWS Solutions Architect"
            />
          </FormField>
        </SpaceBetween>
      </Modal>
    </>
  )
}
