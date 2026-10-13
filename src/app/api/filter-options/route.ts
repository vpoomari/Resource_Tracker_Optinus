import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser, canWriteDemand, canWriteResource, logAudit } from "@/lib/auth";

// Get filter options (clients, skills, locations, owners etc.)
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [demands, resources, users, clients] = await Promise.all([
    db.demand.findMany({ select: { client: true, primarySkill: true, priority: true, status: true, location: true, workMode: true, ownerName: true } }),
    db.resource.findMany({ select: { primarySkill: true, status: true, currentLocation: true, employmentType: true, resourceType: true, tags: true } }),
    db.user.findMany({ select: { id: true, name: true, role: true }, where: { active: true } }),
    db.client.findMany({ select: { name: true } }),
  ]);

  const uniq = (arr: (string | null | undefined)[]) => Array.from(new Set(arr.filter((x): x is string => !!x))).sort();

  return NextResponse.json({
    clients: uniq(demands.map(d => d.client)),
    skills: uniq([...demands.map(d => d.primarySkill), ...resources.map(r => r.primarySkill)]),
    priorities: uniq(demands.map(d => d.priority)),
    statuses: uniq(demands.map(d => d.status)),
    locations: uniq([...demands.map(d => d.location), ...resources.map(r => r.currentLocation)]),
    workModes: uniq(demands.map(d => d.workMode)),
    owners: uniq(demands.map(d => d.ownerName)),
    employmentTypes: uniq(resources.map(r => r.employmentType)),
    resourceTypes: uniq(resources.map(r => r.resourceType)),
    tags: uniq(resources.map(r => r.tags?.split(",").map(t => t.trim())).flat()),
    users: users.map(u => ({ id: u.id, name: u.name, role: u.role })),
    clientNames: clients.map(c => c.name),
  });
}
