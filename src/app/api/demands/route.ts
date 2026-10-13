import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser, logAudit, canWriteDemand } from "@/lib/auth";

function nextDemandId(existing: { demandId: string }[]) {
  let max = 1000;
  for (const d of existing) {
    const m = d.demandId.match(/DMD-(\d+)/);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return `DMD-${max + 1}`;
}

// LIST with filters
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const client = searchParams.get("client");
  const skill = searchParams.get("skill");
  const priority = searchParams.get("priority");
  const status = searchParams.get("status");
  const location = searchParams.get("location");
  const workMode = searchParams.get("workMode");
  const ownerId = searchParams.get("ownerId");
  const search = searchParams.get("search")?.toLowerCase();
  const sortBy = searchParams.get("sortBy") || "createdAt";
  const sortDir = (searchParams.get("sortDir") || "desc") as "asc" | "desc";

  const where: Record<string, unknown> = {};
  if (client && client !== "all") where.client = client;
  if (skill && skill !== "all") where.primarySkill = skill;
  if (priority && priority !== "all") where.priority = priority;
  if (status && status !== "all") where.status = status;
  if (location && location !== "all") where.location = location;
  if (workMode && workMode !== "all") where.workMode = workMode;
  if (ownerId && ownerId !== "all") where.ownerId = ownerId;
  if (search) {
    where.OR = [
      { demandId: { contains: search } },
      { positionTitle: { contains: search } },
      { client: { contains: search } },
      { primarySkill: { contains: search } },
      { project: { contains: search } },
    ];
  }

  const demands = await db.demand.findMany({
    where,
    include: {
      _count: { select: { assignments: true } },
    },
    orderBy: sortBy === "age"
      ? { createdAt: sortDir }
      : sortBy === "priority"
        ? { priority: sortDir }
        : { [sortBy]: sortDir } as Record<string, "asc" | "desc">,
  });

  return NextResponse.json({ demands });
}

// CREATE
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canWriteDemand(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const existing = await db.demand.findMany({ select: { demandId: true } });
  const demandId = nextDemandId(existing);
  const demand = await db.demand.create({
    data: {
      demandId,
      client: body.client,
      account: body.account || null,
      project: body.project || null,
      positionTitle: body.positionTitle,
      primarySkill: body.primarySkill,
      secondarySkills: body.secondarySkills || null,
      jobDescription: body.jobDescription || null,
      minExperience: body.minExperience ? Number(body.minExperience) : null,
      maxExperience: body.maxExperience ? Number(body.maxExperience) : null,
      location: body.location || null,
      workMode: body.workMode || "Onsite",
      numberOfPositions: Number(body.numberOfPositions) || 1,
      priority: body.priority || "Medium",
      status: body.status || "New",
      ownerName: user.name,
      ownerId: user.id,
      resourceManagerName: body.resourceManagerName || user.name,
      resourceManagerId: user.id,
      accountManagerName: body.accountManagerName || null,
      accountManagerId: body.accountManagerId || null,
      targetClosureDate: body.targetClosureDate ? new Date(body.targetClosureDate) : null,
      comments: body.comments || null,
      tags: Array.isArray(body.tags) ? body.tags.join(", ") : (body.tags || null),
    },
  });

  await db.statusHistory.create({
    data: {
      demandId: demand.id,
      newStatus: demand.status,
      changedById: user.id,
      changedByName: user.name,
      comments: "Demand created",
    },
  });

  await logAudit({ userId: user.id, userName: user.name, action: "demand.create", entityType: "Demand", entityId: demandId, entityName: demandId, details: { position: body.positionTitle, client: body.client } });

  return NextResponse.json({ demand });
}
