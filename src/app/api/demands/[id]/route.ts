import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser, logAudit, canWriteDemand } from "@/lib/auth";

// GET demand by id
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const demand = await db.demand.findUnique({
    where: { id },
    include: {
      assignments: {
        include: {
          resource: true,
          proposedBy: { select: { id: true, name: true, role: true, avatarColor: true } },
          statusHistory: { orderBy: { createdAt: "desc" }, take: 1 },
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
        take: 50,
      },
      documents: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!demand) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ demand });
}

// UPDATE
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canWriteDemand(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;

  const body = await req.json();
  const before = await db.demand.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const data: Record<string, unknown> = {};
  const allowed = ["client", "account", "project", "positionTitle", "primarySkill", "secondarySkills",
    "jobDescription", "minExperience", "maxExperience", "location", "workMode",
    "numberOfPositions", "priority", "status", "ownerName", "ownerId",
    "resourceManagerName", "resourceManagerId", "accountManagerName", "accountManagerId",
    "targetClosureDate", "comments", "tags"];
  for (const k of allowed) {
    if (k in body) {
      if (k === "minExperience" || k === "maxExperience" || k === "numberOfPositions") {
        data[k] = body[k] ? Number(body[k]) : null;
      } else if (k === "targetClosureDate") {
        data[k] = body[k] ? new Date(body[k]) : null;
      } else if (k === "tags") {
        data[k] = Array.isArray(body.tags) ? body.tags.join(", ") : (body.tags || null);
      } else {
        data[k] = body[k];
      }
    }
  }

  // If status changed, write a status history record
  if (data.status && data.status !== before.status) {
    await db.statusHistory.create({
      data: {
        demandId: id,
        previousStatus: before.status,
        newStatus: data.status as string,
        changedById: user.id,
        changedByName: user.name,
        comments: body.statusComment || `Status changed from ${before.status} to ${data.status}`,
      },
    });
    if (data.status === "Closed") data.closedAt = new Date();
  }

  const demand = await db.demand.update({ where: { id }, data });
  await logAudit({ userId: user.id, userName: user.name, action: "demand.update", entityType: "Demand", entityId: demand.demandId, entityName: demand.demandId, details: { changes: Object.keys(data) } });
  return NextResponse.json({ demand });
}

// DELETE
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canWriteDemand(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;

  const demand = await db.demand.findUnique({ where: { id }, select: { demandId: true } });
  if (!demand) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await db.demand.delete({ where: { id } });
  await logAudit({ userId: user.id, userName: user.name, action: "demand.delete", entityType: "Demand", entityId: demand.demandId, entityName: demand.demandId });
  return NextResponse.json({ ok: true });
}
