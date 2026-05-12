import React, { useState, useEffect } from 'react'
import Form from '@cloudscape-design/components/form'
import FormField from '@cloudscape-design/components/form-field'
import Input from '@cloudscape-design/components/input'
import Select from '@cloudscape-design/components/select'
import SpaceBetween from '@cloudscape-design/components/space-between'
import Button from '@cloudscape-design/components/button'
import Alert from '@cloudscape-design/components/alert'
import Header from '@cloudscape-design/components/header'
import ColumnLayout from '@cloudscape-design/components/column-layout'
import Box from '@cloudscape-design/components/box'
import { listarDepartamentos } from '../../api/departamentos'
import { criarColaborador, atualizarColaborador } from '../../api/colaboradores'
import type { Colaborador, Departamento } from '../../types'

const NIVEIS = Array.from({ length: 15 }, (_, i) => ({ label: `L${i + 1}`, value: `L${i + 1}` }))
const TIPOS_CONTRATO = [{ label: 'CLT', value: 'CLT' }, { label: 'PJ', value: 'PJ' }]

interface Props {
  colaborador?: Colaborador
  onSuccess: () => void
  onCancel: () => void
}

const str = (v?: number | null) => (v != null && v > 0 ? String(v) : '')

export default function ColaboradorForm({ colaborador, onSuccess, onCancel }: Props) {
  const [nome, setNome] = useState(colaborador?.nome || '')
  const [matricula, setMatricula] = useState(colaborador?.matricula || '')
  const [departamentoId, setDepartamentoId] = useState<number | null>(colaborador?.departamento_id || null)
  const [cargo, setCargo] = useState(colaborador?.cargo || '')
  const [nivel, setNivel] = useState(colaborador?.nivel || '')
  const [tipoContrato, setTipoContrato] = useState<'CLT' | 'PJ'>(colaborador?.tipo_contrato || 'CLT')
  const [dataAdmissao, setDataAdmissao] = useState(colaborador?.data_admissao || '')
  // Remuneracao e beneficios fixos
  const [salarioBase, setSalarioBase] = useState(str(colaborador?.salario_base))
  const [bonusAws, setBonusAws] = useState(str(colaborador?.bonus_aws))
  const [refeicao, setRefeicao] = useState(str(colaborador?.refeicao))
  const [transporte, setTransporte] = useState(str(colaborador?.transporte))
  const [seguroSaude, setSeguroSaude] = useState(str(colaborador?.seguro_saude))
  const [seguroVida, setSeguroVida] = useState(str(colaborador?.seguro_vida))

  const [departamentos, setDepartamentos] = useState<Departamento[]>([])
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  const [erros, setErros] = useState<Record<string, string>>({})

  // Sincroniza o formulario quando o colaborador muda
  useEffect(() => {
    setNome(colaborador?.nome || '')
    setMatricula(colaborador?.matricula || '')
    setDepartamentoId(colaborador?.departamento_id || null)
    setCargo(colaborador?.cargo || '')
    setNivel(colaborador?.nivel || '')
    setTipoContrato(colaborador?.tipo_contrato || 'CLT')
    setDataAdmissao(colaborador?.data_admissao || '')
    setSalarioBase(str(colaborador?.salario_base))
    setBonusAws(str(colaborador?.bonus_aws))
    setRefeicao(str(colaborador?.refeicao))
    setTransporte(str(colaborador?.transporte))
    setSeguroSaude(str(colaborador?.seguro_saude))
    setSeguroVida(str(colaborador?.seguro_vida))
    setErro('')
    setErros({})
  }, [colaborador?.id])

  useEffect(() => {
    listarDepartamentos().then((r) => setDepartamentos(r.data)).catch(() => {})
  }, [])

  const validar = () => {
    const e: Record<string, string> = {}
    if (!nome.trim()) e.nome = 'Nome e obrigatorio'
    if (!matricula.trim()) e.matricula = 'Matricula e obrigatoria'
    if (!departamentoId) e.departamento = 'Departamento e obrigatorio'
    if (!cargo.trim()) e.cargo = 'Cargo e obrigatorio'
    if (!tipoContrato) e.tipoContrato = 'Tipo de contrato e obrigatorio'
    if (!dataAdmissao) e.dataAdmissao = 'Data de admissao e obrigatoria'
    if (!salarioBase || Number(salarioBase) <= 0) e.salarioBase = 'Salario base e obrigatorio'
    setErros(e)
    return Object.keys(e).length === 0
  }

  const num = (v: string) => v ? Number(v) : undefined

  const handleSubmit = async () => {
    if (!validar()) return
    setLoading(true)
    setErro('')
    try {
      const dados = {
        nome, matricula,
        departamento_id: departamentoId!,
        cargo,
        nivel: nivel || undefined,
        tipo_contrato: tipoContrato,
        data_admissao: dataAdmissao,
        salario_base: num(salarioBase),
        bonus_aws: num(bonusAws),
        refeicao: num(refeicao),
        transporte: num(transporte),
        seguro_saude: num(seguroSaude),
        seguro_vida: num(seguroVida),
      }
      if (colaborador) {
        await atualizarColaborador(colaborador.id, dados)
      } else {
        await criarColaborador(dados)
      }
      onSuccess()
    } catch (err: any) {
      if (err.response?.status === 409) {
        setErro(`Matricula '${matricula}' ja esta em uso.`)
      } else {
        setErro('Erro ao salvar colaborador. Tente novamente.')
      }
    } finally {
      setLoading(false)
    }
  }

  const depOptions = departamentos.map((d) => ({ label: d.nome, value: String(d.id) }))
  const depSelecionado = departamentoId
    ? depOptions.find((o) => o.value === String(departamentoId)) || null
    : null

  return (
    <Form
      actions={
        <SpaceBetween direction="horizontal" size="xs">
          <Button variant="link" onClick={onCancel}>Cancelar</Button>
          <Button variant="primary" loading={loading} onClick={handleSubmit}>
            {colaborador ? 'Salvar' : 'Criar'}
          </Button>
        </SpaceBetween>
      }
    >
      <SpaceBetween size="l">
        {erro && <Alert type="error">{erro}</Alert>}

        {/* Dados cadastrais */}
        <SpaceBetween size="m">
          <Header variant="h3">Dados cadastrais</Header>
          <ColumnLayout columns={2}>
            <FormField label="Nome" errorText={erros.nome}>
              <Input value={nome} onChange={({ detail }) => setNome(detail.value)} placeholder="Nome completo" />
            </FormField>
            <FormField label="Matricula" errorText={erros.matricula}>
              <Input value={matricula} onChange={({ detail }) => setMatricula(detail.value)} placeholder="Ex: CLT-001" />
            </FormField>
            <FormField label="Departamento" errorText={erros.departamento}>
              <Select
                selectedOption={depSelecionado}
                options={depOptions}
                placeholder="Selecione"
                onChange={({ detail }) => setDepartamentoId(Number(detail.selectedOption.value))}
              />
            </FormField>
            <FormField label="Cargo" errorText={erros.cargo}>
              <Input value={cargo} onChange={({ detail }) => setCargo(detail.value)} placeholder="Ex: Analista de Infra" />
            </FormField>
            <FormField label="Nivel">
              <Select
                selectedOption={nivel ? { label: nivel, value: nivel } : null}
                options={NIVEIS}
                placeholder="Selecione (opcional)"
                onChange={({ detail }) => setNivel(detail.selectedOption.value || '')}
              />
            </FormField>
            <FormField label="Tipo de Contrato" errorText={erros.tipoContrato}>
              <Select
                selectedOption={{ label: tipoContrato, value: tipoContrato }}
                options={TIPOS_CONTRATO}
                onChange={({ detail }) => setTipoContrato(detail.selectedOption.value as 'CLT' | 'PJ')}
              />
            </FormField>
            <FormField label="Data de Admissao" errorText={erros.dataAdmissao}>
              <Input type="date" value={dataAdmissao} onChange={({ detail }) => setDataAdmissao(detail.value)} />
            </FormField>
          </ColumnLayout>
        </SpaceBetween>

        {/* Remuneracao e beneficios fixos */}
        <SpaceBetween size="m">
          <Header variant="h3">
            Remuneracao e beneficios
            <Box variant="small" color="text-body-secondary" padding={{ left: 's' }}>
              Valores fixos mensais — encargos sao calculados automaticamente
            </Box>
          </Header>
          <ColumnLayout columns={2}>
            <FormField
              label="Salario Base (R$)"
              errorText={erros.salarioBase}
              description={tipoContrato === 'CLT' ? 'FGTS, GPS, ferias e 13o serao calculados sobre este valor' : 'Valor do contrato PJ'}
            >
              <Input type="number" value={salarioBase} onChange={({ detail }) => setSalarioBase(detail.value)} placeholder="Ex: 5000.00" />
            </FormField>
            <FormField label="Bonus AWS (R$)" description="Bonus fixo de certificacao AWS">
              <Input type="number" value={bonusAws} onChange={({ detail }) => setBonusAws(detail.value)} placeholder="0" />
            </FormField>
            <FormField label="Refeicao (R$)" description="Vale refeicao / alimentacao mensal">
              <Input type="number" value={refeicao} onChange={({ detail }) => setRefeicao(detail.value)} placeholder="0" />
            </FormField>
            <FormField label="Transporte (R$)" description="Vale transporte mensal">
              <Input type="number" value={transporte} onChange={({ detail }) => setTransporte(detail.value)} placeholder="0" />
            </FormField>
            <FormField label="Seguro Saude (R$)" description="Plano de saude mensal">
              <Input type="number" value={seguroSaude} onChange={({ detail }) => setSeguroSaude(detail.value)} placeholder="0" />
            </FormField>
            <FormField label="Seguro Vida (R$)" description="Seguro de vida mensal">
              <Input type="number" value={seguroVida} onChange={({ detail }) => setSeguroVida(detail.value)} placeholder="0" />
            </FormField>
          </ColumnLayout>
          {tipoContrato === 'CLT' && salarioBase && Number(salarioBase) > 0 && (
            <Alert type="info">
              Com salario de R$ {Number(salarioBase).toLocaleString('pt-BR', { minimumFractionDigits: 2 })},
              o custo estimado com encargos sera aproximadamente{' '}
              <strong>
                R$ {(Number(salarioBase) * 1.5).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </strong>{' '}
              (salario + FGTS + GPS + provisoes).
            </Alert>
          )}
        </SpaceBetween>
      </SpaceBetween>
    </Form>
  )
}

