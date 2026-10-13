import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyPassword, createSession, logAudit } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }
    const user = await db.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user || !user.active) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }
    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }
    await db.user.update({ where: { id: user.id }, data: { lastLogin: new Date() } });
    await createSession(user.id);
    await logAudit({ userId: user.id, userName: user.name, action: "user.login", entityType: "User", entityId: user.id, entityName: user.name });
    return NextResponse.json({
      id: user.id, email: user.email, name: user.name,
      role: user.role, avatarColor: user.avatarColor, phone: user.phone,
    });
  } catch (e) {
    console.error("Login error:", e);
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
