import React, { useState, useEffect } from 'react'
import ContentLayout from '@cloudscape-design/components/content-layout'
import Header from '@cloudscape-design/components/header'
import Container from '@cloudscape-design/components/container'
import SpaceBetween from '@cloudscape-design/components/space-between'
import FormField from '@cloudscape-design/components/form-field'
import Input from '@cloudscape-design/components/input'
import Select from '@cloudscape-design/components/select'
import Button from '@cloudscape-design/components/button'
import Alert from '@cloudscape-design/components/alert'
import Box from '@cloudscape-design/components/box'
import ColumnLayout from '@cloudscape-design/components/column-layout'
import Badge from '@cloudscape-design/components/badge'
import ExpandableSection from '@cloudscape-design/components/expandable-section'
import Modal from '@cloudscape-design/components/modal'
import { listarColaboradores } from '../../api/colaboradores'
import { previewCalculo, lancarCusto, replicarMesAnterior, replicarTodosMesAnterior, LancamentoCustoInput } from '../../api/custos'
import type { Colaborador } from '../../types'

const formatBRL = (v: unknown) =>
  Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

const LABEL: Record<string, string> = {
  remuneracao:       'Remuneracao total',
  refeicao:          'Refeicao',
  transporte:        'Transporte',
  seguro_saude:      'Seguro Saude',
  seguro_vida:       'Seguro Vida',
  fgts:              'FGTS (8%)',
  gps:               'GPS/INSS (27.8%)',
  ferias:            'Provisao Ferias (1/12)',
  decimo_terceiro:   '13o Salario (1/12)',
  fgts_rescisao:     'Multa FGTS (3.2%)',
  equipamentos:      'Equipamentos (fixo)',
  escritorio:        'Escritorio (fixo)',
}

const CALCULADOS = new Set(['fgts','gps','ferias','decimo_terceiro','fgts_rescisao','equipamentos','escritorio'])
const DO_CADASTRO = new Set(['refeicao','transporte','seguro_saude','seguro_vida'])

const anoAtual = new Date().getFullYear()
const mesAtual = new Date().getMonth() + 1

const mesesOpt = Array.from({ length: 12 }, (_, i) => ({
  label: ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'][i],
  value: String(i + 1),
}))
const anosOpt = Array.from({ length: 4 }, (_, i) => ({
  label: String(anoAtual - 1 + i),
  value: String(anoAtual - 1 + i),
}))

export default function LancamentoCusto() {
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([])
  const [colaboradorId, setColaboradorId] = useState<number | null>(null)
  const [mes, setMes] = useState(String(mesAtual))
  const [ano, setAno] = useState(String(anoAtual))
  // Overrides (apenas se houver reajuste neste mes)
  const [salarioOverride, setSalarioOverride] = useState('')
  const [bonusAwsOverride, setBonusAwsOverride] = useState('')
  // Variaveis mensais
  const [bonusPrd, setBonusPrd] = useState('0')
  const [comissoes, setComissoes] = useState('0')
  const [horaExtra, setHoraExtra] = useState('0')

  const [preview, setPreview] = useState<Record<string, string> | null>(null)
  const [totalPreview, setTotalPreview] = useState<string | null>(null)
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [replicando, setReplicando] = useState(false)
  const [replicandoTodos, setReplicandoTodos] = useState(false)
  const [resultadoReplicacao, setResultadoReplicacao] = useState<any>(null)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')

  useEffect(() => {
    listarColaboradores({ ativo: true, page_size: 100 })
      .then((r) => setColaboradores(r.data))
      .catch(() => {})
  }, [])

  const colaboradorAtual = colaboradores.find((c) => c.id === colaboradorId)

  const buildInput = (): LancamentoCustoInput => ({
    colaborador_id: colaboradorId!,
    mes: Number(mes),
    ano: Number(ano),
    salario_base_override: salarioOverride ? Number(salarioOverride) : undefined,
    bonus_aws_override: bonusAwsOverride !== '' ? Number(bonusAwsOverride) : undefined,
    bonus_prd: Number(bonusPrd) || 0,
    comissoes: Number(comissoes) || 0,
    hora_extra: Number(horaExtra) || 0,
  })

  const handlePreview = async () => {
    if (!colaboradorId) { setErro('Selecione um colaborador.'); return }
    setLoadingPreview(true); setErro('')
    try {
      const resp = await previewCalculo(buildInput())
      setPreview(resp.data.componentes)
      setTotalPreview(resp.data.total)
    } catch (e: any) {
      setErro(e?.response?.data?.detail || 'Erro ao calcular.')
    } finally {
      setLoadingPreview(false)
    }
  }

  const handleLancar = async () => {
    if (!colaboradorId) { setErro('Selecione um colaborador.'); return }
    setSalvando(true); setErro('')
    try {
      const resp = await lancarCusto(buildInput())
      setPreview(resp.data.componentes)
      setTotalPreview(resp.data.total)
      setSucesso(`Custo lancado! Total: ${formatBRL(resp.data.total)}`)
    } catch (e: any) {
      setErro(e?.response?.data?.detail || 'Erro ao lancar custo.')
    } finally {
      setSalvando(false)
    }
  }


  const handleReplicar = async () => {
    if (!colaboradorId) { setErro('Selecione um colaborador.'); return }
    setReplicando(true); setErro('')
    try {
      const resp = await replicarMesAnterior(colaboradorId, Number(mes), Number(ano))
      setPreview(resp.data.componentes)
      setTotalPreview(resp.data.total)
      setSucesso('Mes anterior replicado com sucesso!')
    } catch (e: any) {
      setErro(e?.response?.data?.detail || 'Erro ao replicar mes anterior.')
    } finally {
      setReplicando(false)
    }
  }

  const handleReplicarTodos = async () => {
    setReplicandoTodos(true); setErro('')
    try {
      const resp = await replicarTodosMesAnterior(Number(mes), Number(ano))
      setResultadoReplicacao(resp.data)
    } catch (e: any) {
      setErro(e?.response?.data?.detail || 'Erro ao replicar todos.')
    } finally {
      setReplicandoTodos(false)
    }
  }
  const colabOptions = colaboradores.map((c) => ({
    label: `${c.nome}`,
    value: String(c.id),
    description: `${c.departamento || ''} — ${c.cargo}${c.nivel ? ' ' + c.nivel : ''}`,
  }))

  return (
    <ContentLayout
      header={
        <Header variant="h1" description="Informe apenas os valores variaveis — o restante e calculado automaticamente">
          Lancamento de Custo Mensal
        </Header>
      }
    >
      <SpaceBetween size="l">
        {erro && <Alert type="error" onDismiss={() => setErro('')}>{erro}</Alert>}
        {sucesso && <Alert type="success" onDismiss={() => setSucesso('')}>{sucesso}</Alert>}

        {/* Selecao */}
        <Container header={<Header variant="h2">1. Colaborador e periodo</Header>}>
          <ColumnLayout columns={3}>
            <FormField label="Colaborador">
              <Select
                selectedOption={colaboradorId ? colabOptions.find((o) => o.value === String(colaboradorId)) || null : null}
                options={colabOptions}
                placeholder="Selecione"
                filteringType="auto"
                onChange={({ detail }) => {
                  setColaboradorId(Number(detail.selectedOption.value))
                  setPreview(null); setErro('')
                  setSalarioOverride(''); setBonusAwsOverride('')
                }}
              />
            </FormField>
            <FormField label="Mes">
              <Select
                selectedOption={mesesOpt.find((o) => o.value === mes) || mesesOpt[0]}
                options={mesesOpt}
                onChange={({ detail }) => { setMes(detail.selectedOption.value); setPreview(null) }}
              />
            </FormField>
            <FormField label="Ano">
              <Select
                selectedOption={anosOpt.find((o) => o.value === ano) || anosOpt[1]}
                options={anosOpt}
                onChange={({ detail }) => { setAno(detail.selectedOption.value); setPreview(null) }}
              />
            </FormField>
          </ColumnLayout>

          {/* Resumo do cadastro */}
          {colaboradorAtual && (
            <Box padding={{ top: 'm' }}>
              <SpaceBetween size="xs">
                <SpaceBetween direction="horizontal" size="s">
                  <Badge color={colaboradorAtual.tipo_contrato === 'CLT' ? 'blue' : 'grey'}>
                    {colaboradorAtual.tipo_contrato}
                  </Badge>
                  <Box variant="small">{colaboradorAtual.departamento} — {colaboradorAtual.cargo} {colaboradorAtual.nivel || ''}</Box>
                </SpaceBetween>
                <ColumnLayout columns={3} variant="text-grid">
                  <div>
                    <Box variant="awsui-key-label">Salario base</Box>
                    <Box>{colaboradorAtual.salario_base ? formatBRL(colaboradorAtual.salario_base) : <Badge color="red">Nao cadastrado</Badge>}</Box>
                  </div>
                  <div>
                    <Box variant="awsui-key-label">Bonus AWS</Box>
                    <Box>{colaboradorAtual.bonus_aws ? formatBRL(colaboradorAtual.bonus_aws) : '-'}</Box>
                  </div>
                  <div>
                    <Box variant="awsui-key-label">Beneficios (ref+transp+saude+vida)</Box>
                    <Box>{formatBRL(
                      (Number(colaboradorAtual.refeicao) || 0) +
                      (Number(colaboradorAtual.transporte) || 0) +
                      (Number(colaboradorAtual.seguro_saude) || 0) +
                      (Number(colaboradorAtual.seguro_vida) || 0)
                    )}</Box>
                  </div>
                </ColumnLayout>
              </SpaceBetween>
            </Box>
          )}
        </Container>

        {/* Variaveis mensais */}
        <Container header={
          <Header variant="h2" description="Preencha apenas o que for diferente do cadastro ou variavel neste mes">
            2. Valores variaveis do mes
          </Header>
        }>
          <SpaceBetween size="m">
            <ColumnLayout columns={3}>
              <FormField label="Bonus PRD (R$)" description="Bonus de producao deste mes">
                <Input type="number" value={bonusPrd} onChange={({ detail }) => { setBonusPrd(detail.value); setPreview(null) }} />
              </FormField>
              <FormField label="Comissoes (R$)" description="Comissoes deste mes">
                <Input type="number" value={comissoes} onChange={({ detail }) => { setComissoes(detail.value); setPreview(null) }} />
              </FormField>
              <FormField label="Hora Extra (R$)" description="Horas extras deste mes">
                <Input type="number" value={horaExtra} onChange={({ detail }) => { setHoraExtra(detail.value); setPreview(null) }} />
              </FormField>
            </ColumnLayout>

            {/* Overrides opcionais */}
            <Box>
              <Box variant="awsui-key-label" padding={{ bottom: 'xs' }}>
                Reajuste neste mes? (opcional — deixe em branco para usar o valor do cadastro)
              </Box>
              <ColumnLayout columns={2}>
                <FormField label="Novo salario base (R$)" description="Preencha apenas se houve reajuste">
                  <Input type="number" value={salarioOverride} placeholder={colaboradorAtual?.salario_base ? `Atual: ${formatBRL(colaboradorAtual.salario_base)}` : 'Nao cadastrado'} onChange={({ detail }) => { setSalarioOverride(detail.value); setPreview(null) }} />
                </FormField>
                <FormField label="Novo bonus AWS (R$)" description="Preencha apenas se houve mudanca">
                  <Input type="number" value={bonusAwsOverride} placeholder={colaboradorAtual?.bonus_aws ? `Atual: ${formatBRL(colaboradorAtual.bonus_aws)}` : '0'} onChange={({ detail }) => { setBonusAwsOverride(detail.value); setPreview(null) }} />
                </FormField>
              </ColumnLayout>
            </Box>

            <SpaceBetween size="m">
              <SpaceBetween direction="horizontal" size="s">
                <Button variant="normal" loading={loadingPreview} onClick={handlePreview} disabled={!colaboradorId}>
                  Calcular preview
                </Button>
                <Button variant="primary" loading={salvando} onClick={handleLancar} disabled={!colaboradorId}>
                  Lancar custo
                </Button>
              </SpaceBetween>
              <SpaceBetween direction="horizontal" size="s">
                <Box variant="small" color="text-body-secondary" padding={{ top: "xxs" }}>Sem alteracoes no mes?</Box>
                <Button variant="normal" loading={replicando} onClick={handleReplicar} disabled={!colaboradorId}>
                  Replicar mes anterior (este colaborador)
                </Button>
                <Button variant="normal" loading={replicandoTodos} onClick={handleReplicarTodos}>
                  Replicar mes anterior (todos)
                </Button>
              </SpaceBetween>
            </SpaceBetween>
          </SpaceBetween>
        </Container>

        {/* Preview */}
        {preview && (
          <Container header={<Header variant="h2" description="Encargos calculados automaticamente pelos parametros de calculo">3. Resumo calculado</Header>}>
            <SpaceBetween size="xs">
              {Object.entries(preview).map(([tipo, valor]) => (
                <div key={tipo} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', borderBottom: '1px solid #e9ebed' }}>
                  <SpaceBetween direction="horizontal" size="xs">
                    <Box variant="small">{LABEL[tipo] || tipo.replace(/_/g, ' ')}</Box>
                    {CALCULADOS.has(tipo) && <Badge color="blue">auto</Badge>}
                    {DO_CADASTRO.has(tipo) && <Badge color="grey">cadastro</Badge>}
                  </SpaceBetween>
                  <Box variant="small" fontWeight="bold">{formatBRL(valor)}</Box>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 8 }}>
                <Box fontWeight="bold" fontSize="heading-s">TOTAL</Box>
                <Box fontWeight="bold" fontSize="heading-s" color="text-status-info">{formatBRL(totalPreview)}</Box>
              </div>
            </SpaceBetween>
          </Container>
        )}
      </SpaceBetween>

      {/* Modal resultado replicacao em lote */}
      <Modal
        visible={!!resultadoReplicacao}
        onDismiss={() => setResultadoReplicacao(null)}
        header="Resultado da replicacao em lote"
        size="medium"
        footer={
          <Box float="right">
            <Button variant="primary" onClick={() => setResultadoReplicacao(null)}>Fechar</Button>
          </Box>
        }
      >
        {resultadoReplicacao && (
          <SpaceBetween size="m">
            <Alert type="success">
              Replicado de <strong>{resultadoReplicacao.mes_origem}</strong> para <strong>{resultadoReplicacao.mes_destino}</strong>
            </Alert>
            <ColumnLayout columns={2}>
              <div>
                <Box variant="awsui-key-label">Replicados com sucesso</Box>
                <Box fontSize="heading-l" fontWeight="bold" color="text-status-success">
                  {resultadoReplicacao.replicados}
                </Box>
              </div>
              <div>
                <Box variant="awsui-key-label">Falhas</Box>
                <Box fontSize="heading-l" fontWeight="bold" color={resultadoReplicacao.erros > 0 ? "text-status-error" : "text-status-success"}>
                  {resultadoReplicacao.erros}
                </Box>
              </div>
            </ColumnLayout>
            {resultadoReplicacao.falhas && resultadoReplicacao.falhas.length > 0 && (
              <ExpandableSection headerText="Ver falhas">
                <SpaceBetween size="xs">
                  {resultadoReplicacao.falhas.map((f: any, i: number) => (
                    <Alert key={i} type="error">{f.nome}: {f.erro}</Alert>
                  ))}
                </SpaceBetween>
              </ExpandableSection>
            )}
          </SpaceBetween>
        )}
      </Modal>
    </ContentLayout>
  )
}





