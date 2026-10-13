import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser, canWriteResource, logAudit } from "@/lib/auth";
import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";

const STORAGE_DIR = path.join(process.cwd(), "storage", "cvs");

// Commit a single resume-extracted candidate to the DB.
// Accepts multipart form:
//   - file: the original resume file (will be stored as a CV document)
//   - data: JSON string of the structured candidate info from /api/import-resumes
//
// Returns: { resource, document }
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canWriteResource(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    const dataStr = form.get("data") as string | null;
    if (!file || !dataStr) {
      return NextResponse.json({ error: "Both file and data are required" }, { status: 400 });
    }

    let data: any;
    try { data = JSON.parse(dataStr); }
    catch { return NextResponse.json({ error: "Invalid JSON in data field" }, { status: 400 }); }

    // Generate the next sequential ResourceID
    const all = await db.resource.findMany({ select: { resourceId: true } });
    let max = 1000;
    for (const r of all) {
      const m = r.resourceId.match(/RES-(\d+)/);
      if (m) max = Math.max(max, parseInt(m[1], 10));
    }
    let n = max + 1;
    while (all.some(r => r.resourceId === `RES-${n}`)) n++;
    const resourceId = `RES-${n}`;

    // Create the resource
    const resource = await db.resource.create({
      data: {
        resourceId,
        candidateName: data.candidateName || file.name.replace(/\.[^.]+$/, ""),
        email: data.email || null,
        phone: data.phone || null,
        currentLocation: data.location || null,
        preferredLocation: data.location || null,
        totalExperience: data.totalExperience ?? null,
        relevantExperience: data.relevantExperience ?? null,
        primarySkill: data.primarySkill || null,
        secondarySkills: data.secondarySkills || null,
        technology: data.technology || null,
        currentEmployer: data.currentEmployer || null,
        currentDesignation: data.currentDesignation || null,
        noticePeriod: data.noticePeriod || null,
        expectedRate: data.expectedRate ?? null,
        currency: data.currency || "USD",
        employmentType: data.employmentType || "Full-time",
        resourceType: data.resourceType || "External",
        status: "Available",
        certifications: data.certifications || null,
        education: data.education || null,
        domainExperience: data.domainExperience || null,
        remarks: data.remarks || null,
      },
    });

    // Save the file to disk
    const ext = (file.name.split(".").pop() || "").toLowerCase();
    await fs.mkdir(STORAGE_DIR, { recursive: true });
    const storedName = `${Date.now()}-${randomUUID()}.${ext}`;
    const storagePath = path.join(STORAGE_DIR, storedName);
    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(storagePath, buffer);

    // Create the document record linked to the resource
    const doc = await db.document.create({
      data: {
        fileName: file.name,
        fileType: ext,
        fileSize: file.size,
        storagePath,
        version: 1,
        resourceId: resource.id,
        uploadedById: user.id,
      },
    });

    await db.statusHistory.create({
      data: {
        resourceId: resource.id,
        newStatus: "Available",
        changedById: user.id,
        changedByName: user.name,
        comments: "Auto-created from resume upload",
      },
    });

    await logAudit({
      userId: user.id, userName: user.name,
      action: "resume.import", entityType: "Resource",
      entityId: resourceId, entityName: data.candidateName || file.name,
      details: { fileName: file.name, hadEmail: !!data.email, hadPhone: !!data.phone },
    });

    return NextResponse.json({ resource, document: doc });
  } catch (e: any) {
    console.error("Resume commit error:", e);
    return NextResponse.json({ error: "Commit failed: " + e.message }, { status: 500 });
  }
}
