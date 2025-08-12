from fastapi import FastAPI, File, UploadFile, Form, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
import os
import shutil
import subprocess
import json
import uuid
from datetime import datetime
from pathlib import Path
import asyncio
from typing import Optional, List

app = FastAPI(title="Cut Media API", description="API para processamento de vídeos com YOLO")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Next.js dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Diretórios
UPLOAD_DIR = Path("uploads")
JOBS_DIR = Path("jobs")
MODELS_DIR = Path("/data/models")
SCRIPTS_DIR = Path("server/scripts")

# Criar diretórios se não existirem
UPLOAD_DIR.mkdir(exist_ok=True)
JOBS_DIR.mkdir(exist_ok=True)

# Mapeamento de modelos YOLO
YOLO_MODELS = {
    "diurno": {
        "script": "filter_classesdiurno.py",
        "model_path": "/data/models/diurnov5.1.pt"
    },
    "diurnoangulado": {
        "script": "filter_classesDiurnoAngulado.py", 
        "model_path": "/data/models/diurnoanguladov5.pt"
    },
    "noturno": {
        "script": "filter_classesnight.py",
        "model_path": "/data/models/noturnov5.pt" 
    },
    "noturnoangulado": {
        "script": "filter_classesNoturnoAngulado.py",
        "model_path": "/data/models/noturnoanguladov5.pt"
    },
    "noturnoiluminado": {
        "script": "filter_classesnotilu.py",
        "model_path": "/data/models/noturnoiluminadov5.pt"
    }
}

# Storage para jobs em memória (em produção, usar Redis ou banco de dados)
jobs_status = {}

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
    
    # Validações
    if not video.content_type.startswith("video/"):
        raise HTTPException(status_code=400, detail="Arquivo deve ser um vídeo")
    
    if model not in YOLO_MODELS:
        raise HTTPException(status_code=400, detail=f"Modelo '{model}' não suportado")
    
    # Gerar ID único para o job
    job_id = str(uuid.uuid4())
    job_dir = JOBS_DIR / job_id
    job_dir.mkdir(exist_ok=True)
    
    # Salvar arquivo de vídeo
    video_path = job_dir / "input.mp4"
    with open(video_path, "wb") as buffer:
        shutil.copyfileobj(video.file, buffer)
    
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
        
        cmd = [
            "python", str(script_path),
            "--video", str(input_path),
            "--output", str(output_path),
            "--fps", "30",
            "--maxframes", str(job.parameters["maxframes"])
        ]
        
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
        
        # Executar o script
        process = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        
        # Simular progresso baseado no tempo estimado
        max_wait = 300  # 5 minutos máximo
        wait_interval = 2  # Check a cada 2 segundos
        elapsed = 0
        
        while process.poll() is None and elapsed < max_wait:
            await asyncio.sleep(wait_interval)
            elapsed += wait_interval
            
            # Atualizar progresso baseado no tempo decorrido
            progress = min(40 + (elapsed / max_wait) * 40, 80)
            job.progress = int(progress)
            
            if elapsed % 10 == 0:  # Atualizar stage a cada 10 segundos
                job.stage = f"Processando vídeo... {elapsed}s"
        
        # Verificar resultado
        if process.poll() is None:
            process.terminate()
            raise Exception("Timeout no processamento do vídeo")
        
        stdout, stderr = process.communicate()
        
        if process.returncode != 0:
            raise Exception(f"Erro no script Python: {stderr}")
        
        # Verificar se arquivo de saída foi criado
        if not output_path.exists():
            raise Exception("Arquivo de saída não foi gerado")
        
        # Sucesso!
        job.status = "completed"
        job.stage = "Processamento concluído"
        job.progress = 100
        job.completed_at = datetime.now().isoformat()
        
    except Exception as e:
        # Erro
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
    if not output_path.exists():
        raise HTTPException(status_code=404, detail="Arquivo de saída não encontrado")
    
    return FileResponse(
        path=str(output_path),
        media_type="video/mp4",
        filename=f"{job.file_name.split('.')[0]}_processed.mp4"
    )

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
        ]
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
        "docs": "/docs"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
