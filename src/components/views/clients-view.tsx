"use client";

import { useEffect, useState, useRef } from "react";
import { api } from "@/lib/client/api";
import { useToast } from "@/hooks/use-toast";
import { BulkImportModal } from "@/components/shared/bulk-import-modal";
import { SectionCard, KpiCard } from "@/components/shared/kpi-card";
import { Skeleton, EmptyState } from "@/components/shared/badges";
import { Building2, Plus, Briefcase, Users, AlertTriangle, Download, Upload } from "lucide-react";

interface Client {
  id: string; name: string; industry?: string | null; website?: string | null;
  contactName?: string | null; contactEmail?: string | null; contactPhone?: string | null;
  address?: string | null; active: boolean; demandCount: number; openDemandCount: number;
}

export function ClientsView({ onOpenClient, onNewClient, onNewDemand }: {
  onOpenClient: (id: string) => void;
  onNewClient: () => void;
  onNewDemand: () => void;
}) {
  const { toast } = useToast();
  const [clients, setClients] = useState<Client[] | null>(null);
  const importFileRef = useRef<HTMLInputElement>(null);
  const [bulkImportOpen, setBulkImportOpen] = useState(false);

  const load = () => {
    api<{ clients: Client[] }>("/api/clients").then(r => setClients(r.clients)).catch(e => {
      toast({ title: "Failed to load", description: e.message, variant: "destructive" });
      setClients([]);
    });
  };
  useEffect(() => { load(); }, []);

  const exportCsv = async () => {
    if (!clients) return;
    const headers = ["Name", "Industry", "Website", "ContactName", "ContactEmail", "ContactPhone", "Address", "TotalDemands", "OpenDemands", "Active"];
    const rows = clients.map(c => [c.name, c.industry || "", c.website || "", c.contactName || "", c.contactEmail || "", c.contactPhone || "", c.address || "", c.demandCount, c.openDemandCount, c.active ? "Yes" : "No"]);
    const csv = [headers.join(","), ...rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `clients-${Date.now()}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
    toast({ title: `Exported ${clients.length} clients` });
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
      let created = 0;
      for (const line of lines.slice(1)) {
        const cells = line.split(",").map(c => c.trim().replace(/^"|"$/g, ""));
        const row: Record<string, string> = {};
        headers.forEach((h, i) => row[h] = cells[i] || "");
        if (!row.Name) continue;
        try {
          await api("/api/clients", { method: "POST", body: JSON.stringify({
            name: row.Name, industry: row.Industry || null, website: row.Website || null,
            contactName: row.ContactName || null, contactEmail: row.ContactEmail || null,
            contactPhone: row.ContactPhone || null, address: row.Address || null,
          }) });
          created++;
        } catch (e) { /* skip duplicates */ }
      }
      toast({ title: `Imported ${created} clients` });
      load();
    } catch (e: any) {
      toast({ title: "Import failed", description: e.message, variant: "destructive" });
    }
  };

  if (!clients) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-16" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-44" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in-up">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Clients</h1>
          <p className="text-sm text-slate-400 mt-0.5">{clients.length} clients</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setBulkImportOpen(true)} className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-[#181826] px-3 py-2 text-sm font-semibold text-white hover:bg-white/[0.03]">
            <Upload className="h-4 w-4" /> Import
          </button>
          <button onClick={exportCsv} className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-[#181826] px-3 py-2 text-sm font-semibold text-white hover:bg-white/[0.03]">
            <Download className="h-4 w-4" /> Export
          </button>
          <button onClick={onNewDemand} className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-[#181826] px-3 py-2 text-sm font-semibold text-white hover:bg-white/[0.03]">
            <Plus className="h-4 w-4" /> New Demand
          </button>
          <button onClick={onNewClient} className="inline-flex items-center gap-1.5 rounded-lg bg-[#0070f3] px-3.5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#0050c8]">
            <Plus className="h-4 w-4" /> New Client
          </button>
        </div>
      </div>

      {clients.length === 0 ? (
        <EmptyState icon={<Building2 className="h-7 w-7" />} title="No clients yet" action={onNewClient} actionLabel="+ Add Client" />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {clients.map(c => (
            <button
              key={c.id}
              onClick={() => onOpenClient(c.id)}
              className="group rounded-xl border border-white/10 bg-[#181826] p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-[#0070f3] hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#0070f3] to-[#0050c8] text-white shadow">
                  <Building2 className="h-6 w-6" />
                </div>
                <span className={`text-[10px] font-semibold rounded-full px-2 py-0.5 ${c.active ? "bg-emerald-500/15 text-emerald-300" : "bg-slate-500/15 text-slate-400"}`}>
                  {c.active ? "Active" : "Inactive"}
                </span>
              </div>
              <h3 className="mt-3 font-bold text-white group-hover:text-[#0070f3]">{c.name}</h3>
              <p className="text-xs text-slate-400">{c.industry || "—"}</p>
              <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <div className="text-[10px] uppercase text-slate-400">Total Demands</div>
                  <div className="font-semibold text-white">{c.demandCount}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase text-slate-400">Open</div>
                  <div className="font-semibold text-[#0070f3]">{c.openDemandCount}</div>
                </div>
              </div>
              <div className="mt-3 border-t border-white/5 pt-2 text-xs text-slate-400">
                {c.contactName ? `Contact: ${c.contactName}` : "No contact"}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Bulk Import Modal — drag-drop / paste / click-select */}
      <BulkImportModal
        open={bulkImportOpen}
        onClose={() => setBulkImportOpen(false)}
        entityType="clients"
        onImported={() => load()}
      />
    </div>
  );
}
