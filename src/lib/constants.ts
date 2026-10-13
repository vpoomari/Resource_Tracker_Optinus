// Shared constants & types for Optinus Resource Management

export const STAGES = [
  "New",
  "Sourcing",
  "Profile Submitted",
  "Client Review",
  "Interview",
  "Selected",
  "Joined",
  "Closed",
] as const;

export const KANBAN_COLUMNS = [
  "Sourcing",
  "Profile Submitted",
  "Client Review",
  "Interview",
  "Selected",
  "Joined",
] as const;

export const TERMINAL_STATUSES = ["Rejected", "Withdrawn", "Cancelled", "On Hold"] as const;

export const DEMAND_STATUSES = [
  "New",
  "Open",
  "Sourcing",
  "Profiles Submitted",
  "Client Review",
  "Interview",
  "Selected",
  "Fulfilled",
  "On Hold",
  "Cancelled",
  "Closed",
] as const;

export const RESOURCE_STATUSES = [
  "Available",
  "Proposed",
  "Client Review",
  "Interview",
  "Selected",
  "Rejected",
  "On Hold",
  "Withdrawn",
  "Allocated",
  "Joined",
] as const;

export const PRIORITIES = ["Critical", "High", "Medium", "Low"] as const;

export const WORK_MODES = ["Onsite", "Remote", "Hybrid"] as const;

export const EMPLOYMENT_TYPES = ["Full-time", "Contract", "C2H", "Part-time"] as const;
export const RESOURCE_TYPES = ["Internal", "External", "Bench"] as const;

export const ROLES = [
  "Admin",
  "Resource Manager",
  "Recruiter",
  "Demand Manager",
  "Management",
  "Viewer",
] as const;

// Status color mapping (Tailwind classes for badges — dark-theme-friendly tints)
export const STATUS_COLORS: Record<string, { bg: string; text: string; dot: string; bar: string }> = {
  New:              { bg: "bg-blue-500/15",      text: "text-blue-300",       dot: "bg-blue-400",       bar: "bg-blue-500" },
  Sourcing:         { bg: "bg-cyan-500/15",      text: "text-cyan-300",       dot: "bg-cyan-400",       bar: "bg-cyan-500" },
  "Profile Submitted": { bg: "bg-indigo-500/15", text: "text-indigo-300",    dot: "bg-indigo-400",     bar: "bg-indigo-500" },
  "Client Review":  { bg: "bg-purple-500/15",    text: "text-purple-300",     dot: "bg-purple-400",     bar: "bg-purple-500" },
  Interview:        { bg: "bg-orange-500/15",    text: "text-orange-300",     dot: "bg-orange-400",     bar: "bg-orange-500" },
  Selected:         { bg: "bg-emerald-500/15",   text: "text-emerald-300",   dot: "bg-emerald-400",    bar: "bg-emerald-500" },
  Joined:           { bg: "bg-green-500/15",     text: "text-green-300",     dot: "bg-green-500",      bar: "bg-green-600" },
  "On Hold":        { bg: "bg-amber-500/15",     text: "text-amber-300",     dot: "bg-amber-400",       bar: "bg-amber-500" },
  Rejected:         { bg: "bg-red-500/15",       text: "text-red-300",       dot: "bg-red-400",         bar: "bg-red-500" },
  Withdrawn:        { bg: "bg-slate-500/15",     text: "text-slate-300",     dot: "bg-slate-400",       bar: "bg-slate-500" },
  Cancelled:        { bg: "bg-slate-500/15",     text: "text-slate-300",     dot: "bg-slate-400",       bar: "bg-slate-500" },
  Closed:           { bg: "bg-slate-500/20",     text: "text-slate-300",     dot: "bg-slate-500",       bar: "bg-slate-600" },
  Fulfilled:        { bg: "bg-green-500/15",     text: "text-green-300",     dot: "bg-green-400",       bar: "bg-green-500" },
  Open:             { bg: "bg-blue-500/15",      text: "text-blue-300",      dot: "bg-blue-400",       bar: "bg-blue-500" },
  Available:        { bg: "bg-emerald-500/15",   text: "text-emerald-300",   dot: "bg-emerald-400",    bar: "bg-emerald-500" },
  Proposed:         { bg: "bg-indigo-500/15",    text: "text-indigo-300",    dot: "bg-indigo-400",     bar: "bg-indigo-500" },
  Allocated:        { bg: "bg-blue-500/15",      text: "text-blue-300",      dot: "bg-blue-500",       bar: "bg-blue-600" },
};

export const PRIORITY_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  Critical: { bg: "bg-red-500/15",      text: "text-red-300",      dot: "bg-red-400" },
  High:     { bg: "bg-orange-500/15",   text: "text-orange-300",   dot: "bg-orange-400" },
  Medium:   { bg: "bg-amber-500/15",    text: "text-amber-300",    dot: "bg-amber-400" },
  Low:      { bg: "bg-slate-500/15",    text: "text-slate-300",    dot: "bg-slate-400" },
};

export const AVATAR_COLORS = [
  "#0070f3", "#0091ff", "#0EA5E9", "#06B6D4", "#8B5CF6",
  "#A855F7", "#EC4899", "#F43F5E", "#F97316", "#F59E0B",
  "#14b8a6", "#22C55E", "#84CC16", "#6366F1", "#00a0d0",
];

export function getInitials(name: string): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function avatarColorFor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

// Aging buckets
export const AGING_BUCKETS = [
  { label: "0–7 Days",   min: 0,   max: 7 },
  { label: "8–15 Days",  min: 8,   max: 15 },
  { label: "16–30 Days",  min: 16,  max: 30 },
  { label: "31–60 Days",  min: 31,  max: 60 },
  { label: "60+ Days",   min: 61,  max: 99999 },
];

export function demandAgeDays(createdAt: Date): number {
  const ms = Date.now() - new Date(createdAt).getTime();
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
}

// Valid stage transitions (forward + limited backward)
export const VALID_TRANSITIONS: Record<string, string[]> = {
  "New":              ["Sourcing", "On Hold", "Cancelled"],
  "Sourcing":         ["Profile Submitted", "On Hold", "Rejected", "New"],
  "Profile Submitted": ["Client Review", "Rejected", "On Hold", "Sourcing"],
  "Client Review":    ["Interview", "Rejected", "On Hold", "Profile Submitted"],
  "Interview":         ["Selected", "Rejected", "On Hold", "Client Review"],
  "Selected":         ["Joined", "On Hold", "Rejected"],
  "Joined":           ["Selected", "Closed"],
  "Closed":           [],
  "On Hold":          ["Sourcing", "Profile Submitted", "Client Review", "Interview", "Selected"],
  "Rejected":         ["Sourcing"],
  "Withdrawn":        ["Sourcing"],
  "Cancelled":        [],
};
