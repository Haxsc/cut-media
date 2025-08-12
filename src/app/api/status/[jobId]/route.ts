import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

const JOBS_DIR = path.join(process.cwd(), "jobs");

export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const { jobId } = params;

    if (!jobId) {
      return NextResponse.json(
        { error: "Job ID é obrigatório" },
        { status: 400 }
      );
    }

    const jobDir = path.join(JOBS_DIR, jobId);
    const jobFile = path.join(jobDir, "job.json");

    if (!existsSync(jobFile)) {
      return NextResponse.json(
        { error: "Job não encontrado" },
        { status: 404 }
      );
    }

    const jobData = JSON.parse(await readFile(jobFile, "utf-8"));

    return NextResponse.json({
      id: jobData.id,
      status: jobData.status,
      stage: jobData.stage,
      progress: jobData.progress,
      completed: jobData.status === "completed",
      error: jobData.error || null,
      fileName: jobData.fileName,
      uploadedAt: jobData.uploadedAt,
      startedAt: jobData.startedAt || null,
      completedAt: jobData.completedAt || null,
      parameters: jobData.parameters,
    });
  } catch (error) {
    console.error("Erro ao buscar status:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
