"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, AreaChart, Area, PieChart, Pie, Cell, Legend,
} from "recharts";

const BLUE = "#0070f3";        // Optinus primary brand blue
const BRIGHT_BLUE = "#0091ff";
const INDIGO = "#8b5cf6";       // matches Optinus JS bundle
const PURPLE = "#8b5cf6";
const ORANGE = "#f97316";
const GREEN = "#14b8a6";        // Optinus teal (from JS bundle)
const AMBER = "#f59e0b";       // Optinus amber
const RED = "#ef4444";
const CYAN = "#06b6d4";         // Optinus cyan

const PALETTE = [BLUE, GREEN, PURPLE, CYAN, AMBER, ORANGE, "#ec4899", "#a855f7"];

const tooltipStyle = {
  background: "#181826",
  border: "1px solid rgba(255,255,255,0.10)",
  borderRadius: 8,
  boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
  fontSize: 12,
  padding: "8px 12px",
  color: "#f4f4f8",
};

export function DemandByClientChart({ data }: { data: { name: string; value: number }[] }) {
  if (!data || data.length === 0) return null;
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -10, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
        <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64728A" }} interval={0} angle={-15} textAnchor="end" height={60} />
        <YAxis tick={{ fontSize: 11, fill: "#64728A" }} allowDecimals={false} />
        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "#EAF3FF" }} />
        <Bar dataKey="value" name="Demands" radius={[6, 6, 0, 0]}>
          {data.map((_, i) => (
            <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function DemandBySkillChart({ data }: { data: { name: string; value: number }[] }) {
  if (!data || data.length === 0) return null;
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart layout="vertical" data={data.slice(0, 8)} margin={{ top: 8, right: 8, left: 20, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 11, fill: "#64728A" }} allowDecimals={false} />
        <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "#64728A" }} width={90} />
        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "#EAF3FF" }} />
        <Bar dataKey="value" name="Demands" radius={[0, 6, 6, 0]} fill={BRIGHT_BLUE} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function DemandByPriorityChart({ data }: { data: { name: string; value: number }[] }) {
  if (!data || data.length === 0) return null;
  const colors: Record<string, string> = { Critical: RED, High: ORANGE, Medium: AMBER, Low: "#94A3B8" };
  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          cx="50%" cy="50%"
          outerRadius={90}
          innerRadius={50}
          paddingAngle={2}
          label={({ name, value }) => `${name}: ${value}`}
          labelLine={false}
        >
          {data.map((entry, i) => (
            <Cell key={i} fill={colors[entry.name] || PALETTE[i]} />
          ))}
        </Pie>
        <Tooltip contentStyle={tooltipStyle} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function CandidatesByStageChart({ data }: { data: { name: string; value: number }[] }) {
  if (!data || data.length === 0) return null;
  const stageColors: Record<string, string> = {
    Sourcing: "#06B6D4",
    "Profile Submitted": INDIGO,
    "Client Review": PURPLE,
    Interview: ORANGE,
    Selected: GREEN,
    Joined: "#15803D",
  };
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -10, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
        <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#64728A" }} angle={-15} textAnchor="end" height={60} interval={0} />
        <YAxis tick={{ fontSize: 11, fill: "#64728A" }} allowDecimals={false} />
        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "#EAF3FF" }} />
        <Bar dataKey="value" name="Candidates" radius={[6, 6, 0, 0]}>
          {data.map((entry, i) => (
            <Cell key={i} fill={stageColors[entry.name] || PALETTE[i]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function ConversionFunnelChart({ data }: { data: { name: string; value: number; color: string }[] }) {
  if (!data || data.length === 0) return null;
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} layout="vertical" margin={{ top: 8, right: 8, left: 20, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 11, fill: "#64728A" }} allowDecimals={false} />
        <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "#64728A" }} width={90} />
        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "#EAF3FF" }} />
        <Bar dataKey="value" name="Count" radius={[0, 6, 6, 0]}>
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function MonthlyTrendChart({ data }: { data: { label: string; created: number; closed: number }[] }) {
  if (!data || data.length === 0) return null;
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -10, bottom: 8 }}>
        <defs>
          <linearGradient id="cCreated" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={BLUE} stopOpacity={0.3} />
            <stop offset="95%" stopColor={BLUE} stopOpacity={0} />
          </linearGradient>
          <linearGradient id="cClosed" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={GREEN} stopOpacity={0.3} />
            <stop offset="95%" stopColor={GREEN} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#64728A" }} />
        <YAxis tick={{ fontSize: 11, fill: "#64728A" }} allowDecimals={false} />
        <Tooltip contentStyle={tooltipStyle} />
        <Legend wrapperStyle={{ fontSize: 11, paddingTop: 4 }} />
        <Area type="monotone" dataKey="created" name="Created" stroke={BLUE} strokeWidth={2} fill="url(#cCreated)" />
        <Area type="monotone" dataKey="closed" name="Closed" stroke={GREEN} strokeWidth={2} fill="url(#cClosed)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function AgingChart({ data }: { data: { label: string; count: number }[] }) {
  if (!data || data.length === 0) return null;
  const colors = ["#10B981", "#22C55E", "#F59E0B", "#F97316", "#EF4444"];
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -10, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#64728A" }} angle={-15} textAnchor="end" height={60} interval={0} />
        <YAxis tick={{ fontSize: 11, fill: "#64728A" }} allowDecimals={false} />
        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "#EAF3FF" }} />
        <Bar dataKey="count" name="Demands" radius={[6, 6, 0, 0]}>
          {data.map((_, i) => (
            <Cell key={i} fill={colors[i % colors.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function SimpleTrendChart({ data, color = BLUE, label = "Value" }: { data: { label: string; value: number }[]; color?: string; label?: string }) {
  if (!data || data.length === 0) return null;
  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: -10, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#64728A" }} />
        <YAxis tick={{ fontSize: 10, fill: "#64728A" }} allowDecimals={false} />
        <Tooltip contentStyle={tooltipStyle} />
        <Line type="monotone" dataKey="value" name={label} stroke={color} strokeWidth={2.5} dot={{ r: 3, fill: color }} />
      </LineChart>
    </ResponsiveContainer>
  );
}
