import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

// CREATE note
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { body: noteBody, demandId, resourceId, assignmentId } = body;
  if (!noteBody) return NextResponse.json({ error: "Note body required" }, { status: 400 });

  const note = await db.note.create({
    data: {
      body: noteBody,
      authorId: user.id,
      demandId: demandId || null,
      resourceId: resourceId || null,
      assignmentId: assignmentId || null,
    },
    include: { author: { select: { id: true, name: true, avatarColor: true } } },
  });
  return NextResponse.json({ note });
}

// LIST notes by entity
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const demandId = searchParams.get("demandId");
  const resourceId = searchParams.get("resourceId");
  const assignmentId = searchParams.get("assignmentId");
  const where: Record<string, unknown> = {};
  if (demandId) where.demandId = demandId;
  if (resourceId) where.resourceId = resourceId;
  if (assignmentId) where.assignmentId = assignmentId;
  const notes = await db.note.findMany({
    where,
    include: { author: { select: { id: true, name: true, avatarColor: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ notes });
}
