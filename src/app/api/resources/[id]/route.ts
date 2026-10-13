import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser, logAudit, canWriteResource } from "@/lib/auth";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const resource = await db.resource.findUnique({
    where: { id },
    include: {
      assignments: {
        include: {
          demand: true,
          proposedBy: { select: { id: true, name: true, avatarColor: true } },
        },
        orderBy: { lastUpdated: "desc" },
      },
      notes: {
        include: { author: { select: { id: true, name: true, avatarColor: true } } },
        orderBy: { createdAt: "desc" },
      },
      statusHistory: {
        include: { changedBy: { select: { id: true, name: true, avatarColor: true } } },
        orderBy: { createdAt: "desc" },
        take: 30,
      },
      documents: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!resource) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ resource });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canWriteResource(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;

  const body = await req.json();
  const before = await db.resource.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const data: Record<string, unknown> = {};
  const allowed = ["candidateName", "email", "phone", "currentLocation", "preferredLocation",
    "totalExperience", "relevantExperience", "primarySkill", "secondarySkills", "technology",
    "currentEmployer", "currentDesignation", "noticePeriod", "availabilityDate",
    "expectedRate", "currency", "employmentType", "resourceType", "status",
    "certifications", "education", "domainExperience", "previousClientExp", "remarks", "tags"];
  for (const k of allowed) {
    if (k in body) {
      if (["totalExperience", "relevantExperience", "expectedRate"].includes(k)) {
        data[k] = body[k] ? Number(body[k]) : null;
      } else if (k === "availabilityDate") {
        data[k] = body[k] ? new Date(body[k]) : null;
      } else if (k === "tags") {
        data[k] = Array.isArray(body.tags) ? body.tags.join(", ") : (body.tags || null);
      } else {
        data[k] = body[k];
      }
    }
  }

  if (data.status && data.status !== before.status) {
    await db.statusHistory.create({
      data: {
        resourceId: id,
        previousStatus: before.status,
        newStatus: data.status as string,
        changedById: user.id,
        changedByName: user.name,
        comments: body.statusComment || `Status changed from ${before.status} to ${data.status}`,
      },
    });
  }

  const resource = await db.resource.update({ where: { id }, data });
  await logAudit({ userId: user.id, userName: user.name, action: "resource.update", entityType: "Resource", entityId: resource.resourceId, entityName: resource.candidateName, details: { changes: Object.keys(data) } });
  return NextResponse.json({ resource });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canWriteResource(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;

  const resource = await db.resource.findUnique({ where: { id }, select: { resourceId: true, candidateName: true } });
  if (!resource) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await db.resource.delete({ where: { id } });
  await logAudit({ userId: user.id, userName: user.name, action: "resource.delete", entityType: "Resource", entityId: resource.resourceId, entityName: resource.candidateName });
  return NextResponse.json({ ok: true });
}
