"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function getQuestions(filters?: {
  type?: string;
  difficulty?: string;
  subjectId?: string;
  search?: string;
}) {
  const where: Record<string, unknown> = { deleted: false };
  if (filters?.type) where.type = filters.type;
  if (filters?.difficulty) where.difficulty = filters.difficulty;
  if (filters?.subjectId) where.subjectId = filters.subjectId;
  if (filters?.search) {
    where.question = { contains: filters.search };
  }

  return prisma.question.findMany({
    where,
    include: { subject: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function createQuestion(data: {
  question: string;
  type: string;
  difficulty: string;
  options: string;
  answer: string;
  explanation?: string;
  subjectId?: string;
  tags?: string;
  aiGenerated?: boolean;
}) {
  const question = await prisma.question.create({ data });
  revalidatePath("/questions");
  return question;
}

export async function createManyQuestions(
  questions: {
    question: string;
    type: string;
    difficulty: string;
    options: string;
    answer: string;
    explanation?: string;
    subjectId?: string;
    aiGenerated?: boolean;
  }[]
) {
  const result = await prisma.question.createMany({ data: questions });
  revalidatePath("/questions");
  return result;
}

export async function updateQuestion(
  id: string,
  data: {
    question?: string;
    type?: string;
    difficulty?: string;
    options?: string;
    answer?: string;
    explanation?: string;
    subjectId?: string;
    tags?: string;
  }
) {
  await prisma.question.update({ where: { id }, data });
  revalidatePath("/questions");
}

export async function deleteQuestion(id: string) {
  await prisma.question.update({
    where: { id },
    data: { deleted: true, deletedAt: new Date() },
  });
  revalidatePath("/questions");
}

export async function recordAttempt(
  questionId: string,
  answer: string,
  correct: boolean
) {
  await prisma.questionAttempt.create({
    data: { questionId, answer, correct },
  });
  revalidatePath("/questions");
}

export async function getQuestionStats() {
  const total = await prisma.question.count({ where: { deleted: false } });
  const attempts = await prisma.questionAttempt.count();
  const correct = await prisma.questionAttempt.count({
    where: { correct: true },
  });
  return {
    total,
    attempts,
    correct,
    rate: attempts > 0 ? Math.round((correct / attempts) * 100) : 0,
  };
}
