"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/client/api";
import { useToast } from "@/hooks/use-toast";
import { SectionCard } from "@/components/shared/kpi-card";
import { Skeleton, StatusBadge, PriorityBadge, EmptyState } from "@/components/shared/badges";
import { demandAgeDays } from "@/lib/constants";
import {
  FileText, Clock, BarChart3, Users, Calendar, CheckCircle2, Download, AlertTriangle,
} from "lucide-react";

type ReportType = "demand-aging" | "open-demands" | "client-demands" | "skill-demand" | "resource-availability" | "interview-pipeline" | "selected-resources" | "executive";

const REPORTS: { type: ReportType; label: string; description: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { type: "executive", label: "Executive Summary", description: "Pipeline snapshot with KPIs and aging", icon: BarChart3 },
  { type: "demand-aging", label: "Demand Aging Report", description: "Identify demands aging beyond SLA", icon: Clock },
  { type: "open-demands", label: "Open Demand Report", description: "All currently open demands", icon: FileText },
  { type: "client-demands", label: "Client Demand Report", description: "Demands grouped by client", icon: Users },
  { type: "skill-demand", label: "Skill Demand Report", description: "Top skills in demand", icon: BarChart3 },
  { type: "resource-availability", label: "Resource Availability", description: "Available resources pool", icon: Users },
  { type: "interview-pipeline", label: "Interview Pipeline", description: "Candidates currently in interview", icon: Calendar },
  { type: "selected-resources", label: "Selected Resources", description: "Candidates selected, awaiting joining", icon: CheckCircle2 },
];

export function ReportsView() {
  const { toast } = useToast();
  const [activeType, setActiveType] = useState<ReportType>("executive");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api<any>(`/api/reports?type=${activeType}`)
      .then(r => { if (!cancelled) { setData(r); setLoading(false); } })
      .catch(e => {
        if (cancelled) return;
        toast({ title: "Failed to load report", description: e.message, variant: "destructive" });
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [activeType]);

  const exportCsv = () => {
    if (!data?.rows) return;
    const rows = data.rows;
    const headers = Object.keys(rows[0] || {});
    const csv = [headers.join(","), ...rows.map((r: any) => headers.map(h => `"${String(r[h] ?? "").replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${activeType}-${Date.now()}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
    toast({ title: `Exported ${rows.length} rows` });
  };

  return (
    <div className="space-y-5 animate-fade-in-up">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Reports</h1>
          <p className="text-sm text-slate-400 mt-0.5">Generate & export management reports</p>
        </div>
        {data?.rows && (
          <button onClick={exportCsv} className="inline-flex items-center gap-1.5 rounded-lg bg-[#0070f3] px-3.5 py-2 text-sm font-semibold text-white hover:bg-[#0050c8]">
            <Download className="h-4 w-4" /> Export CSV
          </button>
        )}
      </div>

      {/* Report selector */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {REPORTS.map(r => {
          const active = activeType === r.type;
          return (
            <button
              key={r.type}
              onClick={() => setActiveType(r.type)}
              className={`group rounded-xl border p-4 text-left transition-all hover:-translate-y-0.5 ${
                active ? "border-[#0070f3] bg-[#0070f3]/10 shadow-md" : "border-white/10 bg-[#181826] hover:border-[#0070f3]/30 hover:shadow-sm"
              }`}
            >
              <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${active ? "bg-[#0070f3] text-white" : "bg-slate-500/15 text-slate-400 group-hover:bg-blue-500/15 group-hover:text-[#0070f3]"}`}>
                <r.icon className="h-5 w-5" />
              </div>
              <div className="mt-2 font-semibold text-sm text-white">{r.label}</div>
              <div className="text-[10px] text-slate-400 mt-0.5">{r.description}</div>
            </button>
          );
        })}
      </div>

      {/* Executive summary special layout */}
      {loading ? (
        <Skeleton className="h-96" />
      ) : activeType === "executive" ? (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
            {[
              { label: "Total Open Demands", value: data.summary.totalOpenDemands, tone: "blue" as const, icon: <FileText className="h-5 w-5" /> },
              { label: "Resources Proposed", value: data.summary.resourcesProposed, tone: "purple" as const, icon: <Users className="h-5 w-5" /> },
              { label: "Client Reviews", value: data.summary.clientReviews, tone: "purple" as const, icon: <Clock className="h-5 w-5" /> },
              { label: "Interviews", value: data.summary.interviews, tone: "orange" as const, icon: <Calendar className="h-5 w-5" /> },
              { label: "Selected", value: data.summary.selected, tone: "green" as const, icon: <CheckCircle2 className="h-5 w-5" /> },
              { label: "Joined", value: data.summary.joined, tone: "green" as const, icon: <Users className="h-5 w-5" /> },
            ].map(k => (
              <SectionCard key={k.label}>
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">{k.label}</div>
                <div className="mt-2 text-3xl font-bold text-white">{k.value}</div>
              </SectionCard>
            ))}
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <SectionCard title="Average Closure Time">
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold text-[#0070f3]">{data.summary.avgClosureDays}</span>
                <span className="text-sm text-slate-400">days (avg across closed demands)</span>
              </div>
            </SectionCard>
            <SectionCard title="Aging Distribution">
              <div className="space-y-2">
                {data.aging.map((a: any) => (
                  <div key={a.label} className="flex items-center justify-between text-sm">
                    <span className="text-white">{a.label}</span>
                    <span className={`font-semibold ${a.count > 5 ? "text-red-400" : a.count > 2 ? "text-amber-400" : "text-emerald-400"}`}>{a.count}</span>
                  </div>
                ))}
              </div>
            </SectionCard>
          </div>
        </div>
      ) : data?.rows?.length > 0 ? (
        <SectionCard title={`${REPORTS.find(r => r.type === activeType)?.label} (${data.rows.length} records)`} noPadding>
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-sm">
              <thead className="bg-white/[0.03] text-left">
                <tr className="border-b border-white/10">
                  {data.columns.map((c: string) => (
                    <th key={c} className="px-3 py-3 text-xs font-semibold uppercase text-slate-400">{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.rows.map((row: any, i: number) => (
                  <tr key={i} className="hover:bg-[#0070f3]/[0.06]">
                    {Object.values(row).map((v: any, j: number) => {
                      const colName = data.columns[j];
                      const isStatus = ["Status", "Stage", "Result"].includes(colName);
                      const isPriority = colName === "Priority";
                      if (isStatus && v) return <td key={j} className="px-3 py-2"><StatusBadge status={String(v)} /></td>;
                      if (isPriority && v) return <td key={j} className="px-3 py-2"><PriorityBadge priority={String(v)} /></td>;
                      if (colName === "Age (days)" || colName === "Age") {
                        const age = Number(v) || 0;
                        return <td key={j} className="px-3 py-2">
                          <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold ${age > 60 ? "bg-red-500/15 text-red-300" : age > 30 ? "bg-amber-500/15 text-amber-300" : "bg-emerald-500/15 text-emerald-300"}`}>
                            {age}d
                          </span>
                        </td>;
                      }
                      return <td key={j} className="px-3 py-2 text-white">{String(v ?? "—")}</td>;
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      ) : (
        <EmptyState icon={<BarChart3 className="h-7 w-7" />} title="No data for this report" description="Try a different report type." />
      )}
    </div>
  );
}
