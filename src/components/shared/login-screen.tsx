"use client";

import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/client/api";
import Image from "next/image";

export function LoginScreen({ onLogin }: { onLogin: (user: { id: string; email: string; name: string; role: string; avatarColor: string; phone?: string }) => void }) {
  const { toast } = useToast();
  const [email, setEmail] = useState("admin@optinus.com");
  const [password, setPassword] = useState("admin123");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const r = await api<{ id: string; email: string; name: string; role: string; avatarColor: string; phone?: string }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      onLogin(r);
    } catch (err: any) {
      toast({ title: "Login failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-[#0a0a14]">
      {/* Left — brand panel (Optinus dark theme) */}
      <div className="hidden lg:flex lg:w-3/5 flex-col justify-between p-12 text-white relative overflow-hidden bg-[#0a0a14]">
        {/* Decorative gradient orbs — Optinus brand colors */}
        <div className="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-[#0070f3] opacity-20 blur-3xl" />
        <div className="absolute bottom-0 -left-20 h-80 w-80 rounded-full bg-[#00a0d0] opacity-15 blur-3xl" />
        <div className="absolute top-1/3 right-1/4 h-72 w-72 rounded-full bg-[#14b8a6] opacity-10 blur-3xl" />
        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)`,
            backgroundSize: "40px 40px",
          }}
        />

        {/* Top: Optinus logo — prominent */}
        <div className="relative z-10">
          <div className="flex items-center gap-4">
            <Image
              src="/optinus-logo.png"
              alt="Optinus"
              width={260}
              height={45}
              priority
              className="h-12 w-auto md:h-16 lg:h-20"
            />
          </div>
          <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1 ring-1 ring-white/10 backdrop-blur-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-[#14b8a6] animate-pulse" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#14b8a6]">Specialised Transformation Talent</span>
          </div>
        </div>

        {/* Middle: Hero message */}
        <div className="relative z-10 space-y-6 max-w-xl">
          <h1 className="text-5xl font-extrabold leading-tight tracking-tight">
            <span className="block">Resource</span>
            <span className="block optinus-gradient-text">Management</span>
          </h1>
          <p className="text-lg text-slate-300 leading-relaxed font-light">
            Optinus delivers specialised workforce solutions — connecting enterprises with the professionals who power SAP transformations, finance modernisation, and programme delivery.
          </p>
          <p className="text-sm text-slate-400 leading-relaxed">
            Simple for recruiters. Powerful for resource managers. Executive-friendly for management. Track demands, resources, CV submissions, interviews, selections and onboarding — all in one place.
          </p>

          {/* Stat badges */}
          <div className="grid grid-cols-3 gap-3 pt-4">
            {[
              { label: "Open Demands", value: "15", color: "text-[#0070f3]" },
              { label: "Resources", value: "40", color: "text-[#14b8a6]" },
              { label: "Pipeline", value: "28", color: "text-[#8b5cf6]" },
            ].map(s => (
              <div key={s.label} className="rounded-xl bg-white/[0.03] p-4 ring-1 ring-white/10 backdrop-blur-sm hover:bg-white/[0.05] transition">
                <div className={`text-3xl font-bold ${s.color}`}>{s.value}</div>
                <div className="text-[10px] uppercase tracking-wider text-slate-400 mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom: footer */}
        <div className="relative z-10 flex items-center justify-between text-xs text-slate-500">
          <span>© 2026 Optinus Solutions</span>
          <span className="font-medium">Resource Management v1.0</span>
        </div>
      </div>

      {/* Right — login form */}
      <div className="flex flex-1 items-center justify-center bg-[#0f0f1a] p-6">
        <div className="w-full max-w-md space-y-6">
          {/* Mobile logo */}
          <div className="lg:hidden flex flex-col items-center gap-3 mb-6">
            <Image
              src="/optinus-logo.png"
              alt="Optinus"
              width={200}
              height={35}
              priority
              className="h-12 w-auto"
            />
            <div className="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1 ring-1 ring-white/10">
              <span className="h-1.5 w-1.5 rounded-full bg-[#14b8a6]" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#14b8a6]">Resource Management</span>
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-white">Welcome back</h2>
            <p className="mt-1 text-sm text-slate-400">Sign in to your Optinus account</p>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-[#0070f3] focus:outline-none focus:ring-2 focus:ring-[#0070f3]/30 transition"
                placeholder="you@optinus.com"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-[#0070f3] focus:outline-none focus:ring-2 focus:ring-[#0070f3]/30 transition"
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-[#0070f3] py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#0070f3]/30 transition hover:bg-[#0060d3] hover:shadow-[#0070f3]/40 disabled:opacity-60 optinus-glow"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          {/* Demo accounts */}
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
            <div className="text-xs font-semibold text-slate-300 mb-2">Demo accounts <span className="text-slate-500 font-normal">(password shown in tooltip)</span></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {[
                { email: "admin@optinus.com", role: "Admin", pass: "admin123" },
                { email: "rm@optinus.com", role: "Resource Manager", pass: "rm123" },
                { email: "recruiter@optinus.com", role: "Recruiter", pass: "rec123" },
                { email: "mgmt@optinus.com", role: "Management", pass: "mgmt123" },
              ].map(u => (
                <button
                  key={u.email}
                  type="button"
                  title={`Password: ${u.pass}`}
                  onClick={() => { setEmail(u.email); setPassword(u.pass); }}
                  className="flex items-center justify-between rounded-md border border-white/5 bg-white/[0.02] px-2 py-1.5 text-left text-xs hover:border-[#0070f3] hover:bg-[#0070f3]/10 transition"
                >
                  <span className="font-medium text-white">{u.role}</span>
                  <span className="text-slate-400">{u.email}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="text-center text-[10px] text-slate-500">
            © 2026 Optinus Solutions · Resource Management
          </div>
        </div>
      </div>
    </div>
  );
}
