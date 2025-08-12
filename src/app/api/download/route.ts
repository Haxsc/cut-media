import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { jobPaths } from "@/lib/paths";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const { output } = jobPaths(id);
  if (!fs.existsSync(output))
    return NextResponse.json({ error: "Not ready" }, { status: 404 });
  const stat = await fs.promises.stat(output);
  const stream = fs.createReadStream(output);
  return new NextResponse(stream as any, {
    headers: {
      "Content-Type": "video/mp4",
      "Content-Length": String(stat.size),
      "Content-Disposition": `attachment; filename="${id}.mp4"`,
    },
  });
}
