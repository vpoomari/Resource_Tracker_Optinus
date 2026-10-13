"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { STATUS_COLORS, PRIORITY_COLORS, getInitials, avatarColorFor } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const colors = STATUS_COLORS[status] || { bg: "bg-white/[0.03]0/15", text: "text-slate-300", dot: "bg-slate-400" };
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-white/5",
      colors.bg, colors.text, className
    )}>
      <span className={cn("h-1.5 w-1.5 rounded-full", colors.dot)} />
      {status}
    </span>
  );
}

export function PriorityBadge({ priority, className }: { priority: string; className?: string }) {
  const colors = PRIORITY_COLORS[priority] || PRIORITY_COLORS.Medium;
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-white/5",
      colors.bg, colors.text, className
    )}>
      <span className={cn("h-1.5 w-1.5 rounded-full", colors.dot)} />
      {priority}
    </span>
  );
}

export function UserAvatar({ name, color, size = 36 }: { name: string; color?: string; size?: number }) {
  const bg = color || avatarColorFor(name);
  const initials = getInitials(name);
  return (
    <Avatar style={{ width: size, height: size, background: bg }} className="font-semibold text-white shrink-0 ring-1 ring-white/10">
      <AvatarFallback style={{ background: bg }} className="font-semibold text-white text-xs">
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}

export function TagPill({ tag }: { tag: string }) {
  const tagColors: Record<string, string> = {
    "Hot Candidate": "bg-pink-500/100/15 text-pink-300 ring-1 ring-pink-500/20",
    "Immediate Joiner": "bg-emerald-500/100/15 text-emerald-300 ring-1 ring-emerald-500/20",
    "Client Priority": "bg-purple-500/100/15 text-purple-300 ring-1 ring-purple-500/20",
    "Internal": "bg-[#0070f3]/100/15 text-blue-300 ring-1 ring-blue-500/20",
    "External": "bg-white/[0.03]0/15 text-slate-300 ring-1 ring-slate-500/20",
    "Difficult to Source": "bg-orange-500/100/15 text-orange-300 ring-1 ring-orange-500/20",
    "Urgent": "bg-red-500/100/15 text-red-300 ring-1 ring-red-500/20",
  };
  const color = tagColors[tag] || "bg-white/[0.03]0/15 text-slate-300 ring-1 ring-slate-500/20";
  return (
    <span className={cn("inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-medium", color)}>
      {tag}
    </span>
  );
}

export function EmptyState({
  icon, title, description, action, actionLabel,
}: {
  icon: React.ReactNode;
  title: string;
  description?: string;
  action?: () => void;
  actionLabel?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-white/10 bg-gradient-to-b from-[#181826] to-[#0f0f1a] px-6 py-16 text-center ring-1 ring-white/5">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0070f3]/15 text-[#0070f3] ring-1 ring-[#0070f3]/20">
        {icon}
      </div>
      <div>
        <h3 className="text-base font-semibold text-white">{title}</h3>
        {description && <p className="mt-1 text-sm text-slate-400">{description}</p>}
      </div>
      {action && actionLabel && (
        <button
          onClick={action}
          className="mt-2 inline-flex items-center gap-2 rounded-lg bg-[#0070f3] px-4 py-2 text-sm font-semibold text-white shadow-md shadow-[#0070f3]/30 transition hover:bg-[#0060d3] optinus-glow"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-shimmer rounded-md", className)} />;
}
