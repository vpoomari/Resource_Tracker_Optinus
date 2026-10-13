"use client";

import { useEffect, useState, useMemo } from "react";
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors, useDraggable, useDroppable, type DragEndEvent, type DragStartEvent } from "@dnd-kit/core";
import { api } from "@/lib/client/api";
import { useToast } from "@/hooks/use-toast";
import { StatusBadge, PriorityBadge, UserAvatar, Skeleton } from "@/components/shared/badges";
import { KANBAN_COLUMNS, STATUS_COLORS, VALID_TRANSITIONS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { GripVertical, Briefcase, MapPin, Calendar, AlertTriangle, Download, Upload, Plus, UserPlus } from "lucide-react";
import { AddToKanbanModal } from "@/components/shared/add-to-kanban-modal";
import { BulkImportModal } from "@/components/shared/bulk-import-modal";

interface KanbanAssignment {
  id: string; assignmentId: string; currentStage: string;
  lastUpdated: string; offeredRate?: number | null;
  demand: { id: string; demandId: string; client: string; positionTitle: string; priority: string; project?: string | null; location?: string | null };
  resource: { id: string; resourceId: string; candidateName: string; primarySkill?: string | null; totalExperience?: number | null; currentLocation?: string | null; avatarColor: string; currentDesignation?: string | null };
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function KanbanCard({ assignment, onMove }: { assignment: KanbanAssignment; onMove?: (id: string, stage: string) => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: assignment.id });
  const colors = STATUS_COLORS[assignment.currentStage] || STATUS_COLORS.New;

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={cn(
        "group relative cursor-grab rounded-xl border bg-[#181826] p-3 shadow-sm transition-all",
        "hover:shadow-md hover:border-[#0070f3]",
        isDragging && "kanban-card-dragging",
      )}
    >
      {/* Left accent */}
      <div className={cn("absolute left-0 top-0 bottom-0 w-1 rounded-l-xl", colors.bar)} />
      <div className="pl-2">
        <div className="flex items-start gap-2">
          <UserAvatar name={assignment.resource.candidateName} color={assignment.resource.avatarColor} size={32} />
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm text-white truncate">{assignment.resource.candidateName}</div>
            <div className="text-[10px] text-slate-400">{assignment.resource.resourceId}</div>
          </div>
          <GripVertical className="h-3.5 w-3.5 text-slate-300 group-hover:text-slate-500" />
        </div>

        <div className="mt-2 text-xs">
          <div className="font-medium text-white truncate">{assignment.demand.positionTitle}</div>
          <div className="text-[10px] text-slate-400 truncate">{assignment.demand.client} · {assignment.demand.demandId}</div>
        </div>

        <div className="mt-2 flex items-center gap-2 text-[10px] text-slate-400">
          <span className="inline-flex items-center gap-1"><Briefcase className="h-3 w-3" /> {assignment.resource.totalExperience} yrs</span>
          <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {assignment.resource.currentLocation || "—"}</span>
        </div>

        <div className="mt-2 flex items-center justify-between">
          <PriorityBadge priority={assignment.demand.priority} />
          <span className="text-[10px] text-slate-400">{timeAgo(assignment.lastUpdated)}</span>
        </div>
      </div>
    </div>
  );
}

function KanbanColumn({ stage, assignments, isOver }: { stage: string; assignments: KanbanAssignment[]; isOver: boolean }) {
  const { setNodeRef } = useDroppable({ id: stage });
  const colors = STATUS_COLORS[stage] || STATUS_COLORS.New;

  return (
    <div className="flex flex-col gap-3 rounded-xl bg-white/[0.03] p-3 ring-1 ring-white/10/60 w-[300px] shrink-0">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={cn("h-2.5 w-2.5 rounded-full", colors.dot)} />
          <h3 className="text-sm font-bold text-white">{stage}</h3>
        </div>
        <span className={cn("rounded-full px-2 py-0.5 text-xs font-bold", colors.bg, colors.text)}>{assignments.length}</span>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          "flex-1 space-y-2 min-h-[200px] max-h-[calc(100vh-220px)] overflow-y-auto scrollbar-thin rounded-lg p-1 transition-all",
          isOver && "kanban-column-drop-active"
        )}
      >
        {assignments.length === 0 && (
          <div className="flex h-24 items-center justify-center rounded-lg border-2 border-dashed border-white/10 text-xs text-slate-400">
            Drop here
          </div>
        )}
        {assignments.map(a => (
          <KanbanCard key={a.id} assignment={a} />
        ))}
      </div>
    </div>
  );
}

export function KanbanView({ onToast, onNewResource }: { onToast?: (msg: string) => void; onNewResource?: () => void }) {
  const { toast } = useToast();
  const [assignments, setAssignments] = useState<KanbanAssignment[] | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // New modal state
  const [addToKanbanOpen, setAddToKanbanOpen] = useState(false);
  const [bulkImportOpen, setBulkImportOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const load = () => {
    api<{ assignments: KanbanAssignment[] }>("/api/assignments?view=kanban").then(r => setAssignments(r.assignments)).catch(e => {
      toast({ title: "Failed to load", description: e.message, variant: "destructive" });
      setAssignments([]);
    });
  };

  useEffect(() => { load(); }, []);

  const exportCsv = async () => {
    try {
      const r = await api<{ rows: Record<string, string | number>[]; filename: string }>(`/api/export?type=kanban`);
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
      toast({ title: `Exported ${rows.length} rows` });
    } catch (e: any) {
      toast({ title: "Export failed", description: e.message, variant: "destructive" });
    }
  };

  const grouped = useMemo(() => {
    const g: Record<string, KanbanAssignment[]> = {};
    for (const c of KANBAN_COLUMNS) g[c] = [];
    if (assignments) {
      for (const a of assignments) {
        if (g[a.currentStage]) g[a.currentStage].push(a);
      }
    }
    return g;
  }, [assignments]);

  const active = assignments?.find(a => a.id === activeId);

  const onDragStart = (e: DragStartEvent) => {
    setActiveId(String(e.active.id));
  };

  const onDragEnd = async (e: DragEndEvent) => {
    const { active, over } = e;
    setActiveId(null);
    setOverCol(null);
    if (!over || !assignments) return;
    const dragged = assignments.find(a => a.id === active.id);
    if (!dragged) return;
    const newStage = String(over.id);
    if (newStage === dragged.currentStage) return;

    // Validate transition
    const allowed = VALID_TRANSITIONS[dragged.currentStage] || [];
    if (allowed.length > 0 && !allowed.includes(newStage)) {
      toast({
        title: "Invalid transition",
        description: `Cannot move ${dragged.resource.candidateName} from ${dragged.currentStage} → ${newStage}. Allowed: ${allowed.join(", ")}.`,
        variant: "destructive",
      });
      return;
    }

    // Optimistic update
    setAssignments(prev => prev?.map(a => a.id === dragged.id ? { ...a, currentStage: newStage, lastUpdated: new Date().toISOString() } : a) || null);

    try {
      await api(`/api/assignments/${dragged.id}`, {
        method: "PATCH",
        body: JSON.stringify({ stage: newStage, comment: `Dragged from ${dragged.currentStage} to ${newStage}` }),
      });
      toast({
        title: `✓ ${dragged.resource.candidateName} moved`,
        description: `${dragged.currentStage} → ${newStage}`,
      });
      // Reload to sync server data
      load();
    } catch (err: any) {
      // Rollback
      toast({ title: "Move failed", description: err.message, variant: "destructive" });
      load();
    }
  };

  if (!assignments) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <div className="flex gap-3 overflow-hidden">
          {KANBAN_COLUMNS.map(c => <Skeleton key={c} className="h-96 w-[300px] shrink-0" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in-up">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Kanban Board</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Drag candidates across pipeline stages · {assignments.length} active assignments
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {onNewResource && (
            <button
              onClick={onNewResource}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-[#181826] px-3 py-2 text-sm font-semibold text-white hover:bg-white/[0.03]"
              title="Create a new resource record"
            >
              <Plus className="h-4 w-4" /> Add Resource
            </button>
          )}
          <button
            onClick={() => setBulkImportOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-[#181826] px-3 py-2 text-sm font-semibold text-white hover:bg-white/[0.03]"
            title="Bulk import resources via CSV / paste / resume auto-extract"
          >
            <Upload className="h-4 w-4" /> Import
          </button>
          <button
            onClick={() => setAddToKanbanOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#0070f3] px-3.5 py-2 text-sm font-semibold text-white shadow-md shadow-[#0070f3]/30 hover:bg-[#0060d3] optinus-glow"
            title="Pick a demand + pick resources from the database and add them to the Kanban"
          >
            <UserPlus className="h-4 w-4" /> Add to Kanban
          </button>
          <button onClick={exportCsv} className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-[#181826] px-3 py-2 text-sm font-semibold text-white hover:bg-white/[0.03]">
            <Download className="h-4 w-4" /> Export
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</div>
      )}

      <DndContext
        sensors={sensors}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onDragOver={(e) => setOverCol(e.over?.id ? String(e.over.id) : null)}
      >
        <div className="flex gap-3 overflow-x-auto scrollbar-thin pb-4">
          {KANBAN_COLUMNS.map(col => (
            <KanbanColumn
              key={col}
              stage={col}
              assignments={grouped[col] || []}
              isOver={overCol === col}
            />
          ))}
        </div>

        <DragOverlay>
          {active ? <KanbanCard assignment={active} /> : null}
        </DragOverlay>
      </DndContext>

      {/* Add-to-Kanban modal — pick demand + pick resources + choose starting stage */}
      <AddToKanbanModal
        open={addToKanbanOpen}
        onClose={() => setAddToKanbanOpen(false)}
        onAssigned={() => load()}
      />

      {/* Bulk Import modal — drag-drop CSV / paste / resume auto-extract */}
      <BulkImportModal
        open={bulkImportOpen}
        onClose={() => setBulkImportOpen(false)}
        entityType="resources"
        onImported={() => load()}
      />
    </div>
  );
}
