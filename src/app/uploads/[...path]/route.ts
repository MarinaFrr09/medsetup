import { NextRequest, NextResponse } from "next/server";
import { readFile, stat, readdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

export const dynamic = "force-dynamic";

const MIME_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  svg: "image/svg+xml",
  txt: "text/plain; charset=utf-8",
  md: "text/markdown; charset=utf-8",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  webm: "audio/webm",
  m4a: "audio/mp4",
  json: "application/json",
};

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: pathSegments } = await context.params;
    if (!pathSegments || pathSegments.length === 0) {
      return new NextResponse("Arquivo não especificado", { status: 400 });
    }

    // Sanitize path to prevent directory traversal
    const safeSubPath = pathSegments
      .map((seg) => seg.replace(/\.\./g, ""))
      .join("/");

    // Check public/uploads first, then root uploads
    let targetPath = join(process.cwd(), "public", "uploads", safeSubPath);
    if (!existsSync(targetPath)) {
      targetPath = join(process.cwd(), "uploads", safeSubPath);
    }

    // Flexible fallback: match files in public/uploads if timestamp prefix was added
    if (!existsSync(targetPath)) {
      const publicUploads = join(process.cwd(), "public", "uploads");
      if (existsSync(publicUploads)) {
        try {
          const files = await readdir(publicUploads);
          const cleanQuery = safeSubPath.toLowerCase().replace(/[^a-z0-9]/g, "");
          const match = files.find((f) => {
            const cleanF = f.toLowerCase().replace(/[^a-z0-9]/g, "");
            return cleanF.endsWith(cleanQuery) || cleanF.includes(cleanQuery);
          });
          if (match) {
            targetPath = join(publicUploads, match);
          }
        } catch {}
      }
    }

    if (!existsSync(targetPath)) {
      return new NextResponse("Arquivo não encontrado", { status: 404 });
    }

    const fileStats = await stat(targetPath);
    if (!fileStats.isFile()) {
      return new NextResponse("Caminho não é um arquivo", { status: 400 });
    }

    const ext = safeSubPath.split(".").pop()?.toLowerCase() || "";
    const contentType = MIME_TYPES[ext] || "application/octet-stream";
    const fileBuffer = await readFile(targetPath);

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": fileStats.size.toString(),
        "Content-Disposition": `inline; filename="${encodeURIComponent(pathSegments[pathSegments.length - 1])}"`,
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (err: any) {
    console.error("Erro ao servir arquivo de upload:", err);
    return new NextResponse("Erro ao carregar arquivo", { status: 500 });
  }
}
