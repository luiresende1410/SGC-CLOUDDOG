#!/usr/bin/env bash
# destroy-ec2.sh — Remove TODOS os recursos criados pelo deploy-ec2.sh
set -euo pipefail

REGION="us-east-1"
KEY_NAME="clouddog-key"
SG_NAME="clouddog-sg"
TAG_NAME="clouddog-app"

echo "==> Buscando instância com tag Name=$TAG_NAME..."
INSTANCE_ID=$(aws ec2 describe-instances \
  --filters "Name=tag:Name,Values=$TAG_NAME" "Name=instance-state-name,Values=running,stopped" \
  --region "$REGION" \
  --query 'Reservations[0].Instances[0].InstanceId' \
  --output text)

if [ "$INSTANCE_ID" != "None" ] && [ -n "$INSTANCE_ID" ]; then
  echo "    Terminando instância: $INSTANCE_ID"
  aws ec2 terminate-instances --instance-ids "$INSTANCE_ID" --region "$REGION"
  echo "    Aguardando terminar..."
  aws ec2 wait instance-terminated --instance-ids "$INSTANCE_ID" --region "$REGION"
  echo "    Instância terminada."
else
  echo "    Nenhuma instância encontrada."
fi

echo "==> Removendo Security Group $SG_NAME..."
SG_ID=$(aws ec2 describe-security-groups \
  --filters "Name=group-name,Values=$SG_NAME" \
  --region "$REGION" \
  --query 'SecurityGroups[0].GroupId' \
  --output text 2>/dev/null || echo "None")

if [ "$SG_ID" != "None" ] && [ -n "$SG_ID" ]; then
  aws ec2 delete-security-group --group-id "$SG_ID" --region "$REGION"
  echo "    Security Group removido: $SG_ID"
fi

echo "==> Removendo par de chaves $KEY_NAME..."
aws ec2 delete-key-pair --key-name "$KEY_NAME" --region "$REGION" 2>/dev/null && \
  echo "    Par de chaves removido." || echo "    Par de chaves nao encontrado."

echo ""
echo "Limpeza concluída. Todos os recursos AWS foram removidos."
echo "Lembre de deletar manualmente: clouddog-key.pem e .env.prod"
