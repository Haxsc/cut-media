from fastapi import FastAPI, File, UploadFile, Form, HTTPException, BackgroundTasks, Request
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
import os
import shutil
import subprocess
import json
import uuid
import sys
from datetime import datetime
from pathlib import Path
import asyncio
from typing import Optional, List

app = FastAPI(
    title="Cut Media API", 
    description="API para processamento de vídeos com YOLO"
)

# Configurações para uploads grandes
app.state.max_file_size = 5 * 1024 * 1024 * 1024  # 5GB limit
app.state.timeout = 300  # 5 minutes timeout

origins = [
    "http://192.168.100.194:3000",
    # "*" -> todas as origens
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Middleware para logging de requests grandes
@app.middleware("http")
async def log_large_uploads(request: Request, call_next):
    start_time = datetime.now()
    
    # Log inicio do request
    if request.url.path == "/api/upload":
        print(f"🔄 Upload iniciado em {start_time}")
        
        # Check content length
        content_length = request.headers.get("content-length")
        if content_length:
            size_mb = int(content_length) / (1024 * 1024)
            print(f"📏 Tamanho do upload: {size_mb:.2f} MB")
            
            # Verificar se excede limite
            if int(content_length) > app.state.max_file_size:
                print(f"❌ Arquivo muito grande: {size_mb:.2f} MB (limite: {app.state.max_file_size / (1024 * 1024 * 1024):.1f} GB)")
                raise HTTPException(status_code=413, detail=f"Arquivo muito grande. Limite: {app.state.max_file_size / (1024 * 1024 * 1024):.1f} GB")
    
    # Processar request
    response = await call_next(request)
    
    # Log fim do request
    if request.url.path == "/api/upload":
        end_time = datetime.now()
        duration = (end_time - start_time).total_seconds()
        print(f"✅ Upload concluído em {duration:.2f} segundos")
    
    return response

# Diretórios
UPLOAD_DIR = Path("uploads")
JOBS_DIR = Path("jobs")
MODELS_DIR = Path("/data/models")
SCRIPTS_DIR = Path("scripts")

# Criar diretórios se não existirem
UPLOAD_DIR.mkdir(exist_ok=True)
JOBS_DIR.mkdir(exist_ok=True)

# Mapeamento de modelos YOLO
YOLO_MODELS = {
    "diurno": {
        "script": "filter_classesdiurno.py",
    },
    "diurnoangulado": {
        "script": "filter_classesDiurnoAngulado.py", 
    },
    "noturno": {
        "script": "filter_classesnight.py",
    },
    "noturnoangulado": {
        "script": "filter_classesNoturnoAngulado.py",
    },
    "noturnoiluminado": {
        "script": "filter_classesnotilu.py",

    }
}

# Storage para jobs em memória (em produção, usar Redis ou banco de dados)
jobs_status = {}

# Configuração para limpeza automática (pode ser desabilitada)
AUTO_CLEANUP_AFTER_DOWNLOAD = True
CLEANUP_DELAY_SECONDS = 5

class JobStatus:
    def __init__(self, job_id: str, file_name: str, parameters: dict):
        self.id = job_id
        self.status = "uploaded"
        self.stage = "Arquivo carregado"
        self.progress = 0
        self.file_name = file_name
        self.parameters = parameters
        self.created_at = datetime.now().isoformat()
        self.started_at = None
        self.completed_at = None
        self.error = None

@app.post("/api/upload")
async def upload_video(
    background_tasks: BackgroundTasks,
    video: UploadFile = File(...),
    calibration: str = Form("nao"),
    model: str = Form("diurno"), 
    maxframes: int = Form(0),
    classes: str = Form("")
):
    """Upload de vídeo e início do processamento"""
    
    print(f"🔄 Processando upload: {video.filename}")
    print(f"📄 Content-Type: {video.content_type}")
    print(f"📊 Tamanho reportado: {video.size if hasattr(video, 'size') else 'desconhecido'}")
    
    # Validações
    # Aceitar arquivos de vídeo ou .dav (formato de câmeras de segurança)
    video_extensions = ['.mp4', '.avi', '.mov', '.mkv', '.webm', '.dav', '.DAV']
    is_video_content = video.content_type and video.content_type.startswith("video/")
    is_dav_file = video.filename and any(video.filename.lower().endswith(ext.lower()) for ext in ['.dav'])
    
    if not (is_video_content or is_dav_file):
        error_msg = f"Arquivo deve ser um vídeo ou arquivo .DAV. Recebido: {video.content_type}"
        print(f"❌ {error_msg}")
        raise HTTPException(status_code=400, detail=error_msg)
    
    if model not in YOLO_MODELS:
        raise HTTPException(status_code=400, detail=f"Modelo '{model}' não suportado")
    
    # Gerar ID único para o job
    job_id = str(uuid.uuid4())
    job_dir = JOBS_DIR / job_id
    job_dir.mkdir(exist_ok=True)
    
    print(f"📁 Criado diretório: {job_dir}")
    
    try:
        # Salvar arquivo de vídeo com progresso
        video_path = job_dir / "input.mp4"
        total_size = 0
        
        print(f"💾 Salvando arquivo: {video_path}")
        
        with open(video_path, "wb") as buffer:
            # Ler arquivo em chunks para arquivos grandes
            chunk_size = 8192 * 1024  # 8MB chunks
            while True:
                chunk = await video.read(chunk_size)
                if not chunk:
                    break
                buffer.write(chunk)
                total_size += len(chunk)
                
                # Log progresso a cada 100MB
                if total_size % (100 * 1024 * 1024) == 0:
                    print(f"📊 Progresso: {total_size / (1024 * 1024):.1f} MB")
        
        print(f"✅ Arquivo salvo: {total_size / (1024 * 1024):.2f} MB")
        
    except Exception as e:
        print(f"❌ Erro ao salvar arquivo: {str(e)}")
        # Limpar diretório em caso de erro
        if job_dir.exists():
            shutil.rmtree(job_dir)
        raise HTTPException(status_code=500, detail=f"Erro ao salvar arquivo: {str(e)}")
    
    # Parsear classes
    classes_list = []
    if classes:
        try:
            classes_list = [int(x.strip()) for x in classes.split(",") if x.strip()]
        except ValueError:
            raise HTTPException(status_code=400, detail="Classes devem ser números separados por vírgula")
    
    # Criar status do job
    parameters = {
        "calibration": calibration,
        "model": model,
        "maxframes": maxframes,
        "classes": classes_list
    }
    
    job_status = JobStatus(job_id, video.filename, parameters)
    jobs_status[job_id] = job_status
    
    # Iniciar processamento em background
    background_tasks.add_task(process_video, job_id)
    
    return {
        "id": job_id,
        "status": "uploaded",
        "message": "Upload realizado com sucesso"
    }

async def process_video(job_id: str):
    """Processa o vídeo em background"""
    job = jobs_status.get(job_id)
    if not job:
        return
    
    try:
        # Atualizar status
        job.status = "processing"
        job.stage = "Iniciando processamento com IA"
        job.progress = 20
        job.started_at = datetime.now().isoformat()
        
        job_dir = JOBS_DIR / job_id
        input_path = job_dir / "input.mp4"
        output_path = job_dir / "output.mp4"
        
        # Construir comando para o script Python
        model_info = YOLO_MODELS[job.parameters["model"]]
        script_path = SCRIPTS_DIR / model_info["script"]
        
        # Verificar se o script existe
        if not script_path.exists():
            raise Exception(f"Script não encontrado: {script_path}")
        
        # Usar o mesmo Python executable que está executando este script
        python_executable = sys.executable
        
        print(f"[Job {job_id}] Working directory: {os.getcwd()}")
        print(f"[Job {job_id}] Script path: {script_path}")
        print(f"[Job {job_id}] Input path: {input_path}")
        print(f"[Job {job_id}] Output path: {output_path}")
        
        cmd = [
            python_executable, str(script_path),
            "--video", str(input_path),
            "--output", str(output_path),
        ]

        if str(job.parameters["maxframes"]) != "0":
            cmd.extend(["--maxframes", str(job.parameters["maxframes"])])
    
        
        # Adicionar calibração se necessário
        if job.parameters["calibration"] == "sim":
            # Por enquanto, vamos assumir que existe um arquivo de calibração padrão
            # Em produção, você pode permitir upload de arquivo de calibração
            calibration_path = "/data/calibration/default.yaml"
            if os.path.exists(calibration_path):
                cmd.extend(["--calibration", calibration_path])
        
        # Adicionar classes se especificadas
        if job.parameters["classes"]:
            classes_str = ",".join(map(str, job.parameters["classes"]))
            cmd.extend(["--classes", classes_str])
        # Atualizar progresso
        job.stage = "Executando detecção YOLO"
        job.progress = 40
        
        print(f"[Job {job_id}] Executando comando: {' '.join(cmd)}")
        
        # Atualizar progresso antes de executar
        job.progress = 50
        job.stage = "Processando vídeo com YOLO"
        
        # Executar o script de forma mais simples
        try:
            print(f"[Job {job_id}] Iniciando execução...")
            
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=None,  # Sem timeout
                cwd=os.getcwd(),
                env=os.environ.copy(),
                check=False  # Não levanta exceção automaticamente
            )
            
            print(f"[Job {job_id}] Processo terminou com código: {result.returncode}")
            print(f"[Job {job_id}] STDOUT: {result.stdout[:1000]}{'...' if len(result.stdout) > 1000 else ''}")
            print(f"[Job {job_id}] STDERR: {result.stderr[:1000]}{'...' if len(result.stderr) > 1000 else ''}")
            
            # Atualizar progresso
            job.progress = 90
            job.stage = "Verificando arquivo de saída"
            
            if result.returncode != 0:
                print(f"[Job {job_id}] Erro no processo. Código de retorno: {result.returncode}")
                raise Exception(f"Erro no script Python: {result.stderr}")
                
        except subprocess.TimeoutExpired as e:
            print(f"[Job {job_id}] Timeout no processo: {str(e)}")
            raise Exception(f"Timeout no processamento: {str(e)}")
        except Exception as e:
            print(f"[Job {job_id}] Erro durante execução: {str(e)}")
            raise e
        
        # Verificar se arquivo de saída foi criado
        print(f"[Job {job_id}] Verificando se arquivo de saída existe: {output_path}")
        if not output_path.exists():
            print(f"[Job {job_id}] Arquivo de saída não encontrado!")
            # Listar arquivos no diretório do job para debug
            job_files = list(job_dir.glob("*"))
            print(f"[Job {job_id}] Arquivos no diretório do job: {job_files}")
            raise Exception("Arquivo de saída não foi gerado")
        
        print(f"[Job {job_id}] Processamento concluído com sucesso!")
        
        # Sucesso!
        job.status = "completed"
        job.stage = "Processamento concluído"
        job.progress = 100
        job.completed_at = datetime.now().isoformat()
        
    except Exception as e:
        # Erro
        print(f"[Job {job_id}] Erro durante processamento: {str(e)}")
        job.status = "failed"
        job.stage = "Erro no processamento"
        job.error = str(e)
        job.progress = 0

@app.get("/api/process")
async def get_job_status(id: str):
    """Obter status de um job"""
    job = jobs_status.get(id)
    if not job:
        raise HTTPException(status_code=404, detail="Job não encontrado")
    
    return {
        "id": job.id,
        "status": job.status,
        "stage": job.stage,
        "progress": job.progress,
        "file_name": job.file_name,
        "parameters": job.parameters,
        "created_at": job.created_at,
        "started_at": job.started_at,
        "completed_at": job.completed_at,
        "error": job.error
    }

@app.get("/api/download")
async def download_video(id: str):
    """Download do vídeo processado"""
    job = jobs_status.get(id)
    if not job:
        raise HTTPException(status_code=404, detail="Job não encontrado")
    
    if job.status != "completed":
        raise HTTPException(status_code=400, detail="Processamento ainda não foi concluído")
    
    output_path = JOBS_DIR / id / "output.mp4"
    
    print(f"[Download] Download solicitado para job {id}")
    print(f"[Download] Caminho do arquivo: {output_path}")
    print(f"[Download] Arquivo existe: {output_path.exists()}")
    
    if output_path.exists():
        file_size = output_path.stat().st_size
        print(f"[Download] Tamanho do arquivo: {file_size} bytes")
    
    if not output_path.exists():
        raise HTTPException(status_code=404, detail="Arquivo de saída não encontrado")
    
    filename = f"{job.file_name.split('.')[0]}_processed.mp4"
    print(f"[Download] Nome do arquivo para download: {filename}")
    
    # Criar resposta do arquivo
    response = FileResponse(
        path=str(output_path),
        media_type="video/mp4",
        filename=filename,
        headers={
            "Content-Disposition": f"attachment; filename={filename}",
            "Access-Control-Expose-Headers": "Content-Disposition"
        }
    )
    
    # Agendar limpeza do job após o download (se habilitado)
    if AUTO_CLEANUP_AFTER_DOWNLOAD:
        import asyncio
        asyncio.create_task(cleanup_job_after_download(id))
        print(f"[Download] Limpeza automática agendada para job {id}")
    
    return response

async def cleanup_job_after_download(job_id: str):
    """Limpa o job após um pequeno delay para garantir que o download foi iniciado"""
    try:
        # Aguardar para garantir que o download foi iniciado
        await asyncio.sleep(CLEANUP_DELAY_SECONDS)
        
        print(f"[Cleanup] Iniciando limpeza do job {job_id}")
        
        # Remover arquivos
        job_dir = JOBS_DIR / job_id
        if job_dir.exists():
            shutil.rmtree(job_dir)
            print(f"[Cleanup] Diretório removido: {job_dir}")
        
        # Remover do status
        if job_id in jobs_status:
            del jobs_status[job_id]
            print(f"[Cleanup] Job {job_id} removido da memória")
        
        print(f"[Cleanup] Job {job_id} limpo com sucesso")
        
    except Exception as e:
        print(f"[Cleanup] Erro ao limpar job {job_id}: {str(e)}")

@app.get("/api/file-info/{job_id}")
async def get_file_info(job_id: str):
    """Obter informações sobre o arquivo processado"""
    job = jobs_status.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job não encontrado")
    
    output_path = JOBS_DIR / job_id / "output.mp4"
    input_path = JOBS_DIR / job_id / "input.mp4"
    
    file_info = {
        "job_id": job_id,
        "status": job.status,
        "input_file": {
            "exists": input_path.exists(),
            "size": input_path.stat().st_size if input_path.exists() else 0
        },
        "output_file": {
            "exists": output_path.exists(),
            "size": output_path.stat().st_size if output_path.exists() else 0,
            "path": str(output_path)
        }
    }
    
    return file_info

@app.get("/api/jobs")
async def list_jobs():
    """Listar todos os jobs"""
    return {
        "jobs": [
            {
                "id": job.id,
                "status": job.status,
                "stage": job.stage,
                "progress": job.progress,
                "file_name": job.file_name,
                "created_at": job.created_at
            }
            for job in jobs_status.values()
        ],
        "total_jobs": len(jobs_status),
        "auto_cleanup_enabled": AUTO_CLEANUP_AFTER_DOWNLOAD
    }

@app.delete("/api/jobs/{job_id}")
async def delete_job(job_id: str):
    """Deletar um job e seus arquivos"""
    if job_id not in jobs_status:
        raise HTTPException(status_code=404, detail="Job não encontrado")
    
    # Remover arquivos
    job_dir = JOBS_DIR / job_id
    if job_dir.exists():
        shutil.rmtree(job_dir)
    
    # Remover do status
    del jobs_status[job_id]
    
    return {"message": "Job deletado com sucesso"}

@app.get("/")
async def root():
    return {
        "message": "Cut Media API",
        "version": "1.0.0",
        "docs": "/docs",
        "status": "healthy"
    }

@app.get("/health")
async def health_check():
    """Health check endpoint para Docker"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "version": "1.0.0",
        "auto_cleanup": AUTO_CLEANUP_AFTER_DOWNLOAD,
        "cleanup_delay": CLEANUP_DELAY_SECONDS
    }

if __name__ == "__main__":
    import uvicorn
    
    print("🚀 Iniciando Cut Media API com configurações para uploads grandes...")
    print("📊 Limite de upload: 5GB")
    print("⏱️ Timeout: 10 minutos")
    print("🌐 Servidor: http://0.0.0.0:8000")
    print("📖 Documentação: http://0.0.0.0:8000/docs")
    
    uvicorn.run(
        app, 
        host="0.0.0.0", 
        port=8000,
        timeout_keep_alive=600,  # 10 minutes
        limit_max_requests=1000,
        access_log=True
    )
