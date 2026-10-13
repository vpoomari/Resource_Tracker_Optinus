"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { api } from "@/lib/client/api";
import { useToast } from "@/hooks/use-toast";
import { BulkImportModal } from "@/components/shared/bulk-import-modal";
import { StatusBadge, PriorityBadge, EmptyState, Skeleton } from "@/components/shared/badges";
import { SectionCard } from "@/components/shared/kpi-card";
import { demandAgeDays, DEMAND_STATUSES, PRIORITIES, WORK_MODES } from "@/lib/constants";
import {
  Search, SlidersHorizontal, X, FileText, ArrowUpDown, Eye, Pencil, Plus, Download, Upload, Trash2, Edit,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DemandListItem {
  id: string; demandId: string; client: string; account?: string | null; project?: string | null;
  positionTitle: string; primarySkill: string; priority: string; status: string;
  location?: string | null; workMode: string; ownerName?: string | null;
  createdAt: string; targetClosureDate?: string | null;
  _count: { assignments: number };
}

interface FilterOptions {
  clients: string[]; skills: string[]; priorities: string[]; statuses: string[];
  locations: string[]; workModes: string[]; owners: string[];
}

interface Props {
  initialFilter?: { priority?: string; status?: string };
  onOpenDemand: (id: string) => void;
  onNewDemand: () => void;
}

export function DemandsView({ initialFilter, onOpenDemand, onNewDemand, onEditDemand }: Props & { onEditDemand?: (id: string) => void }) {
  const { toast } = useToast();
  const [demands, setDemands] = useState<DemandListItem[] | null>(null);
  const [opts, setOpts] = useState<FilterOptions | null>(null);
  const [search, setSearch] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState<Record<string, string>>(() => ({
    client: "all", skill: "all",
    priority: initialFilter?.priority || "all",
    status: initialFilter?.status || "all",
    location: "all", workMode: "all", ownerId: "all",
  }));
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<DemandListItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const importFileRef = useRef<HTMLInputElement>(null);
  const [bulkImportOpen, setBulkImportOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api<FilterOptions>("/api/filter-options")
      .then(r => { if (!cancelled) setOpts(r); })
      .catch(() => { if (!cancelled) setOpts({ clients: [], skills: [], priorities: [], statuses: [], locations: [], workModes: [], owners: [], employmentTypes: [], resourceTypes: [], tags: [], users: [], clientNames: [] }); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    for (const [k, v] of Object.entries(filters)) if (v && v !== "all") params.set(k, v);
    params.set("sortBy", sortBy);
    params.set("sortDir", sortDir);
    api<{ demands: DemandListItem[] }>(`/api/demands?${params.toString()}`)
      .then(r => { if (!cancelled) setDemands(r.demands); })
      .catch(e => {
        if (cancelled) return;
        toast({ title: "Failed to load demands", description: e.message, variant: "destructive" });
        setDemands([]);
      });
    return () => { cancelled = true; };
  }, [search, filters, sortBy, sortDir]);

  const activeFilters = Object.entries(filters).filter(([_, v]) => v && v !== "all");

  const toggleSort = (col: string) => {
    if (sortBy === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortBy(col); setSortDir("desc"); }
  };

  const exportCsv = async () => {
    try {
      const r = await api<{ rows: Record<string, string | number>[]; filename: string }>(`/api/export?type=demands`);
      const rows = r.rows;
      if (rows.length === 0) { toast({ title: "No data to export" }); return; }
      const headers = Object.keys(rows[0]);
      const csv = [headers.join(","), ...rows.map(r => headers.map(h => `"${String(r[h] ?? "").replace(/"/g, '""')}"`).join(","))].join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = r.filename;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
      toast({ title: `Exported ${rows.length} demands` });
    } catch (e: any) {
      toast({ title: "Export failed", description: e.message, variant: "destructive" });
    }
  };

  const handleImport = async (file: File) => {
    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter(l => l.trim());
      if (lines.length < 2) {
        toast({ title: "Invalid CSV", description: "Need at least header + 1 row", variant: "destructive" });
        return;
      }
      const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, ""));
      const rows: Record<string, string>[] = lines.slice(1).map(line => {
        const cells = line.split(",").map(c => c.trim().replace(/^"|"$/g, ""));
        const row: Record<string, string> = {};
        headers.forEach((h, i) => row[h] = cells[i] || "");
        return row;
      });
      // Validate first
      const preview = await api<{ total: number; valid: number; duplicates: number; errors: number; errorDetails: any[]; validRows: Record<string, string>[] }>("/api/import", { method: "POST", body: JSON.stringify({ type: "demands", rows }) });
      if (preview.valid === 0) {
        toast({ title: "No valid rows", description: `${preview.errors} errors · ${preview.duplicates} duplicates`, variant: "destructive" });
        return;
      }
      const r = await api<{ created: number }>("/api/import", { method: "PUT", body: JSON.stringify({ type: "demands", rows: preview.validRows }) });
      toast({ title: `Imported ${r.created} demands`, description: `${preview.errors} errors · ${preview.duplicates} duplicates skipped` });
    } catch (e: any) {
      toast({ title: "Import failed", description: e.message, variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api(`/api/demands/${deleteTarget.id}`, { method: "DELETE" });
      toast({ title: "Demand deleted", description: `${deleteTarget.demandId} removed permanently` });
      setDeleteTarget(null);
      // Trigger a refetch by toggling filters
      setFilters(f => ({ ...f }));
    } catch (e: any) {
      toast({ title: "Delete failed", description: e.message, variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  if (!demands || !opts) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-16" />
        <Skeleton className="h-12" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Open Demands</h1>
          <p className="text-sm text-slate-400 mt-0.5">{demands.length} demands · {activeFilters.length} filters active</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setBulkImportOpen(true)} className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-[#181826] px-3 py-2 text-sm font-semibold text-white hover:bg-white/[0.03]">
            <Upload className="h-4 w-4" /> Import
          </button>
          <button onClick={exportCsv} className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-[#181826] px-3 py-2 text-sm font-semibold text-white hover:bg-white/[0.03]">
            <Download className="h-4 w-4" /> Export
          </button>
          <button onClick={onNewDemand} className="inline-flex items-center gap-1.5 rounded-lg bg-[#0070f3] px-3.5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#0050c8]">
            <Plus className="h-4 w-4" /> New Demand
          </button>
        </div>
      </div>

      {/* Search + Filters bar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search demand ID, position, client, skill, project..."
            className="w-full rounded-lg border border-white/10 bg-[#181826] py-2 pl-9 pr-3 text-sm placeholder:text-slate-400 focus:border-[#0070f3] focus:outline-none focus:ring-2 focus:ring-[#0070f3]/20"
          />
        </div>
        <button
          onClick={() => setFilterOpen(o => !o)}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-semibold transition",
            activeFilters.length > 0 ? "border-[#0070f3] bg-[#0070f3]/10 text-[#0070f3]" : "border-white/10 bg-[#181826] text-white hover:bg-white/[0.03]"
          )}
        >
          <SlidersHorizontal className="h-4 w-4" /> Filters
          {activeFilters.length > 0 && (
            <span className="ml-1 rounded-full bg-[#0070f3] px-1.5 py-0.5 text-[10px] text-white">{activeFilters.length}</span>
          )}
        </button>
        {(sortBy !== "createdAt" || sortDir !== "desc") && (
          <button onClick={() => { setSortBy("createdAt"); setSortDir("desc"); }} className="text-xs text-slate-400 hover:text-white">
            Reset sort
          </button>
        )}
      </div>

      {/* Active filter chips */}
      {activeFilters.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {activeFilters.map(([k, v]) => (
            <span key={k} className="inline-flex items-center gap-1.5 rounded-full bg-[#0070f3]/10 px-2.5 py-1 text-xs font-medium text-[#0060d3] ring-1 ring-[#0070f3]/20">
              <span className="capitalize">{k}:</span> <span className="font-semibold">{v}</span>
              <button onClick={() => setFilters(f => ({ ...f, [k]: "all" }))} className="hover:text-[#0070f3]">
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          <button onClick={() => setFilters({ client: "all", skill: "all", priority: "all", status: "all", location: "all", workMode: "all", ownerId: "all" })} className="text-xs font-medium text-slate-400 hover:text-[#0070f3] hover:underline">
            Clear all
          </button>
        </div>
      )}

      {/* Filter panel */}
      {filterOpen && (
        <SectionCard title="Filters" noPadding>
          <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { key: "client", label: "Client", options: opts.clients },
              { key: "skill", label: "Primary Skill", options: opts.skills },
              { key: "priority", label: "Priority", options: PRIORITIES as readonly string[] },
              { key: "status", label: "Status", options: DEMAND_STATUSES as readonly string[] },
              { key: "location", label: "Location", options: opts.locations },
              { key: "workMode", label: "Work Mode", options: WORK_MODES as readonly string[] },
            ].map(({ key, label, options }) => (
              <div key={key}>
                <label className="block text-xs font-semibold text-white mb-1">{label}</label>
                <select
                  value={filters[key]}
                  onChange={(e) => setFilters(f => ({ ...f, [key]: e.target.value }))}
                  className="w-full rounded-md border border-white/10 bg-[#181826] px-2 py-1.5 text-sm focus:border-[#0070f3] focus:outline-none"
                >
                  <option value="all">All {label}s</option>
                  {options.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* Table */}
      {demands.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-7 w-7" />}
          title="No demands found"
          description="Try adjusting your filters or create a new demand to get started."
          action={onNewDemand}
          actionLabel="+ Add Demand"
        />
      ) : (
        <SectionCard noPadding>
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-white/[0.03] text-left">
                <tr className="border-b border-white/10">
                  <th className="px-3 py-3">
                    <input type="checkbox" className="h-4 w-4 rounded border-white/15" onChange={(e) => {
                      if (e.target.checked) setSelected(new Set(demands.map(d => d.id)));
                      else setSelected(new Set());
                    }} />
                  </th>
                  {[
                    { key: "demandId", label: "Demand ID" },
                    { key: "positionTitle", label: "Position" },
                    { key: "client", label: "Client" },
                    { key: "primarySkill", label: "Skill" },
                    { key: "priority", label: "Priority" },
                    { key: "status", label: "Status" },
                    { key: "createdAt", label: "Age", sortable: true, custom: "age" },
                    { key: "actions", label: "" },
                  ].map(col => (
                    <th key={col.key} className="px-3 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
                      {col.sortable ? (
                        <button onClick={() => toggleSort(col.custom || col.key)} className="inline-flex items-center gap-1 hover:text-white">
                          {col.label}
                          <ArrowUpDown className="h-3 w-3" />
                        </button>
                      ) : col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {demands.map(d => {
                  const age = demandAgeDays(new Date(d.createdAt));
                  const isSelected = selected.has(d.id);
                  return (
                    <tr key={d.id} className={cn("transition-colors hover:bg-[#0070f3]/[0.06]", isSelected && "bg-[#0070f3]/[0.12]")}>
                      <td className="px-3 py-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            setSelected(s => {
                              const next = new Set(s);
                              if (e.target.checked) next.add(d.id); else next.delete(d.id);
                              return next;
                            });
                          }}
                          className="h-4 w-4 rounded border-white/15"
                        />
                      </td>
                      <td className="px-3 py-3">
                        <button onClick={() => onOpenDemand(d.id)} className="font-semibold text-[#0070f3] hover:underline">
                          {d.demandId}
                        </button>
                      </td>
                      <td className="px-3 py-3">
                        <div className="font-medium text-white">{d.positionTitle}</div>
                        {d.project && <div className="text-xs text-slate-400">{d.project}</div>}
                      </td>
                      <td className="px-3 py-3 text-white">{d.client}</td>
                      <td className="px-3 py-3"><span className="font-medium text-white">{d.primarySkill}</span></td>
                      <td className="px-3 py-3"><PriorityBadge priority={d.priority} /></td>
                      <td className="px-3 py-3"><StatusBadge status={d.status} /></td>
                      <td className="px-3 py-3">
                        <span className={cn("inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold",
                          age > 60 ? "bg-red-500/15 text-red-300" : age > 30 ? "bg-amber-500/15 text-amber-300" : "bg-emerald-500/15 text-emerald-300"
                        )}>
                          {age}d
                        </span>
                        <div className="text-[10px] text-slate-400 mt-0.5">{d._count.assignments} cand.</div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => onOpenDemand(d.id)} title="View" className="rounded-md p-1.5 text-slate-500 hover:bg-white/5 hover:text-[#0070f3]">
                            <Eye className="h-4 w-4" />
                          </button>
                          {onEditDemand && (
                            <button
                              onClick={() => onEditDemand(d.id)}
                              title="Edit demand"
                              className="rounded-md p-1.5 text-slate-500 hover:bg-[#0070f3]/10 hover:text-[#0070f3]"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            onClick={() => setDeleteTarget(d)}
                            title="Delete"
                            className="rounded-md p-1.5 text-slate-500 hover:bg-red-500/10 hover:text-red-400"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}

      {/* Bulk actions */}
      {selected.size > 0 && (
        <div className="sticky bottom-4 left-1/2 -translate-x-1/2 z-30 inline-flex items-center gap-2 rounded-xl border border-white/10 bg-[#181826] px-4 py-2 shadow-lg">
          <span className="text-sm font-semibold text-white">{selected.size} selected</span>
          <button
            onClick={() => { toast({ title: "Bulk export queued" }); exportCsv(); }}
            className="inline-flex items-center gap-1.5 rounded-md bg-[#0070f3] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#0050c8]"
          >
            <Download className="h-3.5 w-3.5" /> Export selected
          </button>
          <button onClick={() => setSelected(new Set())} className="text-xs text-slate-400 hover:underline">Clear</button>
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setDeleteTarget(null)}>
          <div className="w-full max-w-md rounded-xl border border-white/10 bg-[#181826] p-6 shadow-2xl animate-fade-in-up" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/15 text-red-400 shrink-0">
                <Trash2 className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-white">Delete this demand?</h3>
                <p className="mt-1 text-sm text-slate-400">
                  You&apos;re about to permanently delete <strong className="text-white">{deleteTarget.demandId}</strong> — <strong className="text-white">{deleteTarget.positionTitle}</strong> for <strong className="text-white">{deleteTarget.client}</strong>. This will also remove all {deleteTarget._count.assignments} candidate assignment(s) and any attached notes. This action cannot be undone.
                </p>
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setDeleteTarget(null)} disabled={deleting} className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-sm font-semibold text-white hover:bg-white/[0.03]">
                Cancel
              </button>
              <button onClick={handleDelete} disabled={deleting} className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50">
                {deleting ? <><span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" /> Deleting...</> : <><Trash2 className="h-3.5 w-3.5" /> Delete permanently</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Import Modal — drag-drop / paste / click-select */}
      <BulkImportModal
        open={bulkImportOpen}
        onClose={() => setBulkImportOpen(false)}
        entityType="demands"
        onImported={() => setFilters(f => ({ ...f }))}
      />
    </div>
  );
}
