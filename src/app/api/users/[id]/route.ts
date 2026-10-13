import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser, hashPassword, logAudit, canCreateUser } from "@/lib/auth";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  // Allow self-update of own password; everything else requires admin
  const isSelf = user.id === id;
  const body = await req.json();
  const { name, email, role, phone, password, active } = body;

  if (!isSelf && !canCreateUser(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!isSelf && role && !canCreateUser(user.role)) return NextResponse.json({ error: "Only admins can change roles" }, { status: 403 });

  const data: Record<string, unknown> = {};
  if (name !== undefined) data.name = name;
  if (email !== undefined) data.email = email.toLowerCase();
  if (phone !== undefined) data.phone = phone;
  if (canCreateUser(user.role)) {
    if (role !== undefined) data.role = role;
    if (active !== undefined) data.active = active;
  }
  if (password) data.passwordHash = await hashPassword(password);

  const updated = await db.user.update({ where: { id }, data, select: { id: true, email: true, name: true, role: true, phone: true, avatarColor: true, active: true, lastLogin: true } });
  await logAudit({ userId: user.id, userName: user.name, action: "user.update", entityType: "User", entityId: id, entityName: updated.name, details: { changes: Object.keys(data) } });
  return NextResponse.json({ user: updated });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canCreateUser(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  if (user.id === id) return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 });

  const target = await db.user.findUnique({ where: { id }, select: { name: true } });
  if (!target) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await db.user.delete({ where: { id } });
  await logAudit({ userId: user.id, userName: user.name, action: "user.delete", entityType: "User", entityId: id, entityName: target.name });
  return NextResponse.json({ ok: true });
}
