import React, { useState, useEffect } from 'react'
import Container from '@cloudscape-design/components/container'
import Header from '@cloudscape-design/components/header'
import Box from '@cloudscape-design/components/box'
import SpaceBetween from '@cloudscape-design/components/space-between'
import Badge from '@cloudscape-design/components/badge'
import Spinner from '@cloudscape-design/components/spinner'
import Table from '@cloudscape-design/components/table'
import { listarCertificacoes, relatorioPorTipo, relatorioPorDepartamento, Certificacao } from '../../api/certificacoes'
import client from '../../api/client'

const BADGE_COLORS: Record<string, any> = {
  AWS: 'severity-medium',
  GCP: 'blue',
  Datadog: 'severity-low',
  Terraform: 'severity-high',
  Outro: 'grey',
}

const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

interface ColabCert {
  id: number
  nome: string
  departamento: string
  certificacoes: Certificacao[]
}

export default function CertificacoesDashboard() {
  const [loading, setLoading] = useState(false)
  const [colabs, setColabs] = useState<ColabCert[]>([])
  const [porTipo, setPorTipo] = useState<{tipo: string, total: number}[]>([])
  const [porDepto, setPorDepto] = useState<{departamento: string, total: number, por_tipo: Record<string, number>}[]>([])
  const [expandidos, setExpandidos] = useState<Set<number>>(new Set())

  useEffect(() => {
    const carregar = async () => {
      setLoading(true)
      try {
        const [respCerts, respTipo, respDepto, respColabs] = await Promise.all([
          listarCertificacoes(),
          relatorioPorTipo(),
          relatorioPorDepartamento(),
          client.get('/colaboradores'),
        ])
        const certs: Certificacao[] = respCerts.data
        const colaboradores: any[] = respColabs.data

        // Agrupa certificações por colaborador
        const mapa: Record<number, ColabCert> = {}
        for (const cert of certs) {
          if (!mapa[cert.colaborador_id]) {
            const colab = colaboradores.find((c: any) => c.id === cert.colaborador_id)
            mapa[cert.colaborador_id] = {
              id: cert.colaborador_id,
              nome: colab?.nome || `Colaborador ${cert.colaborador_id}`,
              departamento: colab?.departamento || '',
              certificacoes: [],
            }
          }
          mapa[cert.colaborador_id].certificacoes.push(cert)
        }
        setColabs(Object.values(mapa).sort((a, b) => b.certificacoes.length - a.certificacoes.length))
        setPorTipo(respTipo.data)
        setPorDepto(respDepto.data)
      } catch {} finally { setLoading(false) }
    }
    carregar()
  }, [])

  const toggleExpandir = (id: number) => {
    setExpandidos(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  const totalCerts = colabs.reduce((acc, c) => acc + c.certificacoes.length, 0)
  const maxTipo = Math.max(...porTipo.map(t => t.total), 1)
  const maxDepto = Math.max(...porDepto.map(d => d.total), 1)

  if (loading) return <Box textAlign="center" padding="l"><Spinner /></Box>
  if (totalCerts === 0) return null

  return (
    <SpaceBetween size="l">
      {/* Gráfico por tipo */}
      <Container header={<Header variant="h2" description="Total de certificações por tecnologia">Certificações por Tipo</Header>}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 20, padding: '16px 8px', height: 180 }}>
          {porTipo.map(t => {
            const altura = (t.total / maxTipo) * 130
            return (
              <div key={t.tipo} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <Box variant="small" fontWeight="bold">{t.total}</Box>
                <div style={{ width: '100%', height: altura, background: '#0972d3', borderRadius: '4px 4px 0 0', minHeight: 4 }} />
                <Badge color={BADGE_COLORS[t.tipo] || 'grey'}>{t.tipo}</Badge>
              </div>
            )
          })}
        </div>
      </Container>

      {/* Gráfico por departamento */}
      <Container header={<Header variant="h2" description="Total de certificações por departamento">Certificações por Departamento</Header>}>
        <SpaceBetween size="xs">
          {porDepto.sort((a, b) => b.total - a.total).map(d => {
            const pct = (d.total / maxDepto) * 100
            return (
              <div key={d.departamento} style={{ padding: '6px 0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Box fontWeight="bold">{d.departamento}</Box>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {Object.entries(d.por_tipo).map(([tipo, qtd]) => (
                      <Badge key={tipo} color={BADGE_COLORS[tipo] || 'grey'}>{tipo}: {qtd}</Badge>
                    ))}
                    <Box fontWeight="bold" color="text-status-info">{d.total} total</Box>
                  </div>
                </div>
                <div style={{ background: '#e9ebed', borderRadius: 4, height: 6 }}>
                  <div style={{ background: '#0972d3', borderRadius: 4, height: 6, width: `${pct}%`, transition: 'width 0.4s ease' }} />
                </div>
              </div>
            )
          })}
        </SpaceBetween>
      </Container>

      {/* Lista de colaboradores com certificações */}
      <Container header={<Header variant="h2" description={`${totalCerts} certificações em ${colabs.length} colaboradores`}>Colaboradores Certificados</Header>}>
        <SpaceBetween size="xs">
          {colabs.map(colab => {
            const expandido = expandidos.has(colab.id)
            return (
              <div key={colab.id} style={{ border: '1px solid #e9ebed', borderRadius: 8, overflow: 'hidden' }}>
                <div
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', background: expandido ? '#f0f4ff' : '#fff', cursor: 'pointer', userSelect: 'none' }}
                  onClick={() => toggleExpandir(colab.id)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Box fontWeight="bold">{colab.nome}</Box>
                    <Box variant="small" color="text-body-secondary">{colab.departamento}</Box>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {Object.entries(
                        colab.certificacoes.reduce((acc: Record<string, number>, c) => {
                          acc[c.tipo] = (acc[c.tipo] || 0) + 1; return acc
                        }, {})
                      ).map(([tipo, qtd]) => (
                        <Badge key={tipo} color={BADGE_COLORS[tipo] || 'grey'}>{tipo}: {qtd}</Badge>
                      ))}
                    </div>
                    <Box color="text-body-secondary">{expandido ? '▲' : '▼'}</Box>
                  </div>
                </div>
                {expandido && (
                  <div style={{ padding: '0 16px 12px' }}>
                    <Table
                      items={colab.certificacoes}
                      columnDefinitions={[
                        { id: 'tipo', header: 'Tipo', cell: (c) => <Badge color={BADGE_COLORS[c.tipo] || 'grey'}>{c.tipo}</Badge> },
                        { id: 'nome', header: 'Certificação', cell: (c) => <Box fontWeight="bold">{c.nome}</Box> },
                        { id: 'data', header: 'Conquistada em', cell: (c) => `${MESES[c.mes - 1]}/${c.ano}` },
                      ]}
                      variant="embedded"
                      empty={<Box textAlign="center">Sem certificações</Box>}
                    />
                  </div>
                )}
              </div>
            )
          })}
        </SpaceBetween>
      </Container>
    </SpaceBetween>
  )
}
