import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { demandAgeDays, AGING_BUCKETS } from "@/lib/constants";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") || "demand-aging";

  const demands = await db.demand.findMany({
    include: {
      assignments: {
        include: { resource: { select: { resourceId: true, candidateName: true, primarySkill: true, totalExperience: true, currentLocation: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const resources = await db.resource.findMany({
    include: { assignments: { include: { demand: { select: { demandId: true, client: true, positionTitle: true } } } } },
  });

  const openStatuses = ["New", "Open", "Sourcing", "Profiles Submitted", "Client Review", "Interview", "Selected"];

  if (type === "demand-aging") {
    const rows = demands.filter(d => openStatuses.includes(d.status)).map(d => ({
      demandId: d.demandId, client: d.client, positionTitle: d.positionTitle, priority: d.priority,
      status: d.status, age: demandAgeDays(d.createdAt), createdAt: d.createdAt,
      owner: d.ownerName, candidateCount: d.assignments.length,
    }));
    return NextResponse.json({ rows, columns: ["Demand ID", "Client", "Position", "Priority", "Status", "Age (days)", "Candidates", "Owner", "Created"] });
  }

  if (type === "open-demands") {
    const rows = demands.filter(d => openStatuses.includes(d.status)).map(d => ({
      demandId: d.demandId, client: d.client, positionTitle: d.positionTitle, primarySkill: d.primarySkill,
      priority: d.priority, status: d.status, location: d.location, workMode: d.workMode,
      age: demandAgeDays(d.createdAt), owner: d.ownerName, candidateCount: d.assignments.length,
    }));
    return NextResponse.json({ rows, columns: ["Demand ID", "Client", "Position", "Skill", "Priority", "Status", "Location", "Work Mode", "Age", "Candidates", "Owner"] });
  }

  if (type === "client-demands") {
    const grouped: Record<string, { total: number; open: number; closed: number; critical: number }> = {};
    for (const d of demands) {
      grouped[d.client] = grouped[d.client] || { total: 0, open: 0, closed: 0, critical: 0 };
      grouped[d.client].total++;
      if (openStatuses.includes(d.status)) grouped[d.client].open++;
      if (d.status === "Closed") grouped[d.client].closed++;
      if (d.priority === "Critical" && openStatuses.includes(d.status)) grouped[d.client].critical++;
    }
    const rows = Object.entries(grouped).map(([client, c]) => ({ client, ...c }));
    return NextResponse.json({ rows, columns: ["Client", "Total", "Open", "Critical", "Closed"] });
  }

  if (type === "skill-demand") {
    const grouped: Record<string, number> = {};
    for (const d of demands) {
      if (!openStatuses.includes(d.status)) continue;
      grouped[d.primarySkill] = (grouped[d.primarySkill] || 0) + 1;
    }
    const rows = Object.entries(grouped).map(([skill, count]) => ({ skill, count })).sort((a, b) => b.count - a.count);
    return NextResponse.json({ rows, columns: ["Skill", "Open Demands"] });
  }

  if (type === "resource-availability") {
    const rows = resources.filter(r => r.status === "Available" || r.status === "Proposed").map(r => ({
      resourceId: r.resourceId, candidateName: r.candidateName, primarySkill: r.primarySkill,
      totalExperience: r.totalExperience, currentLocation: r.currentLocation,
      noticePeriod: r.noticePeriod, expectedRate: r.expectedRate, currency: r.currency,
      status: r.status, employmentType: r.employmentType,
    }));
    return NextResponse.json({ rows, columns: ["Resource ID", "Name", "Skill", "Experience", "Location", "Notice", "Rate", "Status", "Employment"] });
  }

  if (type === "interview-pipeline") {
    const assignments = await db.demandResourceAssignment.findMany({
      where: { currentStage: "Interview" },
      include: {
        demand: { select: { demandId: true, client: true, positionTitle: true } },
        resource: { select: { resourceId: true, candidateName: true, primarySkill: true } },
      },
    });
    const rows = assignments.map(a => ({
      assignmentId: a.assignmentId, demandId: a.demand.demandId, client: a.demand.client,
      position: a.demand.positionTitle, candidate: a.resource.candidateName,
      skill: a.resource.primarySkill, interviewDate: a.interviewDate, interviewResult: a.interviewResult,
    }));
    return NextResponse.json({ rows, columns: ["Assignment", "Demand", "Client", "Position", "Candidate", "Skill", "Interview Date", "Result"] });
  }

  if (type === "selected-resources") {
    const assignments = await db.demandResourceAssignment.findMany({
      where: { currentStage: "Selected" },
      include: {
        demand: { select: { demandId: true, client: true, positionTitle: true } },
        resource: { select: { resourceId: true, candidateName: true, primarySkill: true, totalExperience: true } },
      },
    });
    const rows = assignments.map(a => ({
      assignmentId: a.assignmentId, demandId: a.demand.demandId, client: a.demand.client,
      position: a.demand.positionTitle, candidate: a.resource.candidateName,
      skill: a.resource.primarySkill, exp: a.resource.totalExperience, offeredRate: a.offeredRate,
      selectionDate: a.selectionDate,
    }));
    return NextResponse.json({ rows, columns: ["Assignment", "Demand", "Client", "Position", "Candidate", "Skill", "Experience", "Offered", "Selected On"] });
  }

  if (type === "executive") {
    const totalOpen = demands.filter(d => openStatuses.includes(d.status)).length;
    const assignments = await db.demandResourceAssignment.findMany();
    const proposed = assignments.length;
    const clientReview = assignments.filter(a => a.currentStage === "Client Review").length;
    const interviews = assignments.filter(a => a.currentStage === "Interview").length;
    const selected = assignments.filter(a => a.currentStage === "Selected").length;
    const joined = assignments.filter(a => a.currentStage === "Joined").length;
    const closedDemands = demands.filter(d => d.status === "Closed");
    let avgClosureDays = 0;
    if (closedDemands.length > 0) {
      avgClosureDays = Math.round(closedDemands.reduce((s, d) => s + (d.closedAt ? Math.floor((d.closedAt.getTime() - d.createdAt.getTime()) / (1000 * 60 * 60 * 24)) : 0), 0) / closedDemands.length);
    }
    const aging = AGING_BUCKETS.map(b => ({ label: b.label, count: demands.filter(d => openStatuses.includes(d.status) && demandAgeDays(d.createdAt) >= b.min && demandAgeDays(d.createdAt) <= b.max).length }));
    return NextResponse.json({
      summary: { totalOpenDemands: totalOpen, resourcesProposed: proposed, clientReviews: clientReview, interviews, selected, joined, avgClosureDays },
      aging,
    });
  }

  return NextResponse.json({ error: "Unknown report type" }, { status: 400 });
}
