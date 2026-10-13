"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/client/api";
import { useToast } from "@/hooks/use-toast";
import { GLOBAL_CITIES } from "@/lib/locations";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DEMAND_STATUSES, PRIORITIES, WORK_MODES, EMPLOYMENT_TYPES, RESOURCE_TYPES,
  RESOURCE_STATUSES, KANBAN_COLUMNS, VALID_TRANSITIONS,
} from "@/lib/constants";
import { Search, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

// ============ Demand Form Modal ============
export function DemandFormModal({ open, onClose, onSaved, editingId }: { open: boolean; onClose: () => void; onSaved: () => void; editingId?: string | null }) {
  const { toast } = useToast();
  const isEditing = !!editingId;
  const [opts, setOpts] = useState<{ clients: string[]; skills: string[]; users: { id: string; name: string; role: string }[] }>({ clients: [], skills: [], users: [] });
  const [form, setForm] = useState({
    client: "", account: "", project: "", positionTitle: "", primarySkill: "",
    secondarySkills: "", jobDescription: "", minExperience: "", maxExperience: "",
    location: "", workMode: "Hybrid", numberOfPositions: "1", priority: "Medium",
    status: "New", targetClosureDate: "", comments: "",
  });
  const [loading, setLoading] = useState(false);

  // Fetch filter options
  useEffect(() => {
    if (!open) return;
    api<any>("/api/filter-options").then(r => setOpts({
      clients: r.clients?.length ? r.clients : ["HSBC Global", "Accenture", "Cognizant", "Capgemini", "JPMorgan Chase"],
      skills: r.skills?.length ? r.skills : ["Java", "React", "Angular", "AWS", "Python", "DevOps", "Node.js"],
      users: r.users || [],
    })).catch(() => {});
  }, [open]);

  // If editing, fetch the existing demand and pre-fill the form
  useEffect(() => {
    if (!open) return;
    if (!editingId) {
      // Reset form when opening for create
      setForm({ client: "", account: "", project: "", positionTitle: "", primarySkill: "", secondarySkills: "", jobDescription: "", minExperience: "", maxExperience: "", location: "", workMode: "Hybrid", numberOfPositions: "1", priority: "Medium", status: "New", targetClosureDate: "", comments: "" });
      return;
    }
    setLoading(true);
    api<{ demand: any }>(`/api/demands/${editingId}`).then(r => {
      const d = r.demand;
      setForm({
        client: d.client || "",
        account: d.account || "",
        project: d.project || "",
        positionTitle: d.positionTitle || "",
        primarySkill: d.primarySkill || "",
        secondarySkills: d.secondarySkills || "",
        jobDescription: d.jobDescription || "",
        minExperience: d.minExperience != null ? String(d.minExperience) : "",
        maxExperience: d.maxExperience != null ? String(d.maxExperience) : "",
        location: d.location || "",
        workMode: d.workMode || "Hybrid",
        numberOfPositions: d.numberOfPositions != null ? String(d.numberOfPositions) : "1",
        priority: d.priority || "Medium",
        status: d.status || "New",
        targetClosureDate: d.targetClosureDate ? new Date(d.targetClosureDate).toISOString().split("T")[0] : "",
        comments: d.comments || "",
      });
    }).catch(e => {
      toast({ title: "Failed to load demand", description: e.message, variant: "destructive" });
      onClose();
    }).finally(() => setLoading(false));
  }, [open, editingId]);

  const submit = async () => {
    if (!form.client || !form.positionTitle || !form.primarySkill) {
      toast({ title: "Missing fields", description: "Client, Position Title, Primary Skill required", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      if (isEditing && editingId) {
        await api(`/api/demands/${editingId}`, { method: "PATCH", body: JSON.stringify(form) });
        toast({ title: "Demand updated", description: `${form.client} — ${form.positionTitle} saved` });
      } else {
        await api("/api/demands", { method: "POST", body: JSON.stringify(form) });
        toast({ title: "Demand created", description: `${form.client} — ${form.positionTitle} added` });
      }
      onSaved();
      onClose();
    } catch (e: any) {
      toast({ title: isEditing ? "Update failed" : "Create failed", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto scrollbar-thin">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Demand" : "Create New Demand"}</DialogTitle>
          <DialogDescription>{isEditing ? "Update the demand details below" : "Add a new client demand to the pipeline"}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>Client / Company * <span className="ml-1 text-[10px] font-normal text-slate-500">(any company — free text)</span></Label>
            <Input list="client-list" value={form.client} onChange={(e) => setForm(f => ({ ...f, client: e.target.value }))} placeholder="e.g. HSBC Global, Acme Corp, Any Company" />
            <datalist id="client-list">
              {opts.clients.map(c => <option key={c} value={c} />)}
            </datalist>
            <p className="mt-1 text-[10px] text-slate-500">Type any company name — known clients appear as suggestions.</p>
          </div>
          <div><Label>Account</Label><Input value={form.account} onChange={(e) => setForm(f => ({ ...f, account: e.target.value }))} placeholder="e.g. Banking Operations" /></div>
          <div><Label>Project</Label><Input value={form.project} onChange={(e) => setForm(f => ({ ...f, project: e.target.value }))} placeholder="e.g. Core Banking Modernization" /></div>
          <div><Label>Position Title *</Label><Input value={form.positionTitle} onChange={(e) => setForm(f => ({ ...f, positionTitle: e.target.value }))} placeholder="e.g. Senior Java Developer" /></div>
          <div>
            <Label>Primary Skill *</Label>
            <Input list="skill-list" value={form.primarySkill} onChange={(e) => setForm(f => ({ ...f, primarySkill: e.target.value }))} placeholder="e.g. Java" />
            <datalist id="skill-list">{opts.skills.map(s => <option key={s} value={s} />)}</datalist>
          </div>
          <div><Label>Secondary Skills</Label><Input value={form.secondarySkills} onChange={(e) => setForm(f => ({ ...f, secondarySkills: e.target.value }))} placeholder="comma separated" /></div>
          <div><Label>Min Experience (yrs)</Label><Input type="number" value={form.minExperience} onChange={(e) => setForm(f => ({ ...f, minExperience: e.target.value }))} /></div>
          <div><Label>Max Experience (yrs)</Label><Input type="number" value={form.maxExperience} onChange={(e) => setForm(f => ({ ...f, maxExperience: e.target.value }))} /></div>
          <div>
            <Label>Location <span className="ml-1 text-[10px] font-normal text-slate-500">(global — any city, any country)</span></Label>
            <Input
              list="global-cities-list"
              value={form.location}
              onChange={(e) => setForm(f => ({ ...f, location: e.target.value }))}
              placeholder="e.g. Bangalore, India · London, UK · New York, USA"
            />
            <datalist id="global-cities-list">
              {Array.from(new Set(GLOBAL_CITIES)).map(c => <option key={c} value={c} />)}
            </datalist>
            <p className="mt-1 text-[10px] text-slate-500">Type any city in any country — major global cities appear as suggestions.</p>
          </div>
          <div>
            <Label>Work Mode</Label>
            <Select value={form.workMode} onValueChange={(v) => setForm(f => ({ ...f, workMode: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{WORK_MODES.map(w => <SelectItem key={w} value={w}>{w}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Number of Positions</Label><Input type="number" value={form.numberOfPositions} onChange={(e) => setForm(f => ({ ...f, numberOfPositions: e.target.value }))} /></div>
          <div>
            <Label>Priority</Label>
            <Select value={form.priority} onValueChange={(v) => setForm(f => ({ ...f, priority: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{PRIORITIES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => setForm(f => ({ ...f, status: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{DEMAND_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Target Closure Date</Label><Input type="date" value={form.targetClosureDate} onChange={(e) => setForm(f => ({ ...f, targetClosureDate: e.target.value }))} /></div>
          <div className="sm:col-span-2"><Label>Job Description</Label><Textarea rows={3} value={form.jobDescription} onChange={(e) => setForm(f => ({ ...f, jobDescription: e.target.value }))} placeholder="Roles, responsibilities, must-have skills..." /></div>
          <div className="sm:col-span-2"><Label>Comments</Label><Textarea rows={2} value={form.comments} onChange={(e) => setForm(f => ({ ...f, comments: e.target.value }))} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={loading} className="bg-[#0070f3] hover:bg-[#0050c8]">
            {loading ? (isEditing ? "Saving..." : "Creating...") : (isEditing ? "Save Changes" : "Create Demand")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============ Resource Form Modal ============
export function ResourceFormModal({ open, onClose, onSaved, demandId, editingId }: { open: boolean; onClose: () => void; onSaved: () => void; demandId?: string; editingId?: string | null }) {
  const { toast } = useToast();
  const isEditing = !!editingId;
  const [opts, setOpts] = useState<{ skills: string[]; locations: string[] }>({ skills: [], locations: [] });
  const [form, setForm] = useState({
    candidateName: "", email: "", phone: "", currentLocation: "", preferredLocation: "",
    totalExperience: "", relevantExperience: "", primarySkill: "", secondarySkills: "",
    technology: "", currentEmployer: "", currentDesignation: "", noticePeriod: "",
    availabilityDate: "", expectedRate: "", currency: "USD", employmentType: "Full-time",
    resourceType: "External", status: "Available", certifications: "", education: "",
    domainExperience: "", previousClientExp: "", remarks: "", tags: "",
  });
  const [duplicates, setDuplicates] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // Demand association (new field per user request)
  // — multi-select a resource can be linked to multiple demands
  const [availableDemands, setAvailableDemands] = useState<{ id: string; demandId: string; client: string; positionTitle: string; primarySkill: string; priority: string; status: string; project?: string | null }[]>([]);
  const [selectedDemandIds, setSelectedDemandIds] = useState<string[]>([]);
  const [existingAssignmentDemandIds, setExistingAssignmentDemandIds] = useState<Set<string>>(new Set());
  const [demandFilter, setDemandFilter] = useState("");

  // Currency options per user's requirement (INR / USD / EUR)
  const CURRENCIES = ["INR", "USD", "EUR"];

  useEffect(() => {
    if (!open) return;
    api<any>("/api/filter-options").then(r => setOpts({
      skills: r.skills?.length ? r.skills : ["Java", "React", "Angular", "AWS", "Python", "DevOps", "Node.js"],
      locations: r.locations?.length ? r.locations : ["Bangalore", "Mumbai", "Hyderabad", "Pune", "Chennai", "Delhi"],
    })).catch(() => {});
    // Fetch open demands for the "Associate with Demand(s)" field
    api<{ demands: any[] }>("/api/demands?sortBy=createdAt&sortDir=desc").then(r => {
      const openStatuses = ["New", "Open", "Sourcing", "Profiles Submitted", "Client Review", "Interview", "Selected", "On Hold"];
      setAvailableDemands(r.demands.filter(d => openStatuses.includes(d.status)));
    }).catch(() => setAvailableDemands([]));
  }, [open]);

  // If editing, fetch the existing resource and pre-fill the form
  useEffect(() => {
    if (!open) return;
    if (!editingId) {
      // Reset form when opening for create
      setForm({ candidateName: "", email: "", phone: "", currentLocation: "", preferredLocation: "", totalExperience: "", relevantExperience: "", primarySkill: "", secondarySkills: "", technology: "", currentEmployer: "", currentDesignation: "", noticePeriod: "", availabilityDate: "", expectedRate: "", currency: "USD", employmentType: "Full-time", resourceType: "External", status: "Available", certifications: "", education: "", domainExperience: "", previousClientExp: "", remarks: "", tags: "" });
      setDuplicates([]);
      setSelectedDemandIds([]);
      setExistingAssignmentDemandIds(new Set());
      return;
    }
    setLoading(true);
    api<{ resource: any }>(`/api/resources/${editingId}`).then(r => {
      const d = r.resource;
      setForm({
        candidateName: d.candidateName || "",
        email: d.email || "",
        phone: d.phone || "",
        currentLocation: d.currentLocation || "",
        preferredLocation: d.preferredLocation || "",
        totalExperience: d.totalExperience != null ? String(d.totalExperience) : "",
        relevantExperience: d.relevantExperience != null ? String(d.relevantExperience) : "",
        primarySkill: d.primarySkill || "",
        secondarySkills: d.secondarySkills || "",
        technology: d.technology || "",
        currentEmployer: d.currentEmployer || "",
        currentDesignation: d.currentDesignation || "",
        noticePeriod: d.noticePeriod || "",
        availabilityDate: d.availabilityDate ? new Date(d.availabilityDate).toISOString().split("T")[0] : "",
        expectedRate: d.expectedRate != null ? String(d.expectedRate) : "",
        currency: CURRENCIES.includes(d.currency) ? d.currency : "USD",
        employmentType: d.employmentType || "Full-time",
        resourceType: d.resourceType || "External",
        status: d.status || "Available",
        certifications: d.certifications || "",
        education: d.education || "",
        domainExperience: d.domainExperience || "",
        previousClientExp: d.previousClientExp || "",
        remarks: d.remarks || "",
        tags: d.tags || "",
      });
      // Fetch existing assignments — pre-select them in the demand multi-select
      const assignments = d.assignments || [];
      const assignedDemandIds = assignments.map((a: any) => a.demand.id);
      setSelectedDemandIds(assignedDemandIds);
      setExistingAssignmentDemandIds(new Set(assignedDemandIds));
    }).catch(e => {
      toast({ title: "Failed to load resource", description: e.message, variant: "destructive" });
      onClose();
    }).finally(() => setLoading(false));
  }, [open, editingId]);

  const submit = async () => {
    if (!form.candidateName || !form.primarySkill) {
      toast({ title: "Missing fields", description: "Name and Primary Skill required", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      let resourceId: string | null = null;
      if (isEditing && editingId) {
        await api(`/api/resources/${editingId}`, { method: "PATCH", body: JSON.stringify(form) });
        resourceId = editingId;
        toast({ title: "Resource updated", description: `${form.candidateName} saved` });
      } else {
        const r = await api<{ resource: any; duplicates: string[] }>("/api/resources", { method: "POST", body: JSON.stringify(form) });
        resourceId = r.resource.id;
        toast({ title: "Resource created", description: r.duplicates?.length ? `Duplicate check: ${r.duplicates.join("; ")}` : `${form.candidateName} added` });
        setDuplicates(r.duplicates || []);
      }

      // Create assignments for newly-selected demands (only those NOT already assigned)
      // — we don't delete existing assignments; users do that explicitly via Demand Detail → Delete
      if (resourceId) {
        const newDemandIds = selectedDemandIds.filter(id => !existingAssignmentDemandIds.has(id));
        let assigned = 0;
        let assignFailed = 0;
        for (const demandId of newDemandIds) {
          try {
            await api("/api/assignments", {
              method: "POST",
              body: JSON.stringify({ demandId, resourceId, stage: "Profile Submitted" }),
            });
            assigned++;
          } catch (e) {
            assignFailed++;
          }
        }
        if (assigned > 0) {
          toast({
            title: `Linked to ${assigned} demand${assigned !== 1 ? "s" : ""}`,
            description: `${form.candidateName} now appears on the Kanban board under "Profile Submitted" for each${assigned !== 1 ? "" : ""} selected demand${assignFailed > 0 ? ` · ${assignFailed} failed` : ""}`,
          });
        }
      }

      onSaved();
      onClose();
    } catch (e: any) {
      toast({ title: isEditing ? "Update failed" : "Create failed", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto scrollbar-thin">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Resource" : "Add New Resource"}</DialogTitle>
          <DialogDescription>{isEditing ? "Update the candidate details below" : "Add a candidate to the resource master"}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <div><Label>Candidate Name *</Label><Input value={form.candidateName} onChange={(e) => setForm(f => ({ ...f, candidateName: e.target.value }))} /></div>
          <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} /></div>
          <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
          <div>
            <Label>Current Location <span className="ml-1 text-[10px] font-normal text-slate-500">(global)</span></Label>
            <Input list="loc-list" value={form.currentLocation} onChange={(e) => setForm(f => ({ ...f, currentLocation: e.target.value }))} placeholder="e.g. Bangalore, India · London, UK · New York, USA" />
            <datalist id="loc-list">{Array.from(new Set(GLOBAL_CITIES)).map(l => <option key={l} value={l} />)}</datalist>
          </div>
          <div>
            <Label>Preferred Location <span className="ml-1 text-[10px] font-normal text-slate-500">(global)</span></Label>
            <Input list="pref-loc-list" value={form.preferredLocation} onChange={(e) => setForm(f => ({ ...f, preferredLocation: e.target.value }))} placeholder="e.g. Mumbai, India · Singapore · Dubai, UAE" />
            <datalist id="pref-loc-list">{Array.from(new Set(GLOBAL_CITIES)).map(l => <option key={l} value={l} />)}</datalist>
          </div>
          <div>
            <Label>Primary Skill *</Label>
            <Input list="skill-list2" value={form.primarySkill} onChange={(e) => setForm(f => ({ ...f, primarySkill: e.target.value }))} />
            <datalist id="skill-list2">{opts.skills.map(s => <option key={s} value={s} />)}</datalist>
          </div>
          <div><Label>Secondary Skills</Label><Input value={form.secondarySkills} onChange={(e) => setForm(f => ({ ...f, secondarySkills: e.target.value }))} /></div>
          <div><Label>Technology</Label><Input value={form.technology} onChange={(e) => setForm(f => ({ ...f, technology: e.target.value }))} /></div>
          <div><Label>Total Experience</Label><Input type="number" step="0.5" value={form.totalExperience} onChange={(e) => setForm(f => ({ ...f, totalExperience: e.target.value }))} /></div>
          <div><Label>Relevant Experience</Label><Input type="number" step="0.5" value={form.relevantExperience} onChange={(e) => setForm(f => ({ ...f, relevantExperience: e.target.value }))} /></div>
          <div><Label>Current Employer</Label><Input value={form.currentEmployer} onChange={(e) => setForm(f => ({ ...f, currentEmployer: e.target.value }))} /></div>
          <div><Label>Current Designation</Label><Input value={form.currentDesignation} onChange={(e) => setForm(f => ({ ...f, currentDesignation: e.target.value }))} /></div>
          <div><Label>Notice Period</Label><Input value={form.noticePeriod} onChange={(e) => setForm(f => ({ ...f, noticePeriod: e.target.value }))} placeholder="e.g. 60 days" /></div>
          <div><Label>Availability Date</Label><Input type="date" value={form.availabilityDate} onChange={(e) => setForm(f => ({ ...f, availabilityDate: e.target.value }))} /></div>
          <div>
            <Label>Expected Rate / Cost <span className="ml-1 text-[10px] font-normal text-slate-500">(monthly)</span></Label>
            <div className="flex gap-2">
              <Input type="number" value={form.expectedRate} onChange={(e) => setForm(f => ({ ...f, expectedRate: e.target.value }))} placeholder="e.g. 15000" className="flex-1" />
              <Select value={form.currency} onValueChange={(v) => setForm(f => ({ ...f, currency: v }))}>
                <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Employment Type</Label>
            <Select value={form.employmentType} onValueChange={(v) => setForm(f => ({ ...f, employmentType: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{EMPLOYMENT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Resource Type</Label>
            <Select value={form.resourceType} onValueChange={(v) => setForm(f => ({ ...f, resourceType: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{RESOURCE_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => setForm(f => ({ ...f, status: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{RESOURCE_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Certifications</Label><Input value={form.certifications} onChange={(e) => setForm(f => ({ ...f, certifications: e.target.value }))} /></div>
          <div><Label>Education</Label><Input value={form.education} onChange={(e) => setForm(f => ({ ...f, education: e.target.value }))} /></div>
          <div><Label>Domain Experience</Label><Input value={form.domainExperience} onChange={(e) => setForm(f => ({ ...f, domainExperience: e.target.value }))} /></div>
          <div><Label>Previous Client Experience</Label><Input value={form.previousClientExp} onChange={(e) => setForm(f => ({ ...f, previousClientExp: e.target.value }))} /></div>
          <div className="sm:col-span-2"><Label>Remarks</Label><Textarea rows={2} value={form.remarks} onChange={(e) => setForm(f => ({ ...f, remarks: e.target.value }))} /></div>
          <div className="sm:col-span-2"><Label>Tags (comma separated)</Label><Input value={form.tags} onChange={(e) => setForm(f => ({ ...f, tags: e.target.value }))} placeholder="Hot Candidate, Immediate Joiner" /></div>

          {/* Demand(s) — multi-select to associate the resource with one or more demands */}
          {/* On save, this creates assignments that put the resource on the Kanban board */}
          <div className="sm:col-span-2">
            <Label>
              Associate with Demand(s) <span className="ml-1 text-[10px] font-normal text-slate-500">(optional — pick the demands this resource should be a candidate for)</span>
            </Label>
            <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
              {/* Selected demand chips */}
              {selectedDemandIds.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {selectedDemandIds.map(id => {
                    const d = availableDemands.find(x => x.id === id);
                    if (!d) return null;
                    const isExisting = existingAssignmentDemandIds.has(id);
                    return (
                      <span
                        key={id}
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[10px] font-medium ring-1",
                          isExisting
                            ? "bg-emerald-500/15 text-emerald-300 ring-emerald-500/20"
                            : "bg-[#0070f3]/15 text-[#0070f3] ring-[#0070f3]/20"
                        )}
                      >
                        <span className="font-mono">{d.demandId}</span>
                        <span className="text-slate-400">·</span>
                        <span className="text-slate-300">{d.positionTitle}</span>
                        {isExisting && <span className="text-emerald-400">✓ already linked</span>}
                        <button
                          type="button"
                          onClick={() => setSelectedDemandIds(prev => prev.filter(x => x !== id))}
                          className="ml-0.5 text-slate-400 hover:text-red-400"
                          title="Remove this demand association"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}

              {/* Filter input */}
              <div className="relative mb-2">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={demandFilter}
                  onChange={(e) => setDemandFilter(e.target.value)}
                  placeholder={availableDemands.length === 0
                    ? "No open demands available — create one first"
                    : `Filter ${availableDemands.length} open demands...`}
                  className="w-full rounded-lg border border-white/10 bg-white/[0.03] py-2 pl-9 pr-3 text-sm text-white placeholder:text-slate-500 focus:border-[#0070f3] focus:outline-none focus:ring-2 focus:ring-[#0070f3]/30 transition disabled:opacity-50"
                  disabled={availableDemands.length === 0}
                />
              </div>

              {/* Scrollable checkbox list */}
              {availableDemands.length > 0 && (
                <div className="max-h-40 overflow-y-auto scrollbar-thin space-y-1">
                  {availableDemands
                    .filter(d => {
                      const q = demandFilter.toLowerCase().trim();
                      if (!q) return true;
                      return (
                        (d.demandId || "").toLowerCase().includes(q) ||
                        (d.positionTitle || "").toLowerCase().includes(q) ||
                        (d.client || "").toLowerCase().includes(q) ||
                        (d.primarySkill || "").toLowerCase().includes(q) ||
                        (d.project || "").toLowerCase().includes(q)
                      );
                    })
                    .map(d => {
                      const isSelected = selectedDemandIds.includes(d.id);
                      const isExisting = existingAssignmentDemandIds.has(d.id);
                      return (
                        <button
                          key={d.id}
                          type="button"
                          onClick={() => setSelectedDemandIds(prev => isSelected ? prev.filter(x => x !== d.id) : [...prev, d.id])}
                          className={cn(
                            "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition",
                            isSelected ? "bg-[#0070f3]/10" : "hover:bg-white/5"
                          )}
                        >
                          <div className={cn(
                            "flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 transition",
                            isSelected ? "border-[#0070f3] bg-[#0070f3]" : "border-white/20"
                          )}>
                            {isSelected && <Check className="h-2.5 w-2.5 text-white" />}
                          </div>
                          <span className="font-mono font-semibold text-[#0070f3]">{d.demandId}</span>
                          <span className="text-white truncate">{d.positionTitle}</span>
                          <span className="text-slate-500 text-[10px] shrink-0">{d.client} · {d.primarySkill}</span>
                          {isExisting && <span className="text-[9px] text-emerald-400 shrink-0">✓ linked</span>}
                        </button>
                      );
                    })}
                </div>
              )}
              <p className="mt-2 text-[10px] text-slate-500">
                {selectedDemandIds.length > 0
                  ? <>Selected: <strong className="text-slate-300">{selectedDemandIds.length}</strong> demand(s) — on save, this resource will appear on the Kanban board under "Profile Submitted" for each selected demand.</>
                  : <>Tip: pick one or more demands to make this resource a candidate for them. The resource will appear on the Kanban board immediately after saving.</>
                }
              </p>
            </div>
          </div>
        </div>
        {duplicates.length > 0 && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-300">
            <strong>Duplicate check:</strong> {duplicates.join("; ")}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={loading} className="bg-[#0070f3] hover:bg-[#0050c8]">
            {loading ? (isEditing ? "Saving..." : "Adding...") : (isEditing ? "Save Changes" : "Add Resource")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============ Client Form Modal ============
export function ClientFormModal({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const { toast } = useToast();
  const [form, setForm] = useState({ name: "", industry: "", website: "", contactName: "", contactEmail: "", contactPhone: "", address: "" });

  const submit = async () => {
    if (!form.name) {
      toast({ title: "Name required", variant: "destructive" });
      return;
    }
    try {
      await api("/api/clients", { method: "POST", body: JSON.stringify(form) });
      toast({ title: "Client created" });
      onSaved();
      onClose();
      setForm({ name: "", industry: "", website: "", contactName: "", contactEmail: "", contactPhone: "", address: "" });
    } catch (e: any) {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Client</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2"><Label>Client Name *</Label><Input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} /></div>
          <div><Label>Industry</Label><Input value={form.industry} onChange={(e) => setForm(f => ({ ...f, industry: e.target.value }))} /></div>
          <div><Label>Website</Label><Input value={form.website} onChange={(e) => setForm(f => ({ ...f, website: e.target.value }))} /></div>
          <div><Label>Contact Name</Label><Input value={form.contactName} onChange={(e) => setForm(f => ({ ...f, contactName: e.target.value }))} /></div>
          <div><Label>Contact Email</Label><Input value={form.contactEmail} onChange={(e) => setForm(f => ({ ...f, contactEmail: e.target.value }))} /></div>
          <div><Label>Contact Phone</Label><Input value={form.contactPhone} onChange={(e) => setForm(f => ({ ...f, contactPhone: e.target.value }))} /></div>
          <div className="sm:col-span-2"><Label>Address</Label><Textarea rows={2} value={form.address} onChange={(e) => setForm(f => ({ ...f, address: e.target.value }))} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} className="bg-[#0070f3] hover:bg-[#0050c8]">Create Client</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============ Assignment Move Modal ============
export function AssignmentMoveModal({ open, onClose, assignmentId, currentStage }: { open: boolean; onClose: () => void; assignmentId: string | null; currentStage: string | null }) {
  const { toast } = useToast();
  const [target, setTarget] = useState("");
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (currentStage) setTarget(currentStage);
    setComment("");
  }, [currentStage, open]);

  if (!currentStage) return null;
  const allowed = VALID_TRANSITIONS[currentStage] || [];

  const submit = async () => {
    if (!assignmentId || !target) return;
    setSaving(true);
    try {
      await api(`/api/assignments/${assignmentId}`, { method: "PATCH", body: JSON.stringify({ stage: target, comment }) });
      toast({ title: "Stage updated", description: `${currentStage} → ${target}` });
      onClose();
    } catch (e: any) {
      toast({ title: "Move failed", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Move Candidate</DialogTitle>
          <DialogDescription>Current stage: <strong>{currentStage}</strong></DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Move to stage</Label>
            <Select value={target} onValueChange={setTarget}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {allowed.length > 0 ? (
                  allowed.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)
                ) : (
                  KANBAN_COLUMNS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)
                )}
              </SelectContent>
            </Select>
            {allowed.length > 0 && (
              <p className="mt-1 text-xs text-slate-400">Allowed transitions: {allowed.join(", ")}</p>
            )}
          </div>
          <div>
            <Label>Comment (optional)</Label>
            <Textarea rows={2} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Reason for move..." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={saving || !target || target === currentStage} className="bg-[#0070f3] hover:bg-[#0050c8]">
            {saving ? "Moving..." : "Move Candidate"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
