import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser, logAudit, canWriteDemand } from "@/lib/auth";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const client = await db.client.findUnique({ where: { id } });
  if (!client) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const demands = await db.demand.findMany({ where: { client: client.name }, orderBy: { createdAt: "desc" } });
  return NextResponse.json({ client, demands });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canWriteDemand(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const body = await req.json();
  const data: Record<string, unknown> = {};
  for (const k of ["name", "industry", "website", "contactName", "contactEmail", "contactPhone", "address", "active"]) {
    if (k in body) data[k] = body[k];
  }
  const client = await db.client.update({ where: { id }, data });
  await logAudit({ userId: user.id, userName: user.name, action: "client.update", entityType: "Client", entityId: id, entityName: client.name });
  return NextResponse.json({ client });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canWriteDemand(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  await db.client.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
