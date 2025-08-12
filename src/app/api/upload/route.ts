import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { randomUUID } from "crypto";

const UPLOAD_DIR = path.join(process.cwd(), "uploads");
const JOBS_DIR = path.join(process.cwd(), "jobs");

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("video") as File;

    if (!file) {
      return NextResponse.json(
        { error: "Nenhum arquivo enviado" },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.type.startsWith("video/")) {
      return NextResponse.json(
        { error: "Arquivo deve ser um vídeo" },
        { status: 400 }
      );
    }

    // Validate file size (1GB max)
    const maxSize = 1024 * 1024 * 1024; // 1GB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "Arquivo muito grande (max 1GB)" },
        { status: 400 }
      );
    }

    // Create directories if they don't exist
    if (!existsSync(UPLOAD_DIR)) {
      await mkdir(UPLOAD_DIR, { recursive: true });
    }
    if (!existsSync(JOBS_DIR)) {
      await mkdir(JOBS_DIR, { recursive: true });
    }

    // Generate unique job ID
    const jobId = randomUUID();
    const jobDir = path.join(JOBS_DIR, jobId);
    await mkdir(jobDir, { recursive: true });

    // Save uploaded file
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const filePath = path.join(jobDir, "input.mp4");
    await writeFile(filePath, buffer);

    // Create job metadata
    const jobData = {
      id: jobId,
      status: "uploaded",
      fileName: file.name,
      fileSize: file.size,
      uploadedAt: new Date().toISOString(),
      parameters: {
        calibration: formData.get("calibration"),
        model: formData.get("model"),
        maxframes: parseInt(formData.get("maxframes") as string) || 0,
        classes:
          formData.get("classes")?.toString().split(",").map(Number) || [],
      },
      stage: "Arquivo carregado",
      progress: 0,
    };

    const jobFile = path.join(jobDir, "job.json");
    await writeFile(jobFile, JSON.stringify(jobData, null, 2));

    return NextResponse.json({
      jobId,
      message: "Upload realizado com sucesso",
      fileName: file.name,
      fileSize: file.size,
    });
  } catch (error) {
    console.error("Erro no upload:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
