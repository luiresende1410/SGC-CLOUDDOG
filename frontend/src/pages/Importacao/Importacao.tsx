import React, { useState, useRef } from 'react'
import ContentLayout from '@cloudscape-design/components/content-layout'
import Header from '@cloudscape-design/components/header'
import Container from '@cloudscape-design/components/container'
import SpaceBetween from '@cloudscape-design/components/space-between'
import Button from '@cloudscape-design/components/button'
import Alert from '@cloudscape-design/components/alert'
import Box from '@cloudscape-design/components/box'
import FormField from '@cloudscape-design/components/form-field'
import Input from '@cloudscape-design/components/input'
import client from '../../api/client'

export default function Importacao() {
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [mes, setMes] = useState(String(new Date().getMonth() + 1))
  const [ano, setAno] = useState(String(new Date().getFullYear()))
  const [loading, setLoading] = useState(false)
  const [sucesso, setSucesso] = useState('')
  const [erro, setErro] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const handleImportar = async () => {
    if (!arquivo) {
      setErro('Selecione um arquivo CSV para importar.')
      return
    }
    const mesNum = Number(mes)
    const anoNum = Number(ano)
    if (!mesNum || mesNum < 1 || mesNum > 12) {
      setErro('Mes invalido. Informe um valor entre 1 e 12.')
      return
    }
    if (!anoNum || anoNum < 2000) {
      setErro('Ano invalido.')
      return
    }

    setLoading(true)
    setErro('')
    setSucesso('')
    try {
      const formData = new FormData()
      formData.append('file', arquivo)
      formData.append('mes', String(mesNum))
      formData.append('ano', String(anoNum))
      const resp = await client.post('/importacao/csv', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setSucesso(
        `Importacao concluida: ${resp.data.importados ?? 0} registros importados.`
      )
      setArquivo(null)
      if (inputRef.current) inputRef.current.value = ''
    } catch (e: any) {
      setErro(
        e?.response?.data?.detail || 'Erro ao importar arquivo. Verifique o formato do CSV.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <ContentLayout header={<Header variant="h1">Importacao de Custos</Header>}>
      <SpaceBetween size="l">
        <Container header={<Header variant="h2">Importar CSV de Custos</Header>}>
          <SpaceBetween size="m">
            <Box variant="p">
              Importe um arquivo CSV com os custos mensais dos colaboradores. O arquivo deve conter
              as colunas: <strong>matricula</strong>, <strong>salario_base</strong>,{' '}
              <strong>beneficios</strong>, <strong>encargos</strong>.
            </Box>

            <SpaceBetween direction="horizontal" size="m">
              <FormField label="Mes de referencia">
                <Input
                  type="number"
                  value={mes}
                  onChange={({ detail }) => setMes(detail.value)}
                  placeholder="1-12"
                />
              </FormField>
              <FormField label="Ano de referencia">
                <Input
                  type="number"
                  value={ano}
                  onChange={({ detail }) => setAno(detail.value)}
                  placeholder="2024"
                />
              </FormField>
            </SpaceBetween>

            <FormField label="Arquivo CSV">
              <input
                ref={inputRef}
                type="file"
                accept=".csv"
                onChange={(e) => setArquivo(e.target.files?.[0] || null)}
                style={{ padding: '4px 0' }}
              />
            </FormField>

            {arquivo && (
              <Box variant="small" color="text-status-info">
                Arquivo selecionado: {arquivo.name}
              </Box>
            )}

            <Button variant="primary" loading={loading} onClick={handleImportar}>
              Importar
            </Button>
          </SpaceBetween>
        </Container>

        {sucesso && (
          <Alert type="success" onDismiss={() => setSucesso('')}>
            {sucesso}
          </Alert>
        )}
        {erro && (
          <Alert type="error" onDismiss={() => setErro('')}>
            {erro}
          </Alert>
        )}
      </SpaceBetween>
    </ContentLayout>
  )
}
