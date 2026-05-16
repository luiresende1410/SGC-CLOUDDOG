import React, { useState, useEffect, useCallback } from 'react'
import Table from '@cloudscape-design/components/table'
import Box from '@cloudscape-design/components/box'
import SpaceBetween from '@cloudscape-design/components/space-between'
import Header from '@cloudscape-design/components/header'
import Badge from '@cloudscape-design/components/badge'
import TextFilter from '@cloudscape-design/components/text-filter'
import Pagination from '@cloudscape-design/components/pagination'
import Alert from '@cloudscape-design/components/alert'
import ContentLayout from '@cloudscape-design/components/content-layout'
import { listarColaboradores } from '../../api/colaboradores'
import type { Colaborador } from '../../types'

const PAGE_SIZE = 20
const fmtDate = (d?: string) => d ? new Date(d + 'T00:00:00').toLocaleDateString('pt-BR') : '-'

export default function ColaboradoresInativos() {
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([])
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  const [busca, setBusca] = useState('')
  const [pagina, setPagina] = useState(1)

  const carregar = useCallback(async () => {
    setLoading(true)
    setErro('')
    try {
      const resp = await listarColaboradores({ ativo: false, page: 1, page_size: 100 })
      setColaboradores(resp.data)
    } catch {
      setErro('Erro ao carregar colaboradores inativos.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { carregar() }, [carregar])

  const filtrados = colaboradores.filter((c) =>
    !busca || c.nome.toLowerCase().includes(busca.toLowerCase())
  )

  return (
    <ContentLayout header={<Header variant="h1">Colaboradores Inativos</Header>}>
      <SpaceBetween size="l">
        {erro && <Alert type="error" onDismiss={() => setErro('')}>{erro}</Alert>}

        <Table
          loading={loading}
          loadingText="Carregando colaboradores inativos..."
          items={filtrados.slice((pagina - 1) * PAGE_SIZE, pagina * PAGE_SIZE)}
          columnDefinitions={[
            {
              id: 'nome', header: 'Nome',
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
              id: 'cargo', header: 'Cargo / Nivel',
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
              id: 'admissao', header: 'Admissao',
              cell: (c) => <Box variant="small">{fmtDate(c.data_admissao)}</Box>,
            },
            {
              id: 'inativacao', header: 'Data de Saida',
              cell: (c) => (
                <Box variant="small" color="text-status-error">{fmtDate(c.data_inativacao)}</Box>
              ),
            },
          ]}
          header={
            <Header counter={`(${filtrados.length})`}>
              Inativos
            </Header>
          }
          filter={
            <TextFilter
              filteringText={busca}
              filteringPlaceholder="Buscar por nome"
              onChange={({ detail }) => { setBusca(detail.filteringText); setPagina(1) }}
            />
          }
          pagination={
            <Pagination
              currentPageIndex={pagina}
              pagesCount={Math.max(1, Math.ceil(filtrados.length / PAGE_SIZE))}
              onChange={({ detail }) => setPagina(detail.currentPageIndex)}
            />
          }
          empty={<Box textAlign="center" color="inherit"><b>Nenhum colaborador inativo</b></Box>}
        />
      </SpaceBetween>
    </ContentLayout>
  )
}
