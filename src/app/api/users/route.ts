import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser, hashPassword, logAudit, canCreateUser } from "@/lib/auth";
import { AVATAR_COLORS } from "@/lib/constants";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canCreateUser(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const users = await db.user.findMany({
    select: { id: true, email: true, name: true, role: true, phone: true, avatarColor: true, active: true, lastLogin: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ users });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canCreateUser(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { name, email, password, role, phone } = body;
  if (!name || !email || !password) return NextResponse.json({ error: "Missing required fields" }, { status: 400 });

  const existing = await db.user.findUnique({ where: { email: email.toLowerCase() } });
  if (existing) return NextResponse.json({ error: "Email already exists" }, { status: 409 });

  const passwordHash = await hashPassword(password);
  const newUser = await db.user.create({
    data: {
      name, email: email.toLowerCase(),
      passwordHash, role: role || "Viewer",
      phone: phone || null,
      avatarColor: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
    },
  });
  await logAudit({ userId: user.id, userName: user.name, action: "user.create", entityType: "User", entityId: newUser.id, entityName: name, details: { role } });
  return NextResponse.json({ user: { id: newUser.id, email: newUser.email, name: newUser.name, role: newUser.role, phone: newUser.phone, avatarColor: newUser.avatarColor, active: newUser.active } });
}
