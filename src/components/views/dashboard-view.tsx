"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/client/api";
import { KpiCard, SectionCard } from "@/components/shared/kpi-card";
import { Skeleton } from "@/components/shared/badges";
import {
  DemandByClientChart, DemandBySkillChart, DemandByPriorityChart,
  CandidatesByStageChart, ConversionFunnelChart, MonthlyTrendChart, AgingChart,
} from "@/components/shared/charts";
import {
  FileText, FolderOpen, AlertTriangle, CheckCircle2, Clock, Users, UserCheck,
  FileSearch, CalendarCheck, TrendingUp, Activity as ActivityIcon, Zap,
} from "lucide-react";

interface DashboardData {
  kpis: {
    totalDemands: number; openDemands: number; newDemands: number; criticalDemands: number;
    agingDemands: number; closedDemands: number;
    totalResources: number; available: number; proposed: number; clientReview: number;
    interview: number; selected: number; joined: number; rejected: number;
    submissionToInterview: number; interviewToSelection: number; selectionToJoining: number;
    overallClosure: number; avgClosureDays: number;
  };
  aging: { label: string; count: number }[];
  charts: {
    byClient: { name: string; value: number }[];
    bySkill: { name: string; value: number }[];
    byPriority: { name: string; value: number }[];
    candidatesByStage: { name: string; value: number }[];
    funnel: { name: string; value: number; color: string }[];
    months: { label: string; created: number; closed: number }[];
  };
}

export function DashboardView({ onDrillDemands, onDrillResources, onDrillKanban }: {
  onDrillDemands: (filter?: { priority?: string; status?: string }) => void;
  onDrillResources: (filter?: { status?: string }) => void;
  onDrillKanban: () => void;
}) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<DashboardData>("/api/dashboard").then(setData).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading || !data) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-32" />)}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-72" />
          <Skeleton className="h-72" />
        </div>
      </div>
    );
  }

  const k = data.kpis;

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Page header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Executive Dashboard</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Real-time view of demand pipeline · Resource availability · Conversion metrics
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-[#181826] px-3 py-1.5 text-xs text-slate-400">
          <span className="h-2 w-2 rounded-full bg-emerald-500/100 animate-pulse" />
          Live data · Updated {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </div>
      </div>

      {/* DEMAND KPIs */}
      <div>
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-3">Demand KPIs</h2>
        <div className="grid gap-4 grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
          <KpiCard label="Total Demands" value={k.totalDemands} tone="blue" icon={<FileText className="h-5 w-5" />} onClick={() => onDrillDemands()} />
          <KpiCard label="Open Demands" value={k.openDemands} tone="cyan" icon={<FolderOpen className="h-5 w-5" />} onClick={() => onDrillDemands({ status: "Open" })} />
          <KpiCard label="New" value={k.newDemands} tone="blue" icon={<Zap className="h-5 w-5" />} trend="fresh" trendDirection="neutral" />
          <KpiCard label="Critical" value={k.criticalDemands} tone="red" icon={<AlertTriangle className="h-5 w-5" />} onClick={() => onDrillDemands({ priority: "Critical" })} />
          <KpiCard label="Aging (>30d)" value={k.agingDemands} tone="amber" icon={<Clock className="h-5 w-5" />} onClick={() => onDrillDemands()} />
          <KpiCard label="Closed" value={k.closedDemands} tone="green" icon={<CheckCircle2 className="h-5 w-5" />} trend={`${k.overallClosure}% closure`} trendDirection="up" />
        </div>
      </div>

      {/* RESOURCE KPIs */}
      <div>
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-3">Resource & Pipeline KPIs</h2>
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4 xl:grid-cols-8">
          <KpiCard label="Total" value={k.totalResources} tone="blue" icon={<Users className="h-5 w-5" />} onClick={() => onDrillResources()} />
          <KpiCard label="Available" value={k.available} tone="green" icon={<UserCheck className="h-5 w-5" />} onClick={() => onDrillResources({ status: "Available" })} />
          <KpiCard label="Proposed" value={k.proposed} tone="purple" icon={<FileSearch className="h-5 w-5" />} onClick={onDrillKanban} />
          <KpiCard label="Client Review" value={k.clientReview} tone="purple" icon={<FileSearch className="h-5 w-5" />} onClick={onDrillKanban} />
          <KpiCard label="Interview" value={k.interview} tone="orange" icon={<CalendarCheck className="h-5 w-5" />} onClick={onDrillKanban} />
          <KpiCard label="Selected" value={k.selected} tone="green" icon={<UserCheck className="h-5 w-5" />} onClick={onDrillKanban} />
          <KpiCard label="Joined" value={k.joined} tone="green" icon={<CheckCircle2 className="h-5 w-5" />} onClick={onDrillKanban} />
          <KpiCard label="Rejected" value={k.rejected} tone="red" icon={<AlertTriangle className="h-5 w-5" />} onClick={onDrillKanban} />
        </div>
      </div>

      {/* CONVERSION METRICS */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-[#0070f3]/20 bg-gradient-to-br from-[#F4F8FF] to-white p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Submission → Interview</span>
            <TrendingUp className="h-4 w-4 text-[#0070f3]" />
          </div>
          <div className="text-3xl font-bold text-[#0070f3]">{k.submissionToInterview}%</div>
          <p className="mt-1 text-xs text-slate-400">of submitted profiles reach interview</p>
        </div>
        <div className="rounded-xl border border-purple-500/20 bg-gradient-to-br from-purple-50 to-white p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Interview → Selection</span>
            <TrendingUp className="h-4 w-4 text-purple-400" />
          </div>
          <div className="text-3xl font-bold text-purple-400">{k.interviewToSelection}%</div>
          <p className="mt-1 text-xs text-slate-400">of interviews convert to selection</p>
        </div>
        <div className="rounded-xl border border-emerald-500/20 bg-gradient-to-br from-emerald-50 to-white p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Selection → Joining</span>
            <TrendingUp className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-bold text-emerald-400">{k.selectionToJoining}%</div>
          <p className="mt-1 text-xs text-slate-400">of selected candidates join</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-gradient-to-br from-slate-50 to-white p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Avg Closure Time</span>
            <ActivityIcon className="h-4 w-4 text-slate-400" />
          </div>
          <div className="text-3xl font-bold text-white">{k.avgClosureDays}<span className="text-base text-slate-400 ml-1">days</span></div>
          <p className="mt-1 text-xs text-slate-400">across all closed demands</p>
        </div>
      </div>

      {/* CHARTS — Row 1 */}
      <div className="grid gap-4 md:grid-cols-2">
        <SectionCard title="Demands by Client" action={<span className="text-xs text-slate-400">Open demands only</span>}>
          <DemandByClientChart data={data.charts.byClient} />
        </SectionCard>
        <SectionCard title="Demands by Skill" action={<span className="text-xs text-slate-400">Top skills</span>}>
          <DemandBySkillChart data={data.charts.bySkill} />
        </SectionCard>
      </div>

      {/* CHARTS — Row 2 */}
      <div className="grid gap-4 md:grid-cols-3">
        <SectionCard title="Demands by Priority">
          <DemandByPriorityChart data={data.charts.byPriority} />
        </SectionCard>
        <SectionCard title="Candidates by Stage" className="md:col-span-2">
          <CandidatesByStageChart data={data.charts.candidatesByStage} />
        </SectionCard>
      </div>

      {/* CHARTS — Row 3 */}
      <div className="grid gap-4 md:grid-cols-2">
        <SectionCard title="Demand Conversion Funnel" action={<span className="text-xs text-slate-400">Submission → Joining</span>}>
          <ConversionFunnelChart data={data.charts.funnel} />
        </SectionCard>
        <SectionCard title="Monthly Demand Creation & Closure" action={<span className="text-xs text-slate-400">Last 6 months</span>}>
          <MonthlyTrendChart data={data.charts.months} />
        </SectionCard>
      </div>

      {/* AGING */}
      <SectionCard title="Demand Aging Distribution" action={<span className="text-xs text-slate-400">Open demands only</span>}>
        <AgingChart data={data.aging} />
      </SectionCard>
    </div>
  );
}
