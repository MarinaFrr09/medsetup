import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getVolatileApiKey, setVolatileApiKey } from "@/lib/ai";

export async function GET() {
  try {
    let settings = await prisma.appSettings.findUnique({
      where: { id: "default" },
    });

    if (!settings) {
      settings = await prisma.appSettings.create({
        data: {
          id: "default",
          theme: "dark",
          language: "pt-BR",
          openaiApiKey: "",
          trashAutoDelete: 30,
        },
      });
    } else if (settings.openaiApiKey && settings.openaiApiKey.length > 0) {
      // Garante que nenhuma chave fique gravada no arquivo de banco de dados (prisma/dev.db)
      await prisma.appSettings.update({
        where: { id: "default" },
        data: { openaiApiKey: "" },
      });
    }

    return NextResponse.json({
      theme: settings.theme,
      language: settings.language,
      openaiApiKey: getVolatileApiKey(),
      trashAutoDelete: settings.trashAutoDelete,
    });
  } catch (error) {
    console.error("GET settings error:", error);
    return NextResponse.json({
      theme: "dark",
      language: "pt-BR",
      openaiApiKey: getVolatileApiKey(),
      trashAutoDelete: 30,
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const sessionKey = (data.openaiApiKey || "").trim();

    // Mantém a chave APENAS na memória RAM volátil da sessão atual (nunca grava em arquivos/pastas ou no banco dev.db)
    setVolatileApiKey(sessionKey);

    const updated = await prisma.appSettings.upsert({
      where: { id: "default" },
      update: {
        theme: data.theme,
        language: data.language,
        openaiApiKey: "",
        trashAutoDelete: Number(data.trashAutoDelete) || 30,
      },
      create: {
        id: "default",
        theme: data.theme || "dark",
        language: data.language || "pt-BR",
        openaiApiKey: "",
        trashAutoDelete: Number(data.trashAutoDelete) || 30,
      },
    });

    return NextResponse.json({
      success: true,
      settings: {
        ...updated,
        openaiApiKey: sessionKey,
      },
    });
  } catch (error) {
    console.error("POST settings error:", error);
    const message = error instanceof Error ? error.message : "Erro ao salvar configurações";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
