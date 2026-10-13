"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/client/api";
import { useToast } from "@/hooks/use-toast";
import { SectionCard } from "@/components/shared/kpi-card";
import { Skeleton } from "@/components/shared/badges";
import {
  DEMAND_STATUSES, RESOURCE_STATUSES, PRIORITIES, WORK_MODES,
  EMPLOYMENT_TYPES, RESOURCE_TYPES, ROLES,
} from "@/lib/constants";
import { Save, Settings as SettingsIcon } from "lucide-react";

export function SettingsView({ user }: { user: { role: string } }) {
  const { toast } = useToast();
  const [settings, setSettings] = useState<Record<string, string> | null>(null);
  const [saving, setSaving] = useState(false);
  const isAdmin = user.role === "Admin";

  useEffect(() => {
    api<{ settings: Record<string, string> }>("/api/settings").then(r => setSettings(r.settings)).catch(() => setSettings({}));
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      await api("/api/settings", { method: "PUT", body: JSON.stringify(settings) });
      toast({ title: "Settings saved" });
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (!settings) return <Skeleton className="h-96" />;

  const update = (k: string, v: string) => setSettings(s => ({ ...s, [k]: v }));

  return (
    <div className="space-y-5 animate-fade-in-up">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Settings</h1>
          <p className="text-sm text-slate-400 mt-0.5">Configure business values & workflow</p>
        </div>
        {isAdmin && (
          <button onClick={save} disabled={saving} className="inline-flex items-center gap-1.5 rounded-lg bg-[#0070f3] px-3.5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#0050c8] disabled:opacity-50">
            <Save className="h-4 w-4" /> {saving ? "Saving..." : "Save changes"}
          </button>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="General">
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-white mb-1">Company Name</label>
              <input
                type="text"
                value={settings.company_name || ""}
                onChange={(e) => update("company_name", e.target.value)}
                disabled={!isAdmin}
                className="w-full rounded-lg border border-white/10 bg-[#181826] px-3 py-2 text-sm focus:border-[#0070f3] focus:outline-none disabled:bg-white/[0.03]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-white mb-1">Product Name</label>
              <input
                type="text"
                value={settings.product_name || ""}
                onChange={(e) => update("product_name", e.target.value)}
                disabled={!isAdmin}
                className="w-full rounded-lg border border-white/10 bg-[#181826] px-3 py-2 text-sm focus:border-[#0070f3] focus:outline-none disabled:bg-white/[0.03]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-white mb-1">Default Currency</label>
              <input
                type="text"
                value={settings.currency || ""}
                onChange={(e) => update("currency", e.target.value)}
                disabled={!isAdmin}
                className="w-full rounded-lg border border-white/10 bg-[#181826] px-3 py-2 text-sm focus:border-[#0070f3] focus:outline-none disabled:bg-white/[0.03]"
              />
            </div>
          </div>
        </SectionCard>

        <SectionCard title="ID Prefixes">
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-white mb-1">Demand ID Prefix</label>
              <input type="text" value={settings.demand_prefix || ""} onChange={(e) => update("demand_prefix", e.target.value)} disabled={!isAdmin} className="w-full rounded-lg border border-white/10 bg-[#181826] px-3 py-2 text-sm focus:border-[#0070f3] focus:outline-none disabled:bg-white/[0.03]" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-white mb-1">Resource ID Prefix</label>
              <input type="text" value={settings.resource_prefix || ""} onChange={(e) => update("resource_prefix", e.target.value)} disabled={!isAdmin} className="w-full rounded-lg border border-white/10 bg-[#181826] px-3 py-2 text-sm focus:border-[#0070f3] focus:outline-none disabled:bg-white/[0.03]" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-white mb-1">Assignment ID Prefix</label>
              <input type="text" value={settings.assignment_prefix || ""} onChange={(e) => update("assignment_prefix", e.target.value)} disabled={!isAdmin} className="w-full rounded-lg border border-white/10 bg-[#181826] px-3 py-2 text-sm focus:border-[#0070f3] focus:outline-none disabled:bg-white/[0.03]" />
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Aging Thresholds">
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-white mb-1">Warning (days)</label>
              <input type="number" value={settings.aging_warning_days || ""} onChange={(e) => update("aging_warning_days", e.target.value)} disabled={!isAdmin} className="w-full rounded-lg border border-white/10 bg-[#181826] px-3 py-2 text-sm focus:border-[#0070f3] focus:outline-none disabled:bg-white/[0.03]" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-white mb-1">Critical (days)</label>
              <input type="number" value={settings.aging_critical_days || ""} onChange={(e) => update("aging_critical_days", e.target.value)} disabled={!isAdmin} className="w-full rounded-lg border border-white/10 bg-[#181826] px-3 py-2 text-sm focus:border-[#0070f3] focus:outline-none disabled:bg-white/[0.03]" />
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Reference Values">
          <div className="space-y-4">
            <div>
              <div className="text-xs font-semibold text-white mb-1">Demand Statuses</div>
              <div className="flex flex-wrap gap-1">
                {DEMAND_STATUSES.map(s => <span key={s} className="rounded-md bg-slate-500/15 px-2 py-1 text-[10px] font-medium text-slate-300">{s}</span>)}
              </div>
            </div>
            <div>
              <div className="text-xs font-semibold text-white mb-1">Resource Statuses</div>
              <div className="flex flex-wrap gap-1">
                {RESOURCE_STATUSES.map(s => <span key={s} className="rounded-md bg-slate-500/15 px-2 py-1 text-[10px] font-medium text-slate-300">{s}</span>)}
              </div>
            </div>
            <div>
              <div className="text-xs font-semibold text-white mb-1">Priorities</div>
              <div className="flex flex-wrap gap-1">
                {PRIORITIES.map(s => <span key={s} className="rounded-md bg-slate-500/15 px-2 py-1 text-[10px] font-medium text-slate-300">{s}</span>)}
              </div>
            </div>
            <div>
              <div className="text-xs font-semibold text-white mb-1">Work Modes</div>
              <div className="flex flex-wrap gap-1">
                {WORK_MODES.map(s => <span key={s} className="rounded-md bg-slate-500/15 px-2 py-1 text-[10px] font-medium text-slate-300">{s}</span>)}
              </div>
            </div>
            <div>
              <div className="text-xs font-semibold text-white mb-1">Employment Types</div>
              <div className="flex flex-wrap gap-1">
                {EMPLOYMENT_TYPES.map(s => <span key={s} className="rounded-md bg-slate-500/15 px-2 py-1 text-[10px] font-medium text-slate-300">{s}</span>)}
              </div>
            </div>
            <div>
              <div className="text-xs font-semibold text-white mb-1">Resource Types</div>
              <div className="flex flex-wrap gap-1">
                {RESOURCE_TYPES.map(s => <span key={s} className="rounded-md bg-slate-500/15 px-2 py-1 text-[10px] font-medium text-slate-300">{s}</span>)}
              </div>
            </div>
            <div>
              <div className="text-xs font-semibold text-white mb-1">User Roles</div>
              <div className="flex flex-wrap gap-1">
                {ROLES.map(s => <span key={s} className="rounded-md bg-slate-500/15 px-2 py-1 text-[10px] font-medium text-slate-300">{s}</span>)}
              </div>
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
