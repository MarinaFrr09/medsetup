import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import OpenAI from "openai";

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
          openaiApiKey: process.env.OPENAI_API_KEY || "",
          trashAutoDelete: 30,
        },
      });
    }

    return NextResponse.json({
      theme: settings.theme,
      language: settings.language,
      openaiApiKey: settings.openaiApiKey,
      trashAutoDelete: settings.trashAutoDelete,
    });
  } catch (error) {
    console.error("GET settings error:", error);
    return NextResponse.json({
      theme: "dark",
      language: "pt-BR",
      openaiApiKey: process.env.OPENAI_API_KEY || "",
      trashAutoDelete: 30,
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    const updated = await prisma.appSettings.upsert({
      where: { id: "default" },
      update: {
        theme: data.theme,
        language: data.language,
        openaiApiKey: data.openaiApiKey,
        trashAutoDelete: Number(data.trashAutoDelete) || 30,
      },
      create: {
        id: "default",
        theme: data.theme || "dark",
        language: data.language || "pt-BR",
        openaiApiKey: data.openaiApiKey || "",
        trashAutoDelete: Number(data.trashAutoDelete) || 30,
      },
    });

    if (data.openaiApiKey) {
      process.env.OPENAI_API_KEY = data.openaiApiKey;
    }

    return NextResponse.json({ success: true, settings: updated });
  } catch (error) {
    console.error("POST settings error:", error);
    const message = error instanceof Error ? error.message : "Erro ao salvar configurações";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
