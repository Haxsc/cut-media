@echo off
title Cut Media API Server

echo 🚀 Iniciando Cut Media API...

REM Verificar se Python está instalado
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python não encontrado. Por favor, instale Python 3.8 ou superior.
    pause
    exit /b 1
)

REM Verificar se pip está instalado
pip --version >nul 2>&1
if errorlevel 1 (
    echo ❌ pip não encontrado. Por favor, instale pip.
    pause
    exit /b 1
)

REM Criar diretórios necessários
echo 📁 Criando diretórios...
if not exist "uploads" mkdir uploads
if not exist "jobs" mkdir jobs
if not exist "C:\data\models" mkdir "C:\data\models"

REM Instalar dependências
echo 📦 Instalando dependências...
pip install -r requirements.txt

REM Verificar modelos YOLO
echo 🤖 Verificando modelos YOLO...
set MODELS_DIR=C:\data\models
set MODELS=diurnov5.1.pt diurnoanguladov5.pt noturnov5.pt noturnoanguladov5.pt noturnoiluminadov5.pt

for %%m in (%MODELS%) do (
    if exist "%MODELS_DIR%\%%m" (
        echo ✅ Modelo %%m encontrado
    ) else (
        echo ⚠️  Modelo %%m não encontrado em %MODELS_DIR%
        echo    Por favor, adicione os modelos YOLO antes de iniciar a API.
    )
)

REM Iniciar servidor
echo.
echo 🌟 Iniciando servidor na porta 8000...
echo 📖 Documentação disponível em: http://localhost:8000/docs
echo 🌐 API disponível em: http://localhost:8000
echo.
echo Para parar o servidor, pressione Ctrl+C
echo.

python main.py

pause
