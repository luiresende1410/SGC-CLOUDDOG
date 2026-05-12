export interface Colaborador {
  id: number
  nome: string
  matricula: string
  departamento_id: number
  departamento?: string
  cargo: string
  nivel?: string
  tipo_contrato: 'CLT' | 'PJ'
  data_admissao: string
  data_inativacao?: string
  salario_base?: number
  ativo: boolean
}

export interface Departamento {
  id: number
  nome: string
}

export interface ComponenteCusto {
  tipo: string
  valor: number
}

export interface RegistroCusto {
  id: number
  colaborador_id: number
  mes: number
  ano: number
  total: number
  componentes: ComponenteCusto[]
}

export interface Usuario {
  id: number
  email: string
  nome: string
  ativo: boolean
  is_admin: boolean
}

export interface ParametroCalculo {
  id: number
  chave: string
  valor: number
  descricao?: string
}

export interface TabelaSalarial {
  id: number
  cargo: string
  nivel: string
  ano: number
  salario: number
}


export interface HistoricoColaborador {
  id: number
  colaborador_id: number
  tipo_evento: string
  data_evento: string
  cargo_anterior?: string
  cargo_novo?: string
  nivel_anterior?: string
  nivel_novo?: string
  salario_anterior?: number
  salario_novo?: number
  tipo_contrato_anterior?: string
  tipo_contrato_novo?: string
  departamento_anterior?: string
  departamento_novo?: string
  observacao?: string
  criado_em?: string
}

