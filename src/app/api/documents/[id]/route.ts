import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser, logAudit } from "@/lib/auth";
import { promises as fs } from "fs";

// DELETE — remove a CV document (both DB row + file on disk)
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const doc = await db.document.findUnique({ where: { id } });
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Delete the file from disk (best-effort — ignore errors if missing)
  try {
    await fs.unlink(doc.storagePath);
  } catch {}

  // Delete the DB record
  await db.document.delete({ where: { id } });

  await logAudit({
    userId: user.id, userName: user.name,
    action: "document.delete", entityType: "Document",
    entityId: doc.id, entityName: doc.fileName,
    details: { resourceId: doc.resourceId, demandId: doc.demandId, version: doc.version },
  });

  return NextResponse.json({ ok: true });
}
