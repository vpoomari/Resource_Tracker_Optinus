import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser, logAudit, canMovePipeline, canWriteResource } from "@/lib/auth";
import { VALID_TRANSITIONS } from "@/lib/constants";

function nextAssignmentId(existing: { assignmentId: string }[]) {
  let max = 1000;
  for (const a of existing) {
    const m = a.assignmentId.match(/ASN-(\d+)/);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return `ASN-${max + 1}`;
}

// LIST
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const stage = searchParams.get("stage");
  const demandId = searchParams.get("demandId");
  const resourceId = searchParams.get("resourceId");
  const view = searchParams.get("view"); // "kanban"

  const where: Record<string, unknown> = {};
  if (stage && stage !== "all") where.currentStage = stage;
  if (demandId) where.demandId = demandId;
  if (resourceId) where.resourceId = resourceId;
  if (view === "kanban") {
    where.currentStage = { notIn: ["Closed", "Cancelled", "Rejected", "Withdrawn"] };
  }

  const assignments = await db.demandResourceAssignment.findMany({
    where,
    include: {
      demand: { select: { id: true, demandId: true, client: true, positionTitle: true, priority: true, project: true, location: true } },
      resource: { select: { id: true, resourceId: true, candidateName: true, primarySkill: true, secondarySkills: true, totalExperience: true, currentLocation: true, avatarColor: true, currentDesignation: true } },
      proposedBy: { select: { id: true, name: true } },
    },
    orderBy: { lastUpdated: "desc" },
  });
  return NextResponse.json({ assignments });
}

// CREATE — map resource to demand
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canWriteResource(user.role) && !canMovePipeline(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { demandId, resourceId, stage, offeredRate, internalNote, clientFeedback } = body;
  if (!demandId || !resourceId) return NextResponse.json({ error: "demandId and resourceId required" }, { status: 400 });

  // Check for duplicate mapping
  const existing = await db.demandResourceAssignment.findUnique({
    where: { demandId_resourceId: { demandId, resourceId } },
  });
  if (existing) return NextResponse.json({ error: "Resource already mapped to this demand" }, { status: 409 });

  const all = await db.demandResourceAssignment.findMany({ select: { assignmentId: true } });
  const assignmentId = nextAssignmentId(all);
  const initialStage = stage || "Profile Submitted";

  const assignment = await db.demandResourceAssignment.create({
    data: {
      assignmentId,
      demandId,
      resourceId,
      currentStage: initialStage,
      offeredRate: offeredRate ? Number(offeredRate) : null,
      currency: "USD",
      proposedById: user.id,
      internalNote: internalNote || null,
      clientFeedback: clientFeedback || null,
    },
  });

  await db.statusHistory.create({
    data: {
      demandId, resourceId, assignmentId: assignment.id,
      previousStatus: null,
      newStatus: initialStage,
      changedById: user.id,
      changedByName: user.name,
      comments: `Mapped to demand`,
    },
  });

  // Update resource master status to Proposed
  await db.resource.update({ where: { id: resourceId }, data: { status: "Proposed" } });

  await logAudit({
    userId: user.id, userName: user.name,
    action: "assignment.create", entityType: "Assignment",
    entityId: assignmentId, entityName: assignmentId,
    details: { demandId, resourceId, stage: initialStage },
  });

  return NextResponse.json({ assignment });
}
