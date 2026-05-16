import React from 'react'
import SpaceBetween from '@cloudscape-design/components/space-between'
import Header from '@cloudscape-design/components/header'
import Container from '@cloudscape-design/components/container'
import ExpandableSection from '@cloudscape-design/components/expandable-section'
import Box from '@cloudscape-design/components/box'
import ContentLayout from '@cloudscape-design/components/content-layout'
import Table from '@cloudscape-design/components/table'

export default function Guia() {
  return (
    <ContentLayout header={<Header variant="h1">Guia do Sistema</Header>}>
      <SpaceBetween size="l">

        <Container header={<Header variant="h2">Visao Geral</Header>}>
          <Box>
            O SGC (Sistema de Gestao de Custos) permite gerenciar e analisar os custos mensais
            de colaboradores, incluindo salarios, beneficios, encargos e custos operacionais.
            O sistema calcula automaticamente os encargos com base nos parametros configurados.
          </Box>
        </Container>

        <ExpandableSection headerText="Dashboard" variant="container">
          <SpaceBetween size="s">
            <Box>Tela inicial com visao consolidada dos custos e certificacoes.</Box>
            <Table
              items={[
                { campo: 'Colaboradores com custo', desc: 'Quantidade de colaboradores com lancamento no periodo selecionado' },
                { campo: 'Custo total no periodo', desc: 'Soma de todos os custos do mes/ano selecionado' },
                { campo: 'Departamentos ativos', desc: 'Quantidade de departamentos com colaboradores' },
                { campo: 'Distribuicao de Custos', desc: 'Grafico de pizza mostrando o percentual de custo por departamento' },
              ]}
              columnDefinitions={[
                { id: 'campo', header: 'Elemento', cell: (i) => <Box fontWeight="bold">{i.campo}</Box> },
                { id: 'desc', header: 'Descricao', cell: (i) => i.desc },
              ]}
              variant="embedded"
            />
          </SpaceBetween>
        </ExpandableSection>

        <ExpandableSection headerText="Custos por Colaborador" variant="container">
          <SpaceBetween size="s">
            <Box>Exibe o detalhamento de custos de cada colaborador no periodo selecionado (mes/ano).</Box>
            <Box>Cada linha mostra o colaborador, seu cargo, departamento e o custo total. Ao expandir, mostra todos os componentes de custo (remuneracao, FGTS, GPS, beneficios, etc.).</Box>
          </SpaceBetween>
        </ExpandableSection>

        <ExpandableSection headerText="Certificacoes" variant="container">
          <SpaceBetween size="s">
            <Box>Lista todas as certificacoes cadastradas, agrupadas por colaborador em secoes expandiveis. Inclui graficos de distribuicao por tipo (provedor) e por departamento.</Box>
            <Table
              items={[
                { campo: 'Tipo', desc: 'Provedor da certificacao (AWS, GCP, Azure, Terraform, Datadog, etc.)' },
                { campo: 'Nivel', desc: 'Nivel da certificacao (Foundational, Associate, Professional, Specialty, Expert)' },
                { campo: 'Nome', desc: 'Nome completo da certificacao (ex: AWS Solutions Architect)' },
                { campo: 'Data de obtencao', desc: 'Quando o colaborador obteve a certificacao' },
                { campo: 'Data de expiracao', desc: 'Quando a certificacao expira (se aplicavel)' },
              ]}
              columnDefinitions={[
                { id: 'campo', header: 'Campo', cell: (i) => <Box fontWeight="bold">{i.campo}</Box> },
                { id: 'desc', header: 'Descricao', cell: (i) => i.desc },
              ]}
              variant="embedded"
            />
            <Box variant="small" color="text-body-secondary">
              O botao "Nova Certificacao" permite cadastrar uma certificacao selecionando o colaborador, tipo, nivel e nome.
            </Box>
          </SpaceBetween>
        </ExpandableSection>

        <ExpandableSection headerText="Custos por Departamento" variant="container">
          <Box>Exibe os custos agrupados por departamento no periodo selecionado. Mostra o total do departamento e permite expandir para ver os colaboradores individuais.</Box>
        </ExpandableSection>

        <ExpandableSection headerText="Lancamento de Custo" variant="container">
          <SpaceBetween size="s">
            <Box>Tela para registrar o custo mensal de um colaborador. O sistema calcula automaticamente os encargos com base nos Parametros de Calculo configurados.</Box>
            <Table
              items={[
                { campo: 'Colaborador', desc: 'Selecione o colaborador para o lancamento' },
                { campo: 'Mes/Ano', desc: 'Periodo do lancamento' },
                { campo: 'Salario base (override)', desc: 'Opcional — sobrescreve o salario do cadastro se houve reajuste neste mes' },
                { campo: 'Bonus AWS (override)', desc: 'Opcional — sobrescreve o bonus AWS do cadastro' },
                { campo: 'Bonus PRD', desc: 'Bonus de produtividade variavel do mes' },
                { campo: 'Comissoes', desc: 'Comissoes variaveis do mes' },
                { campo: 'Hora extra', desc: 'Valor de horas extras do mes' },
              ]}
              columnDefinitions={[
                { id: 'campo', header: 'Campo', cell: (i) => <Box fontWeight="bold">{i.campo}</Box> },
                { id: 'desc', header: 'Descricao', cell: (i) => i.desc },
              ]}
              variant="embedded"
            />
            <Box variant="small" color="text-body-secondary">
              Apos o lancamento, o sistema aplica automaticamente todos os parametros configurados (FGTS, GPS, equipamentos, etc.) e gera o registro de custo completo.
            </Box>
          </SpaceBetween>
        </ExpandableSection>

        <ExpandableSection headerText="Importacao" variant="container">
          <Box>Permite importar dados de colaboradores e custos em lote via arquivo. Util para carga inicial ou atualizacoes em massa.</Box>
        </ExpandableSection>

        <Header variant="h2">Configuracoes</Header>

        <ExpandableSection headerText="Colaboradores" variant="container">
          <SpaceBetween size="s">
            <Box>Cadastro completo de colaboradores da empresa.</Box>
            <Table
              items={[
                { campo: 'Nome / Matricula', desc: 'Identificacao do colaborador' },
                { campo: 'Departamento', desc: 'Departamento ao qual pertence' },
                { campo: 'Cargo / Nivel', desc: 'Cargo atual e nivel hierarquico' },
                { campo: 'Tipo de contrato', desc: 'CLT ou PJ — afeta quais encargos sao calculados' },
                { campo: 'Data de admissao', desc: 'Data de entrada na empresa' },
                { campo: 'Salario base', desc: 'Salario mensal usado no calculo de custos' },
                { campo: 'Bonus AWS', desc: 'Bonus fixo mensal de certificacao AWS' },
                { campo: 'Beneficios', desc: 'Refeicao, transporte, seguro saude e seguro vida' },
              ]}
              columnDefinitions={[
                { id: 'campo', header: 'Campo', cell: (i) => <Box fontWeight="bold">{i.campo}</Box> },
                { id: 'desc', header: 'Descricao', cell: (i) => i.desc },
              ]}
              variant="embedded"
            />
            <Box variant="small" color="text-body-secondary">
              Acoes disponiveis: Editar, ver Historico de eventos, ver Certificacoes (Certs) e Inativar.
              O historico registra automaticamente mudancas de cargo, departamento, contrato e salario.
            </Box>
          </SpaceBetween>
        </ExpandableSection>

        <ExpandableSection headerText="Colaboradores Inativos" variant="container">
          <SpaceBetween size="s">
            <Box>Lista todos os colaboradores que foram inativados, com data de saida. Acessivel apenas por administradores.</Box>
            <Box variant="small" color="text-body-secondary">
              Colaboradores inativos nao aparecem mais na tela principal de Colaboradores.
              O historico de custos e eventos e preservado.
            </Box>
          </SpaceBetween>
        </ExpandableSection>

        <ExpandableSection headerText="Departamentos" variant="container">
          <SpaceBetween size="s">
            <Box>Gerencia os departamentos da empresa.</Box>
            <Table
              items={[
                { campo: 'Nome', desc: 'Nome do departamento (ex: Desenvolvimento, Comercial)' },
                { campo: 'Budget Mensal', desc: 'Limite de custo mensal para o departamento (opcional, usado como referencia)' },
              ]}
              columnDefinitions={[
                { id: 'campo', header: 'Campo', cell: (i) => <Box fontWeight="bold">{i.campo}</Box> },
                { id: 'desc', header: 'Descricao', cell: (i) => i.desc },
              ]}
              variant="embedded"
            />
          </SpaceBetween>
        </ExpandableSection>

        <ExpandableSection headerText="Parametros de Calculo" variant="container">
          <SpaceBetween size="s">
            <Box>
              Configura os parametros usados no calculo automatico de custos.
              Ao alterar um parametro, os proximos lancamentos usarao o novo valor.
              Lancamentos ja existentes mantem os valores da epoca (snapshot).
            </Box>
            <Table
              items={[
                { campo: 'Chave', desc: 'Identificador unico do parametro (ex: FGTS, EQUIPAMENTOS_MENSAL)' },
                { campo: 'Tipo do valor', desc: 'Percentual (%) — multiplica pela remuneracao | Valor Fixo (R$) — soma direto ao custo | Numerico — apenas referencia, nao aplicado' },
                { campo: 'Aplica a', desc: 'Todos — CLT e PJ | Apenas CLT | Apenas PJ' },
                { campo: 'Valor', desc: 'O numero em si (em % ou R$ dependendo do tipo)' },
                { campo: 'Descricao', desc: 'Texto livre para documentar o parametro' },
              ]}
              columnDefinitions={[
                { id: 'campo', header: 'Campo', cell: (i) => <Box fontWeight="bold">{i.campo}</Box> },
                { id: 'desc', header: 'Descricao', cell: (i) => i.desc },
              ]}
              variant="embedded"
            />
            <Box variant="small" color="text-body-secondary">
              Exemplo: Se criar PLANO_ODONTO, tipo "Valor Fixo", aplica a "Apenas CLT", valor 50 —
              todo colaborador CLT tera R$ 50,00 adicionado ao custo mensal no proximo lancamento.
            </Box>
          </SpaceBetween>
        </ExpandableSection>

        <ExpandableSection headerText="Tabela Salarial" variant="container">
          <SpaceBetween size="s">
            <Box>Define a referencia salarial por cargo, nivel e ano. Usada como base para comparacoes e planejamento.</Box>
            <Table
              items={[
                { campo: 'Cargo', desc: 'Nome do cargo (ex: Engenheiro de Software)' },
                { campo: 'Nivel', desc: 'Nivel do cargo (ex: Junior, Pleno, Senior)' },
                { campo: 'Ano', desc: 'Ano de vigencia da tabela' },
                { campo: 'Salario', desc: 'Valor de referencia para o cargo/nivel naquele ano' },
              ]}
              columnDefinitions={[
                { id: 'campo', header: 'Campo', cell: (i) => <Box fontWeight="bold">{i.campo}</Box> },
                { id: 'desc', header: 'Descricao', cell: (i) => i.desc },
              ]}
              variant="embedded"
            />
          </SpaceBetween>
        </ExpandableSection>

        <ExpandableSection headerText="Usuarios" variant="container">
          <SpaceBetween size="s">
            <Box>Gerencia os usuarios que acessam o sistema.</Box>
            <Table
              items={[
                { campo: 'Nome', desc: 'Nome completo do usuario' },
                { campo: 'Login', desc: 'Email usado para autenticacao' },
                { campo: 'Perfil', desc: 'Administrador (acesso total) ou Usuario comum (apenas menu principal, sem Configuracoes)' },
                { campo: 'Status', desc: 'Ativo ou Inativo — usuarios inativos nao conseguem fazer login' },
              ]}
              columnDefinitions={[
                { id: 'campo', header: 'Campo', cell: (i) => <Box fontWeight="bold">{i.campo}</Box> },
                { id: 'desc', header: 'Descricao', cell: (i) => i.desc },
              ]}
              variant="embedded"
            />
            <Box variant="small" color="text-body-secondary">
              Acoes: Editar dados, Redefinir senha, Inativar (bloqueia acesso) e Excluir (permanente).
              Apenas administradores podem gerenciar usuarios.
            </Box>
          </SpaceBetween>
        </ExpandableSection>

      </SpaceBetween>
    </ContentLayout>
  )
}
