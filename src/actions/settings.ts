"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function getSettings() {
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

    return settings;
  } catch (error) {
    console.error("Error getting settings:", error);
    return {
      id: "default",
      theme: "dark",
      language: "pt-BR",
      openaiApiKey: process.env.OPENAI_API_KEY || "",
      trashAutoDelete: 30,
    };
  }
}

export async function saveSettings(data: {
  theme?: string;
  language?: string;
  openaiApiKey?: string;
  trashAutoDelete?: number;
}) {
  try {
    const updated = await prisma.appSettings.upsert({
      where: { id: "default" },
      update: {
        theme: data.theme,
        language: data.language,
        openaiApiKey: data.openaiApiKey,
        trashAutoDelete: data.trashAutoDelete,
      },
      create: {
        id: "default",
        theme: data.theme || "dark",
        language: data.language || "pt-BR",
        openaiApiKey: data.openaiApiKey || "",
        trashAutoDelete: data.trashAutoDelete || 30,
      },
    });

    if (data.openaiApiKey) {
      process.env.OPENAI_API_KEY = data.openaiApiKey;
    }

    revalidatePath("/settings");
    revalidatePath("/");
    return { success: true, settings: updated };
  } catch (error) {
    console.error("Error saving settings:", error);
    const message = error instanceof Error ? error.message : "Erro ao salvar";
    return { success: false, error: message };
  }
}
