"use client";

import { useEffect, useState, useRef } from "react";
import { api } from "@/lib/client/api";
import { useToast } from "@/hooks/use-toast";
import { BulkImportModal } from "@/components/shared/bulk-import-modal";
import { StatusBadge, UserAvatar, EmptyState, Skeleton, TagPill } from "@/components/shared/badges";
import { SectionCard } from "@/components/shared/kpi-card";
import { RESOURCE_STATUSES, EMPLOYMENT_TYPES, RESOURCE_TYPES } from "@/lib/constants";
import {
  Search, SlidersHorizontal, X, Users, Plus, Download, Upload, Eye, Pencil, Trash2, Edit,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ResourceListItem {
  id: string; resourceId: string; candidateName: string; email?: string | null;
  phone?: string | null; primarySkill?: string | null; technology?: string | null;
  totalExperience?: number | null; currentLocation?: string | null;
  noticePeriod?: string | null; expectedRate?: number | null; currency: string;
  employmentType: string; resourceType: string; status: string; tags?: string | null;
  avatarColor: string;
  _count: { assignments: number };
}

interface FilterOptions {
  skills: string[]; statuses: string[]; locations: string[];
  employmentTypes: string[]; resourceTypes: string[]; tags: string[];
}

export function ResourcesView({ initialFilter, onOpenResource, onNewResource, onEditResource }: {
  initialFilter?: { status?: string };
  onOpenResource: (id: string) => void;
  onNewResource: () => void;
  onEditResource?: (id: string) => void;
}) {
  const { toast } = useToast();
  const [resources, setResources] = useState<ResourceListItem[] | null>(null);
  const [opts, setOpts] = useState<FilterOptions | null>(null);
  const [search, setSearch] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState<Record<string, string>>(() => ({
    skill: "all",
    status: initialFilter?.status || "all",
    location: "all", empType: "all", rType: "all", tag: "all",
  }));
  const importFileRef = useRef<HTMLInputElement>(null);
  const [deleteTarget, setDeleteTarget] = useState<ResourceListItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [bulkImportOpen, setBulkImportOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api<FilterOptions>("/api/filter-options")
      .then(r => { if (!cancelled) setOpts(r); })
      .catch(() => { if (!cancelled) setOpts({ skills: [], statuses: [], locations: [], employmentTypes: [], resourceTypes: [], tags: [] }); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    for (const [k, v] of Object.entries(filters)) if (v && v !== "all") params.set(k, v);
    api<{ resources: ResourceListItem[] }>(`/api/resources?${params.toString()}`)
      .then(r => { if (!cancelled) setResources(r.resources); })
      .catch(e => {
        if (cancelled) return;
        toast({ title: "Failed to load", description: e.message, variant: "destructive" });
        setResources([]);
      });
    return () => { cancelled = true; };
  }, [search, filters]);

  const activeFilters = Object.entries(filters).filter(([_, v]) => v && v !== "all");

  const exportCsv = async () => {
    try {
      const r = await api<{ rows: Record<string, string | number>[]; filename: string }>(`/api/export?type=resources`);
      const rows = r.rows;
      if (!rows.length) { toast({ title: "No data to export" }); return; }
      const headers = Object.keys(rows[0]);
      const csv = [headers.join(","), ...rows.map(r => headers.map(h => `"${String(r[h] ?? "").replace(/"/g, '""')}"`).join(","))].join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = r.filename;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
      toast({ title: `Exported ${rows.length} resources` });
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
      const preview = await api<{ total: number; valid: number; duplicates: number; errors: number; validRows: Record<string, string>[] }>("/api/import", { method: "POST", body: JSON.stringify({ type: "resources", rows }) });
      if (preview.valid === 0) {
        toast({ title: "No valid rows", description: `${preview.errors} errors`, variant: "destructive" });
        return;
      }
      const r = await api<{ created: number }>("/api/import", { method: "PUT", body: JSON.stringify({ type: "resources", rows: preview.validRows }) });
      toast({ title: `Imported ${r.created} resources`, description: `${preview.errors} errors · ${preview.duplicates} duplicates skipped` });
    } catch (e: any) {
      toast({ title: "Import failed", description: e.message, variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api(`/api/resources/${deleteTarget.id}`, { method: "DELETE" });
      toast({ title: "Resource deleted", description: `${deleteTarget.resourceId} — ${deleteTarget.candidateName} removed permanently` });
      setDeleteTarget(null);
      // Trigger a refetch by toggling filters
      setFilters(f => ({ ...f }));
    } catch (e: any) {
      toast({ title: "Delete failed", description: e.message, variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  if (!resources || !opts) {
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Resources</h1>
          <p className="text-sm text-slate-400 mt-0.5">{resources.length} resources · {activeFilters.length} filters active</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setBulkImportOpen(true)} className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-[#181826] px-3 py-2 text-sm font-semibold text-white hover:bg-white/[0.03]">
            <Upload className="h-4 w-4" /> Import
          </button>
          <button onClick={exportCsv} className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-[#181826] px-3 py-2 text-sm font-semibold text-white hover:bg-white/[0.03]">
            <Download className="h-4 w-4" /> Export
          </button>
          <button onClick={onNewResource} className="inline-flex items-center gap-1.5 rounded-lg bg-[#0070f3] px-3.5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#0050c8]">
            <Plus className="h-4 w-4" /> New Resource
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, ID, email, phone, skill, employer..."
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
      </div>

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
          <button onClick={() => setFilters({ skill: "all", status: "all", location: "all", empType: "all", rType: "all", tag: "all" })} className="text-xs font-medium text-slate-400 hover:underline">
            Clear all
          </button>
        </div>
      )}

      {filterOpen && (
        <SectionCard title="Filters" noPadding>
          <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { key: "skill", label: "Primary Skill", options: opts.skills },
              { key: "status", label: "Status", options: RESOURCE_STATUSES as readonly string[] },
              { key: "location", label: "Location", options: opts.locations },
              { key: "empType", label: "Employment Type", options: EMPLOYMENT_TYPES as readonly string[] },
              { key: "rType", label: "Resource Type", options: RESOURCE_TYPES as readonly string[] },
              { key: "tag", label: "Tag", options: opts.tags },
            ].map(({ key, label, options }) => (
              <div key={key}>
                <label className="block text-xs font-semibold text-white mb-1">{label}</label>
                <select
                  value={filters[key]}
                  onChange={(e) => setFilters(f => ({ ...f, [key]: e.target.value }))}
                  className="w-full rounded-md border border-white/10 bg-[#181826] px-2 py-1.5 text-sm focus:border-[#0070f3] focus:outline-none"
                >
                  <option value="all">All</option>
                  {options.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {resources.length === 0 ? (
        <EmptyState
          icon={<Users className="h-7 w-7" />}
          title="No resources found"
          description="Try adjusting your filters or add a new resource."
          action={onNewResource}
          actionLabel="+ Add Resource"
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {resources.map(r => {
            const tags = r.tags?.split(",").map(t => t.trim()).filter(Boolean) || [];
            return (
              <div
                key={r.id}
                onClick={() => onOpenResource(r.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpenResource(r.id); } }}
                className="group relative rounded-xl border border-white/10 bg-[#181826] p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-[#0070f3] hover:shadow-md cursor-pointer"
              >
                {/* Action buttons (top-right corner — Edit + Delete) */}
                <div className="absolute right-2 top-2 z-10 flex items-center gap-0.5 opacity-0 transition group-hover:opacity-100">
                  {onEditResource && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onEditResource(r.id); }}
                      title="Edit resource"
                      className="rounded-md p-1 text-slate-300 transition hover:bg-[#0070f3]/10 hover:text-[#0070f3]"
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); setDeleteTarget(r); }}
                    title="Delete resource"
                    className="rounded-md p-1 text-slate-300 transition hover:bg-red-500/10 hover:text-red-400"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="flex items-start gap-3 pr-14">
                  <UserAvatar name={r.candidateName} color={r.avatarColor} size={42} />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-white group-hover:text-[#0070f3] truncate">{r.candidateName}</div>
                    <div className="text-[10px] text-slate-400">{r.resourceId} · {r.currentDesignation || r.technology || "—"}</div>
                  </div>
                  <StatusBadge status={r.status} />
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <div className="text-[10px] uppercase text-slate-400">Skill</div>
                    <div className="font-medium text-white">{r.primarySkill || "—"}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase text-slate-400">Experience</div>
                    <div className="font-medium text-white">{r.totalExperience ?? 0} yrs</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase text-slate-400">Location</div>
                    <div className="font-medium text-white">{r.currentLocation || "—"}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase text-slate-400">Notice</div>
                    <div className="font-medium text-white">{r.noticePeriod || "—"}</div>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-white/5 pt-2">
                  <span className="text-xs text-slate-400">{r._count.assignments} demand(s)</span>
                  {r.expectedRate && <span className="text-xs font-semibold text-[#0060d3]">${r.expectedRate.toLocaleString()} <span className="text-slate-400 font-normal">{r.currency}</span></span>}
                </div>
                {tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {tags.slice(0, 3).map(t => <TagPill key={t} tag={t} />)}
                  </div>
                )}
              </div>
            );
          })}
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
                <h3 className="text-base font-bold text-white">Delete this resource?</h3>
                <p className="mt-1 text-sm text-slate-400">
                  You&apos;re about to permanently delete <strong className="text-white">{deleteTarget.candidateName}</strong> ({deleteTarget.resourceId}). This will also remove all {deleteTarget._count.assignments} demand assignment(s), CVs, notes, and status history. This action cannot be undone.
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
        entityType="resources"
        onImported={() => setFilters(f => ({ ...f }))}
      />
    </div>
  );
}
