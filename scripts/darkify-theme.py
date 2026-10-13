#!/usr/bin/env python3
"""Optinus dark-theme color migration script.
Updates all .tsx files in src/components/views and src/components/shared
to use dark-theme color classes matching the Optinus brand palette.

Replaces:
  - #1565D8 (old blue)        -> #0070f3 (Optinus brand blue)
  - #0B3D91 (old deep blue)  -> #0050c8 (Optinus deep blue)
  - #2196F3 (old bright blue) -> #0070f3 (Optinus brand blue)
  - #EAF3FF, #F4F8FF (light blue tints) -> #0070f3/10 (transparent blue)
  - bg-white, bg-slate-50, bg-slate-100 -> dark navy equivalents
  - border-slate-200, border-slate-100 -> border-white/X
  - hover:bg-blue-50 etc -> hover:bg-[#0070f3]/10 etc
  - saturated tinted badge backgrounds (bg-blue-100, bg-red-100, etc) -> dark-theme tints
  - light text colors (text-blue-700, text-slate-600) -> dark-theme text colors
"""
import re
import sys
from pathlib import Path

# (regex_pattern, replacement)
# Order matters — more specific patterns first to avoid partial matches
REPLACEMENTS = [
    # Brand color hex swaps (must come before generic patterns)
    (r'bg-\[#1565D8\]', 'bg-[#0070f3]'),
    (r'bg-\[#0B3D91\]', 'bg-[#0050c8]'),
    (r'bg-\[#2196F3\]', 'bg-[#0070f3]'),
    (r'text-\[#1565D8\]', 'text-[#0070f3]'),
    (r'text-\[#0B3D91\]', 'text-[#0060d3]'),
    (r'from-\[#2196F3\]', 'from-[#0070f3]'),
    (r'to-\[#1565D8\]', 'to-[#0050c8]'),
    (r'from-\[#1565D8\]', 'from-[#0070f3]'),
    (r'from-\[#0B3D91\]', 'from-[#0a0a14]'),
    (r'from-\[#072a66\]', 'from-[#0a0a14]'),
    (r'from-white to-\[#F4F8FF\]', 'from-[#181826] to-[#0f0f1a]'),
    (r'from-white to-\[#EAF3FF\]', 'from-[#181826] to-[#0f0f1a]'),
    (r'bg-\[#EAF3FF\]', 'bg-[#0070f3]/10'),
    (r'bg-\[#F4F8FF\]', 'bg-[#181826]'),
    (r'bg-\[#F8FAFC\]', 'bg-[#0f0f1a]'),
    (r'bg-\[#F1F5F9\]', 'bg-white/[0.03]'),

    # Hover effects (specific first)
    (r'hover:bg-blue-50/40', 'hover:bg-[#0070f3]/[0.06]'),
    (r'hover:bg-blue-50/50', 'hover:bg-[#0070f3]/[0.08]'),
    (r'hover:bg-blue-50/70', 'hover:bg-[#0070f3]/[0.12]'),
    (r'hover:bg-blue-50', 'hover:bg-[#0070f3]/10'),
    (r'hover:bg-red-50/50', 'hover:bg-red-500/[0.08]'),
    (r'hover:bg-red-50', 'hover:bg-red-500/10'),
    (r'hover:bg-emerald-50', 'hover:bg-emerald-500/10'),
    (r'hover:bg-amber-50', 'hover:bg-amber-500/10'),
    (r'hover:bg-purple-50', 'hover:bg-purple-500/10'),
    (r'hover:bg-slate-100', 'hover:bg-white/5'),
    (r'hover:bg-slate-50', 'hover:bg-white/[0.03]'),
    (r'hover:bg-red-500/10', 'hover:bg-red-500/10'),  # already correct, no-op

    # Background tints
    (r'bg-blue-50/40', 'bg-[#0070f3]/[0.06]'),
    (r'bg-blue-50/50', 'bg-[#0070f3]/[0.08]'),
    (r'bg-blue-50/70', 'bg-[#0070f3]/[0.12]'),
    (r'bg-blue-50/\\50', 'bg-[#0070f3]/[0.08]'),  # handle escaped slash variant
    (r'bg-blue-50', 'bg-[#0070f3]/10'),
    (r'bg-emerald-50/50', 'bg-emerald-500/[0.08]'),
    (r'bg-emerald-50', 'bg-emerald-500/10'),
    (r'bg-amber-50/50', 'bg-amber-500/[0.08]'),
    (r'bg-amber-50', 'bg-amber-500/10'),
    (r'bg-red-50/50', 'bg-red-500/[0.08]'),
    (r'bg-red-50', 'bg-red-500/10'),
    (r'bg-purple-50/50', 'bg-purple-500/[0.08]'),
    (r'bg-purple-50', 'bg-purple-500/10'),
    (r'bg-cyan-50/50', 'bg-cyan-500/[0.08]'),
    (r'bg-cyan-50', 'bg-cyan-500/10'),
    (r'bg-pink-50/50', 'bg-pink-500/[0.08]'),
    (r'bg-pink-50', 'bg-pink-500/10'),
    (r'bg-orange-50/50', 'bg-orange-500/[0.08]'),
    (r'bg-orange-50', 'bg-orange-500/10'),
    (r'bg-green-50/50', 'bg-green-500/[0.08]'),
    (r'bg-green-50', 'bg-green-500/10'),
    (r'bg-slate-50/40', 'bg-white/[0.04]'),
    (r'bg-slate-50/50', 'bg-white/[0.05]'),
    (r'bg-slate-50/70', 'bg-white/[0.07]'),
    (r'bg-slate-50', 'bg-white/[0.03]'),

    # Saturated tinted badge backgrounds
    (r'bg-blue-200', 'bg-blue-500/20'),
    (r'bg-emerald-200', 'bg-emerald-500/20'),
    (r'bg-amber-200', 'bg-amber-500/20'),
    (r'bg-red-200', 'bg-red-500/20'),
    (r'bg-orange-200', 'bg-orange-500/20'),
    (r'bg-purple-200', 'bg-purple-500/20'),
    (r'bg-pink-200', 'bg-pink-500/20'),
    (r'bg-cyan-200', 'bg-cyan-500/20'),
    (r'bg-green-200', 'bg-green-500/20'),
    (r'bg-slate-200', 'bg-slate-500/20'),

    (r'bg-blue-100', 'bg-blue-500/15'),
    (r'bg-emerald-100', 'bg-emerald-500/15'),
    (r'bg-amber-100', 'bg-amber-500/15'),
    (r'bg-red-100', 'bg-red-500/15'),
    (r'bg-orange-100', 'bg-orange-500/15'),
    (r'bg-purple-100', 'bg-purple-500/15'),
    (r'bg-pink-100', 'bg-pink-500/15'),
    (r'bg-cyan-100', 'bg-cyan-500/15'),
    (r'bg-green-100', 'bg-green-500/15'),
    (r'bg-slate-100', 'bg-slate-500/15'),

    # Text colors for dark theme
    (r'text-blue-800', 'text-blue-300'),
    (r'text-emerald-800', 'text-emerald-300'),
    (r'text-green-800', 'text-green-300'),
    (r'text-blue-700', 'text-blue-300'),
    (r'text-emerald-700', 'text-emerald-300'),
    (r'text-amber-700', 'text-amber-300'),
    (r'text-red-700', 'text-red-300'),
    (r'text-orange-700', 'text-orange-300'),
    (r'text-purple-700', 'text-purple-300'),
    (r'text-slate-700', 'text-slate-300'),
    (r'text-green-700', 'text-green-300'),
    (r'text-pink-700', 'text-pink-300'),
    (r'text-cyan-700', 'text-cyan-300'),

    (r'text-blue-600', 'text-blue-400'),
    (r'text-emerald-600', 'text-emerald-400'),
    (r'text-amber-600', 'text-amber-400'),
    (r'text-red-600', 'text-red-400'),
    (r'text-purple-600', 'text-purple-400'),
    (r'text-green-600', 'text-green-400'),
    (r'text-orange-600', 'text-orange-400'),
    (r'text-slate-600', 'text-slate-400'),

    (r'text-blue-50\b', 'text-blue-200'),
    (r'text-emerald-50\b', 'text-emerald-200'),
    (r'text-amber-50\b', 'text-amber-200'),
    (r'text-red-50\b', 'text-red-200'),

    # Borders
    (r'border-slate-300', 'border-white/15'),
    (r'border-slate-200', 'border-white/10'),
    (r'border-slate-100', 'border-white/5'),
    (r'border-blue-200', 'border-[#0070f3]/30'),
    (r'border-blue-100', 'border-[#0070f3]/20'),
    (r'border-red-200', 'border-red-500/30'),
    (r'border-red-100', 'border-red-500/20'),
    (r'border-amber-200', 'border-amber-500/30'),
    (r'border-amber-100', 'border-amber-500/20'),
    (r'border-emerald-200', 'border-emerald-500/30'),
    (r'border-emerald-100', 'border-emerald-500/20'),
    (r'border-purple-200', 'border-purple-500/30'),
    (r'border-purple-100', 'border-purple-500/20'),
    (r'border-blue-50', 'border-[#0070f3]/15'),

    # Plain white background -> dark navy (very specific to avoid breaking text-white etc)
    (r'(?<![-\w])bg-white(?![/\w])', 'bg-[#181826]'),

    # ring upgrades
    (r'ring-blue-100', 'ring-[#0070f3]/20'),
    (r'ring-blue-200', 'ring-[#0070f3]/30'),
    (r'ring-emerald-200', 'ring-emerald-500/30'),
    (r'ring-emerald-100', 'ring-emerald-500/20'),
    (r'ring-amber-200', 'ring-amber-500/30'),
    (r'ring-amber-100', 'ring-amber-500/20'),
    (r'ring-red-200', 'ring-red-500/30'),
    (r'ring-red-100', 'ring-red-500/20'),
    (r'ring-purple-200', 'ring-purple-500/30'),
    (r'ring-purple-100', 'ring-purple-500/20'),
    (r'ring-slate-200', 'ring-white/10'),

    # focus:border-[#1565D8] -> focus:border-[#0070f3]
    (r'focus:border-\[#1565D8\]', 'focus:border-[#0070f3]'),
    (r'focus:ring-blue-100', 'focus:ring-[#0070f3]/20'),
    (r'focus:bg-white', 'focus:bg-white/[0.05]'),

    # foreground -> white (since dark theme foreground IS white)
    (r'text-foreground\b', 'text-white'),
    (r'text-muted-foreground\b', 'text-slate-400'),
]

def migrate(content):
    """Apply all replacements in order."""
    for pattern, replacement in REPLACEMENTS:
        content = re.sub(pattern, replacement, content)
    return content

def main():
    base_dir = Path("/home/z/my-project/src/components")
    files = list(base_dir.rglob("*.tsx"))
    print(f"Processing {len(files)} files...")
    total_changes = 0
    for f in files:
        original = f.read_text(encoding="utf-8")
        migrated = migrate(original)
        if migrated != original:
            f.write_text(migrated, encoding="utf-8")
            changes = sum(1 for _ in re.finditer('|'.join(re.escape(p) for p, _ in REPLACEMENTS), original))
            print(f"  ✓ {f.relative_to(base_dir)} ({len(original) - len(migrated) if len(migrated) < len(original) else '+' + str(len(migrated) - len(original))} bytes)")
            total_changes += 1
    print(f"\nDone. {total_changes} files updated.")

if __name__ == "__main__":
    main()
