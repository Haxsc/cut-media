# Cut Media API - Servidor Python

API Python para processamento de vídeos com modelos YOLO customizados.

## 🚀 Início Rápido

### Windows

```bash
cd server
./start.bat
```

### Linux/Mac

```bash
cd server
chmod +x start.sh
./start.sh
```

### Manual

```bash
cd server
pip install -r requirements.txt
python main.py
```

## 📋 Pré-requisitos

### Sistema

- Python 3.8 ou superior
- pip (gerenciador de pacotes Python)
- OpenCV compatível
- CUDA (opcional, para GPU)

### Modelos YOLO

Os seguintes modelos devem estar em `/data/models/` (Linux/Mac) ou `C:\data\models\` (Windows):

- `diurnov5.1.pt` - Modelo diurno padrão
- `diurnoanguladov5.pt` - Modelo diurno angulado
- `noturnov5.pt` - Modelo noturno padrão
- `noturnoanguladov5.pt` - Modelo noturno angulado
- `noturnoiluminadov5.pt` - Modelo noturno iluminado

## 🛠️ API Endpoints

### Upload e Processamento

```http
POST /api/upload
Content-Type: multipart/form-data

video: arquivo de vídeo (MP4, MOV, AVI, etc.)
calibration: "sim" ou "nao"
model: "diurno" | "diurnoangulado" | "noturno" | "noturnoangulado" | "noturnoiluminado"
maxframes: número máximo de frames (0 = sem limite)
classes: IDs das classes separadas por vírgula (ex: "0,1,2")
```

### Status do Job

```http
GET /api/process?id={job_id}
```

### Download do Resultado

```http
GET /api/download?id={job_id}
```

### Listar Jobs

```http
GET /api/jobs
```

### Deletar Job

```http
DELETE /api/jobs/{job_id}
```

## 🎯 Classes de Detecção

| ID  | Classe           |
| --- | ---------------- |
| 0   | Carro            |
| 1   | Pesados          |
| 2   | Moto             |
| 3   | Van              |
| 4   | Ônibus           |
| 5   | Roda             |
| 6   | Pessoa           |
| 7   | Bicicleta        |
| 8   | Carretinha       |
| 9   | Tandem Duplo     |
| 10  | Tandem Triplo    |
| 11  | Tandem Quadruplo |
| 12  | Eixo Suspenso    |

## 🔧 Configuração

### Estrutura de Diretórios

```
server/
├── main.py              # API principal
├── requirements.txt     # Dependências Python
├── start.sh            # Script de inicialização (Linux/Mac)
├── start.bat           # Script de inicialização (Windows)
├── scripts/            # Scripts de processamento
│   ├── filter_classesdiurno.py
│   ├── filter_classesDiurnoAngulado.py
│   ├── filter_classesnight.py
│   ├── filter_classesnotilu.py
│   └── filter_classesNoturnoAngulado.py
├── uploads/            # Uploads temporários (criado automaticamente)
└── jobs/              # Jobs de processamento (criado automaticamente)
```

### Variáveis de Ambiente (Opcional)

```bash
MODELS_DIR=/path/to/models  # Diretório dos modelos YOLO
UPLOAD_DIR=/path/to/uploads # Diretório de uploads
JOBS_DIR=/path/to/jobs     # Diretório de jobs
```

## 📊 Fluxo de Processamento

1. **Upload**: Cliente faz upload do vídeo com parâmetros
2. **Queue**: Job é adicionado à fila de processamento
3. **Processing**: Script Python executa detecção YOLO
4. **Progress**: Status e progresso atualizados em tempo real
5. **Complete**: Vídeo processado disponível para download
6. **Download**: Cliente baixa o resultado automaticamente

## 🐛 Troubleshooting

### Erro: "Modelo não encontrado"

- Verifique se os arquivos `.pt` estão no diretório correto
- Confirme as permissões de leitura dos arquivos

### Erro: "OpenCV não encontrado"

```bash
pip install opencv-python
```

### Erro: "CUDA out of memory"

- Reduza o `maxframes` para processar menos frames
- Use CPU ao invés de GPU se necessário

### Performance lenta

- Verifique se CUDA está sendo usado (com GPU NVIDIA)
- Ajuste o número de threads do sistema
- Use SSD para armazenamento temporário

## 📖 Documentação Interativa

Após iniciar o servidor, acesse:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## 🤝 Integração com Frontend

A API é totalmente compatível com o frontend Next.js do Cut Media. Os endpoints seguem o padrão esperado pela interface web.

## 📝 Logs

Logs são exibidos no console onde o servidor foi iniciado. Para logs detalhados, monitore a saída padrão do processo Python.
