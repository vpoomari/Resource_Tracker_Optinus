"use client";

import { useEffect, useState, useRef } from "react";
import { api } from "@/lib/client/api";
import { useToast } from "@/hooks/use-toast";
import { SectionCard } from "@/components/shared/kpi-card";
import { UserAvatar, Skeleton, EmptyState } from "@/components/shared/badges";
import { ROLES } from "@/lib/constants";
import {
  UserCog, Plus, Pencil, Trash2, Check, X, KeyRound, UserX, UserCheck, Download,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface User {
  id: string; email: string; name: string; role: string; phone?: string | null;
  avatarColor: string; active: boolean; lastLogin?: string | null; createdAt: string;
}

export function UsersView() {
  const { toast } = useToast();
  const [users, setUsers] = useState<User[] | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [form, setForm] = useState({ name: "", email: "", role: "Viewer", phone: "", password: "", active: true });

  const load = () => {
    api<{ users: User[] }>("/api/users").then(r => setUsers(r.users)).catch(e => {
      toast({ title: "Failed to load", description: e.message, variant: "destructive" });
      setUsers([]);
    });
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setForm({ name: "", email: "", role: "Viewer", phone: "", password: "", active: true });
    setEditing(null);
    setShowForm(true);
  };

  const openEdit = (u: User) => {
    setForm({ name: u.name, email: u.email, role: u.role, phone: u.phone || "", password: "", active: u.active });
    setEditing(u);
    setShowForm(true);
  };

  const save = async () => {
    if (!form.name || !form.email || (!editing && !form.password)) {
      toast({ title: "Missing fields", description: "Name, email, password required", variant: "destructive" });
      return;
    }
    try {
      if (editing) {
        const body: any = { name: form.name, email: form.email, role: form.role, phone: form.phone, active: form.active };
        if (form.password) body.password = form.password;
        await api(`/api/users/${editing.id}`, { method: "PATCH", body: JSON.stringify(body) });
        toast({ title: "User updated" });
      } else {
        await api("/api/users", { method: "POST", body: JSON.stringify(form) });
        toast({ title: "User created" });
      }
      setShowForm(false);
      load();
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    }
  };

  const toggleActive = async (u: User) => {
    try {
      await api(`/api/users/${u.id}`, { method: "PATCH", body: JSON.stringify({ active: !u.active }) });
      toast({ title: `User ${!u.active ? "activated" : "deactivated"}` });
      load();
    } catch (e: any) {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    }
  };

  const del = async (u: User) => {
    if (!confirm(`Delete ${u.name}? This cannot be undone.`)) return;
    try {
      await api(`/api/users/${u.id}`, { method: "DELETE" });
      toast({ title: "User deleted" });
      load();
    } catch (e: any) {
      toast({ title: "Delete failed", description: e.message, variant: "destructive" });
    }
  };

  const exportCsv = () => {
    if (!users) return;
    const headers = ["Name", "Email", "Role", "Phone", "Active", "LastLogin", "Created"];
    const rows = users.map(u => [u.name, u.email, u.role, u.phone || "", u.active ? "Yes" : "No", u.lastLogin ? new Date(u.lastLogin).toISOString() : "Never", new Date(u.createdAt).toISOString()]);
    const csv = [headers.join(","), ...rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `users-${Date.now()}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
    toast({ title: `Exported ${users.length} users` });
  };

  if (!users) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-16" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in-up">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">User Management</h1>
          <p className="text-sm text-slate-400 mt-0.5">{users.length} users · {users.filter(u => u.active).length} active</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportCsv} className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-[#181826] px-3 py-2 text-sm font-semibold text-white hover:bg-white/[0.03]">
            <Download className="h-4 w-4" /> Export
          </button>
          <button onClick={openCreate} className="inline-flex items-center gap-1.5 rounded-lg bg-[#0070f3] px-3.5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#0050c8]">
            <Plus className="h-4 w-4" /> New User
          </button>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <SectionCard title={editing ? `Edit ${editing.name}` : "Create New User"}>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="block text-xs font-semibold text-white mb-1">Name *</label>
              <input type="text" value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} className="w-full rounded-lg border border-white/10 bg-[#181826] px-3 py-2 text-sm focus:border-[#0070f3] focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-white mb-1">Email *</label>
              <input type="email" value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} className="w-full rounded-lg border border-white/10 bg-[#181826] px-3 py-2 text-sm focus:border-[#0070f3] focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-white mb-1">Role</label>
              <select value={form.role} onChange={(e) => setForm(f => ({ ...f, role: e.target.value }))} className="w-full rounded-lg border border-white/10 bg-[#181826] px-3 py-2 text-sm focus:border-[#0070f3] focus:outline-none">
                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-white mb-1">Phone</label>
              <input type="text" value={form.phone} onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))} className="w-full rounded-lg border border-white/10 bg-[#181826] px-3 py-2 text-sm focus:border-[#0070f3] focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-white mb-1">{editing ? "New Password (blank = no change)" : "Password *"}</label>
              <input type="password" value={form.password} onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))} placeholder="••••••••" className="w-full rounded-lg border border-white/10 bg-[#181826] px-3 py-2 text-sm focus:border-[#0070f3] focus:outline-none" />
            </div>
            {editing && (
              <div>
                <label className="block text-xs font-semibold text-white mb-1">Active</label>
                <button
                  onClick={() => setForm(f => ({ ...f, active: !f.active }))}
                  className={cn("inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold", form.active ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-white/10 bg-white/[0.03] text-slate-400")}
                >
                  {form.active ? <UserCheck className="h-4 w-4" /> : <UserX className="h-4 w-4" />}
                  {form.active ? "Active" : "Inactive"}
                </button>
              </div>
            )}
          </div>
          <div className="mt-3 flex gap-2">
            <button onClick={save} className="inline-flex items-center gap-1.5 rounded-lg bg-[#0070f3] px-3 py-2 text-sm font-semibold text-white hover:bg-[#0050c8]">
              <Check className="h-4 w-4" /> {editing ? "Save changes" : "Create user"}
            </button>
            <button onClick={() => setShowForm(false)} className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-sm font-semibold text-white hover:bg-white/[0.03]">
              <X className="h-4 w-4" /> Cancel
            </button>
          </div>
        </SectionCard>
      )}

      {/* Users table */}
      {users.length === 0 ? (
        <EmptyState icon={<UserCog className="h-7 w-7" />} title="No users" action={openCreate} actionLabel="+ Add User" />
      ) : (
        <SectionCard noPadding>
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-sm">
              <thead className="bg-white/[0.03] text-left">
                <tr className="border-b border-white/10">
                  <th className="px-4 py-3 text-xs font-semibold uppercase text-slate-400">User</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase text-slate-400">Role</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase text-slate-400">Phone</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase text-slate-400">Status</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase text-slate-400">Last Login</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase text-slate-400">Created</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase text-slate-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-[#0070f3]/[0.06]">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <UserAvatar name={u.name} color={u.avatarColor} size={36} />
                        <div>
                          <div className="font-semibold text-white">{u.name}</div>
                          <div className="text-[10px] text-slate-400">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn("rounded-md px-2 py-0.5 text-xs font-semibold",
                        u.role === "Admin" ? "bg-red-500/15 text-red-300" :
                        u.role === "Management" ? "bg-purple-500/15 text-purple-300" :
                        u.role === "Viewer" ? "bg-slate-500/15 text-slate-400" :
                        "bg-blue-500/15 text-blue-300")}>{u.role}</span>
                    </td>
                    <td className="px-4 py-3 text-white">{u.phone || "—"}</td>
                    <td className="px-4 py-3">
                      <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", u.active ? "bg-emerald-500/15 text-emerald-300" : "bg-slate-500/15 text-slate-500")}>
                        {u.active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400">{u.lastLogin ? new Date(u.lastLogin).toLocaleString() : "Never"}</td>
                    <td className="px-4 py-3 text-xs text-slate-400">{new Date(u.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEdit(u)} title="Edit" className="rounded-md p-1.5 text-slate-500 hover:bg-white/5 hover:text-[#0070f3]">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button onClick={() => toggleActive(u)} title={u.active ? "Deactivate" : "Activate"} className="rounded-md p-1.5 text-slate-500 hover:bg-white/5 hover:text-amber-400">
                          {u.active ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                        </button>
                        <button onClick={() => del(u)} title="Delete" className="rounded-md p-1.5 text-slate-500 hover:bg-white/5 hover:text-red-400">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}
    </div>
  );
}
