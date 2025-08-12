#!/bin/bash

# Script para inicializar o servidor Python da Cut Media API

echo "🚀 Iniciando Cut Media API..."

# Verificar se Python está instalado
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 não encontrado. Por favor, instale Python 3.8 ou superior."
    exit 1
fi

# Verificar se pip está instalado
if ! command -v pip3 &> /dev/null; then
    echo "❌ pip3 não encontrado. Por favor, instale pip."
    exit 1
fi

# Criar diretórios necessários
echo "📁 Criando diretórios..."
mkdir -p uploads
mkdir -p jobs
mkdir -p /data/models

# Instalar dependências
echo "📦 Instalando dependências..."
pip3 install -r requirements.txt

# Verificar se os modelos YOLO existem
echo "🤖 Verificando modelos YOLO..."
MODELS_DIR="/data/models"
MODELS=(
    "diurnov5.1.pt"
    "diurnoanguladov5.pt"
    "noturnov5.pt"
    "noturnoanguladov5.pt"
    "noturnoiluminadov5.pt"
)

for model in "${MODELS[@]}"; do
    if [ ! -f "$MODELS_DIR/$model" ]; then
        echo "⚠️  Modelo $model não encontrado em $MODELS_DIR"
        echo "   Por favor, adicione os modelos YOLO antes de iniciar a API."
    else
        echo "✅ Modelo $model encontrado"
    fi
done

# Iniciar servidor
echo "🌟 Iniciando servidor na porta 8000..."
echo "📖 Documentação disponível em: http://localhost:8000/docs"
echo "🌐 API disponível em: http://localhost:8000"
echo ""
echo "Para parar o servidor, pressione Ctrl+C"
echo ""

python3 main.py
