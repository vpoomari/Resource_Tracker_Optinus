import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser, logAudit, canMovePipeline } from "@/lib/auth";
import { VALID_TRANSITIONS } from "@/lib/constants";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const assignment = await db.demandResourceAssignment.findUnique({
    where: { id },
    include: {
      demand: true,
      resource: true,
      proposedBy: { select: { id: true, name: true } },
      statusHistory: {
        include: { changedBy: { select: { id: true, name: true, avatarColor: true } } },
        orderBy: { createdAt: "desc" },
        take: 50,
      },
      notes: {
        include: { author: { select: { id: true, name: true, avatarColor: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!assignment) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ assignment });
}

// MOVE — change stage (Kanban drag-drop, manual move)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canMovePipeline(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;

  const body = await req.json();
  const { stage: newStage, comment, offeredRate, interviewDate, interviewResult, clientFeedback } = body;

  const assignment = await db.demandResourceAssignment.findUnique({ where: { id }, include: { demand: true, resource: true } });
  if (!assignment) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // If moving to a new stage, validate transition
  if (newStage && newStage !== assignment.currentStage) {
    const allowed = VALID_TRANSITIONS[assignment.currentStage] || [];
    if (allowed.length > 0 && !allowed.includes(newStage)) {
      return NextResponse.json({
        error: `Invalid transition: ${assignment.currentStage} → ${newStage}. Allowed: ${allowed.join(", ")}`,
      }, { status: 400 });
    }
  }

  const data: Record<string, unknown> = { lastUpdated: new Date() };
  if (newStage) data.currentStage = newStage;
  if (offeredRate !== undefined) data.offeredRate = offeredRate ? Number(offeredRate) : null;
  if (interviewDate !== undefined) data.interviewDate = interviewDate ? new Date(interviewDate) : null;
  if (interviewResult !== undefined) data.interviewResult = interviewResult || null;
  if (clientFeedback !== undefined) data.clientFeedback = clientFeedback || null;

  if (newStage === "Interview") data.interviewDate = data.interviewDate || new Date();
  if (newStage === "Selected") data.selectionDate = new Date();
  if (newStage === "Rejected") data.rejectionDate = new Date();
  if (newStage === "Withdrawn") data.withdrawalDate = new Date();

  const updated = await db.demandResourceAssignment.update({ where: { id }, data });

  // Status history
  if (newStage && newStage !== assignment.currentStage) {
    await db.statusHistory.create({
      data: {
        assignmentId: id,
        demandId: assignment.demandId,
        resourceId: assignment.resourceId,
        previousStatus: assignment.currentStage,
        newStatus: newStage,
        changedById: user.id,
        changedByName: user.name,
        comments: comment || `Moved from ${assignment.currentStage} to ${newStage}`,
      },
    });
    // Update resource master status (lightweight sync)
    const statusMap: Record<string, string> = {
      "Profile Submitted": "Proposed",
      "Client Review": "Client Review",
      "Interview": "Interview",
      "Selected": "Selected",
      "Joined": "Joined",
      "On Hold": "On Hold",
      "Rejected": "Rejected",
      "Withdrawn": "Withdrawn",
      "Sourcing": "Proposed",
    };
    const rStatus = statusMap[newStage];
    if (rStatus) await db.resource.update({ where: { id: assignment.resourceId }, data: { status: rStatus } });
  }

  await logAudit({
    userId: user.id, userName: user.name,
    action: "assignment.move", entityType: "Assignment",
    entityId: assignment.assignmentId, entityName: assignment.assignmentId,
    details: { from: assignment.currentStage, to: newStage, demand: assignment.demand.demandId },
  });

  return NextResponse.json({ assignment: updated });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canMovePipeline(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;

  const assignment = await db.demandResourceAssignment.findUnique({ where: { id }, select: { assignmentId: true, demandId: true, resourceId: true } });
  if (!assignment) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await db.demandResourceAssignment.delete({ where: { id } });
  await logAudit({
    userId: user.id, userName: user.name,
    action: "assignment.delete", entityType: "Assignment",
    entityId: assignment.assignmentId, entityName: assignment.assignmentId,
  });
  return NextResponse.json({ ok: true });
}
