"use client";

import { useEffect, useState, useMemo } from "react";
import { api } from "@/lib/client/api";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Search, UserPlus, X, Check, ArrowRight, Briefcase, ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { UserAvatar, StatusBadge, PriorityBadge } from "@/components/shared/badges";
import { KANBAN_COLUMNS, VALID_TRANSITIONS } from "@/lib/constants";

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

interface DemandOption {
  id: string; demandId: string; client: string;
  positionTitle: string; primarySkill: string; priority: string; status: string;
  project?: string | null;
  _count: { assignments: number };
}

interface AddToKanbanModalProps {
  open: boolean;
  onClose: () => void;
  onAssigned?: () => void;  // callback after successful commit (usually refetch Kanban)
}

export function AddToKanbanModal({ open, onClose, onAssigned }: AddToKanbanModalProps) {
  const { toast } = useToast();
  const [step, setStep] = useState<1 | 2>(1);
  // Step 1 state
  const [demands, setDemands] = useState<DemandOption[] | null>(null);
  const [selectedDemandId, setSelectedDemandId] = useState<string | null>(null);
  const [demandSearch, setDemandSearch] = useState("");
  // Step 2 state
  const [resources, setResources] = useState<PickerResource[] | null>(null);
  const [resourceSearch, setResourceSearch] = useState("");
  const [skillFilter, setSkillFilter] = useState("");
  const [selectedResourceIds, setSelectedResourceIds] = useState<Set<string>>(new Set());
  const [alreadyAssignedResourceIds, setAlreadyAssignedResourceIds] = useState<Set<string>>(new Set());
  const [stage, setStage] = useState<string>("Profile Submitted");
  const [assigning, setAssigning] = useState(false);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setStep(1);
      setSelectedDemandId(null);
      setDemandSearch("");
      setResourceSearch("");
      setSkillFilter("");
      setSelectedResourceIds(new Set());
      setAlreadyAssignedResourceIds(new Set());
      setStage("Profile Submitted");
    }
  }, [open]);

  // Fetch all demands (we'll filter to open ones)
  useEffect(() => {
    if (!open) return;
    api<{ demands: DemandOption[] }>("/api/demands?sortBy=createdAt&sortDir=desc").then(r => {
      // Only show demands that are not Closed / Cancelled / Fulfilled
      const openStatuses = ["New", "Open", "Sourcing", "Profiles Submitted", "Client Review", "Interview", "Selected", "On Hold"];
      setDemands(r.demands.filter(d => openStatuses.includes(d.status)));
    }).catch(() => setDemands([]));
  }, [open]);

  // Fetch all resources (when user advances to step 2)
  useEffect(() => {
    if (!open || step !== 2) return;
    api<{ resources: PickerResource[] }>("/api/resources").then(r => setResources(r.resources)).catch(() => setResources([]));
  }, [open, step]);

  // Fetch already-assigned resource IDs when a demand is selected (step 2)
  useEffect(() => {
    if (!open || step !== 2 || !selectedDemandId) return;
    api<{ assignments: { resourceId: string }[] }>(`/api/assignments?demandId=${selectedDemandId}`).then(r => {
      setAlreadyAssignedResourceIds(new Set(r.assignments.map(a => a.resourceId)));
    }).catch(() => setAlreadyAssignedResourceIds(new Set()));
  }, [open, step, selectedDemandId]);

  // Filtered demands (step 1)
  const filteredDemands = useMemo(() => {
    if (!demands) return [];
    const q = demandSearch.toLowerCase().trim();
    if (!q) return demands;
    return demands.filter(d =>
      d.demandId.toLowerCase().includes(q) ||
      d.positionTitle.toLowerCase().includes(q) ||
      d.client.toLowerCase().includes(q) ||
      d.primarySkill.toLowerCase().includes(q) ||
      (d.project || "").toLowerCase().includes(q)
    );
  }, [demands, demandSearch]);

  // Filtered resources (step 2)
  const filteredResources = useMemo(() => {
    if (!resources) return [];
    const q = resourceSearch.toLowerCase().trim();
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
      return true;
    });
  }, [resources, resourceSearch, skillFilter]);

  const selectedDemand = demands?.find(d => d.id === selectedDemandId);

  const toggleResource = (id: string) => {
    if (alreadyAssignedResourceIds.has(id)) return;
    setSelectedResourceIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleAssign = async () => {
    if (!selectedDemandId || selectedResourceIds.size === 0) return;
    setAssigning(true);
    let created = 0;
    let failed = 0;
    try {
      for (const resourceId of selectedResourceIds) {
        try {
          await api("/api/assignments", {
            method: "POST",
            body: JSON.stringify({ demandId: selectedDemandId, resourceId, stage }),
          });
          created++;
        } catch (e) {
          failed++;
        }
      }
      toast({
        title: `Added ${created} resource${created !== 1 ? "s" : ""} to Kanban`,
        description: failed > 0
          ? `${failed} already assigned or failed`
          : `Stage: ${stage} — refresh the board to see the new cards`,
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
            Add Resources to Kanban Board
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            {step === 1
              ? <>Step 1 of 2 — pick a demand to add candidates to.</>
              : <>Step 2 of 2 — pick resources from the database to assign to <strong className="text-white">{selectedDemand?.demandId}</strong>.</>
            }
          </DialogDescription>
        </DialogHeader>

        {/* Progress indicator */}
        <div className="flex items-center gap-2 mb-3 text-xs">
          <div className={cn("flex items-center gap-1.5 rounded-full px-2.5 py-1 font-semibold",
            step === 1 ? "bg-[#0070f3]/15 text-[#0070f3] ring-1 ring-[#0070f3]/30" : "bg-emerald-500/15 text-emerald-300")}>
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#0070f3] text-[10px] text-white">1</span>
            Pick Demand
            {step === 2 && <Check className="h-3 w-3" />}
          </div>
          <ArrowRight className="h-3 w-3 text-slate-500" />
          <div className={cn("flex items-center gap-1.5 rounded-full px-2.5 py-1 font-semibold",
            step === 2 ? "bg-[#0070f3]/15 text-[#0070f3] ring-1 ring-[#0070f3]/30" : "bg-white/5 text-slate-400")}>
            <span className={cn("flex h-4 w-4 items-center justify-center rounded-full text-[10px]",
              step === 2 ? "bg-[#0070f3] text-white" : "bg-white/10 text-slate-400")}>2</span>
            Pick Resources
          </div>
          <div className="ml-auto text-slate-500">
            {step === 1 && `${filteredDemands.length} open demands`}
            {step === 2 && `${filteredResources.length} resources available`}
          </div>
        </div>

        {/* ─── STEP 1: PICK DEMAND ─── */}
        {step === 1 && (
          <div className="flex-1 overflow-hidden flex flex-col">
            <div className="relative mb-3">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={demandSearch}
                onChange={(e) => setDemandSearch(e.target.value)}
                placeholder="Search demands by ID, position, client, skill, project..."
                className="w-full rounded-lg border border-white/10 bg-white/[0.03] py-2 pl-9 pr-3 text-sm text-white placeholder:text-slate-500 focus:border-[#0070f3] focus:outline-none focus:ring-2 focus:ring-[#0070f3]/30"
              />
            </div>
            <div className="flex-1 overflow-y-auto scrollbar-thin space-y-2 pr-1">
              {demands === null ? (
                <div className="flex items-center justify-center py-12 text-slate-500">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#0070f3] border-t-transparent" />
                  <span className="ml-2 text-sm">Loading demands...</span>
                </div>
              ) : filteredDemands.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <Briefcase className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <div className="text-sm">No open demands match your search</div>
                  <div className="text-xs mt-1">Create a demand first, or clear the search</div>
                </div>
              ) : (
                filteredDemands.map(d => {
                  const isSelected = selectedDemandId === d.id;
                  return (
                    <button
                      key={d.id}
                      onClick={() => setSelectedDemandId(isSelected ? null : d.id)}
                      className={cn(
                        "w-full flex items-center gap-3 rounded-lg border p-3 text-left transition",
                        isSelected
                          ? "border-[#0070f3] bg-[#0070f3]/10"
                          : "border-white/10 bg-white/[0.02] hover:border-[#0070f3]/40 hover:bg-white/[0.04]"
                      )}
                    >
                      <div className={cn(
                        "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition",
                        isSelected ? "border-[#0070f3] bg-[#0070f3]" : "border-white/20"
                      )}>
                        {isSelected && <Check className="h-3 w-3 text-white" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-[#0070f3]">{d.demandId}</span>
                          <span className="font-semibold text-white truncate">{d.positionTitle}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 truncate">
                          {d.client} · {d.primarySkill} {d.project ? ` · ${d.project}` : ""}
                        </div>
                      </div>
                      <PriorityBadge priority={d.priority} />
                      <StatusBadge status={d.status} />
                      <div className="text-[10px] text-slate-500 shrink-0">
                        <div className="font-semibold text-slate-300">{d._count.assignments}</div>
                        <div>cand.</div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* ─── STEP 2: PICK RESOURCES ─── */}
        {step === 2 && (
          <div className="flex-1 overflow-hidden flex flex-col">
            {/* Selected demand summary */}
            <div className="mb-3 flex items-center gap-2 rounded-lg border border-[#0070f3]/30 bg-[#0070f3]/[0.06] px-3 py-2">
              <Briefcase className="h-4 w-4 text-[#0070f3] shrink-0" />
              <div className="flex-1 min-w-0 text-xs">
                <span className="font-mono font-semibold text-[#0070f3]">{selectedDemand?.demandId}</span>
                <span className="text-slate-300"> · {selectedDemand?.positionTitle} · {selectedDemand?.client}</span>
              </div>
              <button
                onClick={() => { setStep(1); setSelectedResourceIds(new Set()); }}
                className="text-[10px] text-slate-400 hover:text-white underline"
              >
                ← Change demand
              </button>
            </div>

            {/* Search + filter + stage selector */}
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={resourceSearch}
                  onChange={(e) => setResourceSearch(e.target.value)}
                  placeholder="Search resources by name, ID, email, skill, employer..."
                  className="w-full rounded-lg border border-white/10 bg-white/[0.03] py-2 pl-9 pr-3 text-sm text-white placeholder:text-slate-500 focus:border-[#0070f3] focus:outline-none"
                />
              </div>
              <input
                type="text"
                value={skillFilter}
                onChange={(e) => setSkillFilter(e.target.value)}
                placeholder="Filter by skill"
                className="w-40 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-[#0070f3] focus:outline-none"
              />
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-400">Stage:</span>
                <select
                  value={stage}
                  onChange={(e) => setStage(e.target.value)}
                  className="rounded-lg border border-white/10 bg-white/[0.03] px-2 py-2 text-sm text-white focus:border-[#0070f3] focus:outline-none"
                >
                  {KANBAN_COLUMNS.map(s => <option key={s} value={s}>{s}</option>)}
                  <option value="Sourcing">Sourcing</option>
                  <option value="On Hold">On Hold</option>
                </select>
              </div>
            </div>

            {/* Selection summary */}
            {selectedResourceIds.size > 0 && (
              <div className="mb-3 rounded-lg border border-[#0070f3]/30 bg-[#0070f3]/10 px-3 py-2 text-xs text-[#0070f3] flex items-center gap-2">
                <Check className="h-3.5 w-3.5" />
                <strong>{selectedResourceIds.size}</strong> resource{selectedResourceIds.size !== 1 ? "s" : ""} selected → will be added at <strong>{stage}</strong>
                <button onClick={() => setSelectedResourceIds(new Set())} className="ml-auto text-[#0070f3]/70 hover:text-[#0070f3]">Clear</button>
              </div>
            )}

            {/* Resource list */}
            <div className="flex-1 overflow-y-auto scrollbar-thin space-y-2 pr-1">
              {resources === null ? (
                <div className="flex items-center justify-center py-12 text-slate-500">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#0070f3] border-t-transparent" />
                  <span className="ml-2 text-sm">Loading resources...</span>
                </div>
              ) : filteredResources.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <Search className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <div className="text-sm">No resources match your filters</div>
                  <div className="text-xs mt-1">Add resources first, or clear the search</div>
                </div>
              ) : (
                filteredResources.map(r => {
                  const isSelected = selectedResourceIds.has(r.id);
                  const isAlreadyAssigned = alreadyAssignedResourceIds.has(r.id);
                  return (
                    <button
                      key={r.id}
                      onClick={() => toggleResource(r.id)}
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
                          {isAlreadyAssigned && <span className="text-[10px] text-emerald-400 font-semibold">already on this demand</span>}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate">
                          {r.currentDesignation || r.technology || "—"} · {r.currentEmployer || "—"}
                        </div>
                      </div>
                      <div className="hidden md:block text-right text-[10px] text-slate-400">
                        {r.primarySkill && <div className="font-medium text-slate-300">{r.primarySkill}</div>}
                        {r.totalExperience != null && <div>{r.totalExperience} yrs</div>}
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
          </div>
        )}

        <DialogFooter className="border-t border-white/10 pt-3 mt-2">
          <div className="text-xs text-slate-500 mr-auto">
            {step === 1 && `${filteredDemands.length} open demands available`}
            {step === 2 && `${filteredResources.length} of ${resources?.length ?? 0} resources shown${alreadyAssignedResourceIds.size > 0 ? ` · ${alreadyAssignedResourceIds.size} already on this demand` : ""}`}
          </div>
          <Button variant="outline" onClick={onClose} className="border-white/10 text-slate-300 hover:bg-white/5 hover:text-white">
            Cancel
          </Button>
          {step === 1 ? (
            <Button
              onClick={() => setStep(2)}
              disabled={!selectedDemandId}
              className="bg-[#0070f3] hover:bg-[#0060d3] text-white"
            >
              Next: Pick Resources <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          ) : (
            <Button
              onClick={handleAssign}
              disabled={selectedResourceIds.size === 0 || assigning}
              className="bg-[#0070f3] hover:bg-[#0060d3] text-white"
            >
              {assigning ? (
                <>
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Adding to Kanban...
                </>
              ) : (
                <>
                  <UserPlus className="h-3.5 w-3.5" /> Add {selectedResourceIds.size > 0 ? `${selectedResourceIds.size} ` : ""}to Kanban at {stage}
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
