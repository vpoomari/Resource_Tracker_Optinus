"use client";

import { useState, useRef, useEffect } from "react";
import { api, apiForm } from "@/lib/client/api";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Upload, FileText, ClipboardPaste, Download, AlertTriangle, CheckCircle2, X, FileUp, Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type EntityType = "demands" | "resources" | "clients";

interface PreviewResult {
  total: number;
  valid: number;
  duplicates: number;
  errors: number;
  errorDetails: { row: number; field: string; message: string }[];
  duplicateDetails: { row: number; existing: string }[];
  validRows: Record<string, string>[];
  detectedColumns?: Record<string, string | null>;
  parsedHeaders?: string[];
  format?: string;
}

const TEMPLATES: Record<EntityType, string[]> = {
  // DemandID is intentionally NOT in the template — it's auto-generated server-side
  demands: ["Client", "Account", "Project", "Position", "PrimarySkill", "SecondarySkills", "MinExp", "MaxExp", "Location", "WorkMode", "Positions", "Priority", "Status", "Owner", "ResourceManager"],
  // ResourceID is auto-generated if not supplied in the CSV
  resources: ["Name", "Email", "Phone", "Location", "PrimarySkill", "Technology", "TotalExperience", "RelevantExperience", "CurrentEmployer", "Designation", "NoticePeriod", "ExpectedRate", "Currency", "EmploymentType", "ResourceType", "Status", "Tags"],
  clients: ["Name", "Industry", "Website", "ContactName", "ContactEmail", "ContactPhone", "Address"],
};

const LABELS: Record<EntityType, { singular: string; plural: string }> = {
  demands: { singular: "Demand", plural: "Demands" },
  resources: { singular: "Resource", plural: "Resources" },
  clients: { singular: "Client", plural: "Clients" },
};

// Smart parser — auto-detects the format and tries to extract structured data
// from any input: CSV, TSV, semicolon-separated, pipe-separated, JSON array,
// or even "key: value" per line. Handles BOM, mixed line endings, quoted fields.
function smartParse(text: string): { headers: string[]; rows: Record<string, string>[]; format: string } {
  if (!text || !text.trim()) return { headers: [], rows: [], format: "empty" };

  // Strip BOM (byte order mark) that Excel/Sheets adds to CSV exports
  let cleanText = text.replace(/^\uFEFF/, "");
  // Normalize line endings (handle \r\n, \r, \n)
  cleanText = cleanText.replace(/\r\n?/g, "\n").trim();
  if (!cleanText) return { headers: [], rows: [], format: "empty" };

  // ─── Try JSON first ─────────────────────────────────────────
  // Handles: [{"Name": "X", "Email": "Y"}, ...] or {"a": [...], "b": [...]}
  const trimmed = cleanText.trim();
  if ((trimmed.startsWith("[") && trimmed.endsWith("]")) || (trimmed.startsWith("{") && trimmed.endsWith("}"))) {
    try {
      const parsed = JSON.parse(trimmed);
      const arr = Array.isArray(parsed) ? parsed : (Array.isArray(parsed.rows) ? parsed.rows : null);
      if (arr && arr.length > 0 && typeof arr[0] === "object") {
        const headers = Array.from(new Set(arr.flatMap((o: any) => Object.keys(o))));
        const rows = arr.map((o: any) => {
          const row: Record<string, string> = {};
          for (const h of headers) {
            const v = o[h];
            row[h] = v === null || v === undefined ? "" : String(v);
          }
          return row;
        });
        return { headers, rows, format: "JSON array" };
      }
    } catch { /* fall through to delimiter detection */ }
  }

  // ─── Try key:value per line (vCard / properties format) ─────
  // Each line is "Key: Value" or "Key=Value"
  const lines = cleanText.split("\n").filter(l => l.trim());
  const looksLikeKeyValue = lines.every(l => /^[\w\s-]+\s*[:=]\s*/.test(l));
  if (looksLikeKeyValue && lines.length >= 2 && !lines[0].includes(",")) {
    // Build a single record from key:value pairs
    const headers: string[] = [];
    const row: Record<string, string> = {};
    for (const line of lines) {
      const m = line.match(/^([\w\s-]+)\s*[:=]\s*(.*)$/);
      if (m) {
        const key = m[1].trim();
        const value = m[2].trim();
        if (!headers.includes(key)) headers.push(key);
        row[key] = value;
      }
    }
    if (headers.length >= 2) {
      return { headers, rows: [row], format: "key-value" };
    }
  }

  // ─── Delimiter detection for tabular data ─────────────────
  // Count occurrences of common delimiters in the first 5 non-empty lines
  const sampleLines = lines.slice(0, Math.min(5, lines.length));
  const candidates: Record<string, number> = { ",": 0, "\t": 0, ";": 0, "|": 0 };
  for (const line of sampleLines) {
    for (const delim of Object.keys(candidates)) {
      // Count outside quotes
      let inQuotes = false;
      for (const ch of line) {
        if (ch === '"') inQuotes = !inQuotes;
        else if (!inQuotes && ch === delim) candidates[delim]++;
      }
    }
  }
  // Pick the delimiter with the most consistent count across lines
  // (the right delimiter will produce roughly equal cell counts per line)
  let bestDelim = ",";
  let bestScore = 0;
  for (const delim of Object.keys(candidates)) {
    if (candidates[delim] > bestScore) {
      bestScore = candidates[delim];
      bestDelim = delim;
    }
  }

  const formatLabel = bestDelim === "\t" ? "TSV" : bestDelim === ";" ? "semicolon-separated" : bestDelim === "|" ? "pipe-separated" : "CSV";

  // Robust line splitter for the detected delimiter — handles quoted fields with embedded delimiters + escaped quotes
  function splitLine(line: string): string[] {
    const cells: string[] = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; }
        else inQuotes = !inQuotes;
      } else if (ch === bestDelim && !inQuotes) {
        cells.push(cur.trim().replace(/^"|"$/g, ""));
        cur = "";
      } else {
        cur += ch;
      }
    }
    cells.push(cur.trim().replace(/^"|"$/g, ""));
    return cells;
  }

  // Parse headers
  const headers = splitLine(lines[0]).map(h => h.trim());
  if (headers.length < 2) {
    // Single-column "list" — treat each line as a candidate name
    if (lines.length >= 2) {
      return {
        headers: ["Name"],
        rows: lines.map(l => ({ Name: l.trim() })),
        format: "list (one name per line)",
      };
    }
    return { headers: [], rows: [], format: "unknown" };
  }

  const rows: Record<string, string>[] = [];
  for (const line of lines.slice(1)) {
    if (!line.trim()) continue;
    const cells = splitLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = (cells[i] || "").trim(); });
    rows.push(row);
  }
  return { headers, rows, format: formatLabel };
}

interface BulkImportModalProps {
  open: boolean;
  onClose: () => void;
  entityType: EntityType;
  onImported?: (created: number) => void;
}

export function BulkImportModal({ open, onClose, entityType, onImported }: BulkImportModalProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"file" | "paste" | "resumes">("file");
  const [fileName, setFileName] = useState("");
  const [parsedText, setParsedText] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [parsing, setParsing] = useState(false);
  const [committing, setCommitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  // Resume auto-extract state (only for resources)
  const [resumeFiles, setResumeFiles] = useState<File[]>([]);
  const [resumeStatus, setResumeStatus] = useState<Record<string, { status: "pending" | "extracting" | "extracted" | "error"; data?: any; error?: string }>>({});
  const [resumeDragOver, setResumeDragOver] = useState(false);
  const [committingResumes, setCommittingResumes] = useState(false);
  const resumeFileRef = useRef<HTMLInputElement>(null);

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setFileName("");
      setParsedText("");
      setPreview(null);
      setParsing(false);
      setCommitting(false);
      setActiveTab("file");
      setDragOver(false);
      setResumeFiles([]);
      setResumeStatus({});
      setResumeDragOver(false);
      setCommittingResumes(false);
      if (fileRef.current) fileRef.current.value = "";
      if (resumeFileRef.current) resumeFileRef.current.value = "";
    }
  }, [open]);

  const labels = LABELS[entityType];

  // ─── FILE HANDLERS ─────────────────────────────────────────
  const processText = async (text: string, source: string) => {
    if (!text.trim()) {
      toast({ title: "No data to import", description: "Provide some content first", variant: "destructive" });
      return;
    }
    setParsing(true);
    setPreview(null);
    try {
      const { headers, rows, format: detectedFormat } = smartParse(text);
      if (rows.length === 0) {
        toast({ title: "Could not parse", description: "Need at least a header + 1 row of data", variant: "destructive" });
        setParsing(false);
        return;
      }
      // Show toast with detected format
      toast({ title: `Detected format: ${detectedFormat}`, description: `${rows.length} rows · ${headers.length} columns` });
      // For clients, we call /api/clients POST per-row (no /api/import support for clients)
      if (entityType === "clients") {
        let valid = 0;
        let duplicates = 0;
        let errors = 0;
        const errorDetails: PreviewResult["errorDetails"] = [];
        const duplicateDetails: PreviewResult["duplicateDetails"] = [];
        const validRows: Record<string, string>[] = [];
        for (let i = 0; i < rows.length; i++) {
          const r = rows[i];
          if (!r.Name) { errors++; errorDetails.push({ row: i + 2, field: "Name", message: "Required — no 'Name' column found. Add a 'Name' column header." }); continue; }
          // Check for duplicate by trying to look up — for simplicity, just include as valid
          valid++;
          validRows.push(r);
        }
        const previewResult: PreviewResult = {
          total: rows.length, valid, duplicates, errors,
          errorDetails: errorDetails.slice(0, 50),
          duplicateDetails, validRows,
          parsedHeaders: headers,
          format: detectedFormat,
          detectedColumns: { Name: headers.find(h => h.toLowerCase().replace(/[^a-z0-9]/g, "") === "name") || null },
        };
        setPreview(previewResult);
      } else {
        // demands & resources use the /api/import endpoint for validation
        const r = await api<PreviewResult>("/api/import", {
          method: "POST",
          body: JSON.stringify({ type: entityType, rows }),
        });
        setPreview({ ...r, parsedHeaders: headers, format: detectedFormat });
        toast({ title: `Parsed ${r.total} rows`, description: `${r.valid} valid · ${r.errors} errors · ${r.duplicates} duplicates` });
      }
    } catch (e: any) {
      toast({ title: "Parse failed", description: e.message, variant: "destructive" });
    } finally {
      setParsing(false);
    }
  };

  const handleFile = async (file: File) => {
    setFileName(file.name);
    try {
      const text = await file.text();
      setParsedText(text);
      await processText(text, file.name);
    } catch (e: any) {
      toast({ title: "File read failed", description: e.message, variant: "destructive" });
    }
  };

  // ─── PASTE HANDLERS ───────────────────────────────────────
  const handlePaste = async () => {
    if (!parsedText.trim()) {
      toast({ title: "Nothing to parse", description: "Paste CSV content in the textarea", variant: "destructive" });
      return;
    }
    await processText(parsedText, "pasted text");
  };

  // Also support pasting files via the textarea-less approach (drop file on textarea)
  const handleTextareaDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) await handleFile(f);
  };

  // ─── COMMIT ────────────────────────────────────────────────
  const commitImport = async () => {
    if (!preview || preview.validRows.length === 0) return;
    setCommitting(true);
    try {
      if (entityType === "clients") {
        // Clients don't have /api/import — call /api/clients POST per row
        let created = 0;
        for (const r of preview.validRows) {
          try {
            await api("/api/clients", {
              method: "POST",
              body: JSON.stringify({
                name: r.Name,
                industry: r.Industry || null,
                website: r.Website || null,
                contactName: r.ContactName || null,
                contactEmail: r.ContactEmail || null,
                contactPhone: r.ContactPhone || null,
                address: r.Address || null,
              }),
            });
            created++;
          } catch (e) { /* duplicate, skip */ }
        }
        toast({ title: `Imported ${created} ${labels.plural.toLowerCase()}` });
        onImported?.(created);
      } else {
        const r = await api<{ created: number }>("/api/import", {
          method: "PUT",
          body: JSON.stringify({ type: entityType, rows: preview.validRows }),
        });
        toast({ title: `Imported ${r.created} ${labels.plural.toLowerCase()}`, description: `${preview.errors} errors · ${preview.duplicates} duplicates skipped` });
        onImported?.(r.created);
      }
      onClose();
    } catch (e: any) {
      toast({ title: "Import failed", description: e.message, variant: "destructive" });
    } finally {
      setCommitting(false);
    }
  };

  // ─── RESUME AUTO-EXTRACT (resources only) ──────────────────────
  const handleResumeFiles = (files: FileList) => {
    const valid = Array.from(files).filter(f => /\.(pdf|doc|docx|txt)$/i.test(f.name));
    if (valid.length === 0) {
      toast({ title: "No valid files", description: "Supported: PDF, DOC, DOCX, TXT", variant: "destructive" });
      return;
    }
    setResumeFiles(prev => [...prev, ...valid]);
    // Kick off extraction for each new file in parallel
    for (const f of valid) {
      extractResume(f);
    }
  };

  const extractResume = async (file: File) => {
    const key = `${file.name}-${file.size}-${file.lastModified}`;
    setResumeStatus(prev => ({ ...prev, [key]: { status: "extracting" } }));
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await apiForm<any>("/api/import-resumes", fd);
      setResumeStatus(prev => ({ ...prev, [key]: { status: "extracted", data: r } }));
    } catch (e: any) {
      setResumeStatus(prev => ({ ...prev, [key]: { status: "error", error: e.message } }));
    }
  };

  const removeResume = (idx: number) => {
    const f = resumeFiles[idx];
    const key = `${f.name}-${f.size}-${f.lastModified}`;
    setResumeFiles(prev => prev.filter((_, i) => i !== idx));
    setResumeStatus(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const commitResumes = async () => {
    const extracted = resumeFiles.map(f => {
      const key = `${f.name}-${f.size}-${f.lastModified}`;
      const s = resumeStatus[key];
      return s?.status === "extracted" ? { file: f, data: s.data } : null;
    }).filter(Boolean) as { file: File; data: any }[];

    if (extracted.length === 0) {
      toast({ title: "No extracted resumes to commit", description: "Wait for extraction to finish first", variant: "destructive" });
      return;
    }
    setCommittingResumes(true);
    let created = 0;
    let failed = 0;
    try {
      for (const { file, data } of extracted) {
        try {
          const fd = new FormData();
          fd.append("file", file);
          fd.append("data", JSON.stringify(data));
          await apiForm("/api/import-resumes/commit", fd);
          created++;
        } catch (e: any) {
          failed++;
          console.error("Commit failed for", file.name, e);
        }
      }
      toast({
        title: `Created ${created} resource${created !== 1 ? "s" : ""}${failed > 0 ? ` · ${failed} failed` : ""}`,
        description: "Each CV was attached to its resource record.",
      });
      onImported?.(created);
      onClose();
    } catch (e: any) {
      toast({ title: "Commit failed", description: e.message, variant: "destructive" });
    } finally {
      setCommittingResumes(false);
    }
  };

  // ─── TEMPLATE DOWNLOAD ──────────────────────────────────────
  const downloadTemplate = () => {
    const headers = TEMPLATES[entityType];
    // Sample row aligned to TEMPLATES (no DemandID for demands; no ResourceID for resources — both auto-generated)
    const sampleRows: Record<EntityType, string[]> = {
      demands: ["Acme Corp", "Sales", "Phoenix Project", "Senior Java Developer", "Java", "Spring Boot, Microservices", "6", "10", "Bangalore, India", "Hybrid", "1", "High", "New", "Reshma Iyer", "Reshma Iyer"],
      resources: ["John Doe", "john@acme.com", "+91 99999 99999", "Bangalore, India", "Java", "Spring Boot", "8", "7", "TCS", "Senior Developer", "60 days", "15000", "USD", "Full-time", "External", "Available", "Hot Candidate, Immediate Joiner"],
      clients: ["Acme Corp", "Manufacturing", "acme.com", "Jane Smith", "jane@acme.com", "+1 555 123 4567", "123 Main St, Anytown USA"],
    };
    const csv = [headers.join(","), sampleRows[entityType].map(c => `"${c}"`).join(",")].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${entityType}-template.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
    toast({ title: "Template downloaded", description: `${entityType}-template.csv` });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <FileUp className="h-5 w-5 text-[#0070f3]" />
            Import {labels.plural}
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Bulk-add {labels.plural.toLowerCase()} via drag-drop, paste, or file picker — with validation preview before commit.
          </DialogDescription>
        </DialogHeader>

        {/* Method selector */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "file" | "paste" | "resumes")} className="flex-1 overflow-hidden flex flex-col">
          <TabsList className={cn("bg-white/5 mb-3", entityType === "resources" ? "grid-cols-3" : "grid-cols-2")}>
            <TabsTrigger value="file" className="data-[state=active]:bg-[#0070f3] data-[state=active]:text-white text-slate-400">
              <Upload className="h-3.5 w-3.5 mr-1.5" /> Upload File
            </TabsTrigger>
            <TabsTrigger value="paste" className="data-[state=active]:bg-[#0070f3] data-[state=active]:text-white text-slate-400">
              <ClipboardPaste className="h-3.5 w-3.5 mr-1.5" /> Paste Data
            </TabsTrigger>
            {entityType === "resources" && (
              <TabsTrigger value="resumes" className="data-[state=active]:bg-[#0070f3] data-[state=active]:text-white text-slate-400">
                <Sparkles className="h-3.5 w-3.5 mr-1.5" /> Resume Auto-Extract
              </TabsTrigger>
            )}
          </TabsList>

          {/* FILE TAB */}
          <TabsContent value="file" className="flex-1 overflow-y-auto scrollbar-thin pr-1">
            {/* Drag-drop zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                const f = e.dataTransfer.files?.[0];
                if (f) handleFile(f);
              }}
              className={cn(
                "rounded-xl border-2 border-dashed p-8 text-center transition cursor-pointer",
                dragOver
                  ? "border-[#0070f3] bg-[#0070f3]/10"
                  : "border-white/15 bg-white/[0.03] hover:border-[#0070f3] hover:bg-[#0070f3]/[0.06]"
              )}
              onClick={() => fileRef.current?.click()}
            >
              <input
                ref={fileRef}
                type="file"
                accept=".csv,.txt"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                }}
              />
              {fileName ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#0070f3]/15 text-[#0070f3]">
                    <FileText className="h-6 w-6" />
                  </div>
                  <div className="text-sm font-semibold text-white">{fileName}</div>
                  <div className="text-xs text-slate-400">Click to replace</div>
                </div>
              ) : parsing ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#0070f3] border-t-transparent" />
                  <div className="text-sm text-slate-400">Parsing...</div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/5 text-slate-400">
                    <Upload className="h-6 w-6" />
                  </div>
                  <div className="text-sm font-semibold text-white">Drop CSV file here</div>
                  <div className="text-xs text-slate-400">or <span className="text-[#0070f3] font-medium">click to browse</span></div>
                  <div className="text-[10px] text-slate-500 mt-1">Supports .csv and .txt files</div>
                </div>
              )}
            </div>

            {/* Helper buttons */}
            <div className="mt-3 flex items-center justify-between">
              <button
                onClick={downloadTemplate}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-[#0070f3] hover:underline"
              >
                <Download className="h-3.5 w-3.5" /> Download CSV template with sample row
              </button>
              <div className="text-[10px] text-slate-500">
                Expected columns: {TEMPLATES[entityType].length}
              </div>
            </div>

            {/* Hint about supported columns */}
            <div className="mt-3 rounded-lg border border-white/5 bg-white/[0.02] p-3">
              <div className="text-[10px] font-semibold uppercase text-slate-500 mb-1">Expected columns</div>
              <div className="flex flex-wrap gap-1">
                {TEMPLATES[entityType].map((c, i) => (
                  <span key={c} className="inline-flex items-center rounded-md bg-white/5 px-1.5 py-0.5 text-[10px] font-medium text-slate-300">
                    {c}
                    {i === 0 && <span className="ml-1 text-red-400">*</span>}
                  </span>
                ))}
              </div>
              <div className="mt-1.5 text-[10px] text-slate-500">* required — others are optional</div>
            </div>
          </TabsContent>

          {/* PASTE TAB */}
          <TabsContent value="paste" className="flex-1 overflow-y-auto scrollbar-thin pr-1">
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleTextareaDrop}
              className={cn("rounded-xl transition", dragOver && "ring-2 ring-[#0070f3]")}
            >
              <Textarea
                value={parsedText}
                onChange={(e) => setParsedText(e.target.value)}
                rows={10}
                placeholder={`Paste data in ANY format — CSV, TSV (tab), semicolon-separated, pipe | separated, JSON array, or even "Key: Value" per line. The parser auto-detects the format.\n\nExamples:\n\nCSV:\n${TEMPLATES[entityType].slice(0, 4).join(",")},...\n${entityType === "demands" ? "Acme Corp,Sales,Phoenix Project,Senior Java Developer,..." : entityType === "resources" ? "John Doe,john@acme.com,+91 9999999999,Bangalore India" : "Acme Corp,Manufacturing,acme.com"}\n\nJSON:\n[{"${TEMPLATES[entityType][0]}": "...", ...}, {...}]\n\nOr paste directly from Excel/Google Sheets (just select cells + copy).`}
                className="font-mono text-xs bg-white/[0.03] border-white/10 text-white placeholder:text-slate-500 focus:border-[#0070f3]"
              />
            </div>
            <div className="mt-3 flex items-center justify-between">
              <button
                onClick={downloadTemplate}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-[#0070f3] hover:underline"
              >
                <Download className="h-3.5 w-3.5" /> Download template
              </button>
              <Button
                onClick={handlePaste}
                disabled={parsing || !parsedText.trim()}
                className="bg-[#0070f3] hover:bg-[#0060d3] text-white"
              >
                {parsing ? (
                  <>
                    <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Parsing...
                  </>
                ) : (
                  <>
                    <ClipboardPaste className="h-3.5 w-3.5" /> Parse CSV
                  </>
                )}
              </Button>
            </div>
            <div className="mt-2 text-[10px] text-slate-500">
              💡 Tip: paste directly from Excel/Google Sheets (just select cells + copy), or drag-and-drop a CSV file onto this textarea. Any format is accepted — auto-detected.
            </div>
          </TabsContent>

          {/* RESUME AUTO-EXTRACT TAB (resources only) */}
          {entityType === "resources" && (
            <TabsContent value="resumes" className="flex-1 overflow-y-auto scrollbar-thin pr-1">
              <div
                onDragOver={(e) => { e.preventDefault(); setResumeDragOver(true); }}
                onDragLeave={() => setResumeDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setResumeDragOver(false);
                  if (e.dataTransfer.files?.length) handleResumeFiles(e.dataTransfer.files);
                }}
                className={cn(
                  "rounded-xl border-2 border-dashed p-6 text-center transition cursor-pointer",
                  resumeDragOver
                    ? "border-[#0070f3] bg-[#0070f3]/10"
                    : "border-white/15 bg-white/[0.03] hover:border-[#0070f3] hover:bg-[#0070f3]/[0.06]"
                )}
                onClick={() => resumeFileRef.current?.click()}
              >
                <input
                  ref={resumeFileRef}
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.txt"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.length) handleResumeFiles(e.target.files);
                    e.target.value = "";
                  }}
                />
                <div className="flex flex-col items-center gap-2">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#0070f3]/15 text-[#0070f3] ring-1 ring-[#0070f3]/20">
                    <Sparkles className="h-6 w-6" />
                  </div>
                  <div className="text-sm font-semibold text-white">Drop resume files here</div>
                  <div className="text-xs text-slate-400">or <span className="text-[#0070f3] font-medium">click to browse</span></div>
                  <div className="text-[10px] text-slate-500 mt-1">
                    PDF, DOC, DOCX, TXT · up to 10 files · max 10MB each<br/>
                    <span className="text-[#0070f3]">AI-powered</span> — the system reads each resume and auto-extracts candidate info (name, email, phone, skills, experience, etc.)
                  </div>
                </div>
              </div>

              {/* Per-file extraction status list */}
              {resumeFiles.length > 0 && (
                <div className="mt-3 space-y-2">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    {resumeFiles.length} file{resumeFiles.length !== 1 ? "s" : ""} · {
                      Object.values(resumeStatus).filter(s => s.status === "extracted").length
                    } extracted · {
                      Object.values(resumeStatus).filter(s => s.status === "extracting").length
                    } processing · {
                      Object.values(resumeStatus).filter(s => s.status === "error").length
                    } errors
                  </div>
                  {resumeFiles.map((f, idx) => {
                    const key = `${f.name}-${f.size}-${f.lastModified}`;
                    const s = resumeStatus[key] || { status: "pending" as const };
                    return (
                      <div key={key} className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
                        <div className="flex items-start gap-3">
                          <div className={cn(
                            "flex h-9 w-9 items-center justify-center rounded-lg text-[10px] font-bold uppercase shrink-0",
                            f.name.endsWith(".pdf") ? "bg-red-500/15 text-red-300" :
                            f.name.endsWith(".doc") || f.name.endsWith(".docx") ? "bg-blue-500/15 text-blue-300" :
                            "bg-slate-500/15 text-slate-300"
                          )}>
                            {f.name.split(".").pop()?.slice(0, 3)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <div className="text-sm font-semibold text-white truncate">{f.name}</div>
                              <button
                                onClick={() => removeResume(idx)}
                                className="text-slate-400 hover:text-red-400 shrink-0"
                                title="Remove"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                            <div className="text-[10px] text-slate-500">{(f.size / 1024).toFixed(1)} KB</div>
                            {/* Status */}
                            {s.status === "extracting" && (
                              <div className="mt-1.5 flex items-center gap-1.5 text-[10px] text-[#0070f3]">
                                <div className="h-2.5 w-2.5 animate-spin rounded-full border-2 border-[#0070f3] border-t-transparent" />
                                AI is reading this resume...
                              </div>
                            )}
                            {s.status === "pending" && (
                              <div className="mt-1.5 text-[10px] text-slate-500">Queued...</div>
                            )}
                            {s.status === "error" && (
                              <div className="mt-1.5 text-[10px] text-red-400">⚠️ {s.error}</div>
                            )}
                            {s.status === "extracted" && s.data && (
                              <div className="mt-2 space-y-1">
                                <div className="text-sm font-semibold text-emerald-300">
                                  {s.data.candidateName || "(no name extracted)"}
                                </div>
                                <div className="grid grid-cols-2 gap-1 text-[10px] text-slate-400">
                                  {s.data.email && <div>📧 {s.data.email}</div>}
                                  {s.data.phone && <div>📞 {s.data.phone}</div>}
                                  {s.data.primarySkill && <div>🎯 {s.data.primarySkill}</div>}
                                  {s.data.totalExperience != null && <div>⏱️ {s.data.totalExperience} yrs</div>}
                                  {s.data.location && <div>📍 {s.data.location}</div>}
                                  {s.data.currentEmployer && <div>🏢 {s.data.currentEmployer}</div>}
                                </div>
                                {s.data.secondarySkills && (
                                  <div className="mt-1 text-[10px] text-slate-500">
                                    <strong className="text-slate-400">Skills:</strong> {s.data.secondarySkills}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          )}
        </Tabs>

        {/* PREVIEW / VALIDATION RESULTS */}
        {preview && (
          <div className="border-t border-white/10 pt-3 space-y-3">
            {/* Detected headers + column mapping */}
            {preview.parsedHeaders && preview.parsedHeaders.length > 0 && (
              <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Detected CSV Headers ({preview.parsedHeaders.length} columns)
                  </div>
                  {preview.detectedColumns && Object.values(preview.detectedColumns).some(v => v !== null) && (
                    <div className="text-[10px] text-emerald-400 font-medium">✓ Required fields mapped</div>
                  )}
                </div>
                <div className="flex flex-wrap gap-1">
                  {preview.parsedHeaders.map((h, i) => {
                    const isMapped = preview.detectedColumns
                      ? Object.values(preview.detectedColumns).includes(h)
                      : false;
                    return (
                      <span
                        key={`${h}-${i}`}
                        className={cn(
                          "inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium ring-1",
                          isMapped
                            ? "bg-emerald-500/15 text-emerald-300 ring-emerald-500/20"
                            : "bg-white/5 text-slate-300 ring-white/10"
                        )}
                        title={isMapped ? "Mapped to required field" : "Not mapped to a required field"}
                      >
                        {h || <span className="text-slate-500 italic">(empty)</span>}
                        {isMapped && <span className="ml-1 text-emerald-400">✓</span>}
                      </span>
                    );
                  })}
                </div>
                {preview.detectedColumns && Object.entries(preview.detectedColumns).some(([_, v]) => v === null) && (
                  <div className="mt-2 rounded-md bg-red-500/10 border border-red-500/20 px-2 py-1.5 text-[10px] text-red-300">
                    ⚠️ Missing required columns: {
                      Object.entries(preview.detectedColumns)
                        .filter(([_, v]) => v === null)
                        .map(([k]) => k)
                        .join(", ")
                    }. Download the template above to see the expected format, or rename your CSV headers to match.
                  </div>
                )}
              </div>
            )}

            {/* Stat tiles */}
            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="rounded-lg bg-white/[0.03] p-2 ring-1 ring-white/5">
                <div className="text-lg font-bold text-white">{preview.total}</div>
                <div className="text-[9px] uppercase tracking-wider text-slate-500">Records</div>
              </div>
              <div className="rounded-lg bg-emerald-500/10 p-2 ring-1 ring-emerald-500/20">
                <div className="text-lg font-bold text-emerald-300">{preview.valid}</div>
                <div className="text-[9px] uppercase tracking-wider text-emerald-400">Valid</div>
              </div>
              <div className="rounded-lg bg-amber-500/10 p-2 ring-1 ring-amber-500/20">
                <div className="text-lg font-bold text-amber-300">{preview.duplicates}</div>
                <div className="text-[9px] uppercase tracking-wider text-amber-400">Duplicates</div>
              </div>
              <div className="rounded-lg bg-red-500/10 p-2 ring-1 ring-red-500/20">
                <div className="text-lg font-bold text-red-300">{preview.errors}</div>
                <div className="text-[9px] uppercase tracking-wider text-red-400">Errors</div>
              </div>
            </div>

            {/* Error details */}
            {preview.errorDetails.length > 0 && (
              <div className="rounded-lg border border-red-500/20 bg-red-500/[0.06] p-3">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-red-300 mb-1">
                  <AlertTriangle className="h-3.5 w-3.5" /> Errors ({preview.errorDetails.length})
                </div>
                <ul className="space-y-0.5 text-xs text-red-300/80 max-h-24 overflow-y-auto scrollbar-thin">
                  {preview.errorDetails.slice(0, 10).map((e, i) => (
                    <li key={i}>Row {e.row} · <strong>{e.field}</strong>: {e.message}</li>
                  ))}
                  {preview.errorDetails.length > 10 && <li className="italic text-red-400/60">+ {preview.errorDetails.length - 10} more...</li>}
                </ul>
              </div>
            )}

            {/* Duplicate details */}
            {preview.duplicateDetails.length > 0 && (
              <div className="rounded-lg border border-amber-500/20 bg-amber-500/[0.06] p-3">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-300 mb-1">
                  <AlertTriangle className="h-3.5 w-3.5" /> Duplicates ({preview.duplicateDetails.length})
                </div>
                <ul className="space-y-0.5 text-xs text-amber-300/80 max-h-16 overflow-y-auto scrollbar-thin">
                  {preview.duplicateDetails.slice(0, 5).map((d, i) => (
                    <li key={i}>Row {d.row} → already exists: {d.existing}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Valid preview rows */}
            {preview.validRows.length > 0 && (
              <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/[0.04] p-3">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-300 mb-2">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Valid preview (first 5 of {preview.validRows.length})
                </div>
                <div className="overflow-x-auto scrollbar-thin">
                  <table className="w-full text-[10px]">
                    <thead>
                      <tr className="border-b border-emerald-500/20">
                        {Object.keys(preview.validRows[0]).slice(0, 5).map(h => (
                          <th key={h} className="text-left py-1 px-1.5 font-semibold text-emerald-400">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.validRows.slice(0, 5).map((row, i) => (
                        <tr key={i} className="border-b border-emerald-500/5">
                          {Object.values(row).slice(0, 5).map((v, j) => (
                            <td key={j} className="py-1 px-1.5 text-slate-300 truncate max-w-[120px]">{String(v)}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <DialogFooter className="border-t border-white/10 pt-3 mt-auto">
          <Button variant="outline" onClick={onClose} className="border-white/10 text-slate-300 hover:bg-white/5 hover:text-white">
            Cancel
          </Button>
          {activeTab === "resumes" ? (
            <Button
              onClick={commitResumes}
              disabled={committingResumes || Object.values(resumeStatus).filter(s => s.status === "extracted").length === 0}
              className="bg-[#0070f3] hover:bg-[#0060d3] text-white"
            >
              {committingResumes ? (
                <>
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Creating resources...
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5" /> Create {Object.values(resumeStatus).filter(s => s.status === "extracted").length} resource{Object.values(resumeStatus).filter(s => s.status === "extracted").length !== 1 ? "s" : ""} with CVs attached
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={commitImport}
              disabled={!preview || preview.valid === 0 || committing}
              className="bg-[#0070f3] hover:bg-[#0060d3] text-white"
            >
              {committing ? (
                <>
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Importing...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5" /> Import {preview?.valid ?? 0} valid {preview?.valid === 1 ? labels.singular.toLowerCase() : labels.plural.toLowerCase()}
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
