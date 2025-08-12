import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { jobPaths, ensureDirs, projectRoot } from "./paths";

export type StartJobOptions = {
  jobId: string;
  videoPath: string; // absolute
  calibrationPath?: string; // absolute or undefined
  modelPath?: string; // absolute or undefined
  fps?: number;
  maxframes?: number;
  classes?: string; // e.g., "1,3,4"
};

export type JobStatus = "queued" | "running" | "done" | "error";

export type JobInfo = {
  id: string;
  status: JobStatus;
  output?: string; // absolute path to output
  error?: string;
};

const jobs = new Map<string, JobInfo>();

export function getJob(id: string) {
  return jobs.get(id);
}

export function startJob(opts: StartJobOptions) {
  ensureDirs();
  const { jobId } = opts;
  const { output, log } = jobPaths(jobId);
  const logStream = fs.createWriteStream(log, { flags: "a" });

  const py = path.join(projectRoot, "python", "processor.py");
  const args = [py, "--video", opts.videoPath, "--output", output];
  if (opts.calibrationPath) args.push("--calibration", opts.calibrationPath);
  if (opts.modelPath) args.push("--model", opts.modelPath);
  if (opts.fps && Number(opts.fps) > 0) args.push("--fps", String(opts.fps));
  if (opts.maxframes && Number(opts.maxframes) > 0)
    args.push("--maxframes", String(opts.maxframes));
  if (opts.classes) args.push("--classes", opts.classes);

  const job: JobInfo = { id: jobId, status: "queued" };
  jobs.set(jobId, job);

  // On Windows, prefer to use the configured python. Let PATH resolve "python".
  const child = spawn("python", args, { cwd: projectRoot, env: process.env });
  job.status = "running";

  child.stdout.on("data", (d) => logStream.write(d));
  child.stderr.on("data", (d) => logStream.write(d));
  child.on("error", (err) => {
    job.status = "error";
    job.error = String(err);
    logStream.end();
  });
  child.on("close", (code) => {
    if (code === 0 && fs.existsSync(output)) {
      job.status = "done";
      job.output = output;
    } else {
      job.status = "error";
      if (!job.error) job.error = `Exited with code ${code}`;
    }
    logStream.end();
  });

  return job;
}
