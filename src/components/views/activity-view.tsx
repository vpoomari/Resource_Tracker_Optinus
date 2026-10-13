"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/client/api";
import { useToast } from "@/hooks/use-toast";
import { SectionCard } from "@/components/shared/kpi-card";
import { Skeleton, EmptyState, UserAvatar } from "@/components/shared/badges";
import { Activity as ActivityIcon, Filter, Download } from "lucide-react";

interface AuditLog {
  id: string; userId?: string | null; userName?: string | null;
  action: string; entityType: string; entityId?: string | null;
  entityName?: string | null; details?: string | null; createdAt: string;
}

const ACTION_LABELS: Record<string, string> = {
  "user.login": "Logged in",
  "user.logout": "Logged out",
  "user.create": "Created user",
  "user.update": "Updated user",
  "user.delete": "Deleted user",
  "demand.create": "Created demand",
  "demand.update": "Updated demand",
  "demand.delete": "Deleted demand",
  "demand.close": "Closed demand",
  "resource.create": "Created resource",
  "resource.update": "Updated resource",
  "resource.delete": "Deleted resource",
  "assignment.create": "Mapped assignment",
  "assignment.move": "Moved pipeline",
  "assignment.delete": "Removed assignment",
  "client.create": "Created client",
  "client.update": "Updated client",
  "document.upload": "Uploaded document",
  "import.commit": "Imported records",
  "settings.update": "Updated settings",
};

const ACTION_TONES: Record<string, string> = {
  "user.login": "bg-blue-500/15 text-blue-300",
  "user.create": "bg-emerald-500/15 text-emerald-300",
  "user.delete": "bg-red-500/15 text-red-300",
  "demand.create": "bg-blue-500/15 text-blue-300",
  "demand.update": "bg-amber-500/15 text-amber-300",
  "demand.delete": "bg-red-500/15 text-red-300",
  "demand.close": "bg-emerald-500/15 text-emerald-300",
  "resource.create": "bg-blue-500/15 text-blue-300",
  "resource.update": "bg-amber-500/15 text-amber-300",
  "resource.delete": "bg-red-500/15 text-red-300",
  "assignment.create": "bg-purple-500/15 text-purple-300",
  "assignment.move": "bg-orange-500/15 text-orange-300",
  "assignment.delete": "bg-red-500/15 text-red-300",
  "document.upload": "bg-cyan-500/15 text-cyan-300",
  "import.commit": "bg-emerald-500/15 text-emerald-300",
};

export function ActivityView() {
  const { toast } = useToast();
  const [logs, setLogs] = useState<AuditLog[] | null>(null);
  const [filter, setFilter] = useState("all");

  const load = (action?: string) => {
    const q = action && action !== "all" ? `?action=${action}` : "?limit=200";
    api<{ logs: AuditLog[] }>(`/api/activity${q}`).then(r => setLogs(r.logs)).catch(e => {
      toast({ title: "Failed to load", description: e.message, variant: "destructive" });
      setLogs([]);
    });
  };
  useEffect(() => { load(); }, []);

  const exportCsv = () => {
    if (!logs) return;
    const headers = ["Time", "User", "Action", "EntityType", "EntityID", "EntityName", "Details"];
    const csv = [headers.join(","), ...logs.map(l => headers.map(h => `"${String((l as any)[h.toLowerCase()] || "").replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `activity-${Date.now()}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
    toast({ title: `Exported ${logs.length} logs` });
  };

  if (!logs) return <Skeleton className="h-96" />;

  const actionTypes = Array.from(new Set(logs.map(l => l.action.split(".")[0])));

  return (
    <div className="space-y-5 animate-fade-in-up">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Activity / Audit Log</h1>
          <p className="text-sm text-slate-400 mt-0.5">{logs.length} recent activities</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={filter}
            onChange={(e) => { setFilter(e.target.value); load(e.target.value); }}
            className="rounded-lg border border-white/10 bg-[#181826] px-3 py-2 text-sm focus:border-[#0070f3] focus:outline-none"
          >
            <option value="all">All actions</option>
            {actionTypes.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <button onClick={exportCsv} className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-[#181826] px-3 py-2 text-sm font-semibold text-white hover:bg-white/[0.03]">
            <Download className="h-4 w-4" /> Export
          </button>
        </div>
      </div>

      {logs.length === 0 ? (
        <EmptyState icon={<ActivityIcon className="h-7 w-7" />} title="No activity yet" />
      ) : (
        <SectionCard noPadding>
          <ol className="divide-y divide-slate-100">
            {logs.map(l => {
              const label = ACTION_LABELS[l.action] || l.action;
              const tone = ACTION_TONES[l.action] || "bg-slate-500/15 text-slate-300";
              const [entity, verb] = l.action.split(".");
              return (
                <li key={l.id} className="flex items-start gap-3 px-4 py-3 hover:bg-white/[0.03]">
                  {l.userName ? <UserAvatar name={l.userName} size={32} /> : <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-500/20 text-slate-500"><ActivityIcon className="h-4 w-4" /></div>}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-white">{l.userName || "System"}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${tone}`}>{label}</span>
                    </div>
                    <div className="text-xs text-slate-400">
                      {l.entityName && <span>{l.entityType}: <strong className="text-white">{l.entityName}</strong></span>}
                      {l.details && <span className="ml-2 font-mono text-[10px]">{l.details}</span>}
                    </div>
                  </div>
                  <div className="text-[10px] text-slate-400 whitespace-nowrap">
                    {new Date(l.createdAt).toLocaleString()}
                  </div>
                </li>
              );
            })}
          </ol>
        </SectionCard>
      )}
    </div>
  );
}
