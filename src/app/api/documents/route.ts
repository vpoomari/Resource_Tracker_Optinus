import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser, logAudit } from "@/lib/auth";
import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";

const STORAGE_DIR = path.join(process.cwd(), "storage", "cvs");

// GET — list documents for an entity (resource / demand / assignment)
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const resourceId = searchParams.get("resourceId");
  const demandId = searchParams.get("demandId");
  const assignmentId = searchParams.get("assignmentId");
  const where: Record<string, unknown> = {};
  if (resourceId) where.resourceId = resourceId;
  if (demandId) where.demandId = demandId;
  if (assignmentId) where.assignmentId = assignmentId;
  const docs = await db.document.findMany({ where, orderBy: { createdAt: "desc" } });
  return NextResponse.json({ documents: docs });
}

// POST — upload CV (multipart form)
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("file") as File | null;
  const resourceId = (form.get("resourceId") as string) || null;
  const demandId = (form.get("demandId") as string) || null;
  const assignmentId = (form.get("assignmentId") as string) || null;

  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  const fileName = file.name;
  const ext = fileName.split(".").pop()?.toLowerCase() || "";
  if (!["pdf", "doc", "docx"].includes(ext)) {
    return NextResponse.json({ error: "Supported formats: PDF, DOC, DOCX" }, { status: 400 });
  }
  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 400 });
  }

  await fs.mkdir(STORAGE_DIR, { recursive: true });
  const storedName = `${Date.now()}-${randomUUID()}.${ext}`;
  const storagePath = path.join(STORAGE_DIR, storedName);
  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(storagePath, buffer);

  // Count existing versions for this resource to increment
  let version = 1;
  if (resourceId) {
    version = 1 + await db.document.count({ where: { resourceId, fileName: { contains: fileName.split(".")[0] } } });
  }

  const doc = await db.document.create({
    data: {
      fileName,
      fileType: ext,
      fileSize: file.size,
      storagePath,
      version,
      resourceId,
      demandId,
      assignmentId,
      uploadedById: user.id,
    },
  });

  await logAudit({ userId: user.id, userName: user.name, action: "document.upload", entityType: "Document", entityId: doc.id, entityName: fileName, details: { resourceId, version } });
  return NextResponse.json({ document: doc });
}

// GET by id (download)
export async function GET_DOWNLOAD(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const doc = await db.document.findUnique({ where: { id } });
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const buffer = await fs.readFile(doc.storagePath);
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="${doc.fileName}"`,
    },
  });
}
