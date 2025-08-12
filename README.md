UI Next.js para configurar o processamento de vídeo (upload, calibração, modelo YOLO, FPS, limites, classes). No momento está só a interface — sem API/Python.

## Estado atual

Somente UI (sem back-end). Quando quiser, reativamos as rotas de API e o script Python para processar localmente ou em servidor.

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
- ✅ **Download automático** do resultado
- ✅ **Estados visuais** responsivos
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

# Backend (opcional)
MODELS_DIR=/data/models
UPLOAD_DIR=./uploads
JOBS_DIR=./jobs
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
  "error": null | "Mensagem de erro"
}
```

### Download

```http
GET /api/download?id={job_id}
Content-Type: video/mp4
```

## 🚀 Deploy em Produção

### Docker Swarm

```bash
docker stack deploy -c docker-compose.prod.yml cutmedia
```

### Kubernetes

```bash
kubectl apply -f k8s/
```

### Manual

1. Build frontend: `npm run build`
2. Setup API Python com Gunicorn
3. Configure nginx como proxy reverso
4. Setup SSL/TLS

## 🐛 Troubleshooting

### Frontend não conecta com API

- Verificar `NEXT_PUBLIC_API_URL` em `.env.local`
- Confirmar que API está rodando na porta 8000
- Checar CORS no backend

### Modelos YOLO não encontrados

- Verificar se arquivos `.pt` estão em `/data/models/`
- Confirmar permissões de leitura
- Checar logs da API para erros específicos

### Processamento lento

- Usar GPU com CUDA se disponível
- Reduzir `maxframes` para testes
- Monitorar uso de CPU/memória

## 📊 Monitoramento

### Logs da API

```bash
# Docker
docker-compose logs -f api

# Manual
tail -f server/logs/app.log
```

### Métricas

- Jobs processados: `GET /api/jobs`
- Status da API: `GET /`
- Health check: `GET /health`

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
