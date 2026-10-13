import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

// Export data as JSON (client converts to CSV)
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") || "demands";

  if (type === "demands") {
    const demands = await db.demand.findMany({
      include: { _count: { select: { assignments: true } } },
      orderBy: { createdAt: "desc" },
    });
    const rows = demands.map(d => ({
      DemandID: d.demandId, Client: d.client, Account: d.account || "",
      Project: d.project || "", Position: d.positionTitle,
      PrimarySkill: d.primarySkill, SecondarySkills: d.secondarySkills || "",
      MinExp: d.minExperience ?? "", MaxExp: d.maxExperience ?? "",
      Location: d.location || "", WorkMode: d.workMode,
      Positions: d.numberOfPositions, Priority: d.priority, Status: d.status,
      Owner: d.ownerName || "", ResourceManager: d.resourceManagerName || "",
      AccountManager: d.accountManagerName || "",
      CreatedAt: d.createdAt.toISOString().split("T")[0],
      TargetClosure: d.targetClosureDate ? d.targetClosureDate.toISOString().split("T")[0] : "",
      Candidates: d._count.assignments,
    }));
    return NextResponse.json({ rows, filename: `demands-${Date.now()}.csv` });
  }

  if (type === "resources") {
    const resources = await db.resource.findMany({
      include: { _count: { select: { assignments: true } } },
      orderBy: { createdAt: "desc" },
    });
    const rows = resources.map(r => ({
      ResourceID: r.resourceId, Name: r.candidateName, Email: r.email || "",
      Phone: r.phone || "", Location: r.currentLocation || "",
      PrimarySkill: r.primarySkill || "", Technology: r.technology || "",
      TotalExperience: r.totalExperience ?? "", RelevantExperience: r.relevantExperience ?? "",
      CurrentEmployer: r.currentEmployer || "", Designation: r.currentDesignation || "",
      NoticePeriod: r.noticePeriod || "", ExpectedRate: r.expectedRate ?? "",
      Currency: r.currency, EmploymentType: r.employmentType, ResourceType: r.resourceType,
      Status: r.status, Tags: r.tags || "", Assignments: r._count.assignments,
    }));
    return NextResponse.json({ rows, filename: `resources-${Date.now()}.csv` });
  }

  if (type === "assignments") {
    const assignments = await db.demandResourceAssignment.findMany({
      include: {
        demand: { select: { demandId: true, client: true, positionTitle: true } },
        resource: { select: { resourceId: true, candidateName: true, primarySkill: true } },
      },
      orderBy: { lastUpdated: "desc" },
    });
    const rows = assignments.map(a => ({
      AssignmentID: a.assignmentId, DemandID: a.demand.demandId, Client: a.demand.client,
      Position: a.demand.positionTitle, ResourceID: a.resource.resourceId,
      Candidate: a.resource.candidateName, Skill: a.resource.primarySkill || "",
      Stage: a.currentStage, Submitted: a.submissionDate.toISOString().split("T")[0],
      InterviewDate: a.interviewDate ? a.interviewDate.toISOString().split("T")[0] : "",
      SelectionDate: a.selectionDate ? a.selectionDate.toISOString().split("T")[0] : "",
      OfferedRate: a.offeredRate ?? "", Result: a.interviewResult || "",
      LastUpdated: a.lastUpdated.toISOString().split("T")[0],
    }));
    return NextResponse.json({ rows, filename: `assignments-${Date.now()}.csv` });
  }

  if (type === "activity") {
    const logs = await db.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 1000 });
    const rows = logs.map(l => ({
      Time: l.createdAt.toISOString(),
      User: l.userName || "", Action: l.action, EntityType: l.entityType,
      EntityID: l.entityId || "", EntityName: l.entityName || "", Details: l.details || "",
    }));
    return NextResponse.json({ rows, filename: `activity-${Date.now()}.csv` });
  }

  if (type === "kanban") {
    const assignments = await db.demandResourceAssignment.findMany({
      where: { currentStage: { notIn: ["Closed", "Cancelled", "Rejected", "Withdrawn"] } },
      include: {
        demand: { select: { demandId: true, client: true, positionTitle: true, priority: true } },
        resource: { select: { resourceId: true, candidateName: true, primarySkill: true, totalExperience: true, currentLocation: true } },
      },
    });
    const rows = assignments.map(a => ({
      AssignmentID: a.assignmentId, Stage: a.currentStage,
      DemandID: a.demand.demandId, Client: a.demand.client,
      Position: a.demand.positionTitle, Priority: a.demand.priority,
      Candidate: a.resource.candidateName, Skill: a.resource.primarySkill,
      Experience: a.resource.totalExperience ?? "", Location: a.resource.currentLocation ?? "",
    }));
    return NextResponse.json({ rows, filename: `kanban-${Date.now()}.csv` });
  }

  return NextResponse.json({ error: "Unknown export type" }, { status: 400 });
}
