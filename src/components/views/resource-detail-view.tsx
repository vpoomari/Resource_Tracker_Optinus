"use client";

import { useEffect, useState, useRef } from "react";
import { api, apiForm } from "@/lib/client/api";
import { useToast } from "@/hooks/use-toast";
import { SectionCard } from "@/components/shared/kpi-card";
import { StatusBadge, UserAvatar, EmptyState, Skeleton, TagPill } from "@/components/shared/badges";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { STATUS_COLORS, RESOURCE_STATUSES } from "@/lib/constants";
import {
  ArrowLeft, Mail, Phone, MapPin, Briefcase, Calendar, FileText, Send, Download,
  Building2, Award, BookOpen, Clock, DollarSign, History, Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ResourceDetail {
  id: string; resourceId: string; candidateName: string; email?: string | null;
  phone?: string | null; currentLocation?: string | null; preferredLocation?: string | null;
  totalExperience?: number | null; relevantExperience?: number | null;
  primarySkill?: string | null; secondarySkills?: string | null; technology?: string | null;
  currentEmployer?: string | null; currentDesignation?: string | null;
  noticePeriod?: string | null; availabilityDate?: string | null;
  expectedRate?: number | null; currency: string; employmentType: string;
  resourceType: string; status: string; certifications?: string | null;
  education?: string | null; domainExperience?: string | null;
  previousClientExp?: string | null; remarks?: string | null;
  tags?: string | null; avatarColor: string; createdAt: string;
  assignments: {
    id: string; assignmentId: string; currentStage: string; submissionDate: string;
    lastUpdated: string; offeredRate?: number | null;
    demand: { id: string; demandId: string; client: string; positionTitle: string; priority: string; project?: string | null };
  }[];
  notes: { id: string; body: string; createdAt: string; author?: { id: string; name: string; avatarColor: string } | null }[];
  statusHistory: { id: string; previousStatus?: string | null; newStatus: string; comments?: string | null; createdAt: string; changedBy?: { id: string; name: string; avatarColor: string } | null }[];
  documents: { id: string; fileName: string; fileType: string; fileSize: number; version: number; createdAt: string }[];
}

export function ResourceDetailView({ resourceId, onBack, onOpenDemand, userRole = "Admin" }: {
  resourceId: string;
  onBack: () => void;
  onOpenDemand: (id: string) => void;
  userRole?: string;
}) {
  const { toast } = useToast();
  const [resource, setResource] = useState<ResourceDetail | null>(null);
  const [tab, setTab] = useState("profile");
  const [newNote, setNewNote] = useState("");
  const [confirmDeleteResource, setConfirmDeleteResource] = useState(false);
  const [confirmDeleteDoc, setConfirmDeleteDoc] = useState<string | null>(null);
  const [deletingResource, setDeletingResource] = useState(false);
  const [deletingDoc, setDeletingDoc] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const canDelete = ["Admin", "Resource Manager", "Recruiter"].includes(userRole);

  const load = () => {
    api<{ resource: ResourceDetail }>(`/api/resources/${resourceId}`).then(r => setResource(r.resource)).catch(e => {
      toast({ title: "Failed to load resource", description: e.message, variant: "destructive" });
    });
  };

  useEffect(() => { load(); }, [resourceId]);

  const addNote = async () => {
    if (!newNote.trim()) return;
    try {
      await api("/api/notes", { method: "POST", body: JSON.stringify({ body: newNote, resourceId }) });
      setNewNote("");
      load();
      toast({ title: "Note added" });
    } catch (e: any) {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    }
  };

  const uploadCV = async (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("resourceId", resourceId);
    try {
      await apiForm("/api/documents", fd);
      load();
      toast({ title: "CV uploaded", description: file.name });
    } catch (e: any) {
      toast({ title: "Upload failed", description: e.message, variant: "destructive" });
    }
  };

  const handleDeleteResource = async () => {
    if (!resource) return;
    setDeletingResource(true);
    try {
      await api(`/api/resources/${resource.id}`, { method: "DELETE" });
      toast({ title: "Resource deleted", description: `${resource.resourceId} — ${resource.candidateName} removed permanently` });
      onBack();
    } catch (e: any) {
      toast({ title: "Delete failed", description: e.message, variant: "destructive" });
    } finally {
      setDeletingResource(false);
      setConfirmDeleteResource(false);
    }
  };

  const handleDeleteDoc = async (docId: string) => {
    const doc = resource?.documents.find(d => d.id === docId);
    if (!doc) return;
    setDeletingDoc(true);
    try {
      await api(`/api/documents/${docId}`, { method: "DELETE" });
      toast({ title: "CV deleted", description: `${doc.fileName} removed` });
      load();
    } catch (e: any) {
      toast({ title: "Delete failed", description: e.message, variant: "destructive" });
    } finally {
      setDeletingDoc(false);
      setConfirmDeleteDoc(null);
    }
  };

  if (!resource) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-32" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  const tags = resource.tags?.split(",").map(t => t.trim()).filter(Boolean) || [];

  return (
    <div className="space-y-5 animate-fade-in-up">
      <button onClick={onBack} className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-400 hover:text-white">
        <ArrowLeft className="h-4 w-4" /> Back to resources
      </button>

      {/* Header */}
      <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#181826] to-[#0f0f1a] p-6 shadow-sm">
        <div className="flex flex-wrap items-start gap-4">
          <UserAvatar name={resource.candidateName} color={resource.avatarColor} size={64} />
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-white">{resource.candidateName}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-400">
              <span className="font-mono text-[#0070f3]">{resource.resourceId}</span>
              <span>·</span>
              <span className="inline-flex items-center gap-1"><Briefcase className="h-3 w-3" /> {resource.currentDesignation || "—"}</span>
              <span>·</span>
              <span className="inline-flex items-center gap-1"><Building2 className="h-3 w-3" /> {resource.currentEmployer || "—"}</span>
              <span>·</span>
              <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {resource.currentLocation || "—"}</span>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <StatusBadge status={resource.status} />
              <span className="rounded-md bg-blue-500/15 px-2 py-0.5 text-xs font-semibold text-[#0060d3]">{resource.primarySkill}</span>
              <span className="rounded-md bg-slate-500/15 px-2 py-0.5 text-xs font-medium text-slate-300">{resource.totalExperience} yrs exp</span>
              <span className="rounded-md bg-slate-500/15 px-2 py-0.5 text-xs font-medium text-slate-300">{resource.employmentType}</span>
              <span className="rounded-md bg-slate-500/15 px-2 py-0.5 text-xs font-medium text-slate-300">{resource.resourceType}</span>
            </div>
            {tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {tags.map(t => <TagPill key={t} tag={t} />)}
              </div>
            )}
          </div>
          <div className="flex flex-col items-end gap-3 text-xs text-slate-400">
            <div className="text-right">
              <div className="font-semibold text-white">{resource.expectedRate ? `$${resource.expectedRate.toLocaleString()}` : "—"}</div>
              <div>per month ({resource.currency})</div>
              <div className="mt-1">{resource.noticePeriod}</div>
            </div>
            {canDelete && (
              <button
                onClick={() => setConfirmDeleteResource(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-[#181826] px-3 py-1.5 text-xs font-semibold text-red-400 shadow-sm transition hover:bg-red-500/10 hover:border-red-300"
                title="Permanently delete this resource"
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete Resource
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Resource delete confirmation modal */}
      {confirmDeleteResource && resource && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setConfirmDeleteResource(false)}>
          <div className="w-full max-w-md rounded-xl border border-white/10 bg-[#181826] p-6 shadow-2xl animate-fade-in-up" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/15 text-red-400 shrink-0">
                <Trash2 className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-white">Delete this resource?</h3>
                <p className="mt-1 text-sm text-slate-400">
                  You&apos;re about to permanently delete <strong className="text-white">{resource.candidateName}</strong> ({resource.resourceId}). This will also remove all {resource.assignments.length} demand assignment(s), {resource.documents.length} CV document(s), notes, and status history. This action cannot be undone.
                </p>
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setConfirmDeleteResource(false)} disabled={deletingResource} className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-sm font-semibold text-white hover:bg-white/[0.03]">
                Cancel
              </button>
              <button onClick={handleDeleteResource} disabled={deletingResource} className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50">
                {deletingResource ? <><span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" /> Deleting...</> : <><Trash2 className="h-3.5 w-3.5" /> Delete permanently</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CV delete confirmation modal */}
      {confirmDeleteDoc && resource && (() => {
        const doc = resource.documents.find(d => d.id === confirmDeleteDoc);
        if (!doc) return null;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setConfirmDeleteDoc(null)}>
            <div className="w-full max-w-md rounded-xl border border-white/10 bg-[#181826] p-6 shadow-2xl animate-fade-in-up" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/15 text-red-400 shrink-0">
                  <Trash2 className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-bold text-white">Delete this CV?</h3>
                  <p className="mt-1 text-sm text-slate-400">
                    You&apos;re about to delete <strong className="text-white">{doc.fileName}</strong> (v{doc.version}, {(doc.fileSize / 1024).toFixed(1)} KB). The file will be removed from disk. This action cannot be undone.
                  </p>
                </div>
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <button onClick={() => setConfirmDeleteDoc(null)} disabled={deletingDoc} className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-sm font-semibold text-white hover:bg-white/[0.03]">
                  Cancel
                </button>
                <button onClick={() => handleDeleteDoc(confirmDeleteDoc)} disabled={deletingDoc} className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50">
                  {deletingDoc ? <><span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" /> Deleting...</> : <><Trash2 className="h-3.5 w-3.5" /> Delete CV</>}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-slate-500/15 p-1">
          <TabsTrigger value="profile" className="data-[state=active]:bg-[#181826] data-[state=active]:text-[#0070f3]">Profile</TabsTrigger>
          <TabsTrigger value="experience" className="data-[state=active]:bg-[#181826] data-[state=active]:text-[#0070f3]">Experience</TabsTrigger>
          <TabsTrigger value="cv" className="data-[state=active]:bg-[#181826] data-[state=active]:text-[#0070f3]">CV / Documents</TabsTrigger>
          <TabsTrigger value="demands" className="data-[state=active]:bg-[#181826] data-[state=active]:text-[#0070f3]">Demand History ({resource.assignments.length})</TabsTrigger>
          <TabsTrigger value="activity" className="data-[state=active]:bg-[#181826] data-[state=active]:text-[#0070f3]">Activity</TabsTrigger>
          <TabsTrigger value="notes" className="data-[state=active]:bg-[#181826] data-[state=active]:text-[#0070f3]">Notes</TabsTrigger>
        </TabsList>

        {/* PROFILE */}
        <TabsContent value="profile" className="mt-4">
          <div className="grid gap-4 md:grid-cols-2">
            <SectionCard title="Contact">
              <dl className="space-y-3 text-sm">
                <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-slate-400" /><span className="font-medium text-white">{resource.email || "—"}</span></div>
                <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-slate-400" /><span className="font-medium text-white">{resource.phone || "—"}</span></div>
                <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-slate-400" /><span className="font-medium text-white">{resource.currentLocation || "—"}</span></div>
                <div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-slate-400" /><span className="font-medium text-white">Available: {resource.availabilityDate ? new Date(resource.availabilityDate).toLocaleDateString() : "—"}</span></div>
                <div className="flex items-center gap-2"><DollarSign className="h-4 w-4 text-slate-400" /><span className="font-medium text-white">{resource.expectedRate ? `$${resource.expectedRate.toLocaleString()} ${resource.currency}` : "—"}</span></div>
              </dl>
            </SectionCard>
            <SectionCard title="Skills & Experience">
              <dl className="space-y-3 text-sm">
                <div><dt className="text-xs text-slate-400">Primary Skill</dt><dd className="font-medium text-white">{resource.primarySkill || "—"}</dd></div>
                <div><dt className="text-xs text-slate-400">Secondary Skills</dt><dd className="font-medium text-white">{resource.secondarySkills || "—"}</dd></div>
                <div><dt className="text-xs text-slate-400">Technology</dt><dd className="font-medium text-white">{resource.technology || "—"}</dd></div>
                <div><dt className="text-xs text-slate-400">Total Experience</dt><dd className="font-medium text-white">{resource.totalExperience} years</dd></div>
                <div><dt className="text-xs text-slate-400">Relevant Experience</dt><dd className="font-medium text-white">{resource.relevantExperience} years</dd></div>
              </dl>
            </SectionCard>
          </div>
        </TabsContent>

        {/* EXPERIENCE */}
        <TabsContent value="experience" className="mt-4">
          <div className="grid gap-4 md:grid-cols-2">
            <SectionCard title="Professional Background">
              <dl className="space-y-3 text-sm">
                <div><dt className="text-xs text-slate-400">Current Employer</dt><dd className="font-medium text-white">{resource.currentEmployer || "—"}</dd></div>
                <div><dt className="text-xs text-slate-400">Designation</dt><dd className="font-medium text-white">{resource.currentDesignation || "—"}</dd></div>
                <div><dt className="text-xs text-slate-400">Notice Period</dt><dd className="font-medium text-white">{resource.noticePeriod || "—"}</dd></div>
                <div><dt className="text-xs text-slate-400">Employment Type</dt><dd className="font-medium text-white">{resource.employmentType}</dd></div>
                <div><dt className="text-xs text-slate-400">Resource Type</dt><dd className="font-medium text-white">{resource.resourceType}</dd></div>
              </dl>
            </SectionCard>
            <SectionCard title="Domain & Certifications">
              <dl className="space-y-3 text-sm">
                <div className="flex items-start gap-2"><Award className="h-4 w-4 mt-0.5 text-slate-400" /><div><dt className="text-xs text-slate-400">Certifications</dt><dd className="font-medium text-white">{resource.certifications || "—"}</dd></div></div>
                <div className="flex items-start gap-2"><BookOpen className="h-4 w-4 mt-0.5 text-slate-400" /><div><dt className="text-xs text-slate-400">Education</dt><dd className="font-medium text-white">{resource.education || "—"}</dd></div></div>
                <div><dt className="text-xs text-slate-400">Domain Experience</dt><dd className="font-medium text-white">{resource.domainExperience || "—"}</dd></div>
                <div><dt className="text-xs text-slate-400">Previous Client Experience</dt><dd className="font-medium text-white">{resource.previousClientExp || "—"}</dd></div>
              </dl>
            </SectionCard>
            {resource.remarks && (
              <SectionCard title="Remarks" className="md:col-span-2">
                <p className="text-sm text-white">{resource.remarks}</p>
              </SectionCard>
            )}
          </div>
        </TabsContent>

        {/* CV / DOCUMENTS */}
        <TabsContent value="cv" className="mt-4">
          <SectionCard title="CV / Resume Documents" action={
            <button
              onClick={() => fileRef.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#0070f3] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#0050c8]"
            >
              <FileText className="h-3.5 w-3.5" /> Upload CV
            </button>
          }>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.doc,.docx"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) uploadCV(f);
                e.target.value = "";
              }}
            />
            {resource.documents.length === 0 ? (
              <EmptyState
                icon={<FileText className="h-7 w-7" />}
                title="No CVs uploaded"
                description="Upload a PDF, DOC, or DOCX file. Max 10MB."
              />
            ) : (
              <div className="space-y-2">
                {resource.documents.map(d => (
                  <div key={d.id} className="flex items-center gap-3 rounded-lg border border-white/5 p-3 hover:bg-white/[0.03]">
                    <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg text-xs font-bold uppercase",
                      d.fileType === "pdf" ? "bg-red-500/15 text-red-300" : "bg-blue-500/15 text-blue-300")}>
                      {d.fileType}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-white">{d.fileName}</div>
                      <div className="text-[10px] text-slate-400">v{d.version} · {(d.fileSize / 1024).toFixed(1)} KB · {new Date(d.createdAt).toLocaleDateString()}</div>
                    </div>
                    <a
                      href={`/api/documents/${d.id}?XTransformPort=3000`}
                      className="inline-flex items-center gap-1 rounded-md border border-white/10 px-2 py-1 text-xs font-medium hover:bg-[#0070f3]/10"
                    >
                      <Download className="h-3.5 w-3.5" /> Download
                    </a>
                    {canDelete && (
                      <button
                        onClick={() => setConfirmDeleteDoc(d.id)}
                        title="Delete this CV"
                        className="inline-flex items-center gap-1 rounded-md border border-red-500/30 px-2 py-1 text-xs font-medium text-red-400 hover:bg-red-500/10"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Delete
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </TabsContent>

        {/* DEMANDS */}
        <TabsContent value="demands" className="mt-4">
          <SectionCard title={`Demand History (${resource.assignments.length})`} noPadding>
            {resource.assignments.length === 0 ? (
              <div className="p-8"><EmptyState icon={<Briefcase className="h-7 w-7" />} title="Not mapped to any demand" description="Search demands and assign this resource." /></div>
            ) : (
              <div className="overflow-x-auto scrollbar-thin">
                <table className="w-full text-sm">
                  <thead className="bg-white/[0.03] text-left">
                    <tr className="border-b border-white/10">
                      <th className="px-3 py-3 text-xs font-semibold uppercase text-slate-400">Assignment</th>
                      <th className="px-3 py-3 text-xs font-semibold uppercase text-slate-400">Demand</th>
                      <th className="px-3 py-3 text-xs font-semibold uppercase text-slate-400">Client</th>
                      <th className="px-3 py-3 text-xs font-semibold uppercase text-slate-400">Stage</th>
                      <th className="px-3 py-3 text-xs font-semibold uppercase text-slate-400">Submitted</th>
                      <th className="px-3 py-3 text-xs font-semibold uppercase text-slate-400">Last Updated</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {resource.assignments.map(a => (
                      <tr key={a.id} className="hover:bg-[#0070f3]/[0.06]">
                        <td className="px-3 py-3 font-mono text-xs text-[#0070f3]">{a.assignmentId}</td>
                        <td className="px-3 py-3">
                          <button onClick={() => onOpenDemand(a.demand.id)} className="font-semibold text-[#0070f3] hover:underline">
                            {a.demand.demandId}
                          </button>
                          <div className="text-xs text-slate-400">{a.demand.positionTitle}</div>
                        </td>
                        <td className="px-3 py-3 text-white">{a.demand.client}</td>
                        <td className="px-3 py-3"><StatusBadge status={a.currentStage} /></td>
                        <td className="px-3 py-3 text-xs text-slate-400">{new Date(a.submissionDate).toLocaleDateString()}</td>
                        <td className="px-3 py-3 text-xs text-slate-400">{new Date(a.lastUpdated).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>
        </TabsContent>

        {/* ACTIVITY */}
        <TabsContent value="activity" className="mt-4">
          <SectionCard title="Status History">
            {resource.statusHistory.length === 0 ? (
              <p className="text-sm text-slate-400">No activity yet.</p>
            ) : (
              <ol className="relative border-l-2 border-[#0070f3]/20 ml-3 space-y-4">
                {resource.statusHistory.map(h => {
                  const colors = STATUS_COLORS[h.newStatus] || STATUS_COLORS.Available;
                  return (
                    <li key={h.id} className="ml-6">
                      <span className={cn("absolute -left-[9px] mt-1 h-4 w-4 rounded-full ring-4 ring-white", colors.dot)} />
                      <div className="flex items-center gap-2">
                        <StatusBadge status={h.newStatus} />
                        {h.previousStatus && <span className="text-xs text-slate-400">from <strong>{h.previousStatus}</strong></span>}
                      </div>
                      <div className="mt-1 text-xs text-slate-400">{new Date(h.createdAt).toLocaleString()} · by <strong>{h.changedBy?.name || "System"}</strong></div>
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
                placeholder="Add a note about this resource..."
                className="w-full rounded-lg border border-white/10 bg-[#181826] p-3 text-sm focus:border-[#0070f3] focus:outline-none focus:ring-2 focus:ring-[#0070f3]/20"
              />
              <button onClick={addNote} disabled={!newNote.trim()} className="mt-2 w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#0070f3] px-3 py-2 text-sm font-semibold text-white hover:bg-[#0050c8] disabled:opacity-50">
                <Send className="h-4 w-4" /> Post Note
              </button>
            </SectionCard>
            <SectionCard title={`Notes (${resource.notes.length})`} className="md:col-span-2">
              {resource.notes.length === 0 ? (
                <p className="text-sm text-slate-400">No notes yet.</p>
              ) : (
                <div className="space-y-3">
                  {resource.notes.map(n => (
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
