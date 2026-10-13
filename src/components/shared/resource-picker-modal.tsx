"use client";

import { useEffect, useState, useMemo } from "react";
import { api } from "@/lib/client/api";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search, UserPlus, X, Check, Filter,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { UserAvatar, StatusBadge } from "@/components/shared/badges";

interface PickerResource {
  id: string; resourceId: string; candidateName: string;
  email?: string | null; phone?: string | null;
  primarySkill?: string | null; secondarySkills?: string | null;
  totalExperience?: number | null; currentLocation?: string | null;
  currentEmployer?: string | null; currentDesignation?: string | null;
  noticePeriod?: string | null; expectedRate?: number | null;
  currency: string; employmentType: string; resourceType: string;
  status: string; avatarColor: string;
}

interface ResourcePickerModalProps {
  open: boolean;
  onClose: () => void;
  demandId: string | null;          // the demand to add the resource to
  demandLabel?: string;              // e.g. "DMD-1001 — Senior Java Developer"
  onAssigned?: () => void;           // callback after successful assignment
}

export function ResourcePickerModal({ open, onClose, demandId, demandLabel, onAssigned }: ResourcePickerModalProps) {
  const { toast } = useToast();
  const [resources, setResources] = useState<PickerResource[] | null>(null);
  const [search, setSearch] = useState("");
  const [skillFilter, setSkillFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selected, setSelected] = useState<Set<string>>(new Set()); // selected resource IDs
  const [assigning, setAssigning] = useState(false);
  // IDs already assigned to this demand (so we can grey them out)
  const [alreadyAssignedIds, setAlreadyAssignedIds] = useState<Set<string>>(new Set());

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setSearch("");
      setSkillFilter("");
      setStatusFilter("all");
      setSelected(new Set());
      setAlreadyAssignedIds(new Set());
    }
  }, [open]);

  // Fetch all resources
  useEffect(() => {
    if (!open) return;
    api<{ resources: PickerResource[] }>("/api/resources").then(r => setResources(r.resources)).catch(() => setResources([]));
  }, [open]);

  // Fetch existing assignments for this demand (so we can show "Already assigned")
  useEffect(() => {
    if (!open || !demandId) return;
    api<{ assignments: { resourceId: string }[] }>(`/api/assignments?demandId=${demandId}`).then(r => {
      setAlreadyAssignedIds(new Set(r.assignments.map(a => a.resourceId)));
    }).catch(() => {});
  }, [open, demandId]);

  // Filtered list
  const filtered = useMemo(() => {
    if (!resources) return [];
    const q = search.toLowerCase().trim();
    const skill = skillFilter.toLowerCase().trim();
    return resources.filter(r => {
      if (q) {
        const matches = (
          r.candidateName?.toLowerCase().includes(q) ||
          r.resourceId?.toLowerCase().includes(q) ||
          r.email?.toLowerCase().includes(q) ||
          r.phone?.toLowerCase().includes(q) ||
          r.primarySkill?.toLowerCase().includes(q) ||
          r.currentEmployer?.toLowerCase().includes(q)
        );
        if (!matches) return false;
      }
      if (skill && !r.primarySkill?.toLowerCase().includes(skill)) return false;
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      return true;
    });
  }, [resources, search, skillFilter, statusFilter]);

  const toggleSelect = (id: string) => {
    if (alreadyAssignedIds.has(id)) return; // can't re-assign
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleAssign = async () => {
    if (!demandId || selected.size === 0) return;
    setAssigning(true);
    let created = 0;
    let failed = 0;
    try {
      for (const resourceId of selected) {
        try {
          await api("/api/assignments", {
            method: "POST",
            body: JSON.stringify({ demandId, resourceId, stage: "Profile Submitted" }),
          });
          created++;
        } catch (e: any) {
          // Likely "already assigned" — count as failed but continue
          failed++;
        }
      }
      toast({
        title: `Assigned ${created} resource${created !== 1 ? "s" : ""} to demand`,
        description: failed > 0 ? `${failed} already assigned or failed` : "They now appear on the Kanban board under 'Profile Submitted'",
      });
      onAssigned?.();
      onClose();
    } catch (e: any) {
      toast({ title: "Assignment failed", description: e.message, variant: "destructive" });
    } finally {
      setAssigning(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <UserPlus className="h-5 w-5 text-[#0070f3]" />
            Add Candidate to Demand
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            {demandLabel
              ? <>Pick resources from the database to assign to <strong className="text-white">{demandLabel}</strong>. They'll appear on the Kanban board under "Profile Submitted".</>
              : "Pick resources from the database to assign to this demand."
            }
          </DialogDescription>
        </DialogHeader>

        {/* Search + filter bar */}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, ID, email, phone, skill, employer..."
              className="w-full rounded-lg border border-white/10 bg-white/[0.03] py-2 pl-9 pr-3 text-sm text-white placeholder:text-slate-500 focus:border-[#0070f3] focus:outline-none focus:ring-2 focus:ring-[#0070f3]/30 transition"
            />
          </div>
          <input
            type="text"
            value={skillFilter}
            onChange={(e) => setSkillFilter(e.target.value)}
            placeholder="Filter by skill"
            className="w-40 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-[#0070f3] focus:outline-none"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white focus:border-[#0070f3] focus:outline-none"
          >
            <option value="all">All statuses</option>
            <option value="Available">Available</option>
            <option value="Proposed">Proposed</option>
            <option value="Allocated">Allocated</option>
            <option value="On Hold">On Hold</option>
          </select>
        </div>

        {/* Selection summary */}
        {selected.size > 0 && (
          <div className="mb-3 rounded-lg border border-[#0070f3]/30 bg-[#0070f3]/10 px-3 py-2 text-xs text-[#0070f3] flex items-center gap-2">
            <Check className="h-3.5 w-3.5" />
            <strong>{selected.size}</strong> resource{selected.size !== 1 ? "s" : ""} selected
            <button onClick={() => setSelected(new Set())} className="ml-auto text-[#0070f3]/70 hover:text-[#0070f3]">Clear</button>
          </div>
        )}

        {/* Resource list (scrollable) */}
        <div className="flex-1 overflow-y-auto scrollbar-thin space-y-2 pr-1">
          {resources === null ? (
            <div className="flex items-center justify-center py-12 text-slate-500">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#0070f3] border-t-transparent" />
              <span className="ml-2 text-sm">Loading resources...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Filter className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <div className="text-sm">No resources match your filters</div>
              <div className="text-xs mt-1">Try clearing search or add new resources first</div>
            </div>
          ) : (
            filtered.map(r => {
              const isSelected = selected.has(r.id);
              const isAlreadyAssigned = alreadyAssignedIds.has(r.id);
              return (
                <button
                  key={r.id}
                  onClick={() => toggleSelect(r.id)}
                  disabled={isAlreadyAssigned}
                  className={cn(
                    "w-full flex items-center gap-3 rounded-lg border p-3 text-left transition",
                    isAlreadyAssigned
                      ? "border-white/5 bg-white/[0.01] opacity-40 cursor-not-allowed"
                      : isSelected
                        ? "border-[#0070f3] bg-[#0070f3]/10"
                        : "border-white/10 bg-white/[0.02] hover:border-[#0070f3]/40 hover:bg-white/[0.04]"
                  )}
                >
                  {/* Checkbox / status indicator */}
                  <div className={cn(
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition",
                    isAlreadyAssigned
                      ? "border-emerald-500/50 bg-emerald-500/20"
                      : isSelected
                        ? "border-[#0070f3] bg-[#0070f3]"
                        : "border-white/20"
                  )}>
                    {isAlreadyAssigned ? (
                      <Check className="h-3 w-3 text-emerald-300" />
                    ) : isSelected ? (
                      <Check className="h-3 w-3 text-white" />
                    ) : null}
                  </div>

                  <UserAvatar name={r.candidateName} color={r.avatarColor} size={36} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="font-semibold text-white truncate">{r.candidateName}</div>
                      <span className="text-[10px] text-slate-500">{r.resourceId}</span>
                    </div>
                    <div className="text-[10px] text-slate-400 truncate">
                      {r.currentDesignation || r.technology || "—"} · {r.currentEmployer || "—"}
                    </div>
                  </div>
                  <div className="hidden md:block text-right text-[10px] text-slate-400">
                    {r.primarySkill && <div className="font-medium text-slate-300">{r.primarySkill}</div>}
                    {r.totalExperience != null && <div>{r.totalExperience} yrs exp</div>}
                    {r.currentLocation && <div>{r.currentLocation}</div>}
                  </div>
                  <StatusBadge status={isAlreadyAssigned ? "Proposed" : r.status} />
                  {r.expectedRate != null && (
                    <div className="text-right text-[10px] text-slate-400 shrink-0">
                      <div className="font-semibold text-white">${r.expectedRate.toLocaleString()}</div>
                      <div>{r.currency}</div>
                    </div>
                  )}
                </button>
              );
            })
          )}
        </div>

        <DialogFooter className="border-t border-white/10 pt-3 mt-2">
          <div className="text-xs text-slate-500 mr-auto">
            {filtered.length} of {resources?.length ?? 0} resources shown
            {alreadyAssignedIds.size > 0 && ` · ${alreadyAssignedIds.size} already assigned`}
          </div>
          <Button variant="outline" onClick={onClose} className="border-white/10 text-slate-300 hover:bg-white/5 hover:text-white">
            Cancel
          </Button>
          <Button
            onClick={handleAssign}
            disabled={selected.size === 0 || assigning || !demandId}
            className="bg-[#0070f3] hover:bg-[#0060d3] text-white"
          >
            {assigning ? (
              <>
                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Assigning...
              </>
            ) : (
              <>
                <UserPlus className="h-3.5 w-3.5" /> Assign {selected.size > 0 ? `${selected.size} ` : ""}to Demand
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
