# SGC-CloudDog — Sistema de Gestao de Custos de Colaboradores

Sistema web para gestao e analise de custos mensais de colaboradores.

## Stack
- **Backend**: Python 3.11 + FastAPI + PostgreSQL
- **Frontend**: React 18 + TypeScript + Cloudscape Design System
- **Infra**: Docker + Docker Compose

## Como rodar localmente

`ash
# Copiar variaveis de ambiente
cp backend/.env.example backend/.env

# Subir todos os servicos
docker-compose up --build

# Backend: http://localhost:8000
# Frontend: http://localhost:3000
# API docs: http://localhost:8000/docs
`

## Deploy na AWS EC2

Consulte o arquivo DEPLOY_README.md para instrucoes de deploy em producao.

## Documentacao

Consulte o arquivo PLAYBOOK.md para o guia completo de uso do sistema.

## Credenciais iniciais

- E-mail: admin@clouddog.com
- Senha: admin123
- **Troque a senha no primeiro acesso!**
