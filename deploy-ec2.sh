#!/usr/bin/env bash
# =============================================================================
# deploy-ec2.sh — CloudDog: provisiona EC2 t3.micro em us-east-1
# Execute LOCALMENTE com suas credenciais AWS já exportadas no terminal.
# =============================================================================
set -euo pipefail

# ---------- CONFIGURAÇÕES ---------------------------------------------------
MY_IP="177.68.94.219/32"
REGION="us-east-1"
INSTANCE_TYPE="t3.micro"
KEY_NAME="clouddog-key"
SG_NAME="clouddog-sg"
TAG_NAME="clouddog-app"
# Amazon Linux 2023 AMI (us-east-1) — atualizar se necessário
AMI_ID="ami-0c02fb55956c7d316"
# ---------------------------------------------------------------------------

echo "==> [1/7] Verificando credenciais AWS..."
aws sts get-caller-identity --region "$REGION" \
  --query '{Account:Account,User:Arn}' --output table

echo ""
echo "==> [2/7] Criando par de chaves SSH..."
if aws ec2 describe-key-pairs --key-names "$KEY_NAME" --region "$REGION" &>/dev/null; then
  echo "    Par de chaves '$KEY_NAME' ja existe. Pulando."
else
  aws ec2 create-key-pair \
    --key-name "$KEY_NAME" \
    --region "$REGION" \
    --query 'KeyMaterial' \
    --output text > "${KEY_NAME}.pem"
  chmod 400 "${KEY_NAME}.pem"
  echo "    Chave salva em: $(pwd)/${KEY_NAME}.pem"
  echo "    GUARDE ESSE ARQUIVO — sem ele nao ha acesso SSH!"
fi

echo ""
echo "==> [3/7] Criando Security Group (apenas seu IP: $MY_IP)..."
SG_ID=$(aws ec2 describe-security-groups \
  --filters "Name=group-name,Values=$SG_NAME" \
  --region "$REGION" \
  --query 'SecurityGroups[0].GroupId' \
  --output text 2>/dev/null || echo "None")

if [ "$SG_ID" = "None" ] || [ -z "$SG_ID" ]; then
  SG_ID=$(aws ec2 create-security-group \
    --group-name "$SG_NAME" \
    --description "CloudDog App - acesso restrito" \
    --region "$REGION" \
    --query 'GroupId' \
    --output text)
  echo "    Security Group criado: $SG_ID"

  # SSH — apenas seu IP
  aws ec2 authorize-security-group-ingress \
    --group-id "$SG_ID" --region "$REGION" \
    --protocol tcp --port 22 --cidr "$MY_IP"

  # Frontend (3000) — apenas seu IP
  aws ec2 authorize-security-group-ingress \
    --group-id "$SG_ID" --region "$REGION" \
    --protocol tcp --port 3000 --cidr "$MY_IP"

  # Backend API (8000) — apenas seu IP
  aws ec2 authorize-security-group-ingress \
    --group-id "$SG_ID" --region "$REGION" \
    --protocol tcp --port 8000 --cidr "$MY_IP"

  echo "    Regras criadas: SSH, 3000, 8000 — somente $MY_IP"
else
  echo "    Security Group '$SG_NAME' ja existe: $SG_ID"
fi

echo ""
echo "==> [4/7] Gerando .env de producao..."
# Gera JWT secret aleatório de 64 chars
JWT_SECRET=$(openssl rand -hex 32)
EC2_PUBLIC_IP_PLACEHOLDER="__EC2_IP__"  # será substituído após criação

cat > .env.prod << EOF
POSTGRES_DB=clouddog_costs
POSTGRES_USER=clouddog
POSTGRES_PASSWORD=$(openssl rand -hex 16)
JWT_SECRET_KEY=${JWT_SECRET}
CORS_ORIGINS=http://${EC2_PUBLIC_IP_PLACEHOLDER}:3000
EOF

echo "    .env.prod gerado com senhas aleatórias."
echo "    GUARDE ESSE ARQUIVO — contém as credenciais do banco!"

echo ""
echo "==> [5/7] Criando instância EC2 $INSTANCE_TYPE..."
INSTANCE_ID=$(aws ec2 run-instances \
  --image-id "$AMI_ID" \
  --instance-type "$INSTANCE_TYPE" \
  --key-name "$KEY_NAME" \
  --security-group-ids "$SG_ID" \
  --region "$REGION" \
  --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=$TAG_NAME}]" \
  --user-data '#!/bin/bash
    yum update -y
    yum install -y docker git
    systemctl start docker
    systemctl enable docker
    usermod -aG docker ec2-user
    curl -SL https://github.com/docker/compose/releases/download/v2.24.0/docker-compose-linux-x86_64 \
      -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
    echo "SETUP_DONE" > /tmp/setup_done
  ' \
  --query 'Instances[0].InstanceId' \
  --output text)

echo "    Instância criada: $INSTANCE_ID"
echo "    Aguardando ficar running..."

aws ec2 wait instance-running --instance-ids "$INSTANCE_ID" --region "$REGION"

PUBLIC_IP=$(aws ec2 describe-instances \
  --instance-ids "$INSTANCE_ID" \
  --region "$REGION" \
  --query 'Reservations[0].Instances[0].PublicIpAddress' \
  --output text)

echo "    IP Público: $PUBLIC_IP"

# Atualiza CORS_ORIGINS com o IP real
sed -i "s|${EC2_PUBLIC_IP_PLACEHOLDER}|${PUBLIC_IP}|g" .env.prod

echo ""
echo "==> [6/7] Aguardando SSH ficar disponível (~60s)..."
sleep 60
for i in {1..10}; do
  if ssh -o StrictHostKeyChecking=no -o ConnectTimeout=5 \
       -i "${KEY_NAME}.pem" "ec2-user@${PUBLIC_IP}" "echo ok" 2>/dev/null; then
    echo "    SSH disponível!"
    break
  fi
  echo "    Tentativa $i/10 — aguardando..."
  sleep 10
done

echo ""
echo "==> [7/7] Enviando código e subindo sistema..."

# Copia o projeto para a EC2
rsync -az --exclude='.git' --exclude='node_modules' --exclude='__pycache__' \
  -e "ssh -i ${KEY_NAME}.pem -o StrictHostKeyChecking=no" \
  ./ "ec2-user@${PUBLIC_IP}:/home/ec2-user/clouddog/"

# Copia o .env.prod
scp -i "${KEY_NAME}.pem" -o StrictHostKeyChecking=no \
  .env.prod "ec2-user@${PUBLIC_IP}:/home/ec2-user/clouddog/.env.prod"

# Sobe os containers
ssh -i "${KEY_NAME}.pem" -o StrictHostKeyChecking=no "ec2-user@${PUBLIC_IP}" << 'REMOTE'
  cd /home/ec2-user/clouddog
  # Aguarda setup do user-data terminar
  while [ ! -f /tmp/setup_done ]; do sleep 5; done
  # Carrega .env.prod e sobe
  set -a; source .env.prod; set +a
  docker-compose -f docker-compose.prod.yml up -d --build
  echo "Containers subindo..."
  sleep 10
  docker-compose -f docker-compose.prod.yml ps
REMOTE

echo ""
echo "============================================================"
echo "  DEPLOY CONCLUÍDO!"
echo "============================================================"
echo "  Frontend : http://${PUBLIC_IP}:3000"
echo "  Backend  : http://${PUBLIC_IP}:8000"
echo "  API Docs : http://${PUBLIC_IP}:8000/docs"
echo ""
echo "  SSH      : ssh -i ${KEY_NAME}.pem ec2-user@${PUBLIC_IP}"
echo ""
echo "  Login    : admin@clouddog.com / admin123"
echo "  (Troque a senha após o primeiro acesso!)"
echo "============================================================"
echo ""
echo "  Para DESTRUIR tudo quando terminar:"
echo "  aws ec2 terminate-instances --instance-ids $INSTANCE_ID --region $REGION"
echo "  aws ec2 delete-security-group --group-id $SG_ID --region $REGION"
echo "  aws ec2 delete-key-pair --key-name $KEY_NAME --region $REGION"
echo "============================================================"
