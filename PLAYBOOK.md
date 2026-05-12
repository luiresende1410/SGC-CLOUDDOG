# CloudDog — Playbook do Sistema de Gestao de Custos

> Guia completo de uso do sistema para administradores e usuarios.

---

## Sumario

1. Acesso ao sistema
2. Perfis de usuario
3. Dashboard
4. Custos por Colaborador
5. Custos por Departamento
6. Lancamento de Custo Mensal
7. Importacao de Planilha
8. Configuracoes — Colaboradores
9. Configuracoes — Departamentos
10. Configuracoes — Parametros de Calculo
11. Configuracoes — Tabela Salarial
12. Configuracoes — Usuarios
13. Fluxo completo: novo colaborador
14. Fluxo completo: lancamento mensal
15. Fluxo completo: reajuste salarial

---

## 1. Acesso ao sistema

**URL:** http://localhost:3000 (local) ou o IP da EC2 em producao.

### Login

1. Acesse a URL do sistema
2. Informe seu **e-mail** e **senha**
3. Clique em **Entrar**

> Credenciais padrao do administrador inicial:
> - E-mail: admin@clouddog.com
> - Senha: admin123
> Troque a senha no primeiro acesso em Configuracoes > Usuarios.

### Logout

Clique no seu nome no canto superior direito > Sair.

---

## 2. Perfis de usuario

O sistema possui dois perfis:

| Perfil | Acesso |
|---|---|
| Administrador | Menu completo + secao Configuracoes |
| Usuario comum | Dashboard, Custos, Importacao, Lancamento de Custo |

Usuarios comuns nao visualizam a secao Configuracoes no menu e sao redirecionados ao Dashboard se tentarem acessar essas rotas diretamente.

---

## 3. Dashboard

**Caminho:** Menu > Dashboard

Exibe um resumo do periodo selecionado (mes/ano).

### Como usar

1. Selecione o **Mes** e o **Ano** nos seletores no topo
2. Os cards atualizam automaticamente mostrando:
   - Colaboradores com custo — quantos colaboradores tem registro no periodo
   - Custo total no periodo — soma de todos os custos em R$
   - Departamentos ativos — quantos departamentos tem custo no periodo
   - Custo medio por colaborador — media do periodo
3. O ranking de departamentos mostra os 5 maiores custos com barra de participacao percentual

---

## 4. Custos por Colaborador

**Caminho:** Menu > Custos por Colaborador

Lista todos os colaboradores com custo no periodo, ordenados do maior para o menor custo.

### Como usar

1. Selecione o **Mes** e o **Ano**
2. A tabela exibe: Nome, Cargo, Departamento, Tipo de Contrato e Custo Total
3. Clique em **Ver detalhes** para expandir os componentes de custo
4. Clique em **Exportar CSV** para baixar os dados do periodo

### Badges nos componentes

- `calculado` — valor gerado automaticamente pelos parametros
- `cadastro` — valor fixo do cadastro do colaborador

---

## 5. Custos por Departamento

**Caminho:** Menu > Custos por Departamento

Visao consolidada por departamento.

### Como usar

1. Selecione o **Mes** e o **Ano**
2. A tabela exibe: Departamento, N de Colaboradores, Custo Total, Custo Medio e % do total
3. A barra de participacao mostra visualmente o peso de cada departamento
4. Clique em **Exportar CSV** para baixar os dados

---

## 6. Lancamento de Custo Mensal

**Caminho:** Menu > Lancamento de Custo

Permite registrar o custo de um colaborador para um mes especifico. Os encargos sao calculados automaticamente.

### Como usar

**Passo 1 — Selecione o colaborador e periodo**
1. Escolha o colaborador no seletor (com busca por nome)
2. Selecione o mes e o ano
3. O sistema exibe o salario base e beneficios cadastrados do colaborador

**Passo 2 — Informe os valores variaveis do mes**

| Campo | Quando preencher |
|---|---|
| Bonus PRD | Quando houver bonus de producao neste mes |
| Comissoes | Quando houver comissoes neste mes |
| Hora Extra | Quando houver horas extras neste mes |
| Novo salario base | APENAS se houve reajuste neste mes especifico |
| Novo bonus AWS | APENAS se houve mudanca neste mes especifico |

Deixe os campos de reajuste em branco para usar os valores do cadastro.

**Passo 3 — Calcule e confirme**
1. Clique em **Calcular preview** para ver todos os valores antes de salvar
2. Revise os componentes calculados automaticamente
3. Clique em **Lancar custo** para salvar

Se ja existir um registro para o mesmo colaborador/mes/ano, ele sera substituido (upsert).

### O que e calculado automaticamente

Para colaboradores CLT:
- FGTS = Remuneracao x 8%
- GPS/INSS = Remuneracao x 27,8%
- Provisao Ferias = Remuneracao / 12
- 13 Salario = Remuneracao / 12
- Multa FGTS = Remuneracao x 3,2%

Para todos os colaboradores:
- Equipamentos = R$ 343,27 (fixo — rateio mensal)
- Escritorio = R$ 1.762,59 (fixo — rateio mensal)

Os percentuais e valores fixos sao configurados em Configuracoes > Parametros de Calculo.

---

## 7. Importacao de Planilha

**Caminho:** Menu > Importacao

Permite importar dados historicos de custos via arquivo CSV.

### Como usar

1. Selecione o **Mes** e o **Ano** de referencia
2. Clique em **Selecionar arquivo** e escolha o CSV
3. Clique em **Importar**
4. O sistema exibe o resultado: registros importados e eventuais erros por linha

A importacao e tolerante a falhas — linhas com erro sao puladas e o restante e importado.

---

## 8. Configuracoes — Colaboradores

**Caminho:** Configuracoes > Colaboradores (apenas Administradores)

### Cadastrar novo colaborador

1. Clique em **+ Novo Colaborador**
2. Preencha os dados cadastrais:
   - Nome, Matricula, Departamento, Cargo, Nivel (L1-L15), Tipo de Contrato (CLT/PJ), Data de Admissao
3. Preencha a remuneracao e beneficios fixos:
   - Salario Base (obrigatorio — base para calculo de encargos)
   - Bonus AWS, Refeicao, Transporte, Seguro Saude, Seguro Vida
4. Clique em **Criar**

### Editar colaborador

1. Clique em **Editar** na linha do colaborador
2. Altere os campos desejados
3. Clique em **Salvar**

Alteracoes de cargo, nivel, departamento ou tipo de contrato sao registradas automaticamente no historico.

### Ver historico

1. Clique em **Historico** na linha do colaborador
2. O painel exibe todos os eventos: admissao, promocoes, mudancas de cargo/departamento, inativacoes

### Inativar colaborador

1. Clique em **Inativar** na linha do colaborador
2. Informe a **data de saida** (padrao: hoje)
3. Informe uma **observacao** opcional
4. Clique em **Confirmar Inativacao**

O historico de custos e preservado apos a inativacao.

---

## 9. Configuracoes — Departamentos

**Caminho:** Configuracoes > Departamentos (apenas Administradores)

### Criar departamento

1. Clique em **Novo Departamento**
2. Informe o nome
3. Clique em **Salvar**

### Editar / Excluir

- Clique em **Editar** para renomear
- Clique em **Excluir** para remover (apenas se nao houver colaboradores vinculados)

---

## 10. Configuracoes — Parametros de Calculo

**Caminho:** Configuracoes > Parametros de Calculo (apenas Administradores)

### Parametros disponiveis

| Parametro | Tipo | Valor padrao | Descricao |
|---|---|---|---|
| FGTS | % | 8% | Aliquota FGTS sobre remuneracao (CLT) |
| GPS | % | 27,8% | Aliquota GPS/INSS patronal (CLT) |
| MULTA_FGTS | % | 3,2% | Multa rescisoria FGTS (CLT) |
| EQUIPAMENTOS_MENSAL | R$ | R$ 343,27 | Rateio mensal de equipamentos por colaborador |
| ESCRITORIO_MENSAL | R$ | R$ 1.762,59 | Rateio mensal de escritorio por colaborador |
| COLABORADORES_RATEIO | Qtd | 35 | Numero de colaboradores para rateio dos custos fixos |
| MESES_COMISSAO | Qtd | 4 | Meses de comissao para provisao |

### Editar um parametro

1. Clique em **Editar** na linha do parametro
2. Informe o novo valor
   - Para percentuais: informe em % (ex: 8 para 8%)
   - Para valores monetarios: informe em R$ (ex: 343.27)
3. Clique em **Salvar**

ATENCAO: Alteracoes nos parametros afetam apenas lancamentos futuros. Registros ja salvos nao sao recalculados.

---

## 11. Configuracoes — Tabela Salarial

**Caminho:** Configuracoes > Tabela Salarial (apenas Administradores)

Referencia de salarios por cargo, nivel e ano.

### Filtrar

Use os filtros de **Cargo** e **Ano** para encontrar entradas especificas.

### Adicionar entrada

1. Clique em **Nova Entrada**
2. Informe: Cargo, Nivel, Ano e Salario
3. Clique em **Salvar**

### Editar / Excluir

- Clique em **Editar** para atualizar o salario de uma entrada
- Clique em **Excluir** para remover

---

## 12. Configuracoes — Usuarios

**Caminho:** Configuracoes > Usuarios (apenas Administradores)

### Criar usuario

1. Clique em **+ Novo Usuario**
2. Preencha: Nome, E-mail, Senha (minimo 6 caracteres)
3. Defina o **Perfil de acesso** com o toggle:
   - Desligado = Usuario comum (acesso apenas ao menu principal)
   - Ligado = Administrador (acesso total incluindo Configuracoes)
4. Clique em **Criar**

### Editar usuario

1. Clique em **Editar** na linha do usuario
2. Altere Nome, E-mail e/ou Perfil de acesso
3. Clique em **Salvar**

O toggle de perfil nao aparece quando o admin esta editando a propria conta.

### Redefinir senha

1. Clique em **Senha** na linha do usuario
2. Informe a nova senha e confirme
3. Clique em **Redefinir**

### Inativar usuario

Bloqueia o acesso sem excluir o cadastro.

1. Clique em **Inativar** na linha do usuario
2. Confirme a acao

### Excluir usuario

Remove permanentemente o usuario do sistema.

1. Clique em **Excluir** na linha do usuario
2. Confirme a acao irreversivel

Nao e possivel excluir ou inativar a propria conta.

---

## 13. Fluxo completo: novo colaborador

```
1. Configuracoes > Departamentos
   Verificar se o departamento existe, criar se necessario

2. Configuracoes > Colaboradores > + Novo Colaborador
   Dados cadastrais: nome, matricula, departamento, cargo, nivel, contrato, admissao
   Remuneracao: salario base, bonus AWS, refeicao, transporte, seguro saude, seguro vida

3. Menu > Lancamento de Custo
   Selecionar o colaborador e o mes/ano
   Informar variaveis do mes (bonus PRD, comissoes, hora extra) se houver
   Clicar em "Calcular preview" para revisar
   Clicar em "Lancar custo" para confirmar

4. Menu > Dashboard ou Custos por Colaborador
   Verificar se o custo aparece corretamente
```

---

## 14. Fluxo completo: lancamento mensal

Para a maioria dos colaboradores, o lancamento mensal e simples:

```
1. Menu > Lancamento de Custo
2. Selecionar colaborador + mes/ano
3. Informar apenas o que variou neste mes:
   - Bonus PRD (se houver)
   - Comissoes (se houver)
   - Hora extra (se houver)
4. Clicar em "Calcular preview" > revisar
5. Clicar em "Lancar custo"
```

Para colaboradores sem variaveis no mes, basta selecionar e lancar diretamente.

---

## 15. Fluxo completo: reajuste salarial

Quando um colaborador recebe aumento de salario:

```
Opcao 1 — Atualizar o cadastro (recomendado para reajustes permanentes):
1. Configuracoes > Colaboradores > Editar o colaborador
   Atualizar o "Salario Base" para o novo valor
   O sistema registra automaticamente o evento no historico

2. Menu > Lancamento de Custo
   Selecionar o colaborador e o mes do reajuste
   O novo salario ja aparece pre-preenchido
   Lancar normalmente

Opcao 2 — Override no lancamento (para reajustes pontuais ou retroativos):
1. Menu > Lancamento de Custo
   Selecionar o colaborador e o mes
   Preencher o campo "Novo salario base" com o valor do reajuste
   Lancar — o cadastro sera atualizado automaticamente
```

---

## Dicas gerais

- O filtro de periodo (mes/ano) e compartilhado entre Dashboard, Custos por Colaborador e Custos por Departamento
- Exportacao CSV disponivel nas telas de Custos por Colaborador e Custos por Departamento
- O historico de colaboradores registra automaticamente admissoes, promocoes, mudancas e inativacoes
- Cada registro de custo guarda o cargo e nivel do colaborador no momento do lancamento (snapshot)
- Colaboradores PJ nao tem FGTS, GPS, ferias, 13 e multa FGTS calculados

---

Documento gerado em maio de 2026 — CloudDog Sistema de Gestao de Custos v1.0
