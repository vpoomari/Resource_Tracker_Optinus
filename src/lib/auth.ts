import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { db } from "./db";

export const SESSION_COOKIE = "rf_session";
const SALT_ROUNDS = 10;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Simple session: store userId in a signed-ish cookie. For production you would use
// JWT or NextAuth. For this controlled environment a httponce cookie is fine.
export async function createSession(userId: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, userId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function getCurrentUser() {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get(SESSION_COOKIE)?.value;
    if (!sessionId) return null;
    const user = await db.user.findUnique({
      where: { id: sessionId },
      select: {
        id: true, email: true, name: true, role: true,
        avatarColor: true, phone: true, active: true,
      },
    });
    if (!user || !user.active) return null;
    return user;
  } catch {
    return null;
  }
}

// Permission helpers — role-based access
const FULL_ACCESS = ["Admin"];
const WRITE_DEMAND = ["Admin", "Resource Manager", "Demand Manager"];
const WRITE_RESOURCE = ["Admin", "Resource Manager", "Recruiter"];
const MOVE_PIPELINE = ["Admin", "Resource Manager", "Recruiter", "Demand Manager"];
const READONLY = ["Management", "Viewer"];

export function canCreateUser(role: string) { return FULL_ACCESS.includes(role); }
export function canManageSettings(role: string) { return FULL_ACCESS.includes(role); }
export function canWriteDemand(role: string) { return WRITE_DEMAND.includes(role); }
export function canWriteResource(role: string) { return WRITE_RESOURCE.includes(role); }
export function canMovePipeline(role: string) { return MOVE_PIPELINE.includes(role); }
export function isReadOnly(role: string) { return READONLY.includes(role); }

export async function logAudit(opts: {
  userId?: string;
  userName?: string;
  action: string;
  entityType: string;
  entityId?: string;
  entityName?: string;
  details?: Record<string, unknown>;
}) {
  try {
    await db.auditLog.create({
      data: {
        userId: opts.userId ?? null,
        userName: opts.userName ?? null,
        action: opts.action,
        entityType: opts.entityType,
        entityId: opts.entityId ?? null,
        entityName: opts.entityName ?? null,
        details: opts.details ? JSON.stringify(opts.details) : null,
      },
    });
  } catch (e) {
    console.error("Audit log failed:", e);
  }
}
