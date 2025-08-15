UI Next.js para configuração e processamento de vídeo com IA. Interface completa integrada com API Python para processamento em background usando modelos YOLO customizados.

## Estado atual

Sistema completo funcional com frontend Next.js e backend Python. Processamento de vídeos com download manual controlado pelo usuário.

# Cut Media - IA Video Trimmer

Sistema completo para processamento inteligente de vídeos usando modelos YOLO customizados. Interface moderna em Next.js com API Python para processamento em background.

## 🚀 Início Rápido

### Opção 1: Docker (Recomendado)

```bash
# Clonar repositório
git clone <repository-url>
cd cut-media

# Adicionar modelos YOLO em ./data/models/
# - diurnov5.1.pt
# - diurnoanguladov5.pt
# - noturnov5.pt
# - noturnoanguladov5.pt
# - noturnoiluminadov5.pt

# Iniciar com Docker
docker-compose up -d

# Acessar
# Frontend: http://localhost:3000
# API: http://localhost:8000
# Docs: http://localhost:8000/docs
```

### Opção 2: Desenvolvimento Manual

#### Backend (API Python)

```bash
cd server
pip install -r requirements.txt
python main.py
```

#### Frontend (Next.js)

```bash
npm install
npm run dev
```

## 🏗️ Arquitetura

```
┌─────────────────┐    HTTP/REST    ┌──────────────────┐
│   Next.js       │ ──────────────► │   FastAPI        │
│   Frontend      │                 │   (Python)       │
│                 │                 │                  │
│ • Upload UI     │                 │ • File handling  │
│ • Progress      │                 │ • YOLO processing│
│ • Download      │                 │ • Job management │
└─────────────────┘                 └──────────────────┘
                                              │
                                              ▼
                                    ┌──────────────────┐
                                    │  YOLO Scripts    │
                                    │                  │
                                    │ • Diurno         │
                                    │ • Noturno        │
                                    │ • Angulado       │
                                    │ • Iluminado      │
                                    └──────────────────┘
```

## 🎯 Funcionalidades

### Frontend (Next.js)

- ✅ **Interface moderna** com tema dark/blue
- ✅ **Upload drag & drop** para vídeos
- ✅ **Seleção de modelos YOLO** (5 opções)
- ✅ **Controle de duração** com slider dinâmico
- ✅ **Seleção de classes** com filtros visuais
- ✅ **Progress tracking** em tempo real
- ✅ **Download manual** controlado pelo usuário
- ✅ **Botão de download** após processamento
- ✅ **Estados visuais** responsivos
- ✅ **Corte de vídeo** no navegador antes do upload
- ✅ **Preview de duração** automático
- ✅ **Validação de formulário** completa

### Backend (Python API)

- ✅ **Upload de vídeos** com validação
- ✅ **Processamento background** assíncrono
- ✅ **5 modelos YOLO** especializados
- ✅ **Sistema de jobs** com status
- ✅ **Progress tracking** detalhado
- ✅ **Download direto** de resultados
- ✅ **Calibração opcional** de câmera
- ✅ **Filtros de classes** customizáveis
- ✅ **Prevenção de downloads múltiplos**
- ✅ **Sistema de logs** detalhado
- ✅ **Limpeza automática** de jobs após download

## 🎛️ Modelos YOLO Disponíveis

| Modelo                | Script                             | Uso Recomendado                               |
| --------------------- | ---------------------------------- | --------------------------------------------- |
| **Diurno**            | `filter_classesdiurno.py`          | Vídeos durante o dia, iluminação natural      |
| **Diurno Angulado**   | `filter_classesDiurnoAngulado.py`  | Câmeras inclinadas, ângulos não convencionais |
| **Noturno**           | `filter_classesnight.py`           | Vídeos noturnos, baixa iluminação             |
| **Noturno Angulado**  | `filter_classesNoturnoAngulado.py` | Noturno + ângulos especiais                   |
| **Noturno Iluminado** | `filter_classesnotilu.py`          | Noturno com iluminação artificial             |

## 🎯 Classes de Detecção

| ID  | Classe           | Descrição                    |
| --- | ---------------- | ---------------------------- |
| 0   | Carro            | Veículos de passeio          |
| 1   | Pesados          | Caminhões e veículos pesados |
| 2   | Moto             | Motocicletas e similares     |
| 3   | Van              | Vans e veículos utilitários  |
| 4   | Ônibus           | Ônibus e micro-ônibus        |
| 5   | Roda             | Detecção específica de rodas |
| 6   | Pessoa           | Pedestres                    |
| 7   | Bicicleta        | Bicicletas                   |
| 8   | Carretinha       | Reboques pequenos            |
| 9   | Tandem Duplo     | Eixo duplo                   |
| 10  | Tandem Triplo    | Eixo triplo                  |
| 11  | Tandem Quadruplo | Eixo quádruplo               |
| 12  | Eixo Suspenso    | Eixos suspensos              |

## ⚙️ Configuração

### Variáveis de Ambiente

```bash
# Frontend (.env.local)
NEXT_PUBLIC_API_URL=http://localhost:8000
# Para produção use o IP/domínio do servidor:
# NEXT_PUBLIC_API_URL=http://192.168.1.100:8000

# Backend (opcional)
MODELS_DIR=/data/models
UPLOAD_DIR=./uploads
JOBS_DIR=./jobs

# Configurações de limpeza automática
AUTO_CLEANUP_AFTER_DOWNLOAD=true  # Limpar jobs após download
CLEANUP_DELAY_SECONDS=5           # Delay antes da limpeza
```

### Estrutura de Diretórios

```
cut-media/
├── src/                    # Frontend Next.js
│   ├── app/
│   ├── components/
│   └── lib/
├── server/                 # Backend Python
│   ├── main.py            # API principal
│   ├── scripts/           # Scripts YOLO
│   └── requirements.txt
├── data/
│   └── models/            # Modelos YOLO (.pt)
├── docker-compose.yml     # Orquestração
└── README.md
```

## 🔧 API Endpoints

### Upload e Processamento

```http
POST /api/upload
Content-Type: multipart/form-data

video: File
calibration: "sim" | "nao"
model: "diurno" | "diurnoangulado" | "noturno" | "noturnoangulado" | "noturnoiluminado"
maxframes: number (0 = sem limite)
classes: string (IDs separados por vírgula)
```

### Status do Job

```http
GET /api/process?id={job_id}

Response:
{
  "id": "uuid",
  "status": "uploaded" | "processing" | "completed" | "failed",
  "stage": "Descrição atual",
  "progress": 0-100,
  "error": null | "Mensagem de erro",
  "file_name": "video.mp4",
  "created_at": "ISO timestamp",
  "completed_at": "ISO timestamp | null"
}
```

### Download Manual

```http
GET /api/download?id={job_id}
Content-Type: video/mp4

# O download só funciona quando status = "completed"
# Usuário controla quando baixar através da interface
```

### Fluxo Completo

1. **Upload**: Cliente seleciona vídeo e obtém duração automática
2. **Corte (Opcional)**: Vídeo pode ser cortado no navegador antes do envio
3. **Processamento**: API processa o vídeo (original ou cortado) em background
4. **Polling**: Frontend consulta status periodicamente
5. **Conclusão**: Status muda para "completed"
6. **Download**: Usuário clica no botão para baixar
7. **Limpeza**: Job é automaticamente removido após 5 segundos

## 🚀 Deploy em Produção

### Docker Compose (Recomendado)

```bash
# Build da imagem atualizada
docker build -t haxsc/cut-media:latest .

# Rodar em produção
docker-compose up -d

# Verificar status
docker-compose ps
docker-compose logs -f
```

### Configuração de Rede Local

```bash
# 1. Configure o IP correto no .env.local
NEXT_PUBLIC_API_URL=http://192.168.1.100:8000

# 2. Configure o servidor para escutar em todas as interfaces
# No main.py: uvicorn.run(app, host="0.0.0.0", port=8000)

# 3. Build e deploy
docker build -t haxsc/cut-media:2.1.4 .
docker run -d -p 3000:3000 -p 8000:8000 haxsc/cut-media:2.1.4
```

## 🐛 Troubleshooting

### Frontend não conecta com API

- Verificar `NEXT_PUBLIC_API_URL` em `.env.local`
- Confirmar que API está rodando na porta 8000
- Checar CORS no backend
- **Importante**: Para uso em rede local, usar IP da máquina em vez de localhost

### Modelos YOLO não encontrados

- Verificar se arquivos `.pt` estão em `/data/models/`
- Confirmar permissões de leitura
- Checar logs da API para erros específicos

### Processamento lento

- Usar GPU com CUDA se disponível
- Reduzir `maxframes` para testes
- Monitorar uso de CPU/memória

### Downloads múltiplos/infinitos

- ✅ **Resolvido**: Sistema agora usa download manual
- Frontend para o polling quando processamento termina
- Usuário controla quando baixar o arquivo
- Não há mais downloads automáticos

### Erro "address not available"

- Verificar se IP configurado está correto
- Usar `0.0.0.0` no servidor para escutar em todas as interfaces
- Para rede local, usar IP real da máquina (ex: `192.168.1.100`)

### ⚠️ **Upload de arquivos grandes (>1GB) - Bad Request**

**Problema**: Vídeos de 1h+ de outros discos demoram e retornam Bad Request

**Soluções implementadas**:

- ✅ **Limite aumentado**: De 1GB para 5GB
- ✅ **Timeout extendido**: 10 minutos para uploads
- ✅ **Chunked upload**: Arquivos processados em pedaços de 8MB
- ✅ **Logging detalhado**: Monitor de progresso no console
- ✅ **Validação melhorada**: Melhor detecção de tipos de arquivo
- ✅ **Error handling**: Mensagens de erro mais claras

**Configurações aplicadas**:

```bash
# Backend
MAX_FILE_SIZE=5GB
UPLOAD_TIMEOUT=600s  # 10 minutos
CHUNK_SIZE=8MB

# Frontend
UPLOAD_TIMEOUT=600000ms  # 10 minutos
```

**Monitoramento**: Logs mostram progresso a cada 100MB processados

**Se ainda houver problemas**:

1. Verificar espaço em disco disponível
2. Testar com arquivo menor primeiro
3. Verificar velocidade de leitura do disco origem
4. Considerar cortar vídeo localmente antes do upload

## 📊 Monitoramento

### Logs da API

```bash
# Docker
docker-compose logs -f api

# Manual
python server/main.py
# Logs aparecem no console
```

### Métricas

- Jobs processados: `GET /api/jobs`
- Status da API: `GET /`
- Informações de arquivo: `GET /api/file-info/{job_id}`

### Estados do Sistema

| Estado       | Descrição             | Ação do Usuário                   |
| ------------ | --------------------- | --------------------------------- |
| `uploaded`   | Arquivo carregado     | Aguardar processamento            |
| `processing` | Processando com IA    | Aguardar conclusão                |
| `completed`  | Pronto para download  | Clicar em "Baixar Vídeo"          |
| `failed`     | Erro no processamento | Verificar logs e tentar novamente |

### Limpeza Automática

- ✅ **Jobs são automaticamente removidos** após o download
- ✅ **Delay de 5 segundos** para garantir conclusão do download
- ✅ **Remove arquivos e metadados** completamente
- ✅ **Libera espaço em disco** automaticamente
- ⚙️ **Configurável** via variável `AUTO_CLEANUP_AFTER_DOWNLOAD`

## 🆕 Últimas Atualizações

### v2.2.1 - Otimização do Slider de Duração

- ✅ **Range otimizado**: Máximo reduzido para 10 minutos (mais prático)
- ✅ **Incrementos precisos**: Ajuste de 5 em 5 segundos
- ✅ **Valor mínimo**: Nunca pode ser 0 (mínimo 5 segundos)
- ✅ **Default inteligente**: Inicia com 5 segundos por padrão
- ✅ **Interface melhorada**: Indicadores visuais mais claros

### v2.2.0 - Corte de Vídeo no Frontend

- ✅ **Corte no navegador**: Processa vídeo localmente antes do upload
- ✅ **Duração automática**: Detecta duração do vídeo automaticamente
- ✅ **Interface intuitiva**: Controles de início/fim em segundos
- ✅ **Otimização de upload**: Reduz tempo de envio e processamento
- ✅ **Fallback inteligente**: Usa vídeo original se corte falhar
- ✅ **Formato flexível**: Suporta WebM e MP4 conforme disponibilidade
- ✅ **Suporte .DAV**: Arquivos de câmeras de segurança (limitações no corte)

### 📹 **Formatos de Vídeo Suportados**

**Formatos Padrão (com corte):**

- ✅ **MP4** - Recomendado para melhor compatibilidade
- ✅ **MOV** - Apple QuickTime
- ✅ **AVI** - Audio Video Interleave
- ✅ **MKV** - Matroska Video
- ✅ **WEBM** - Web Video

**Formatos Especiais:**

- ⚠️ **DAV** - Câmeras de segurança Dahua
  - Suportado para processamento YOLO
  - **Limitação**: Corte de vídeo não disponível
  - **Recomendação**: Converter para MP4 se precisar do corte

**Observações:**

- Tamanho máximo: 1 GB
- Corte de vídeo funciona apenas com formatos padrão
- Arquivos .DAV são processados diretamente pela API sem corte prévio

### v2.1.5 - Limpeza Automática

- ✅ **Limpeza automática**: Jobs removidos automaticamente após download
- ✅ **Gestão de espaço**: Libera espaço em disco automaticamente
- ✅ **Configurável**: Pode ser desabilitada se necessário
- ✅ **Aviso visual**: Interface mostra que job será removido
- ✅ **Logs detalhados**: Monitoramento da limpeza automática

### v2.1.4 - Download Manual

- ✅ **Novo fluxo**: Download controlado pelo usuário
- ✅ **Interface melhorada**: Botão de download após processamento
- ✅ **Prevenção de bugs**: Eliminados downloads múltiplos automáticos
- ✅ **UX aprimorada**: Ícones visuais e feedback claro
- ✅ **Logs detalhados**: Melhor debugging e monitoramento

### Melhorias de Estabilidade

- ✅ **Polling inteligente**: Para automaticamente quando processamento termina
- ✅ **Cleanup automático**: Gestão de memória e intervals
- ✅ **Estados controlados**: Melhor sincronização frontend/backend
- ✅ **Configuração de rede**: Suporte para deploy em rede local
- ✅ **Corte de vídeo**: Processamento local para otimização de recursos

## 🤝 Contribuição

1. Fork o projeto
2. Crie branch para feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add AmazingFeature'`)
4. Push para branch (`git push origin feature/AmazingFeature`)
5. Abra Pull Request

## 📄 Licença

Distribuído sob licença MIT. Veja `LICENSE` para mais informações.

## 📞 Suporte

- **Documentação API**: http://localhost:8000/docs
- **Issues**: [GitHub Issues](link-to-issues)
- **Discussões**: [GitHub Discussions](link-to-discussions)
