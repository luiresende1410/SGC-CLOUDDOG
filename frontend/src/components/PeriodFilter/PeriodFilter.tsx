import React from 'react'
import SpaceBetween from '@cloudscape-design/components/space-between'
import Select from '@cloudscape-design/components/select'
import FormField from '@cloudscape-design/components/form-field'
import { useFilterStore } from '../../store/filterStore'

const MESES = [
  { label: 'Janeiro', value: '1' },
  { label: 'Fevereiro', value: '2' },
  { label: 'Marco', value: '3' },
  { label: 'Abril', value: '4' },
  { label: 'Maio', value: '5' },
  { label: 'Junho', value: '6' },
  { label: 'Julho', value: '7' },
  { label: 'Agosto', value: '8' },
  { label: 'Setembro', value: '9' },
  { label: 'Outubro', value: '10' },
  { label: 'Novembro', value: '11' },
  { label: 'Dezembro', value: '12' },
]

const currentYear = new Date().getFullYear()
const ANOS = Array.from({ length: 5 }, (_, i) => ({
  label: String(currentYear - 2 + i),
  value: String(currentYear - 2 + i),
}))

export default function PeriodFilter() {
  const { mes, ano, setMes, setAno } = useFilterStore()

  return (
    <SpaceBetween direction="horizontal" size="m">
      <FormField label="Mes">
        <Select
          selectedOption={{ label: MESES[mes - 1].label, value: String(mes) }}
          options={MESES}
          onChange={({ detail }) => setMes(Number(detail.selectedOption.value))}
        />
      </FormField>
      <FormField label="Ano">
        <Select
          selectedOption={{ label: String(ano), value: String(ano) }}
          options={ANOS}
          onChange={({ detail }) => setAno(Number(detail.selectedOption.value))}
        />
      </FormField>
    </SpaceBetween>
  )
}
