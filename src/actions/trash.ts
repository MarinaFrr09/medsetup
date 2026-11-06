"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

interface TrashItem {
  id: string;
  type: "material" | "question" | "flashcardDeck" | "mindMap" | "audioRecording";
  name: string;
  deletedAt: Date | null;
}

export async function getTrashItems(): Promise<TrashItem[]> {
  const [materials, questions, decks, mindMaps, recordings] = await Promise.all([
    prisma.material.findMany({
      where: { deleted: true },
      select: { id: true, name: true, deletedAt: true },
    }),
    prisma.question.findMany({
      where: { deleted: true },
      select: { id: true, question: true, deletedAt: true },
    }),
    prisma.flashcardDeck.findMany({
      where: { deleted: true },
      select: { id: true, name: true, deletedAt: true },
    }),
    prisma.mindMap.findMany({
      where: { deleted: true },
      select: { id: true, name: true, deletedAt: true },
    }),
    prisma.audioRecording.findMany({
      where: { deleted: true },
      select: { id: true, name: true, deletedAt: true },
    }),
  ]);

  const items: TrashItem[] = [
    ...materials.map((m) => ({ id: m.id, type: "material" as const, name: m.name, deletedAt: m.deletedAt })),
    ...questions.map((q) => ({ id: q.id, type: "question" as const, name: q.question.substring(0, 60), deletedAt: q.deletedAt })),
    ...decks.map((d) => ({ id: d.id, type: "flashcardDeck" as const, name: d.name, deletedAt: d.deletedAt })),
    ...mindMaps.map((m) => ({ id: m.id, type: "mindMap" as const, name: m.name, deletedAt: m.deletedAt })),
    ...recordings.map((r) => ({ id: r.id, type: "audioRecording" as const, name: r.name, deletedAt: r.deletedAt })),
  ];

  return items.sort((a, b) => {
    const dateA = a.deletedAt?.getTime() || 0;
    const dateB = b.deletedAt?.getTime() || 0;
    return dateB - dateA;
  });
}

export async function restoreItem(id: string, type: string) {
  switch (type) {
    case "material": await prisma.material.update({ where: { id }, data: { deleted: false, deletedAt: null } }); break;
    case "question": await prisma.question.update({ where: { id }, data: { deleted: false, deletedAt: null } }); break;
    case "flashcardDeck": await prisma.flashcardDeck.update({ where: { id }, data: { deleted: false, deletedAt: null } }); break;
    case "mindMap": await prisma.mindMap.update({ where: { id }, data: { deleted: false, deletedAt: null } }); break;
    case "audioRecording": await prisma.audioRecording.update({ where: { id }, data: { deleted: false, deletedAt: null } }); break;
  }
  revalidatePath("/trash");
  revalidatePath("/");
}

export async function permanentlyDeleteItem(id: string, type: string) {
  switch (type) {
    case "material": await prisma.material.delete({ where: { id } }); break;
    case "question": await prisma.question.delete({ where: { id } }); break;
    case "flashcardDeck": await prisma.flashcardDeck.delete({ where: { id } }); break;
    case "mindMap": await prisma.mindMap.delete({ where: { id } }); break;
    case "audioRecording": await prisma.audioRecording.delete({ where: { id } }); break;
  }
  revalidatePath("/trash");
}

export async function emptyTrash() {
  await Promise.all([
    prisma.material.deleteMany({ where: { deleted: true } }),
    prisma.question.deleteMany({ where: { deleted: true } }),
    prisma.flashcardDeck.deleteMany({ where: { deleted: true } }),
    prisma.mindMap.deleteMany({ where: { deleted: true } }),
    prisma.audioRecording.deleteMany({ where: { deleted: true } }),
  ]);
  revalidatePath("/trash");
}
