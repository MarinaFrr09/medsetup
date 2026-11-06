"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function getFlashcardDecks() {
  return prisma.flashcardDeck.findMany({
    where: { deleted: false },
    include: {
      subject: true,
      flashcards: true,
      _count: { select: { flashcards: true } },
    },
    orderBy: { updatedAt: "desc" },
  });
}

export async function createDeck(data: {
  name: string;
  description?: string;
  subjectId?: string;
}) {
  const deck = await prisma.flashcardDeck.create({ data });
  revalidatePath("/flashcards");
  return deck;
}

export async function deleteDeck(id: string) {
  await prisma.flashcardDeck.update({
    where: { id },
    data: { deleted: true, deletedAt: new Date() },
  });
  revalidatePath("/flashcards");
}

export async function createFlashcard(data: {
  front: string;
  back: string;
  deckId: string;
  aiGenerated?: boolean;
}) {
  const card = await prisma.flashcard.create({ data });
  revalidatePath("/flashcards");
  return card;
}

export async function createManyFlashcards(
  cards: { front: string; back: string; deckId: string; aiGenerated?: boolean }[]
) {
  const result = await prisma.flashcard.createMany({ data: cards });
  revalidatePath("/flashcards");
  return result;
}

export async function updateFlashcardDifficulty(
  id: string,
  difficulty: number
) {
  const intervals = [0, 1, 3, 7]; // days based on difficulty
  const nextReview = new Date();
  nextReview.setDate(nextReview.getDate() + (intervals[difficulty] || 1));

  await prisma.flashcard.update({
    where: { id },
    data: {
      difficulty,
      nextReview,
      reviewCount: { increment: 1 },
    },
  });
  revalidatePath("/flashcards");
}

export async function deleteFlashcard(id: string) {
  await prisma.flashcard.delete({ where: { id } });
  revalidatePath("/flashcards");
}
