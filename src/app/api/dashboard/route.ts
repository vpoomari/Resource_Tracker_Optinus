import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { demandAgeDays, AGING_BUCKETS } from "@/lib/constants";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [demands, resources, assignments, closedDemands] = await Promise.all([
    db.demand.findMany({ select: { id: true, demandId: true, client: true, primarySkill: true, priority: true, status: true, createdAt: true, targetClosureDate: true, closedAt: true, numberOfPositions: true } }),
    db.resource.findMany({ select: { id: true, resourceId: true, status: true, primarySkill: true } }),
    db.demandResourceAssignment.findMany({ select: { id: true, currentStage: true, createdAt: true, demandId: true, resourceId: true } }),
    db.demand.findMany({ where: { status: "Closed" }, select: { createdAt: true, closedAt: true } }),
  ]);

  // Demand KPIs
  const totalDemands = demands.length;
  const openStatuses = ["New", "Open", "Sourcing", "Profiles Submitted", "Client Review", "Interview", "Selected"];
  const openDemands = demands.filter(d => openStatuses.includes(d.status)).length;
  const newDemands = demands.filter(d => d.status === "New" || d.status === "Open").length;
  const criticalDemands = demands.filter(d => d.priority === "Critical" && openStatuses.includes(d.status)).length;
  const agingDemands = demands.filter(d => openStatuses.includes(d.status) && demandAgeDays(d.createdAt) > 30).length;
  const closedCount = demands.filter(d => d.status === "Closed").length;

  // Resource KPIs (by assignment stage aggregated across resources)
  const stageCounts: Record<string, number> = {
    Available: 0, Proposed: 0, "Client Review": 0, Interview: 0, Selected: 0, Joined: 0, Rejected: 0,
  };
  for (const r of resources) {
    if (r.status === "Available") stageCounts.Available++;
  }
  for (const a of assignments) {
    if (a.currentStage in stageCounts) {
      stageCounts[a.currentStage]++;
    }
  }

  // Conversion rates
  const submitted = assignments.length;
  const inInterview = assignments.filter(a => ["Interview", "Selected", "Joined"].includes(a.currentStage)).length;
  const selected = assignments.filter(a => ["Selected", "Joined"].includes(a.currentStage)).length;
  const joined = assignments.filter(a => a.currentStage === "Joined").length;
  const submissionToInterview = submitted > 0 ? Math.round((inInterview / submitted) * 100) : 0;
  const interviewToSelection = inInterview > 0 ? Math.round((selected / inInterview) * 100) : 0;
  const selectionToJoining = selected > 0 ? Math.round((joined / selected) * 100) : 0;
  const overallClosure = totalDemands > 0 ? Math.round((closedCount / totalDemands) * 100) : 0;

  // Aging buckets
  const aging = AGING_BUCKETS.map(b => ({
    label: b.label,
    count: demands.filter(d => openStatuses.includes(d.status) && demandAgeDays(d.createdAt) >= b.min && demandAgeDays(d.createdAt) <= b.max).length,
  }));

  // Avg closure time (days) — for closed demands
  let avgClosureDays = 0;
  if (closedDemands.length > 0) {
    const totalDays = closedDemands.reduce((sum, d) => sum + (d.closedAt ? Math.floor((d.closedAt.getTime() - d.createdAt.getTime()) / (1000 * 60 * 60 * 24)) : 0), 0);
    avgClosureDays = Math.round(totalDays / closedDemands.length);
  }

  // Charts
  const byClient: Record<string, number> = {};
  const bySkill: Record<string, number> = {};
  const byPriority: Record<string, number> = { Critical: 0, High: 0, Medium: 0, Low: 0 };
  for (const d of demands) {
    if (!openStatuses.includes(d.status)) continue;
    byClient[d.client] = (byClient[d.client] || 0) + 1;
    bySkill[d.primarySkill] = (bySkill[d.primarySkill] || 0) + 1;
    byPriority[d.priority] = (byPriority[d.priority] || 0) + 1;
  }
  const byClientArr = Object.entries(byClient).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  const bySkillArr = Object.entries(bySkill).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  const byPriorityArr = Object.entries(byPriority).map(([name, value]) => ({ name, value }));

  // Candidates by stage
  const candidatesByStage = [
    { name: "Sourcing", value: stageCounts.Available },
    { name: "Profile Submitted", value: stageCounts.Proposed },
    { name: "Client Review", value: stageCounts["Client Review"] },
    { name: "Interview", value: stageCounts.Interview },
    { name: "Selected", value: stageCounts.Selected },
    { name: "Joined", value: stageCounts.Joined },
  ];

  // Conversion funnel
  const funnel = [
    { name: "Submitted", value: submitted, color: "#0070f3" },
    { name: "Interview", value: inInterview, color: "#14b8a6" },
    { name: "Selected", value: selected, color: "#F59E0B" },
    { name: "Joined", value: joined, color: "#10B981" },
  ];

  // Monthly creation trend (last 6 months)
  const now = new Date();
  const months: { label: string; created: number; closed: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const nextD = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    const created = demands.filter(x => new Date(x.createdAt) >= d && new Date(x.createdAt) < nextD).length;
    const closed = demands.filter(x => x.closedAt && new Date(x.closedAt) >= d && new Date(x.closedAt) < nextD).length;
    months.push({ label: d.toLocaleString("en-US", { month: "short" }), created, closed });
  }

  return NextResponse.json({
    kpis: {
      totalDemands, openDemands, newDemands, criticalDemands, agingDemands, closedDemands: closedCount,
      totalResources: resources.length,
      available: stageCounts.Available,
      proposed: stageCounts.Proposed,
      clientReview: stageCounts["Client Review"],
      interview: stageCounts.Interview,
      selected: stageCounts.Selected,
      joined: stageCounts.Joined,
      rejected: stageCounts.Rejected,
      submissionToInterview, interviewToSelection, selectionToJoining, overallClosure,
      avgClosureDays,
    },
    aging,
    charts: {
      byClient: byClientArr,
      bySkill: bySkillArr,
      byPriority: byPriorityArr,
      candidatesByStage,
      funnel,
      months,
    },
  });
}
