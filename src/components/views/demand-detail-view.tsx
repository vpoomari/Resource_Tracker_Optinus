"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/client/api";
import { useToast } from "@/hooks/use-toast";
import { SectionCard } from "@/components/shared/kpi-card";
import { StatusBadge, PriorityBadge, UserAvatar, EmptyState, Skeleton, TagPill } from "@/components/shared/badges";
import { demandAgeDays, DEMAND_STATUSES, PRIORITIES, WORK_MODES, STATUS_COLORS } from "@/lib/constants";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft, Calendar, Building2, User, Briefcase, MapPin, FileText,
  MessageSquare, History, FileSearch, Users, Plus, Send, ChevronRight, Trash2, Edit, UserPlus,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DemandDetail {
  id: string; demandId: string; client: string; account?: string | null; project?: string | null;
  positionTitle: string; primarySkill: string; secondarySkills?: string | null;
  jobDescription?: string | null; minExperience?: number | null; maxExperience?: number | null;
  location?: string | null; workMode: string; numberOfPositions: number; priority: string;
  status: string; ownerName?: string | null; resourceManagerName?: string | null;
  accountManagerName?: string | null; targetClosureDate?: string | null; closedAt?: string | null;
  comments?: string | null; tags?: string | null; createdAt: string;
  assignments: Assignment[];
  notes: Note[];
  statusHistory: StatusHistory[];
  documents: any[];
}

interface Assignment {
  id: string; assignmentId: string; currentStage: string; submissionDate: string;
  lastUpdated: string; interviewDate?: string | null; interviewResult?: string | null;
  selectionDate?: string | null; offeredRate?: number | null; clientFeedback?: string | null;
  resource: { id: string; resourceId: string; candidateName: string; primarySkill?: string | null;
    totalExperience?: number | null; currentLocation?: string | null; avatarColor: string;
    currentDesignation?: string | null; secondarySkills?: string | null; };
  proposedBy?: { id: string; name: string; avatarColor: string } | null;
}

interface Note {
  id: string; body: string; createdAt: string;
  author?: { id: string; name: string; avatarColor: string } | null;
}

interface StatusHistory {
  id: string; previousStatus?: string | null; newStatus: string;
  comments?: string | null; createdAt: string;
  changedBy?: { id: string; name: string; avatarColor: string } | null;
}

export function DemandDetailView({ demandId, onBack, onOpenResource, onMoveAssignment, onEditDemand, onAddCandidate, userRole = "Admin" }: {
  demandId: string;
  onBack: () => void;
  onOpenResource: (id: string) => void;
  onMoveAssignment: (assignmentId: string, currentStage: string) => void;
  onEditDemand?: (id: string) => void;
  onAddCandidate?: (demandId: string) => void;
  userRole?: string;
}) {
  const { toast } = useToast();
  const [demand, setDemand] = useState<DemandDetail | null>(null);
  const [tab, setTab] = useState("overview");
  const [newNote, setNewNote] = useState("");
  const [moveDialog, setMoveDialog] = useState<{ assignmentId: string; current: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const canDelete = ["Admin", "Demand Manager", "Resource Manager"].includes(userRole);

  const handleDelete = async () => {
    if (!demand) return;
    setDeleting(true);
    try {
      await api(`/api/demands/${demand.id}`, { method: "DELETE" });
      toast({ title: "Demand deleted", description: `${demand.demandId} removed permanently` });
      onBack();
    } catch (e: any) {
      toast({ title: "Delete failed", description: e.message, variant: "destructive" });
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  const load = () => {
    api<{ demand: DemandDetail }>(`/api/demands/${demandId}`).then(r => setDemand(r.demand)).catch(e => {
      toast({ title: "Failed to load demand", description: e.message, variant: "destructive" });
    });
  };

  useEffect(() => { load(); }, [demandId]);

  const addNote = async () => {
    if (!newNote.trim()) return;
    try {
      await api("/api/notes", { method: "POST", body: JSON.stringify({ body: newNote, demandId }) });
      setNewNote("");
      load();
      toast({ title: "Note added" });
    } catch (e: any) {
      toast({ title: "Failed to add note", description: e.message, variant: "destructive" });
    }
  };

  if (!demand) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-32" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  const age = demandAgeDays(new Date(demand.createdAt));
  const tags = demand.tags?.split(",").map(t => t.trim()).filter(Boolean) || [];

  return (
    <div className="space-y-5 animate-fade-in-up">
      {/* Back */}
      <button onClick={onBack} className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-400 hover:text-white">
        <ArrowLeft className="h-4 w-4" /> Back to demands
      </button>

      {/* Header */}
      <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#181826] to-[#0f0f1a] p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
              <span className="font-mono font-semibold text-[#0070f3]">{demand.demandId}</span>
              <span>·</span>
              <span>{demand.client}</span>
              {demand.project && <><span>·</span><span>{demand.project}</span></>}
            </div>
            <h1 className="text-2xl font-bold text-white">{demand.positionTitle}</h1>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <StatusBadge status={demand.status} />
              <PriorityBadge priority={demand.priority} />
              <span className={cn("inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold",
                age > 60 ? "bg-red-500/15 text-red-300" : age > 30 ? "bg-amber-500/15 text-amber-300" : "bg-emerald-500/15 text-emerald-300"
              )}>
                <Calendar className="h-3 w-3" /> {age} days old
              </span>
              {demand.targetClosureDate && (
                <span className="inline-flex items-center gap-1 rounded-md bg-slate-500/15 px-2 py-1 text-xs font-medium text-slate-300">
                  <Calendar className="h-3 w-3" /> Target: {new Date(demand.targetClosureDate).toLocaleDateString()}
                </span>
              )}
            </div>
            {tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {tags.map(t => <TagPill key={t} tag={t} />)}
              </div>
            )}
          </div>
          <div className="flex flex-col items-end gap-3 text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <UserAvatar name={demand.ownerName || "Unassigned"} size={28} />
              <div>
                <div className="font-medium text-white">{demand.ownerName || "Unassigned"}</div>
                <div className="text-[10px]">Owner</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {onEditDemand && (
                <button
                  onClick={() => onEditDemand(demand.id)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#0070f3]/30 bg-[#0070f3]/10 px-3 py-1.5 text-xs font-semibold text-[#0070f3] shadow-sm transition hover:bg-[#0070f3]/20"
                  title="Edit this demand"
                >
                  <Edit className="h-3.5 w-3.5" /> Edit Demand
                </button>
              )}
              {canDelete && (
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-[#181826] px-3 py-1.5 text-xs font-semibold text-red-400 shadow-sm transition hover:bg-red-500/10 hover:border-red-300"
                  title="Permanently delete this demand"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete Demand
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Delete confirmation modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setConfirmDelete(false)}>
          <div className="w-full max-w-md rounded-xl border border-white/10 bg-[#181826] p-6 shadow-2xl animate-fade-in-up" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/15 text-red-400 shrink-0">
                <Trash2 className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-white">Delete this demand?</h3>
                <p className="mt-1 text-sm text-slate-400">
                  You&apos;re about to permanently delete <strong className="text-white">{demand.demandId}</strong> — <strong className="text-white">{demand.positionTitle}</strong> for <strong className="text-white">{demand.client}</strong>. This will also remove all {demand.assignments.length} candidate assignment(s) and any notes/documents attached to this demand. This action cannot be undone.
                </p>
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setConfirmDelete(false)} disabled={deleting} className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-sm font-semibold text-white hover:bg-white/[0.03]">
                Cancel
              </button>
              <button onClick={handleDelete} disabled={deleting} className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50">
                {deleting ? <><span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" /> Deleting...</> : <><Trash2 className="h-3.5 w-3.5" /> Delete permanently</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-slate-500/15 p-1">
          <TabsTrigger value="overview" className="data-[state=active]:bg-[#181826] data-[state=active]:text-[#0070f3]">Overview</TabsTrigger>
          <TabsTrigger value="candidates" className="data-[state=active]:bg-[#181826] data-[state=active]:text-[#0070f3]">
            Candidates ({demand.assignments.length})
          </TabsTrigger>
          <TabsTrigger value="activity" className="data-[state=active]:bg-[#181826] data-[state=active]:text-[#0070f3]">Activity</TabsTrigger>
          <TabsTrigger value="notes" className="data-[state=active]:bg-[#181826] data-[state=active]:text-[#0070f3]">Notes ({demand.notes.length})</TabsTrigger>
        </TabsList>

        {/* OVERVIEW */}
        <TabsContent value="overview" className="mt-4">
          <div className="grid gap-4 md:grid-cols-3">
            <SectionCard title="Demand Information" className="md:col-span-2">
              <dl className="grid grid-cols-2 gap-4 text-sm">
                <div><dt className="text-xs text-slate-400">Client</dt><dd className="font-medium text-white">{demand.client}</dd></div>
                <div><dt className="text-xs text-slate-400">Account</dt><dd className="font-medium text-white">{demand.account || "—"}</dd></div>
                <div><dt className="text-xs text-slate-400">Project</dt><dd className="font-medium text-white">{demand.project || "—"}</dd></div>
                <div><dt className="text-xs text-slate-400">Position</dt><dd className="font-medium text-white">{demand.positionTitle}</dd></div>
                <div><dt className="text-xs text-slate-400">Primary Skill</dt><dd className="font-medium text-white">{demand.primarySkill}</dd></div>
                <div><dt className="text-xs text-slate-400">Secondary Skills</dt><dd className="font-medium text-white">{demand.secondarySkills || "—"}</dd></div>
                <div><dt className="text-xs text-slate-400">Experience</dt><dd className="font-medium text-white">{demand.minExperience}–{demand.maxExperience} yrs</dd></div>
                <div><dt className="text-xs text-slate-400">Positions</dt><dd className="font-medium text-white">{demand.numberOfPositions}</dd></div>
                <div><dt className="text-xs text-slate-400">Location</dt><dd className="font-medium text-white">{demand.location || "—"}</dd></div>
                <div><dt className="text-xs text-slate-400">Work Mode</dt><dd className="font-medium text-white">{demand.workMode}</dd></div>
                <div><dt className="text-xs text-slate-400">Created</dt><dd className="font-medium text-white">{new Date(demand.createdAt).toLocaleDateString()}</dd></div>
                <div><dt className="text-xs text-slate-400">Target Closure</dt><dd className="font-medium text-white">{demand.targetClosureDate ? new Date(demand.targetClosureDate).toLocaleDateString() : "—"}</dd></div>
                <div><dt className="text-xs text-slate-400">Resource Manager</dt><dd className="font-medium text-white">{demand.resourceManagerName || "—"}</dd></div>
                <div><dt className="text-xs text-slate-400">Account Manager</dt><dd className="font-medium text-white">{demand.accountManagerName || "—"}</dd></div>
              </dl>
            </SectionCard>

            <SectionCard title="Job Description">
              <p className="text-sm text-white whitespace-pre-wrap">{demand.jobDescription || "No description provided."}</p>
              {demand.comments && (
                <div className="mt-4 border-t border-white/5 pt-3">
                  <div className="text-xs font-semibold uppercase text-slate-400 mb-1">Comments</div>
                  <p className="text-sm text-white">{demand.comments}</p>
                </div>
              )}
            </SectionCard>
          </div>
        </TabsContent>

        {/* CANDIDATES */}
        <TabsContent value="candidates" className="mt-4">
          <SectionCard title={`Candidates Mapped (${demand.assignments.length})`} action={
            <div className="flex items-center gap-2">
              {onAddCandidate && (
                <button
                  onClick={() => onAddCandidate(demand.id)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#0070f3] px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-[#0060d3]"
                  title="Pick a resource from the database and add to this demand's pipeline"
                >
                  <UserPlus className="h-3.5 w-3.5" /> Add Candidate
                </button>
              )}
              <span className="text-xs text-slate-400">Drag-drop in Kanban to move stages</span>
            </div>
          } noPadding>
            {demand.assignments.length === 0 ? (
              <div className="p-8">
                <EmptyState
                  icon={<Users className="h-7 w-7" />}
                  title="No candidates mapped"
                  description={onAddCandidate ? "Click 'Add Candidate' above to pick a resource from the database and assign them to this demand. They'll appear on the Kanban board under 'Profile Submitted'."
                    : "Search for resources in the Resources tab and assign them to this demand."}
                  action={onAddCandidate ? () => onAddCandidate(demand.id) : undefined}
                  actionLabel={onAddCandidate ? "+ Add Candidate" : undefined}
                />
              </div>
            ) : (
              <div className="overflow-x-auto scrollbar-thin">
                <table className="w-full text-sm">
                  <thead className="bg-white/[0.03] text-left">
                    <tr className="border-b border-white/10">
                      <th className="px-3 py-3 text-xs font-semibold uppercase text-slate-400">Candidate</th>
                      <th className="px-3 py-3 text-xs font-semibold uppercase text-slate-400">Skill / Exp</th>
                      <th className="px-3 py-3 text-xs font-semibold uppercase text-slate-400">Stage</th>
                      <th className="px-3 py-3 text-xs font-semibold uppercase text-slate-400">Submitted</th>
                      <th className="px-3 py-3 text-xs font-semibold uppercase text-slate-400">Last Updated</th>
                      <th className="px-3 py-3 text-xs font-semibold uppercase text-slate-400">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {demand.assignments.map(a => (
                      <tr key={a.id} className="hover:bg-[#0070f3]/[0.06]">
                        <td className="px-3 py-3">
                          <button onClick={() => onOpenResource(a.resource.id)} className="flex items-center gap-2">
                            <UserAvatar name={a.resource.candidateName} color={a.resource.avatarColor} size={32} />
                            <div className="text-left">
                              <div className="font-semibold text-white hover:text-[#0070f3]">{a.resource.candidateName}</div>
                              <div className="text-[10px] text-slate-400">{a.resource.resourceId}</div>
                            </div>
                          </button>
                        </td>
                        <td className="px-3 py-3">
                          <div className="font-medium text-white">{a.resource.primarySkill || "—"}</div>
                          <div className="text-[10px] text-slate-400">{a.resource.totalExperience ?? 0} yrs · {a.resource.currentLocation || "—"}</div>
                        </td>
                        <td className="px-3 py-3"><StatusBadge status={a.currentStage} /></td>
                        <td className="px-3 py-3 text-xs text-slate-400">{new Date(a.submissionDate).toLocaleDateString()}</td>
                        <td className="px-3 py-3 text-xs text-slate-400">{new Date(a.lastUpdated).toLocaleDateString()}</td>
                        <td className="px-3 py-3">
                          <button
                            onClick={() => onMoveAssignment(a.id, a.currentStage)}
                            className="inline-flex items-center gap-1 rounded-md border border-white/10 px-2 py-1 text-xs font-medium hover:bg-[#0070f3]/10 hover:border-[#0070f3]"
                          >
                            Move <ChevronRight className="h-3 w-3" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>
        </TabsContent>

        {/* ACTIVITY TIMELINE */}
        <TabsContent value="activity" className="mt-4">
          <SectionCard title="Status History Timeline">
            {demand.statusHistory.length === 0 ? (
              <p className="text-sm text-slate-400">No activity yet.</p>
            ) : (
              <ol className="relative border-l-2 border-[#0070f3]/20 ml-3 space-y-4">
                {demand.statusHistory.map(h => {
                  const colors = STATUS_COLORS[h.newStatus] || STATUS_COLORS.New;
                  return (
                    <li key={h.id} className="ml-6">
                      <span className={cn("absolute -left-[9px] mt-1 h-4 w-4 rounded-full ring-4 ring-white", colors.dot)} />
                      <div className="flex items-center gap-2">
                        <StatusBadge status={h.newStatus} />
                        {h.previousStatus && <span className="text-xs text-slate-400">from <strong>{h.previousStatus}</strong></span>}
                      </div>
                      <div className="mt-1 text-xs text-slate-400">
                        {new Date(h.createdAt).toLocaleString()} · by <strong>{h.changedBy?.name || "System"}</strong>
                      </div>
                      {h.comments && <div className="mt-1 text-sm text-white">{h.comments}</div>}
                    </li>
                  );
                })}
              </ol>
            )}
          </SectionCard>
        </TabsContent>

        {/* NOTES */}
        <TabsContent value="notes" className="mt-4">
          <div className="grid gap-4 md:grid-cols-3">
            <SectionCard title="Add Note" className="md:col-span-1">
              <textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                rows={5}
                placeholder="Add a note about this demand..."
                className="w-full rounded-lg border border-white/10 bg-[#181826] p-3 text-sm focus:border-[#0070f3] focus:outline-none focus:ring-2 focus:ring-[#0070f3]/20"
              />
              <button
                onClick={addNote}
                disabled={!newNote.trim()}
                className="mt-2 w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#0070f3] px-3 py-2 text-sm font-semibold text-white hover:bg-[#0050c8] disabled:opacity-50"
              >
                <Send className="h-4 w-4" /> Post Note
              </button>
            </SectionCard>
            <SectionCard title={`Notes (${demand.notes.length})`} className="md:col-span-2">
              {demand.notes.length === 0 ? (
                <p className="text-sm text-slate-400">No notes yet. Be the first to add one.</p>
              ) : (
                <div className="space-y-3">
                  {demand.notes.map(n => (
                    <div key={n.id} className="flex gap-3 rounded-lg border border-white/5 p-3">
                      <UserAvatar name={n.author?.name || "Unknown"} color={n.author?.avatarColor} size={32} />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-semibold text-white">{n.author?.name || "Unknown"}</div>
                          <div className="text-[10px] text-slate-400">{new Date(n.createdAt).toLocaleString()}</div>
                        </div>
                        <p className="mt-1 text-sm text-white">{n.body}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
