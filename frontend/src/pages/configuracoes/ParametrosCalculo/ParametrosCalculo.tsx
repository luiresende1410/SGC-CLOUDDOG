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
import Badge from '@cloudscape-design/components/badge'
import { listarParametros, atualizarParametro } from '../../../api/parametros'
import type { ParametroCalculo } from '../../../types'

// Chaves que representam valores monetarios (R$)
const CHAVES_MONETARIAS = new Set([
  'EQUIPAMENTOS_MENSAL',
  'ESCRITORIO_MENSAL',
])

// Chaves que representam percentuais (ex: 0.08 = 8%)
const CHAVES_PERCENTUAIS = new Set([
  'FGTS',
  'GPS',
  'MULTA_FGTS',
])

type TipoValor = 'monetario' | 'percentual' | 'inteiro' | 'numerico'

const getTipo = (chave: string, valor: number): TipoValor => {
  if (CHAVES_MONETARIAS.has(chave)) return 'monetario'
  if (CHAVES_PERCENTUAIS.has(chave)) return 'percentual'
  if (Number.isInteger(Number(valor))) return 'inteiro'
  return 'numerico'
}

const formatarValor = (chave: string, valor: number): string => {
  const v = Number(valor)
  const tipo = getTipo(chave, v)
  if (tipo === 'monetario') {
    return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }
  if (tipo === 'percentual') {
    return `${(v * 100).toFixed(2)}%`
  }
  if (tipo === 'inteiro') {
    return v.toFixed(0)
  }
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 4 })
}

const TIPO_BADGE: Record<TipoValor, { label: string; color: 'blue' | 'green' | 'grey' }> = {
  monetario:  { label: 'R$',  color: 'green' },
  percentual: { label: '%',   color: 'blue' },
  inteiro:    { label: 'Qtd', color: 'grey' },
  numerico:   { label: 'Num', color: 'grey' },
}

export default function ParametrosCalculo() {
  const [parametros, setParametros] = useState<ParametroCalculo[]>([])
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  const [editando, setEditando] = useState<ParametroCalculo | null>(null)
  const [novoValor, setNovoValor] = useState('')
  const [salvando, setSalvando] = useState(false)

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

  const handleSalvar = async () => {
    if (!editando) return
    const valor = parseFloat(novoValor.replace(',', '.'))
    if (isNaN(valor)) {
      setErro('Valor invalido.')
      return
    }
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

  const abrirEditar = (p: ParametroCalculo) => {
    setEditando(p)
    const tipo = getTipo(p.chave, Number(p.valor))
    // Para percentuais, mostra o valor em % para facilitar a edicao
    if (tipo === 'percentual') {
      setNovoValor(String((Number(p.valor) * 100).toFixed(4)))
    } else {
      setNovoValor(String(p.valor))
    }
  }

  const getDescricaoInput = () => {
    if (!editando) return ''
    const tipo = getTipo(editando.chave, Number(editando.valor))
    if (tipo === 'percentual') return 'Informe o valor em % (ex: 8 para 8%)'
    if (tipo === 'monetario') return 'Informe o valor em reais (ex: 343.27)'
    return editando.descricao || ''
  }

  const getValorParaSalvar = (): number => {
    const v = parseFloat(novoValor.replace(',', '.'))
    if (!editando) return v
    const tipo = getTipo(editando.chave, Number(editando.valor))
    // Converte % de volta para decimal
    if (tipo === 'percentual') return v / 100
    return v
  }

  const handleSalvarFinal = async () => {
    if (!editando) return
    const valor = getValorParaSalvar()
    if (isNaN(valor)) {
      setErro('Valor invalido.')
      return
    }
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

  return (
    <ContentLayout header={<Header variant="h1">Parametros de Calculo</Header>}>
      <SpaceBetween size="l">
        {erro && (
          <Alert type="error" onDismiss={() => setErro('')}>
            {erro}
          </Alert>
        )}
        <Table
          loading={loading}
          loadingText="Carregando parametros..."
          items={parametros}
          columnDefinitions={[
            {
              id: 'chave',
              header: 'Parametro',
              cell: (p) => (
                <SpaceBetween direction="vertical" size="xxxs">
                  <Box fontWeight="bold">{p.chave}</Box>
                </SpaceBetween>
              ),
            },
            {
              id: 'descricao',
              header: 'Descricao',
              cell: (p) => p.descricao || '-',
            },
            {
              id: 'tipo',
              header: 'Tipo',
              cell: (p) => {
                const tipo = getTipo(p.chave, Number(p.valor))
                const meta = TIPO_BADGE[tipo]
                return <Badge color={meta.color}>{meta.label}</Badge>
              },
            },
            {
              id: 'valor',
              header: 'Valor',
              cell: (p) => (
                <Box fontWeight="bold">
                  {formatarValor(p.chave, Number(p.valor))}
                </Box>
              ),
            },
            {
              id: 'acoes',
              header: 'Acoes',
              cell: (p) => (
                <Button variant="inline-link" onClick={() => abrirEditar(p)}>
                  Editar
                </Button>
              ),
            },
          ]}
          header={<Header counter={`(${parametros.length})`}>Parametros</Header>}
          empty={
            <Box textAlign="center" color="inherit">
              <b>Nenhum parametro encontrado</b>
            </Box>
          }
        />
      </SpaceBetween>

      <Modal
        visible={!!editando}
        onDismiss={() => setEditando(null)}
        header={`Editar: ${editando?.chave}`}
        footer={
          <Box float="right">
            <SpaceBetween direction="horizontal" size="xs">
              <Button variant="link" onClick={() => setEditando(null)}>
                Cancelar
              </Button>
              <Button variant="primary" loading={salvando} onClick={handleSalvarFinal}>
                Salvar
              </Button>
            </SpaceBetween>
          </Box>
        }
      >
        <SpaceBetween size="m">
          <FormField
            label={
              editando
                ? getTipo(editando.chave, Number(editando.valor)) === 'percentual'
                  ? 'Valor (%)'
                  : getTipo(editando.chave, Number(editando.valor)) === 'monetario'
                  ? 'Valor (R$)'
                  : 'Valor'
                : 'Valor'
            }
            description={getDescricaoInput()}
          >
            <Input
              value={novoValor}
              onChange={({ detail }) => setNovoValor(detail.value)}
              type="number"
            />
          </FormField>
          {editando && (
            <Box variant="small" color="text-body-secondary">
              Valor atual: <strong>{formatarValor(editando.chave, Number(editando.valor))}</strong>
            </Box>
          )}
        </SpaceBetween>
      </Modal>
    </ContentLayout>
  )
}
