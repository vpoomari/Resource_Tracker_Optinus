"use client";

import { useState, useRef } from "react";
import { api } from "@/lib/client/api";
import { useToast } from "@/hooks/use-toast";
import { SectionCard } from "@/components/shared/kpi-card";
import {
  Upload, FileSpreadsheet, Download, AlertTriangle, CheckCircle2, FileDown,
} from "lucide-react";
import { cn } from "@/lib/utils";

const EXPORTS = [
  { type: "demands", label: "All Demands", description: "Export every demand record", icon: FileSpreadsheet },
  { type: "resources", label: "All Resources", description: "Export every resource / candidate", icon: FileSpreadsheet },
  { type: "assignments", label: "All Assignments", description: "Demand → Resource mappings", icon: FileSpreadsheet },
  { type: "kanban", label: "Kanban Data", description: "Current pipeline state snapshot", icon: FileSpreadsheet },
  { type: "activity", label: "Activity History", description: "Audit logs (last 1000 entries)", icon: FileSpreadsheet },
];

const TEMPLATES = {
  // DemandID is auto-generated server-side — not part of the import template
  demands: ["Client", "Account", "Project", "Position", "PrimarySkill", "SecondarySkills", "MinExp", "MaxExp", "Location", "WorkMode", "Positions", "Priority", "Status", "Owner", "ResourceManager"],
  resources: ["ResourceID", "Name", "Email", "Phone", "Location", "PrimarySkill", "Technology", "TotalExperience", "RelevantExperience", "CurrentEmployer", "Designation", "NoticePeriod", "ExpectedRate", "Currency", "EmploymentType", "ResourceType", "Status", "Tags"],
};

export function ImportExportView() {
  const { toast } = useToast();
  const [importType, setImportType] = useState<"demands" | "resources">("demands");
  const [parsedData, setParsedData] = useState<Record<string, string>[]>([]);
  const [preview, setPreview] = useState<{ total: number; valid: number; duplicates: number; errors: number; errorDetails: any[]; duplicateDetails: any[]; validRows: Record<string, string>[] } | null>(null);
  const [parsing, setParsing] = useState(false);
  const [committing, setCommitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setParsing(true);
    setPreview(null);
    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter(l => l.trim());
      if (lines.length < 2) {
        toast({ title: "Invalid CSV", description: "Need at least header + 1 row", variant: "destructive" });
        setParsing(false);
        return;
      }
      const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, ""));
      const rows: Record<string, string>[] = lines.slice(1).map(line => {
        // simple CSV parse (no quoted commas)
        const cells = line.split(",").map(c => c.trim().replace(/^"|"$/g, ""));
        const row: Record<string, string> = {};
        headers.forEach((h, i) => row[h] = cells[i] || "");
        return row;
      });
      setParsedData(rows);
      const r = await api<{ total: number; valid: number; duplicates: number; errors: number; errorDetails: any[]; duplicateDetails: any[]; validRows: Record<string, string>[] }>(
        "/api/import",
        { method: "POST", body: JSON.stringify({ type: importType, rows }) }
      );
      setPreview(r);
      toast({ title: `Parsed ${r.total} rows`, description: `${r.valid} valid · ${r.errors} errors · ${r.duplicates} duplicates` });
    } catch (e: any) {
      toast({ title: "Parse failed", description: e.message, variant: "destructive" });
    } finally {
      setParsing(false);
    }
  };

  const commitImport = async () => {
    if (!preview?.validRows?.length) return;
    setCommitting(true);
    try {
      const r = await api<{ created: number }>("/api/import", { method: "PUT", body: JSON.stringify({ type: importType, rows: preview.validRows }) });
      toast({ title: `Imported ${r.created} ${importType}` });
      setPreview(null);
      setParsedData([]);
      if (fileRef.current) fileRef.current.value = "";
    } catch (e: any) {
      toast({ title: "Import failed", description: e.message, variant: "destructive" });
    } finally {
      setCommitting(false);
    }
  };

  const downloadTemplate = (type: "demands" | "resources") => {
    const headers = TEMPLATES[type];
    const csv = headers.join(",") + "\n";
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${type}-template.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
    toast({ title: `Template downloaded` });
  };

  const handleExport = async (type: string) => {
    try {
      const r = await api<{ rows: Record<string, string | number>[]; filename: string }>(`/api/export?type=${type}`);
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

  return (
    <div className="space-y-5 animate-fade-in-up">
      <div>
        <h1 className="text-2xl font-bold text-white">Import / Export</h1>
        <p className="text-sm text-slate-400 mt-0.5">Bulk operations · Templates · Validation</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* IMPORT */}
        <SectionCard title="Import Data">
          <div className="space-y-4">
            {/* Type selector */}
            <div className="flex gap-2">
              {(["demands", "resources"] as const).map(t => (
                <button
                  key={t}
                  onClick={() => { setImportType(t); setPreview(null); setParsedData([]); if (fileRef.current) fileRef.current.value = ""; }}
                  className={cn(
                    "flex-1 rounded-lg border px-3 py-2 text-sm font-semibold capitalize transition",
                    importType === t ? "border-[#0070f3] bg-[#0070f3]/10 text-[#0070f3]" : "border-white/10 bg-[#181826] text-white hover:bg-white/[0.03]"
                  )}
                >
                  {t}
                </button>
              ))}
            </div>

            {/* Template download */}
            <button
              onClick={() => downloadTemplate(importType)}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-[#0070f3] hover:underline"
            >
              <Download className="h-3.5 w-3.5" /> Download {importType} template
            </button>

            {/* Drop zone */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const f = e.dataTransfer.files?.[0];
                if (f) handleFile(f);
              }}
              className="rounded-xl border-2 border-dashed border-white/10 bg-white/[0.03] p-6 text-center hover:border-[#0070f3] hover:bg-[#0070f3]/[0.08] transition cursor-pointer"
              onClick={() => fileRef.current?.click()}
            >
              <input
                ref={fileRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                  e.target.value = "";
                }}
              />
              {parsing ? (
                <div className="text-sm text-slate-400">Parsing CSV...</div>
              ) : (
                <>
                  <Upload className="mx-auto h-8 w-8 text-slate-400" />
                  <p className="mt-2 text-sm font-semibold text-white">Drop CSV file or click to upload</p>
                  <p className="text-xs text-slate-400">CSV only · {importType} template format</p>
                </>
              )}
            </div>

            {/* Preview */}
            {preview && (
              <div className="space-y-3">
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div className="rounded-lg bg-white/[0.03] p-2">
                    <div className="text-lg font-bold text-white">{preview.total}</div>
                    <div className="text-[10px] uppercase text-slate-400">Records</div>
                  </div>
                  <div className="rounded-lg bg-emerald-500/10 p-2">
                    <div className="text-lg font-bold text-emerald-300">{preview.valid}</div>
                    <div className="text-[10px] uppercase text-emerald-400">Valid</div>
                  </div>
                  <div className="rounded-lg bg-amber-500/10 p-2">
                    <div className="text-lg font-bold text-amber-300">{preview.duplicates}</div>
                    <div className="text-[10px] uppercase text-amber-400">Duplicates</div>
                  </div>
                  <div className="rounded-lg bg-red-500/10 p-2">
                    <div className="text-lg font-bold text-red-300">{preview.errors}</div>
                    <div className="text-[10px] uppercase text-red-400">Errors</div>
                  </div>
                </div>

                {preview.errorDetails.length > 0 && (
                  <div className="rounded-lg border border-red-500/20 bg-red-500/100/[0.08] p-3">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-red-300 mb-1">
                      <AlertTriangle className="h-4 w-4" /> Errors ({preview.errorDetails.length})
                    </div>
                    <ul className="space-y-0.5 text-xs text-red-400">
                      {preview.errorDetails.slice(0, 5).map((e, i) => (
                        <li key={i}>Row {e.row} · {e.field}: {e.message}</li>
                      ))}
                      {preview.errorDetails.length > 5 && <li className="italic">+{preview.errorDetails.length - 5} more</li>}
                    </ul>
                  </div>
                )}

                {preview.duplicateDetails.length > 0 && (
                  <div className="rounded-lg border border-amber-500/20 bg-amber-500/100/[0.08] p-3">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-300 mb-1">
                      <AlertTriangle className="h-4 w-4" /> Duplicates ({preview.duplicateDetails.length})
                    </div>
                    <ul className="space-y-0.5 text-xs text-amber-300">
                      {preview.duplicateDetails.slice(0, 3).map((d, i) => (
                        <li key={i}>Row {d.row} → matches {d.existing}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={commitImport}
                    disabled={preview.valid === 0 || committing}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#0070f3] px-3 py-2 text-sm font-semibold text-white hover:bg-[#0050c8] disabled:opacity-50"
                  >
                    <CheckCircle2 className="h-4 w-4" /> {committing ? "Importing..." : `Import ${preview.valid} valid records`}
                  </button>
                  <button
                    onClick={() => { setPreview(null); setParsedData([]); if (fileRef.current) fileRef.current.value = ""; }}
                    className="inline-flex items-center justify-center rounded-lg border border-white/10 px-3 py-2 text-sm font-semibold text-white hover:bg-white/[0.03]"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </SectionCard>

        {/* EXPORT */}
        <SectionCard title="Export Data">
          <div className="space-y-2">
            {EXPORTS.map(e => (
              <button
                key={e.type}
                onClick={() => handleExport(e.type)}
                className="group flex w-full items-center gap-3 rounded-lg border border-white/10 bg-[#181826] p-3 text-left transition hover:border-[#0070f3] hover:bg-[#0070f3]/[0.06]"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-500/15 text-slate-400 group-hover:bg-[#0070f3] group-hover:text-white transition">
                  <e.icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-white">{e.label}</div>
                  <div className="text-[10px] text-slate-400">{e.description}</div>
                </div>
                <FileDown className="h-4 w-4 text-slate-400 group-hover:text-[#0070f3]" />
              </button>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
