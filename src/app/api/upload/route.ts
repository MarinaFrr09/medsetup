import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "Arquivo é obrigatório" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Create uploads directory if it doesn't exist
    const uploadsDir = join(process.cwd(), "public", "uploads");
    await mkdir(uploadsDir, { recursive: true });

    // Generate unique filename
    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const fileName = `${timestamp}-${safeName}`;
    const filePath = join(uploadsDir, fileName);

    await writeFile(filePath, buffer);

    return NextResponse.json({
      fileName: file.name,
      filePath: `/uploads/${fileName}`,
      fileSize: file.size,
      fileType: file.type,
    });
  } catch (error) {
    console.error("Upload Error:", error);
    return NextResponse.json({ error: "Erro ao fazer upload" }, { status: 500 });
  }
}
