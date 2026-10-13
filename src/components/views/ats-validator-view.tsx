"use client";

import { useState, useRef } from "react";
import { api, apiForm } from "@/lib/client/api";
import { useToast } from "@/hooks/use-toast";
import { SectionCard } from "@/components/shared/kpi-card";
import { Skeleton, EmptyState } from "@/components/shared/badges";
import {
  FileText, Upload, Sparkles, X, Check, AlertTriangle, Award, TrendingUp,
  Target, GraduationCap, Briefcase, Download,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AtsResult {
  candidateName: string;
  cvId: string;
  fileName: string;
  score: number;
  skillMatch: number;
  experienceMatch: number;
  educationMatch: number;
  domainMatch: number;
  matchedSkills: string[];
  missingSkills: string[];
  strengths: string;
  gaps: string;
  recommendation: string;
  raw?: string;
}

function scoreColor(score: number) {
  if (score >= 80) return { bg: "bg-emerald-500/15", text: "text-emerald-300", ring: "ring-emerald-300", bar: "bg-emerald-500/100" };
  if (score >= 65) return { bg: "bg-green-500/15", text: "text-green-300", ring: "ring-green-300", bar: "bg-green-500/100" };
  if (score >= 45) return { bg: "bg-amber-500/15", text: "text-amber-300", ring: "ring-amber-300", bar: "bg-amber-500/100" };
  if (score >= 25) return { bg: "bg-orange-500/15", text: "text-orange-300", ring: "ring-orange-300", bar: "bg-orange-500/100" };
  return { bg: "bg-red-500/15", text: "text-red-300", ring: "ring-red-300", bar: "bg-red-500/100" };
}

function recBadge(rec: string) {
  const m: Record<string, string> = {
    "Strong Match": "bg-emerald-500/15 text-emerald-300",
    "Good Match": "bg-green-500/15 text-green-300",
    "Partial Match": "bg-amber-500/15 text-amber-300",
    "Weak Match": "bg-orange-500/15 text-orange-300",
    "No Match": "bg-red-500/15 text-red-300",
  };
  return m[rec] || "bg-slate-500/15 text-slate-300";
}

function ScoreBar({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  const colors = scoreColor(value);
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="inline-flex items-center gap-1 text-slate-400">
          {icon}
          {label}
        </span>
        <span className={cn("font-bold", colors.text)}>{value}%</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-500/15">
        <div className={cn("h-full rounded-full transition-all", colors.bar)} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

export function AtsValidatorView() {
  const { toast } = useToast();
  const [jdText, setJdText] = useState("");
  const [jdFileName, setJdFileName] = useState("");
  const [cvFiles, setCvFiles] = useState<File[]>([]);
  const [scoring, setScoring] = useState(false);
  const [results, setResults] = useState<AtsResult[] | null>(null);
  const jdFileRef = useRef<HTMLInputElement>(null);
  const cvFileRef = useRef<HTMLInputElement>(null);

  // Batch scoring state — score ALL resources in the DB against the JD
  const [batchScoring, setBatchScoring] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{ done: number; total: number } | null>(null);
  const [batchResults, setBatchResults] = useState<any[]>([]);

  const handleJdFile = async (file: File) => {
    if (file.size > 1 * 1024 * 1024) {
      toast({ title: "JD file too large", description: "Max 1MB", variant: "destructive" });
      return;
    }
    setJdFileName(file.name);
    if (file.name.endsWith(".txt")) {
      const text = await file.text();
      setJdText(prev => (prev ? prev + "\n\n" + text : text));
    }
    toast({ title: "JD file attached", description: file.name });
  };

  const handleCvFiles = (files: FileList) => {
    const valid = Array.from(files).filter(f => /\.(pdf|doc|docx|txt)$/i.test(f.name));
    if (valid.length === 0) {
      toast({ title: "No valid files", description: "Supported: PDF, DOC, DOCX, TXT", variant: "destructive" });
      return;
    }
    if (cvFiles.length + valid.length > 5) {
      toast({ title: "Too many files", description: "Max 5 CVs per request", variant: "destructive" });
      return;
    }
    setCvFiles(prev => [...prev, ...valid]);
  };

  const removeCv = (idx: number) => {
    setCvFiles(prev => prev.filter((_, i) => i !== idx));
  };

  const runScore = async () => {
    if (!jdText.trim() && !jdFileName) {
      toast({ title: "JD required", description: "Paste JD text or upload a JD file", variant: "destructive" });
      return;
    }
    if (cvFiles.length === 0) {
      toast({ title: "CVs required", description: "Upload at least 1 CV", variant: "destructive" });
      return;
    }
    setScoring(true);
    setResults(null);
    try {
      const fd = new FormData();
      fd.append("jdText", jdText);
      for (const f of cvFiles) fd.append("cvFiles", f);
      const r = await apiForm<{ results: AtsResult[]; jdSnippet: string }>("/api/ats-score", fd);
      setResults(r.results);
      toast({ title: `Scored ${r.results.length} candidates` });
    } catch (e: any) {
      toast({ title: "Scoring failed", description: e.message, variant: "destructive" });
    } finally {
      setScoring(false);
    }
  };

  const exportResults = () => {
    if (!results) return;
    const headers = ["Candidate", "File", "Score", "Skill", "Experience", "Education", "Domain", "Matched Skills", "Missing Skills", "Recommendation", "Strengths", "Gaps"];
    const rows = results.map(r => [
      r.candidateName, r.fileName, r.score, r.skillMatch, r.experienceMatch, r.educationMatch, r.domainMatch,
      r.matchedSkills.join("; "), r.missingSkills.join("; "), r.recommendation, `"${r.strengths.replace(/"/g, '""')}"`, `"${r.gaps.replace(/"/g, '""')}"`,
    ]);
    const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `ats-scores-${Date.now()}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
    toast({ title: `Exported ${results.length} results` });
  };

  // Batch score ALL resources in the database against the JD
  const scoreAllResources = async () => {
    if (!jdText.trim()) {
      toast({ title: "JD required", description: "Paste or upload a JD first", variant: "destructive" });
      return;
    }
    setBatchScoring(true);
    setBatchProgress({ done: 0, total: 0 });
    setBatchResults([]);
    try {
      let offset = 0;
      let total = 0;
      const allResults: any[] = [];
      do {
        const r = await api<{ scored: any[]; total: number; offset: number; hasMore: boolean }>(
          "/api/ats-score-batch",
          { method: "POST", body: JSON.stringify({ jdText, offset, limit: 3 }) }
        );
        total = r.total;
        allResults.push(...r.scored);
        setBatchResults([...allResults]);
        setBatchProgress({ done: allResults.length, total });
        offset += 3;
      } while (offset < total);

      // Sort by score descending
      allResults.sort((a, b) => (b.score || 0) - (a.score || 0));
      setBatchResults(allResults);
      toast({
        title: `Scored ${allResults.length} resources`,
        description: "ATS scores updated on all resource records. View them in Resource Database.",
      });
    } catch (e: any) {
      toast({ title: "Batch scoring failed", description: e.message, variant: "destructive" });
    } finally {
      setBatchScoring(false);
    }
  };

  return (
    <div className="space-y-5 animate-fade-in-up">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-[#0070f3]" /> ATS Score Validator
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">
            AI-powered candidate-to-JD match scoring · powered by Optinus AI
          </p>
        </div>
        {results && results.length > 0 && (
          <button onClick={exportResults} className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-[#181826] px-3 py-2 text-sm font-semibold text-white hover:bg-white/[0.03]">
            <Download className="h-4 w-4" /> Export CSV
          </button>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* JD input */}
        <SectionCard title="Job Description" action={
          jdFileName ? (
            <span className="inline-flex items-center gap-1 rounded-md bg-[#0070f3]/10 px-2 py-1 text-xs font-medium text-[#0060d3]">
              <FileText className="h-3 w-3" /> {jdFileName}
              <button onClick={() => { setJdFileName(""); if (jdFileRef.current) jdFileRef.current.value = ""; }} className="ml-1 hover:text-red-400">
                <X className="h-3 w-3" />
              </button>
            </span>
          ) : null
        }>
          <div className="space-y-3">
            <textarea
              value={jdText}
              onChange={(e) => setJdText(e.target.value)}
              rows={10}
              placeholder="Paste the full job description here, including responsibilities, required skills, experience, and qualifications..."
              className="w-full rounded-lg border border-white/10 bg-[#181826] p-3 text-sm focus:border-[#0070f3] focus:outline-none focus:ring-2 focus:ring-[#0070f3]/20 font-mono"
            />
            <div className="flex items-center gap-2">
              <input
                ref={jdFileRef}
                type="file"
                accept=".txt,.pdf,.doc,.docx"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleJdFile(f);
                  e.target.value = "";
                }}
              />
              <button
                onClick={() => jdFileRef.current?.click()}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-[#181826] px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/[0.03]"
              >
                <Upload className="h-3.5 w-3.5" /> Upload JD file
              </button>
              <span className="text-[10px] text-slate-400">TXT, PDF, DOC, DOCX (max 1MB)</span>
            </div>
          </div>
        </SectionCard>

        {/* CV input */}
        <SectionCard title="Candidate CVs" action={<span className="text-xs text-slate-400">{cvFiles.length}/5 files</span>}>
          <div className="space-y-3">
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); handleCvFiles(e.dataTransfer.files); }}
              className="rounded-xl border-2 border-dashed border-white/10 bg-white/[0.03] p-6 text-center hover:border-[#0070f3] hover:bg-[#0070f3]/[0.08] transition cursor-pointer"
              onClick={() => cvFileRef.current?.click()}
            >
              <input
                ref={cvFileRef}
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.txt"
                className="hidden"
                onChange={(e) => { if (e.target.files) handleCvFiles(e.target.files); e.target.value = ""; }}
              />
              <Upload className="mx-auto h-8 w-8 text-slate-400" />
              <p className="mt-2 text-sm font-semibold text-white">Drop CV files or click to upload</p>
              <p className="text-xs text-slate-400">PDF, DOC, DOCX, TXT · max 5 files</p>
            </div>
            {cvFiles.length > 0 && (
              <ul className="space-y-1.5">
                {cvFiles.map((f, i) => (
                  <li key={i} className="flex items-center justify-between rounded-md border border-white/5 bg-white/[0.03] px-3 py-1.5 text-xs">
                    <span className="flex items-center gap-1.5 truncate">
                      <FileText className="h-3.5 w-3.5 text-[#0070f3]" />
                      <span className="font-medium text-white truncate">{f.name}</span>
                      <span className="text-slate-400">({(f.size / 1024).toFixed(1)} KB)</span>
                    </span>
                    <button onClick={() => removeCv(i)} className="text-slate-400 hover:text-red-500">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </SectionCard>
      </div>

      {/* Batch score ALL resources section */}
      <div className="rounded-xl border border-[#0070f3]/20 bg-[#0070f3]/[0.04] p-4 ring-1 ring-[#0070f3]/10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[#0070f3]" />
              Score All Resources in Database
            </h3>
            <p className="mt-0.5 text-xs text-slate-400">
              Uses the JD above to AI-score every resource in your database. Scores are saved on each resource record and visible in the Resource Database tab.
            </p>
          </div>
          <button
            onClick={scoreAllResources}
            disabled={batchScoring || !jdText.trim()}
            className="inline-flex items-center gap-2 rounded-lg bg-[#0070f3] px-4 py-2 text-sm font-semibold text-white shadow-md shadow-[#0070f3]/30 hover:bg-[#0060d3] disabled:opacity-50 disabled:cursor-not-allowed optinus-glow"
          >
            {batchScoring ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Scoring {batchProgress?.done || 0} of {batchProgress?.total || 0}...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" /> Score All Resources
              </>
            )}
          </button>
        </div>

        {/* Progress bar */}
        {batchScoring && batchProgress && batchProgress.total > 0 && (
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>Progress: {batchProgress.done} of {batchProgress.total} resources scored</span>
              <span>{Math.round((batchProgress.done / batchProgress.total) * 100)}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-[#0070f3] transition-all duration-500"
                style={{ width: `${(batchProgress.done / batchProgress.total) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Batch results table */}
        {batchResults.length > 0 && !batchScoring && (
          <div className="mt-3 overflow-x-auto scrollbar-thin">
            <table className="w-full text-sm">
              <thead className="bg-white/[0.03] text-left">
                <tr className="border-b border-white/5">
                  <th className="px-2 py-2 text-[10px] font-bold uppercase text-slate-500">#</th>
                  <th className="px-2 py-2 text-[10px] font-bold uppercase text-slate-500">Candidate</th>
                  <th className="px-2 py-2 text-[10px] font-bold uppercase text-slate-500">Resource ID</th>
                  <th className="px-2 py-2 text-[10px] font-bold uppercase text-slate-500">Score</th>
                  <th className="px-2 py-2 text-[10px] font-bold uppercase text-slate-500">Recommendation</th>
                  <th className="px-2 py-2 text-[10px] font-bold uppercase text-slate-500">Matched Skills</th>
                  <th className="px-2 py-2 text-[10px] font-bold uppercase text-slate-500">Missing Skills</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {batchResults.map((r, i) => {
                  const sc = scoreColor(r.score || 0);
                  return (
                    <tr key={r.resourceId} className="hover:bg-white/[0.02]">
                      <td className="px-2 py-2 text-xs text-slate-500">{i + 1}</td>
                      <td className="px-2 py-2 text-xs font-medium text-white">{r.candidateName}</td>
                      <td className="px-2 py-2 text-xs font-mono text-[#0070f3]">{r.resourceId}</td>
                      <td className="px-2 py-2">
                        <span className={cn("inline-flex items-center rounded-md px-2 py-0.5 text-xs font-bold", sc.bg, sc.text)}>
                          {r.score || 0}%
                        </span>
                      </td>
                      <td className="px-2 py-2">
                        <span className={cn("inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold", recBadge(r.recommendation))}>
                          {r.recommendation}
                        </span>
                      </td>
                      <td className="px-2 py-2 text-[10px] text-emerald-300">{(r.matchedSkills || []).join(", ") || "—"}</td>
                      <td className="px-2 py-2 text-[10px] text-red-300">{(r.missingSkills || []).join(", ") || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Run button */}
      <div className="flex justify-center">
        <button
          onClick={runScore}
          disabled={scoring || (!jdText.trim() && !jdFileName) || cvFiles.length === 0}
          className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#0070f3] to-[#0070f3] px-6 py-3 text-sm font-semibold text-white shadow-lg hover:shadow-xl transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {scoring ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Scoring candidates...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" /> Score {cvFiles.length || 0} candidate{cvFiles.length !== 1 ? "s" : ""}
            </>
          )}
        </button>
      </div>

      {/* Results */}
      {scoring ? (
        <SectionCard title="Analyzing CVs...">
          <div className="space-y-3">
            {Array.from({ length: cvFiles.length || 2 }).map((_, i) => <Skeleton key={i} className="h-32" />)}
          </div>
        </SectionCard>
      ) : results && results.length > 0 ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">Results · ranked by score</h2>
            <button
              onClick={() => { setResults(null); setJdText(""); setJdFileName(""); setCvFiles([]); }}
              className="text-xs text-slate-400 hover:text-white hover:underline"
            >
              Clear & re-run
            </button>
          </div>
          {results.map((r, i) => {
            const c = scoreColor(r.score || 0);
            return (
              <SectionCard key={r.cvId} noPadding className="overflow-hidden">
                <div className="grid gap-4 p-5 md:grid-cols-[180px_1fr]">
                  {/* Score panel */}
                  <div className={cn("rounded-xl p-4 text-center ring-2", c.bg, c.ring)}>
                    <div className={cn("text-5xl font-bold", c.text)}>{r.score}</div>
                    <div className="text-xs text-slate-400 mt-1">out of 100</div>
                    <div className={cn("mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold", recBadge(r.recommendation))}>
                      <Award className="h-3 w-3" /> {r.recommendation}
                    </div>
                    <div className="mt-2 text-[10px] text-slate-400">#{i + 1} ranked</div>
                  </div>
                  {/* Details */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-base font-bold text-white">{r.candidateName}</h3>
                        <p className="text-xs text-slate-400">{r.fileName}</p>
                      </div>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                      <ScoreBar label="Skills" value={r.skillMatch} icon={<Target className="h-3 w-3" />} />
                      <ScoreBar label="Experience" value={r.experienceMatch} icon={<Briefcase className="h-3 w-3" />} />
                      <ScoreBar label="Education" value={r.educationMatch} icon={<GraduationCap className="h-3 w-3" />} />
                      <ScoreBar label="Domain" value={r.domainMatch} icon={<TrendingUp className="h-3 w-3" />} />
                    </div>
                    <div className="grid gap-2 md:grid-cols-2">
                      <div>
                        <div className="text-[10px] font-semibold uppercase text-emerald-300 mb-1">Matched Skills</div>
                        {r.matchedSkills?.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {r.matchedSkills.map((s, i) => (
                              <span key={i} className="inline-flex items-center gap-1 rounded-md bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-medium text-emerald-300">
                                <Check className="h-2.5 w-2.5" /> {s}
                              </span>
                            ))}
                          </div>
                        ) : <span className="text-xs text-slate-400">None</span>}
                      </div>
                      <div>
                        <div className="text-[10px] font-semibold uppercase text-red-300 mb-1">Missing Skills</div>
                        {r.missingSkills?.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {r.missingSkills.map((s, i) => (
                              <span key={i} className="inline-flex items-center gap-1 rounded-md bg-red-500/15 px-1.5 py-0.5 text-[10px] font-medium text-red-300">
                                <AlertTriangle className="h-2.5 w-2.5" /> {s}
                              </span>
                            ))}
                          </div>
                        ) : <span className="text-xs text-slate-400">None</span>}
                      </div>
                    </div>
                    <div className="grid gap-2 md:grid-cols-2 text-xs">
                      <div className="rounded-md bg-emerald-500/100/[0.08] border border-emerald-500/20 p-2">
                        <div className="font-semibold text-emerald-300 mb-0.5">Strengths</div>
                        <p className="text-white">{r.strengths}</p>
                      </div>
                      <div className="rounded-md bg-amber-500/100/[0.08] border border-amber-500/20 p-2">
                        <div className="font-semibold text-amber-300 mb-0.5">Gaps</div>
                        <p className="text-white">{r.gaps}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </SectionCard>
            );
          })}
        </div>
      ) : results && results.length === 0 ? (
        <EmptyState icon={<AlertTriangle className="h-7 w-7" />} title="No results returned" description="Try with different CVs or a clearer JD." />
      ) : null}
    </div>
  );
}
