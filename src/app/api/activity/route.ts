import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action");
  const entityType = searchParams.get("entityType");
  const limit = Number(searchParams.get("limit") || 100);
  const where: Record<string, unknown> = {};
  if (action && action !== "all") where.action = { contains: action };
  if (entityType && entityType !== "all") where.entityType = entityType;
  const logs = await db.auditLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return NextResponse.json({ logs });
}
