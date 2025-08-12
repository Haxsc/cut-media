import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { ensureDirs, jobPaths } from "@/lib/paths";
import { startJob, getJob } from "@/lib/runner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  ensureDirs();
  const form = await req.formData();
  const video = form.get("video") as File | null;
  const calibration = form.get("calibration") as File | null;
  const modelPath = (form.get("modelPath") as string) || "";
  const fps = Number(form.get("fps") || 0);
  const maxframes = Number(form.get("maxframes") || 0);
  const classes = (form.get("classes") as string) || "";

  if (!video)
    return NextResponse.json({ error: "Missing video" }, { status: 400 });

  const jobId = crypto.randomUUID();
  const { input } = jobPaths(jobId);

  // Save uploaded files to disk
  const videoBuf = Buffer.from(await video.arrayBuffer());
  await fs.promises.writeFile(input, videoBuf);

  let calibrationPath: string | undefined;
  if (calibration && typeof calibration !== "string") {
    const { uploadsDir } = await import("@/lib/paths");
    const calPath = path.join(uploadsDir, `${jobId}.yaml`);
    const calBuf = Buffer.from(await calibration.arrayBuffer());
    await fs.promises.writeFile(calPath, calBuf);
    calibrationPath = calPath;
  }

  const absVideo = input;
  const job = startJob({
    jobId,
    videoPath: absVideo,
    calibrationPath,
    modelPath: modelPath || undefined,
    fps: isFinite(fps) ? fps : 0,
    maxframes: isFinite(maxframes) ? maxframes : 0,
    classes,
  });

  return NextResponse.json({ id: job.id, status: job.status });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const job = getJob(id);
  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(job);
}
