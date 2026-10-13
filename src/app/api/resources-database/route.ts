import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

// Resource Database — full historical archive view
// Returns ALL resources (active + withdrawn + joined + archived) with
// full activity context: assignment count, last activity, latest demand, etc.
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search")?.toLowerCase();
  const skill = searchParams.get("skill");
  const status = searchParams.get("status");
  const location = searchParams.get("location");
  const empType = searchParams.get("empType");
  const rType = searchParams.get("rType");
  const tag = searchParams.get("tag");
  const minExp = searchParams.get("minExp");
  const maxExp = searchParams.get("maxExp");
  const sortBy = searchParams.get("sortBy") || "createdAt";
  const sortDir = (searchParams.get("sortDir") || "desc") as "asc" | "desc";

  const where: Record<string, unknown> = {};
  if (skill && skill !== "all") where.primarySkill = skill;
  if (status && status !== "all") where.status = status;
  if (location && location !== "all") where.currentLocation = location;
  if (empType && empType !== "all") where.employmentType = empType;
  if (rType && rType !== "all") where.resourceType = rType;
  if (tag && tag !== "all") where.tags = { contains: tag };
  if (minExp || maxExp) {
    const exp: Record<string, number> = {};
    if (minExp) exp.gte = Number(minExp);
    if (maxExp) exp.lte = Number(maxExp);
    where.totalExperience = exp;
  }
  if (search) {
    where.OR = [
      { resourceId: { contains: search } },
      { candidateName: { contains: search } },
      { email: { contains: search } },
      { phone: { contains: search } },
      { primarySkill: { contains: search } },
      { technology: { contains: search } },
      { currentEmployer: { contains: search } },
      { previousClientExp: { contains: search } },
      { domainExperience: { contains: search } },
    ];
  }

  const resources = await db.resource.findMany({
    where,
    include: {
      assignments: {
        include: { demand: { select: { demandId: true, client: true, positionTitle: true, status: true } } },
        orderBy: { lastUpdated: "desc" },
        take: 5,
      },
      _count: { select: { assignments: true, documents: true, statusHistory: true } },
    },
    orderBy: { [sortBy]: sortDir } as Record<string, "asc" | "desc">,
  });

  // Enrich with computed fields
  const enriched = resources.map(r => {
    const lastActivity = r.assignments[0]?.lastUpdated || r.updatedAt;
    const lastDemand = r.assignments[0]?.demand;
    const allClients = Array.from(new Set(r.assignments.map(a => a.demand.client)));
    const allStages = Array.from(new Set(r.assignments.map(a => a.currentStage)));
    return {
      id: r.id,
      resourceId: r.resourceId,
      candidateName: r.candidateName,
      email: r.email,
      phone: r.phone,
      currentLocation: r.currentLocation,
      preferredLocation: r.preferredLocation,
      totalExperience: r.totalExperience,
      relevantExperience: r.relevantExperience,
      primarySkill: r.primarySkill,
      secondarySkills: r.secondarySkills,
      technology: r.technology,
      currentEmployer: r.currentEmployer,
      currentDesignation: r.currentDesignation,
      noticePeriod: r.noticePeriod,
      expectedRate: r.expectedRate,
      currency: r.currency,
      employmentType: r.employmentType,
      resourceType: r.resourceType,
      status: r.status,
      certifications: r.certifications,
      education: r.education,
      domainExperience: r.domainExperience,
      previousClientExp: r.previousClientExp,
      remarks: r.remarks,
      tags: r.tags,
      atsScore: r.atsScore,
      atsScoreDate: r.atsScoreDate,
      atsScoreJd: r.atsScoreJd,
      avatarColor: r.avatarColor,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      lastActivity,
      lastDemandId: lastDemand?.demandId || null,
      lastDemandClient: lastDemand?.client || null,
      lastDemandPosition: lastDemand?.positionTitle || null,
      lastDemandStatus: lastDemand?.status || null,
      allClientsWorked: allClients,
      allStagesReached: allStages,
      assignmentCount: r._count.assignments,
      documentCount: r._count.documents,
      historyCount: r._count.statusHistory,
    };
  });

  // Fetch ATS scores via raw SQL (stale Prisma client may not include new fields)
  try {
    const atsRows: any[] = await db.$queryRaw`SELECT id, atsScore, atsScoreDate, atsScoreJd FROM resources`;
    const atsMap = new Map(atsRows.map((r: any) => [r.id, r]));
    enriched.forEach(r => {
      const ats = atsMap.get(r.id);
      r.atsScore = ats?.atsScore ?? null;
      r.atsScoreDate = ats?.atsScoreDate ?? null;
      r.atsScoreJd = ats?.atsScoreJd ?? null;
    });
  } catch {}

  return NextResponse.json({ resources: enriched, total: enriched.length });
}
