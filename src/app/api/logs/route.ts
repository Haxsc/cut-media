import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import { jobPaths } from "@/lib/paths";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const tailParam = Number(searchParams.get("tail") || 4096);
  const tail = isFinite(tailParam) && tailParam > 0 ? tailParam : 4096;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const { log } = jobPaths(id);
  if (!fs.existsSync(log)) return new NextResponse("", { status: 204 });
  const stat = await fs.promises.stat(log);
  const start = Math.max(0, stat.size - tail);
  const fd = await fs.promises.open(log, "r");
  try {
    const buf = Buffer.alloc(stat.size - start);
    await fd.read(buf, 0, buf.length, start);
    return new NextResponse(buf.toString("utf8"), {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } finally {
    await fd.close();
  }
}
