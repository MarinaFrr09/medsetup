"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function getSubjects() {
  return prisma.subject.findMany({
    orderBy: { name: "asc" },
  });
}

export async function createSubject(name: string, color: string = "#3B82F6") {
  const subject = await prisma.subject.create({
    data: { name, color },
  });
  revalidatePath("/");
  return subject;
}

export async function deleteSubject(id: string) {
  await prisma.subject.delete({ where: { id } });
  revalidatePath("/");
}
