"use client";

import { cn } from "@/lib/utils";
import { ArrowDown, ArrowUp } from "lucide-react";

export type KpiTone = "blue" | "green" | "orange" | "red" | "purple" | "cyan" | "amber" | "slate";

const TONE_MAP: Record<KpiTone, { bg: string; ring: string; icon: string; text: string }> = {
  blue:   { bg: "from-[#0070f3]/10 to-[#181826]",   ring: "ring-[#0070f3]/30",   icon: "bg-[#0070f3] text-white",   text: "text-[#0070f3]" },
  green:  { bg: "from-emerald-500/10 to-[#181826]",  ring: "ring-emerald-500/30",  icon: "bg-emerald-500/100 text-white",  text: "text-emerald-400" },
  orange: { bg: "from-orange-500/10 to-[#181826]",   ring: "ring-orange-500/30",   icon: "bg-orange-500/100 text-white",   text: "text-orange-400" },
  red:    { bg: "from-red-500/10 to-[#181826]",      ring: "ring-red-500/30",      icon: "bg-red-500/100 text-white",      text: "text-red-400" },
  purple: { bg: "from-purple-500/10 to-[#181826]",   ring: "ring-purple-500/30",   icon: "bg-purple-500/100 text-white",   text: "text-purple-400" },
  cyan:   { bg: "from-cyan-500/10 to-[#181826]",     ring: "ring-cyan-500/30",     icon: "bg-cyan-500/100 text-white",     text: "text-cyan-400" },
  amber:  { bg: "from-amber-500/10 to-[#181826]",    ring: "ring-amber-500/30",     icon: "bg-amber-500/100 text-white",    text: "text-amber-400" },
  slate:  { bg: "from-slate-500/10 to-[#181826]",    ring: "ring-slate-500/30",     icon: "bg-white/[0.03]0 text-white",    text: "text-slate-400" },
};

export function KpiCard({
  label, value, icon, tone = "blue", trend, trendDirection, hint, onClick,
}: {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  tone?: KpiTone;
  trend?: string;
  trendDirection?: "up" | "down" | "neutral";
  hint?: string;
  onClick?: () => void;
}) {
  const t = TONE_MAP[tone];
  return (
    <button
      type="button"
      disabled={!onClick}
      onClick={onClick}
      className={cn(
        "group relative flex flex-col gap-3 overflow-hidden rounded-xl p-5 text-left transition-all",
        "bg-gradient-to-br ring-1 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/30",
        t.bg, t.ring,
        onClick ? "cursor-pointer" : "cursor-default"
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</span>
        <span className={cn("flex h-9 w-9 items-center justify-center rounded-lg shadow-md", t.icon)}>
          {icon}
        </span>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-bold tabular-nums text-white">{value}</span>
        {trend && (
          <span className={cn(
            "inline-flex items-center gap-0.5 text-xs font-semibold",
            trendDirection === "up" ? "text-emerald-400" : trendDirection === "down" ? "text-red-400" : "text-slate-500"
          )}>
            {trendDirection === "up" && <ArrowUp className="h-3 w-3" />}
            {trendDirection === "down" && <ArrowDown className="h-3 w-3" />}
            {trend}
          </span>
        )}
      </div>
      {hint && <p className="text-xs text-slate-500">{hint}</p>}
    </button>
  );
}

export function SectionCard({
  title, action, children, className, noPadding,
}: {
  title?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  noPadding?: boolean;
}) {
  return (
    <div className={cn("rounded-xl border border-white/10 bg-[#181826] shadow-sm ring-1 ring-white/5", className)}>
      {(title || action) && (
        <div className="flex items-center justify-between border-b border-white/5 px-5 py-3">
          {title && <h3 className="text-sm font-semibold text-white">{title}</h3>}
          {action}
        </div>
      )}
      <div className={noPadding ? "" : "p-5"}>{children}</div>
    </div>
  );
}
