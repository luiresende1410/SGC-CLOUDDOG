# Deploy CloudDog na AWS EC2

## Pré-requisitos no seu computador
- AWS CLI instalado: https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2.html
- rsync instalado (Git Bash no Windows já tem)
- openssl instalado (Git Bash no Windows já tem)

## Como executar (passo a passo seguro)

### 1. Abra o Git Bash (NÃO o PowerShell)

### 2. Configure as credenciais APENAS no terminal (não cole em nenhum arquivo)
```bash
export AWS_ACCESS_KEY_ID="sua_key_aqui"
export AWS_SECRET_ACCESS_KEY="sua_secret_aqui"
export AWS_SESSION_TOKEN="seu_token_aqui"
```

### 3. Vá para a pasta do projeto
```bash
cd /c/Users/lcres/.kiro
```

### 4. Dê permissão e execute o script
```bash
chmod +x deploy-ec2.sh
./deploy-ec2.sh
```

### 5. Aguarde (~5-10 minutos)
O script vai:
- Criar par de chaves SSH (clouddog-key.pem) — GUARDE ESSE ARQUIVO
- Criar Security Group liberando APENAS seu IP (177.68.94.219)
- Criar instância t3.micro em us-east-1
- Instalar Docker na instância
- Enviar o código e subir os containers
- Mostrar as URLs de acesso

## Arquivos gerados (NUNCA commitar no git)
- `clouddog-key.pem` — chave SSH privada
- `.env.prod` — variáveis de ambiente com senhas geradas aleatoriamente

## Para destruir tudo quando terminar
```bash
./destroy-ec2.sh
```
Ou use os comandos mostrados ao final do deploy.

## Segurança implementada
- Banco de dados NÃO exposto externamente (apenas interno entre containers)
- Portas 22, 3000 e 8000 abertas SOMENTE para 177.68.94.219
- Senhas do banco geradas aleatoriamente (não são as do desenvolvimento)
- JWT secret gerado aleatoriamente
- Credenciais AWS nunca salvas em arquivo
