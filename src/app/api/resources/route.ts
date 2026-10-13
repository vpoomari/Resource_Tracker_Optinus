import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser, logAudit, canWriteResource } from "@/lib/auth";

function nextResourceId(existing: { resourceId: string }[]) {
  let max = 1000;
  for (const r of existing) {
    const m = r.resourceId.match(/RES-(\d+)/);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return `RES-${max + 1}`;
}

// LIST
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const skill = searchParams.get("skill");
  const status = searchParams.get("status");
  const location = searchParams.get("location");
  const empType = searchParams.get("empType");
  const rType = searchParams.get("rType");
  const search = searchParams.get("search")?.toLowerCase();
  const minExp = searchParams.get("minExp");
  const maxExp = searchParams.get("maxExp");
  const tag = searchParams.get("tag");

  const where: Record<string, unknown> = {};
  if (skill && skill !== "all") where.primarySkill = skill;
  if (status && status !== "all") where.status = status;
  if (location && location !== "all") where.currentLocation = location;
  if (empType && empType !== "all") where.employmentType = empType;
  if (rType && rType !== "all") where.resourceType = rType;
  if (tag && tag !== "all") where.tags = { contains: tag };
  if (minExp) where.totalExperience = { gte: Number(minExp) };
  if (maxExp) where.totalExperience = { ...(where.totalExperience as object || {}), lte: Number(maxExp) };
  if (search) {
    where.OR = [
      { resourceId: { contains: search } },
      { candidateName: { contains: search } },
      { email: { contains: search } },
      { phone: { contains: search } },
      { primarySkill: { contains: search } },
      { technology: { contains: search } },
      { currentEmployer: { contains: search } },
    ];
  }

  const resources = await db.resource.findMany({
    where,
    include: {
      _count: { select: { assignments: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ resources });
}

// CREATE
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canWriteResource(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();

  // Duplicate detection
  const duplicates: string[] = [];
  if (body.email) {
    const byEmail = await db.resource.findFirst({ where: { email: body.email } });
    if (byEmail) duplicates.push(`Email matches ${byEmail.resourceId} (${byEmail.candidateName})`);
  }
  if (body.phone) {
    const byPhone = await db.resource.findFirst({ where: { phone: body.phone } });
    if (byPhone) duplicates.push(`Phone matches ${byPhone.resourceId} (${byPhone.candidateName})`);
  }

  const existing = await db.resource.findMany({ select: { resourceId: true } });
  const resourceId = nextResourceId(existing);
  const resource = await db.resource.create({
    data: {
      resourceId,
      candidateName: body.candidateName,
      email: body.email || null,
      phone: body.phone || null,
      currentLocation: body.currentLocation || null,
      preferredLocation: body.preferredLocation || null,
      totalExperience: body.totalExperience ? Number(body.totalExperience) : null,
      relevantExperience: body.relevantExperience ? Number(body.relevantExperience) : null,
      primarySkill: body.primarySkill || null,
      secondarySkills: body.secondarySkills || null,
      technology: body.technology || null,
      currentEmployer: body.currentEmployer || null,
      currentDesignation: body.currentDesignation || null,
      noticePeriod: body.noticePeriod || null,
      availabilityDate: body.availabilityDate ? new Date(body.availabilityDate) : null,
      expectedRate: body.expectedRate ? Number(body.expectedRate) : null,
      currency: body.currency || "USD",
      employmentType: body.employmentType || "Full-time",
      resourceType: body.resourceType || "External",
      status: body.status || "Available",
      certifications: body.certifications || null,
      education: body.education || null,
      domainExperience: body.domainExperience || null,
      previousClientExp: body.previousClientExp || null,
      remarks: body.remarks || null,
      tags: Array.isArray(body.tags) ? body.tags.join(", ") : (body.tags || null),
    },
  });

  await db.statusHistory.create({
    data: {
      resourceId: resource.id,
      newStatus: resource.status,
      changedById: user.id,
      changedByName: user.name,
      comments: "Resource created",
    },
  });

  await logAudit({ userId: user.id, userName: user.name, action: "resource.create", entityType: "Resource", entityId: resourceId, entityName: body.candidateName, details: { duplicates } });
  return NextResponse.json({ resource, duplicates });
}
