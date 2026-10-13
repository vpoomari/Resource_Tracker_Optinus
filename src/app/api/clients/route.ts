import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser, logAudit, canWriteDemand } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search")?.toLowerCase();
  const where: Record<string, unknown> = {};
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { industry: { contains: search } },
      { contactName: { contains: search } },
    ];
  }
  const clients = await db.client.findMany({
    where,
    include: {
      _count: { select: { demands: false } },
    },
    orderBy: { name: "asc" },
  });
  // Attach demand counts
  const withCounts = await Promise.all(clients.map(async (c) => {
    const count = await db.demand.count({ where: { client: c.name } });
    const openCount = await db.demand.count({ where: { client: c.name, status: { in: ["New", "Open", "Sourcing", "Profiles Submitted", "Client Review", "Interview", "Selected"] } } });
    return { ...c, demandCount: count, openDemandCount: openCount };
  }));
  return NextResponse.json({ clients: withCounts });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canWriteDemand(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const client = await db.client.create({
    data: {
      name: body.name,
      industry: body.industry || null,
      website: body.website || null,
      contactName: body.contactName || null,
      contactEmail: body.contactEmail || null,
      contactPhone: body.contactPhone || null,
      address: body.address || null,
    },
  });
  await logAudit({ userId: user.id, userName: user.name, action: "client.create", entityType: "Client", entityId: client.id, entityName: body.name });
  return NextResponse.json({ client });
}
