import path from "node:path";
import fs from "node:fs";

export const projectRoot = process.cwd();
export const dataDir = path.join(projectRoot, "data");
export const uploadsDir = path.join(dataDir, "uploads");
export const outputsDir = path.join(dataDir, "outputs");

export function ensureDirs() {
  for (const p of [dataDir, uploadsDir, outputsDir]) {
    if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
  }
}

export function jobPaths(jobId: string) {
  ensureDirs();
  const input = path.join(uploadsDir, `${jobId}.input`);
  const output = path.join(outputsDir, `${jobId}.mp4`);
  const log = path.join(outputsDir, `${jobId}.log`);
  return { input, output, log };
}
