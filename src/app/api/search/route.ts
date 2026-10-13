import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

// Global search across demands, resources, clients
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").toLowerCase();
  if (!q || q.length < 2) return NextResponse.json({ results: { demands: [], resources: [], clients: [] } });

  const [demands, resources, clients] = await Promise.all([
    db.demand.findMany({
      where: {
        OR: [
          { demandId: { contains: q } },
          { positionTitle: { contains: q } },
          { client: { contains: q } },
          { primarySkill: { contains: q } },
          { project: { contains: q } },
        ],
      },
      take: 10,
      select: { id: true, demandId: true, positionTitle: true, client: true, primarySkill: true, priority: true, status: true },
    }),
    db.resource.findMany({
      where: {
        OR: [
          { resourceId: { contains: q } },
          { candidateName: { contains: q } },
          { email: { contains: q } },
          { phone: { contains: q } },
          { primarySkill: { contains: q } },
          { technology: { contains: q } },
        ],
      },
      take: 10,
      select: { id: true, resourceId: true, candidateName: true, primarySkill: true, totalExperience: true, currentLocation: true, status: true, avatarColor: true },
    }),
    db.client.findMany({
      where: { OR: [{ name: { contains: q } }, { industry: { contains: q } }, { contactName: { contains: q } }] },
      take: 5,
      select: { id: true, name: true, industry: true, contactName: true },
    }),
  ]);

  return NextResponse.json({ results: { demands, resources, clients } });
}
