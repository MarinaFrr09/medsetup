"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function getMindMaps() {
  return prisma.mindMap.findMany({
    where: { deleted: false },
    include: { subject: true },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getMindMap(id: string) {
  return prisma.mindMap.findUnique({
    where: { id },
    include: { subject: true },
  });
}

export async function createMindMap(data: {
  name: string;
  description?: string;
  subjectId?: string;
  nodes?: string;
  edges?: string;
  layout?: string;
}) {
  const map = await prisma.mindMap.create({ data });
  revalidatePath("/mindmaps");
  return map;
}

export async function updateMindMap(
  id: string,
  data: {
    name?: string;
    description?: string;
    nodes?: string;
    edges?: string;
    layout?: string;
    subjectId?: string;
  }
) {
  await prisma.mindMap.update({ where: { id }, data });
  revalidatePath("/mindmaps");
}

export async function deleteMindMap(id: string) {
  await prisma.mindMap.update({
    where: { id },
    data: { deleted: true, deletedAt: new Date() },
  });
  revalidatePath("/mindmaps");
}
