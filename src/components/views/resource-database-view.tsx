"use client";

import { useEffect, useState, useRef } from "react";
import { api } from "@/lib/client/api";
import { useToast } from "@/hooks/use-toast";
import { BulkImportModal } from "@/components/shared/bulk-import-modal";
import { SectionCard } from "@/components/shared/kpi-card";
import { StatusBadge, UserAvatar, EmptyState, Skeleton, TagPill } from "@/components/shared/badges";
import { RESOURCE_STATUSES, EMPLOYMENT_TYPES, RESOURCE_TYPES } from "@/lib/constants";
import {
  Search, SlidersHorizontal, X, Database, Download, Upload, Eye, Clock, Trash2, Edit,
  Briefcase, History, Building2, FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DatabaseResource {
  id: string; resourceId: string; candidateName: string;
  email?: string | null; phone?: string | null;
  currentLocation?: string | null; preferredLocation?: string | null;
  totalExperience?: number | null; relevantExperience?: number | null;
  primarySkill?: string | null; secondarySkills?: string | null;
  technology?: string | null; currentEmployer?: string | null;
  currentDesignation?: string | null; noticePeriod?: string | null;
  expectedRate?: number | null; currency: string;
  employmentType: string; resourceType: string; status: string;
  certifications?: string | null; education?: string | null;
  domainExperience?: string | null; previousClientExp?: string | null;
  remarks?: string | null; tags?: string | null;
  avatarColor: string; createdAt: string; updatedAt: string;
  lastActivity: string;
  lastDemandId?: string | null;
  lastDemandClient?: string | null;
  lastDemandPosition?: string | null;
  lastDemandStatus?: string | null;
  allClientsWorked: string[];
  allStagesReached: string[];
  assignmentCount: number;
  documentCount: number;
  historyCount: number;
  atsScore?: number | null;
  atsScoreDate?: string | null;
}

interface FilterOptions {
  skills: string[]; statuses: string[]; locations: string[];
  employmentTypes: string[]; resourceTypes: string[]; tags: string[];
}

export function ResourceDatabaseView({ onOpenResource, onEditResource }: { onOpenResource: (id: string) => void; onEditResource?: (id: string) => void }) {
  const { toast } = useToast();
  const [resources, setResources] = useState<DatabaseResource[] | null>(null);
  const [opts, setOpts] = useState<FilterOptions | null>(null);
  const [search, setSearch] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState<Record<string, string>>({
    skill: "all", status: "all", location: "all", empType: "all", rType: "all", tag: "all",
  });
  const [deleteTarget, setDeleteTarget] = useState<DatabaseResource | null>(null);
  const [deleting, setDeleting] = useState(false);
  const importFileRef = useRef<HTMLInputElement>(null) as any;
  const [bulkImportOpen, setBulkImportOpen] = useState(false);

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
    api<{ resources: DatabaseResource[]; total: number }>(`/api/resources-database?${params.toString()}`)
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
      a.href = url; a.download = `resource-database-${Date.now()}.csv`;
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
      const r = await api<{ created: number }>("/api/import", { method: "PUT", body: JSON.stringify({ type: "resources", rows }) });
      toast({ title: `Imported ${r.created} resources` });
      // Refresh
      setFilters(f => ({ ...f }));
    } catch (e: any) {
      toast({ title: "Import failed", description: e.message, variant: "destructive" });
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
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Database className="h-6 w-6 text-[#0070f3]" /> Resource Database
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">
            {resources.length} historical records · full archive of all resources ever tracked
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setBulkImportOpen(true)} className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-[#181826] px-3 py-2 text-sm font-semibold text-white hover:bg-white/[0.03]">
            <Upload className="h-4 w-4" /> Import
          </button>
          <button onClick={exportCsv} className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-[#181826] px-3 py-2 text-sm font-semibold text-white hover:bg-white/[0.03]">
            <Download className="h-4 w-4" /> Export
          </button>
        </div>
      </div>

      {/* Search + filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, ID, skill, employer, client, domain..."
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

      {/* Records */}
      {resources.length === 0 ? (
        <EmptyState
          icon={<Database className="h-7 w-7" />}
          title="No resources found"
          description="The database is empty for the current filters. Try clearing them or import records."
        />
      ) : (
        <SectionCard noPadding>
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-sm">
              <thead className="bg-white/[0.03] text-left">
                <tr className="border-b border-white/10">
                  <th className="px-3 py-3 text-xs font-semibold uppercase text-slate-400">Candidate</th>
                  <th className="px-3 py-3 text-xs font-semibold uppercase text-slate-400">Skill / Exp</th>
                  <th className="px-3 py-3 text-xs font-semibold uppercase text-slate-400">Employer</th>
                  <th className="px-3 py-3 text-xs font-semibold uppercase text-slate-400">Status</th>
                  <th className="px-3 py-3 text-xs font-semibold uppercase text-slate-400">Last Activity</th>
                  <th className="px-3 py-3 text-xs font-semibold uppercase text-slate-400">Last Demand</th>
                  <th className="px-3 py-3 text-xs font-semibold uppercase text-slate-400">Clients Worked</th>
                  <th className="px-3 py-3 text-xs font-semibold uppercase text-slate-400">Records</th>
                  <th className="px-3 py-3 text-xs font-semibold uppercase text-slate-400">ATS Score</th>
                  <th className="px-3 py-3 text-xs font-semibold uppercase text-slate-400">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {resources.map(r => {
                  const lastActivity = new Date(r.lastActivity);
                  const activityDays = Math.floor((Date.now() - lastActivity.getTime()) / (1000 * 60 * 60 * 24));
                  const tags = r.tags?.split(",").map(t => t.trim()).filter(Boolean) || [];
                  return (
                    <tr key={r.id} className="hover:bg-[#0070f3]/[0.06]">
                      <td className="px-3 py-3">
                        <button onClick={() => onOpenResource(r.id)} className="flex items-center gap-2.5">
                          <UserAvatar name={r.candidateName} color={r.avatarColor} size={36} />
                          <div className="text-left">
                            <div className="font-semibold text-white hover:text-[#0070f3]">{r.candidateName}</div>
                            <div className="text-[10px] text-slate-400">{r.resourceId}</div>
                          </div>
                        </button>
                        {tags.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-0.5">
                            {tags.slice(0, 2).map(t => <TagPill key={t} tag={t} />)}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <div className="font-medium text-white">{r.primarySkill || "—"}</div>
                        <div className="text-[10px] text-slate-400">{r.totalExperience ?? 0} yrs · {r.technology || "—"}</div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="font-medium text-white">{r.currentEmployer || "—"}</div>
                        <div className="text-[10px] text-slate-400">{r.currentDesignation || ""}</div>
                      </td>
                      <td className="px-3 py-3"><StatusBadge status={r.status} /></td>
                      <td className="px-3 py-3">
                        <div className="inline-flex items-center gap-1 text-xs">
                          <Clock className="h-3 w-3 text-slate-400" />
                          <span className="text-slate-400">{activityDays === 0 ? "today" : activityDays < 30 ? `${activityDays}d ago` : new Date(r.lastActivity).toLocaleDateString()}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        {r.lastDemandId ? (
                          <>
                            <div className="font-mono text-xs text-[#0070f3]">{r.lastDemandId}</div>
                            <div className="text-[10px] text-slate-400">{r.lastDemandClient}</div>
                            <div className="text-[10px] text-slate-400">{r.lastDemandPosition}</div>
                          </>
                        ) : <span className="text-xs text-slate-400">—</span>}
                      </td>
                      <td className="px-3 py-3">
                        {r.allClientsWorked.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {r.allClientsWorked.slice(0, 3).map(c => (
                              <span key={c} className="inline-flex items-center gap-1 rounded-md bg-slate-500/15 px-1.5 py-0.5 text-[10px] text-slate-300">
                                <Building2 className="h-2.5 w-2.5" /> {c}
                              </span>
                            ))}
                            {r.allClientsWorked.length > 3 && (
                              <span className="text-[10px] text-slate-400">+{r.allClientsWorked.length - 3}</span>
                            )}
                          </div>
                        ) : <span className="text-xs text-slate-400">—</span>}
                      </td>
                      <td className="px-3 py-3">
                        <div className="space-y-0.5 text-[10px]">
                          <div className="inline-flex items-center gap-1 text-slate-400">
                            <Briefcase className="h-2.5 w-2.5" /> {r.assignmentCount} assignments
                          </div>
                          <div className="inline-flex items-center gap-1 text-slate-400">
                            <FileText className="h-2.5 w-2.5" /> {r.documentCount} CVs
                          </div>
                          <div className="inline-flex items-center gap-1 text-slate-400">
                            <History className="h-2.5 w-2.5" /> {r.historyCount} events
                          </div>
                        </div>
                      </td>
                      {/* ATS Score */}
                      <td className="px-3 py-3">
                        {r.atsScore != null ? (
                          <div className="flex flex-col gap-0.5">
                            <span className={cn(
                              "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-bold",
                              (r.atsScore || 0) >= 80 ? "bg-emerald-500/15 text-emerald-300"
                              : (r.atsScore || 0) >= 65 ? "bg-green-500/15 text-green-300"
                              : (r.atsScore || 0) >= 45 ? "bg-amber-500/15 text-amber-300"
                              : (r.atsScore || 0) >= 25 ? "bg-orange-500/15 text-orange-300"
                              : "bg-red-500/15 text-red-300"
                            )}>
                              {r.atsScore}%
                            </span>
                            {r.atsScoreDate && (
                              <span className="text-[9px] text-slate-500">
                                {new Date(r.atsScoreDate).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-600">Not scored</span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => onOpenResource(r.id)} title="View" className="rounded-md p-1.5 text-slate-500 hover:bg-white/5 hover:text-[#0070f3]">
                            <Eye className="h-4 w-4" />
                          </button>
                          {onEditResource && (
                            <button
                              onClick={() => onEditResource(r.id)}
                              title="Edit resource"
                              className="rounded-md p-1.5 text-slate-500 hover:bg-[#0070f3]/10 hover:text-[#0070f3]"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            onClick={() => setDeleteTarget(r)}
                            title="Delete resource"
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
                  You&apos;re about to permanently delete <strong className="text-white">{deleteTarget.candidateName}</strong> ({deleteTarget.resourceId}). This will also remove all {deleteTarget.assignmentCount} demand assignment(s), {deleteTarget.documentCount} CV document(s), {deleteTarget.historyCount} history event(s), and any notes. This action cannot be undone.
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
