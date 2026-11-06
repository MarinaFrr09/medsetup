"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function getMaterials() {
  return prisma.material.findMany({
    where: { deleted: false },
    include: { subject: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function deleteMaterial(id: string) {
  await prisma.material.update({
    where: { id },
    data: { deleted: true, deletedAt: new Date() },
  });
  revalidatePath("/materials");
}

export async function restoreMaterial(id: string) {
  await prisma.material.update({
    where: { id },
    data: { deleted: false, deletedAt: null },
  });
  revalidatePath("/materials");
  revalidatePath("/trash");
}

export async function renameMaterial(id: string, name: string) {
  await prisma.material.update({
    where: { id },
    data: { name },
  });
  revalidatePath("/materials");
}

export async function permanentlyDeleteMaterial(id: string) {
  await prisma.material.delete({ where: { id } });
  revalidatePath("/trash");
}
