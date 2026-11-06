"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function getAudioRecordings() {
  return prisma.audioRecording.findMany({
    where: { deleted: false },
    include: { subject: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function createAudioRecording(data: {
  name: string;
  duration: number;
  audioPath?: string;
  subjectId?: string;
}) {
  const recording = await prisma.audioRecording.create({ data });
  revalidatePath("/audio");
  return recording;
}

export async function updateAudioRecording(
  id: string,
  data: {
    name?: string;
    transcript?: string;
    summary?: string;
  }
) {
  await prisma.audioRecording.update({ where: { id }, data });
  revalidatePath("/audio");
}

export async function deleteAudioRecording(id: string) {
  await prisma.audioRecording.update({
    where: { id },
    data: { deleted: true, deletedAt: new Date() },
  });
  revalidatePath("/audio");
}
