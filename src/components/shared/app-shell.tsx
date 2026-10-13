"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import {
  LayoutDashboard, FileText, Users, KanbanSquare, Building2, BarChart3,
  ArrowUpDown, Activity, Settings, UserCog, Bell, Search, Plus, LogOut,
  ChevronLeft, ChevronRight, Menu, X, Database, Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { UserAvatar } from "./badges";
import { api } from "@/lib/client/api";

export type ViewKey =
  | "dashboard" | "demands" | "resources" | "resource-database" | "kanban" | "clients"
  | "reports" | "ats-validator" | "import-export" | "activity" | "settings" | "users";

export interface AppUser {
  id: string; email: string; name: string; role: string;
  avatarColor: string; phone?: string;
}

const NAV_MAIN: { key: ViewKey; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "dashboard",          label: "Dashboard",         icon: LayoutDashboard },
  { key: "demands",            label: "Open Demands",       icon: FileText },
  { key: "resources",          label: "Resources",          icon: Users },
  { key: "resource-database", label: "Resource Database", icon: Database },
  { key: "kanban",             label: "Kanban Board",       icon: KanbanSquare },
  { key: "clients",            label: "Clients",            icon: Building2 },
  { key: "reports",            label: "Reports",            icon: BarChart3 },
  { key: "ats-validator",     label: "ATS Validator",      icon: Sparkles },
  { key: "import-export",     label: "Import / Export",    icon: ArrowUpDown },
  { key: "activity",           label: "Activity",           icon: Activity },
];

const NAV_ADMIN: { key: ViewKey; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "settings", label: "Settings",        icon: Settings },
  { key: "users",    label: "User Management", icon: UserCog },
];

export interface SearchResult {
  demands: { id: string; demandId: string; positionTitle: string; client: string; primarySkill: string; priority: string; status: string }[];
  resources: { id: string; resourceId: string; candidateName: string; primarySkill: string; totalExperience: number; currentLocation: string; status: string; avatarColor: string }[];
  clients: { id: string; name: string; industry: string; contactName: string }[];
}

export function AppShell({
  user, activeView, onChangeView, onLogout, onQuickAdd, onSelectDemand, onSelectResource, onSelectClient,
  children,
}: {
  user: AppUser;
  activeView: ViewKey;
  onChangeView: (v: ViewKey) => void;
  onLogout: () => void;
  onQuickAdd: (target: "demand" | "resource" | "import") => void;
  onSelectDemand: (id: string) => void;
  onSelectResource: (id: string) => void;
  onSelectClient: (id: string) => void;
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult | null>(null);
  const [notifOpen, setNotifOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const [notifications, setNotifications] = useState<{ id: string; title: string; body: string; type: string; read: boolean; createdAt: string }[]>([]);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const quickAddRef = useRef<HTMLDivElement>(null);

  // Load notifications
  useEffect(() => {
    api<{ notifications: typeof notifications }>("/api/notifications").then(r => setNotifications(r.notifications)).catch(() => {});
  }, [activeView]);

  // Global search — debounced
  useEffect(() => {
    if (!searchQ || searchQ.length < 2) return;
    const id = setTimeout(() => {
      api<{ results: SearchResult }>(`/api/search?q=${encodeURIComponent(searchQ)}`).then(r => setSearchResults(r.results)).catch(() => {});
    }, 250);
    return () => clearTimeout(id);
  }, [searchQ]);

  // Click-outside handlers
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) setUserMenuOpen(false);
      if (quickAddRef.current && !quickAddRef.current.contains(e.target as Node)) setQuickAddOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const isAdmin = user.role === "Admin";
  const navMain = NAV_MAIN;
  const navAdmin = isAdmin ? NAV_ADMIN : NAV_ADMIN.filter(n => n.key === "settings");

  return (
    <div className="flex h-screen w-full bg-[#0f0f1a]">
      {/* ===== Sidebar (desktop) ===== */}
      <aside className={cn(
        "relative z-30 hidden md:flex flex-col text-white transition-all duration-300",
        "bg-[#0a0a14] shadow-xl ring-1 ring-white/5",
        collapsed ? "w-[72px]" : "w-64"
      )}>
        {/* Brand */}
        <div className="flex items-center gap-2 px-3 py-4 border-b border-white/5">
          {!collapsed && (
            <Image
              src="/optinus-logo.png"
              alt="Optinus"
              width={140}
              height={24}
              priority
              className="h-7 w-auto"
            />
          )}
          {collapsed && (
            <Image
              src="/favicon.png"
              alt="Optinus"
              width={28}
              height={28}
              priority
              className="h-7 w-auto mx-auto"
            />
          )}
          {!collapsed && (
            <button
              onClick={() => setCollapsed(c => !c)}
              className="ml-auto rounded-md p-1 text-slate-500 hover:bg-white/5 hover:text-slate-300"
              aria-label="Collapse sidebar"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}
        </div>
        {collapsed && (
          <button
            onClick={() => setCollapsed(c => !c)}
            className="absolute top-4 -right-3 z-40 flex h-6 w-6 items-center justify-center rounded-full bg-[#0070f3] text-white shadow-md hover:bg-[#0060d3]"
            aria-label="Expand sidebar"
          >
            <ChevronRight className="h-3 w-3" />
          </button>
        )}

        {/* Main nav */}
        <nav className="flex flex-1 flex-col gap-0.5 px-2 py-3 overflow-y-auto scrollbar-thin">
          {navMain.map(item => {
            const active = activeView === item.key;
            return (
              <button
                key={item.key}
                onClick={() => onChangeView(item.key)}
                className={cn(
                  "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                  active
                    ? "bg-[#0070f3] text-white shadow-md shadow-[#0070f3]/20"
                    : "text-slate-400 hover:bg-white/[0.04] hover:text-white",
                  collapsed && "justify-center"
                )}
                title={item.label}
              >
                <item.icon className={cn("shrink-0", active ? "text-white" : "text-slate-500 group-hover:text-white")} style={{ width: 18, height: 18 }} />
                {!collapsed && <span>{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* Divider */}
        <div className="my-1 mx-4 border-t border-white/5" />

        {/* Admin nav */}
        <nav className="flex flex-col gap-0.5 px-2 pb-3">
          {navAdmin.map(item => {
            const active = activeView === item.key;
            return (
              <button
                key={item.key}
                onClick={() => onChangeView(item.key)}
                className={cn(
                  "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                  active ? "bg-white/10 text-white ring-1 ring-white/10" : "text-slate-400 hover:bg-white/[0.04] hover:text-white",
                  collapsed && "justify-center"
                )}
                title={item.label}
              >
                <item.icon style={{ width: 18, height: 18 }} />
                {!collapsed && <span>{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        {!collapsed && (
          <div className="border-t border-white/5 px-4 py-3 text-[10px] text-slate-500">
            <div className="font-semibold text-slate-300">Resource Management v1.0</div>
            <div>© 2026 Optinus Solutions</div>
          </div>
        )}
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileNavOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-72 bg-[#0a0a14] text-white shadow-2xl flex flex-col ring-1 ring-white/5">
            <div className="flex items-center justify-between px-4 py-4 border-b border-white/5">
              <Image
                src="/optinus-logo.png"
                alt="Optinus"
                width={140}
                height={24}
                className="h-7 w-auto"
              />
              <button onClick={() => setMobileNavOpen(false)} className="rounded-md p-1.5 text-slate-400 hover:bg-white/5 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex flex-1 flex-col gap-0.5 px-3 py-3 overflow-y-auto scrollbar-thin">
              {[...navMain, ...navAdmin].map(item => {
                const active = activeView === item.key;
                return (
                  <button
                    key={item.key}
                    onClick={() => { onChangeView(item.key); setMobileNavOpen(false); }}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                      active ? "bg-[#0070f3] text-white shadow-md shadow-[#0070f3]/20" : "text-slate-400 hover:bg-white/[0.04] hover:text-white"
                    )}
                  >
                    <item.icon style={{ width: 18, height: 18 }} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      )}

      {/* ===== Main column ===== */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="z-20 flex h-16 items-center gap-3 border-b border-white/5 bg-[#181826] px-4 md:px-6 shadow-sm">
          <button
            className="rounded-lg p-2 text-slate-400 hover:bg-white/5 md:hidden"
            onClick={() => setMobileNavOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Global search */}
          <div ref={searchRef} className="relative flex-1 max-w-2xl">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={searchQ}
                onChange={(e) => { setSearchQ(e.target.value); setSearchOpen(true); }}
                onFocus={() => setSearchOpen(true)}
                placeholder="Search demands, resources, clients..."
                className="w-full rounded-lg border border-white/10 bg-white/[0.03] py-2 pl-9 pr-3 text-sm text-white placeholder:text-slate-500 focus:border-[#0070f3] focus:bg-white/[0.05]/[0.05] focus:outline-none focus:ring-2 focus:ring-[#0070f3]/30 transition"
              />
            </div>
            {searchOpen && searchResults && (
              <div className="absolute top-full mt-2 w-full overflow-hidden rounded-xl border border-white/10 bg-[#181826] shadow-2xl z-50 max-h-[60vh] overflow-y-auto scrollbar-thin ring-1 ring-white/5">
                {searchResults.demands.length === 0 && searchResults.resources.length === 0 && searchResults.clients.length === 0 ? (
                  <div className="px-4 py-6 text-center text-sm text-slate-400">No results for &quot;{searchQ}&quot;</div>
                ) : (
                  <div className="py-2">
                    {searchResults.demands.length > 0 && (
                      <div>
                        <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">Demands</div>
                        {searchResults.demands.slice(0, 5).map(d => (
                          <button
                            key={d.id}
                            onClick={() => { onSelectDemand(d.id); setSearchOpen(false); setSearchQ(""); }}
                            className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-[#0070f3]/10"
                          >
                            <div>
                              <div className="font-semibold text-white">{d.demandId} — {d.positionTitle}</div>
                              <div className="text-xs text-slate-400">{d.client} · {d.primarySkill}</div>
                            </div>
                            <span className="text-xs text-slate-400">{d.status}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    {searchResults.resources.length > 0 && (
                      <div>
                        <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">Resources</div>
                        {searchResults.resources.slice(0, 5).map(r => (
                          <button
                            key={r.id}
                            onClick={() => { onSelectResource(r.id); setSearchOpen(false); setSearchQ(""); }}
                            className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-[#0070f3]/10"
                          >
                            <UserAvatar name={r.candidateName} color={r.avatarColor} size={28} />
                            <div className="flex-1">
                              <div className="font-semibold text-white">{r.candidateName}</div>
                              <div className="text-xs text-slate-400">{r.resourceId} · {r.primarySkill} · {r.totalExperience} yrs</div>
                            </div>
                            <span className="text-xs text-slate-400">{r.status}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    {searchResults.clients.length > 0 && (
                      <div>
                        <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">Clients</div>
                        {searchResults.clients.slice(0, 3).map(c => (
                          <button
                            key={c.id}
                            onClick={() => { onSelectClient(c.id); setSearchOpen(false); setSearchQ(""); }}
                            className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-[#0070f3]/10"
                          >
                            <div>
                              <div className="font-semibold text-white">{c.name}</div>
                              <div className="text-xs text-slate-400">{c.industry}</div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="ml-auto flex items-center gap-2">
            {/* Quick add */}
            <div ref={quickAddRef} className="relative">
              <button
                onClick={() => setQuickAddOpen(o => !o)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#0070f3] px-3.5 py-2 text-sm font-semibold text-white shadow-md shadow-[#0070f3]/30 transition hover:bg-[#0060d3] active:scale-95 optinus-glow"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Add</span>
              </button>
              {quickAddOpen && (
                <div className="absolute right-0 top-full mt-2 w-48 overflow-hidden rounded-xl border border-white/10 bg-[#181826] py-1 shadow-2xl z-50 animate-fade-in-up ring-1 ring-white/5">
                  <button onClick={() => { onQuickAdd("demand"); setQuickAddOpen(false); }} className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-slate-300 hover:bg-[#0070f3]/10 hover:text-white">
                    <FileText className="h-4 w-4 text-[#0070f3]" /> Add Demand
                  </button>
                  <button onClick={() => { onQuickAdd("resource"); setQuickAddOpen(false); }} className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-slate-300 hover:bg-[#0070f3]/10 hover:text-white">
                    <Users className="h-4 w-4 text-[#0070f3]" /> Add Resource
                  </button>
                  <button onClick={() => { onQuickAdd("import"); setQuickAddOpen(false); }} className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-slate-300 hover:bg-[#0070f3]/10 hover:text-white">
                    <ArrowUpDown className="h-4 w-4 text-[#0070f3]" /> Import Data
                  </button>
                </div>
              )}
            </div>

            {/* Notifications */}
            <div ref={notifRef} className="relative">
              <button
                onClick={() => setNotifOpen(o => !o)}
                className="relative rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-white"
              >
                <Bell className="h-5 w-5" />
                {notifications.filter(n => !n.read).length > 0 && (
                  <span className="absolute top-1 right-1 h-2.5 w-2.5 rounded-full bg-[#0070f3] ring-2 ring-[#181826]" />
                )}
              </button>
              {notifOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 overflow-hidden rounded-xl border border-white/10 bg-[#181826] shadow-2xl z-50 ring-1 ring-white/5">
                  <div className="flex items-center justify-between border-b border-white/5 px-4 py-3">
                    <div className="text-sm font-semibold text-white">Notifications</div>
                    <button
                      onClick={async () => {
                        await api("/api/notifications?action=read-all", { method: "PATCH" });
                        setNotifications(ns => ns.map(n => ({ ...n, read: true })));
                      }}
                      className="text-xs font-medium text-[#0070f3] hover:underline"
                    >Mark all read</button>
                  </div>
                  <div className="max-h-80 overflow-y-auto scrollbar-thin">
                    {notifications.length === 0 ? (
                      <div className="px-4 py-6 text-center text-sm text-slate-500">No notifications</div>
                    ) : notifications.map(n => (
                      <div key={n.id} className={cn("border-b border-white/5 px-4 py-3", !n.read && "bg-[#0070f3]/[0.06]")}>
                        <div className="flex items-start gap-2">
                          {!n.read && <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-[#0070f3]" />}
                          <div className="flex-1">
                            <div className="text-sm font-medium text-white">{n.title}</div>
                            <div className="text-xs text-slate-400">{n.body}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* User menu */}
            <div ref={userMenuRef} className="relative">
              <button
                onClick={() => setUserMenuOpen(o => !o)}
                className="flex items-center gap-2 rounded-lg p-1 pr-2 hover:bg-white/5"
              >
                <UserAvatar name={user.name} color={user.avatarColor} size={32} />
                <div className="hidden lg:block text-left">
                  <div className="text-xs font-semibold text-white leading-tight">{user.name}</div>
                  <div className="text-[10px] text-slate-400 leading-tight">{user.role}</div>
                </div>
              </button>
              {userMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 overflow-hidden rounded-xl border border-white/10 bg-[#181826] py-1 shadow-2xl z-50 animate-fade-in-up ring-1 ring-white/5">
                  <div className="border-b border-white/5 px-4 py-3">
                    <div className="text-sm font-semibold text-white">{user.name}</div>
                    <div className="text-xs text-slate-400">{user.email}</div>
                    <div className="mt-1 inline-flex items-center rounded-full bg-[#0070f3]/15 px-2 py-0.5 text-[10px] font-semibold text-[#0070f3] ring-1 ring-[#0070f3]/20">{user.role}</div>
                  </div>
                  <button onClick={() => { onChangeView("settings"); setUserMenuOpen(false); }} className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-sm text-slate-300 hover:bg-white/5 hover:text-white">
                    <Settings className="h-4 w-4 text-slate-500" /> Settings
                  </button>
                  {isAdmin && (
                    <button onClick={() => { onChangeView("users"); setUserMenuOpen(false); }} className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-sm text-slate-300 hover:bg-white/5 hover:text-white">
                      <UserCog className="h-4 w-4 text-slate-500" /> User Management
                    </button>
                  )}
                  <div className="border-t border-white/5 my-1" />
                  <button onClick={onLogout} className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-sm text-red-400 hover:bg-red-500/100/100/10 hover:text-red-300">
                    <LogOut className="h-4 w-4" /> Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto scrollbar-thin">
          <div className="mx-auto max-w-[1600px] p-4 md:p-6 lg:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
