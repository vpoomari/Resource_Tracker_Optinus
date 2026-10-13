// ⚠️  DESTRUCTIVE OPERATION — wipes all business data (clients, demands, resources,
//     assignments, history, notes, documents, notifications, audit logs).
//     Preserves users + settings so login still works.
//
//     This script is DANGEROUS. It will NOT run unless you explicitly pass
//     `--confirm-i-really-want-to-wipe` as the first argument.
//
//     Usage (only when you really mean it):
//       bun run scripts/wipe-data.ts --confirm-i-really-want-to-wipe
//
//     Per the user's standing instruction ("retain the current data going
//     forward — do not delete the entire data from the tool"), this script
//     should NOT be run as part of normal development or testing.

import { db } from "../src/lib/db";
import { promises as fs } from "fs";
import path from "path";

async function main() {
  // Safety guard: require an explicit confirmation flag
  if (process.argv[2] !== "--confirm-i-really-want-to-wipe") {
    console.log("╔══════════════════════════════════════════════════════════════════╗");
    console.log("║  ⚠️  WIPE-DATA SCRIPT — SAFETY GUARD ENGAGED                       ║");
    console.log("║                                                                    ║");
    console.log("║  This script will PERMANENTLY DELETE all business data            ║");
    console.log("║  (clients, demands, resources, assignments, history, notes,       ║");
    console.log("║  documents, notifications, audit logs).                           ║");
    console.log("║                                                                    ║");
    console.log("║  Per the user's standing instruction, data should be RETAINED.     ║");
    console.log("║                                                                    ║");
    console.log("║  If you really want to wipe everything, run:                       ║");
    console.log("║                                                                    ║");
    console.log("║    bun run scripts/wipe-data.ts --confirm-i-really-want-to-wipe    ║");
    console.log("║                                                                    ║");
    console.log("╚══════════════════════════════════════════════════════════════════╝");
    process.exit(1);
  }

  console.log("⚠️  Wiping all business data (safety flag detected)...\n");


  // Order matters due to foreign-key constraints.
  // Cascade-delete is configured in schema.prisma for most relations,
  // but we'll delete explicitly to be safe and report counts.

  const counts: { table: string; before: number; after: number }[] = [];

  // 1. Documents (CVs) — also delete files from disk
  const docsBefore = await db.document.count();
  const docs = await db.document.findMany({ select: { storagePath: true } });
  for (const d of docs) {
    try { await fs.unlink(d.storagePath); } catch {}
  }
  await db.document.deleteMany({});
  counts.push({ table: "Documents", before: docsBefore, after: 0 });
  console.log(`  Documents: ${docsBefore} → 0 (files on disk also removed)`);

  // 2. Notes
  const notesBefore = await db.note.count();
  await db.note.deleteMany({});
  counts.push({ table: "Notes", before: notesBefore, after: 0 });
  console.log(`  Notes: ${notesBefore} → 0`);

  // 3. StatusHistory
  const historyBefore = await db.statusHistory.count();
  await db.statusHistory.deleteMany({});
  counts.push({ table: "StatusHistory", before: historyBefore, after: 0 });
  console.log(`  StatusHistory: ${historyBefore} → 0`);

  // 4. DemandResourceAssignments (junction — must be deleted before Demands/Resources)
  const assignmentsBefore = await db.demandResourceAssignment.count();
  await db.demandResourceAssignment.deleteMany({});
  counts.push({ table: "DemandResourceAssignments", before: assignmentsBefore, after: 0 });
  console.log(`  DemandResourceAssignments: ${assignmentsBefore} → 0`);

  // 5. Demands
  const demandsBefore = await db.demand.count();
  await db.demand.deleteMany({});
  counts.push({ table: "Demands", before: demandsBefore, after: 0 });
  console.log(`  Demands: ${demandsBefore} → 0`);

  // 6. Resources
  const resourcesBefore = await db.resource.count();
  await db.resource.deleteMany({});
  counts.push({ table: "Resources", before: resourcesBefore, after: 0 });
  console.log(`  Resources: ${resourcesBefore} → 0`);

  // 7. Clients
  const clientsBefore = await db.client.count();
  await db.client.deleteMany({});
  counts.push({ table: "Clients", before: clientsBefore, after: 0 });
  console.log(`  Clients: ${clientsBefore} → 0`);

  // 8. Notifications
  const notifBefore = await db.notification.count();
  await db.notification.deleteMany({});
  counts.push({ table: "Notifications", before: notifBefore, after: 0 });
  console.log(`  Notifications: ${notifBefore} → 0`);

  // 9. AuditLogs
  const auditBefore = await db.auditLog.count();
  await db.auditLog.deleteMany({});
  counts.push({ table: "AuditLogs", before: auditBefore, after: 0 });
  console.log(`  AuditLogs: ${auditBefore} → 0`);

  // === KEPT (NOT DELETED) ===
  const usersCount = await db.user.count();
  const settingsCount = await db.setting.count();
  console.log(`\n  Users: ${usersCount} (KEPT — so you can still log in)`);
  console.log(`  Settings: ${settingsCount} (KEPT — default config preserved)`);

  // Log a fresh audit entry marking the wipe
  await db.auditLog.create({
    data: {
      userName: "System",
      action: "data.wipe",
      entityType: "System",
      entityName: "All business data",
      details: JSON.stringify({ before: counts.map(c => ({ table: c.table, count: c.before })) }),
    },
  });

  console.log("\n✓ Wipe complete. App is now ready for fresh data entry.");
  console.log("\nYou can sign in with admin@optinus.com / admin123 to start fresh.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await db.$disconnect(); });
