"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMe, api } from "@/lib/client";
import type { Capability } from "@/lib/permissions";
import {
  LayoutDashboard, FileText, Inbox, ScrollText, ShieldCheck,
  Users, ClipboardList, Radio, Menu, ChevronDown, LogOut, Image as ImageIcon, Sparkles, Newspaper, BookOpen, Bell, BarChart3, CalendarDays, BookUser, Mail, Film, Share2 } from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: any;
  cap?: Capability;
  group?: string;
}

const NAV: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/stories", label: "Stories", icon: FileText, cap: "story.view" },
  { href: "/ai", label: "AI Desk", icon: Sparkles, cap: "story.view" },
  { href: "/tips", label: "Tips", icon: Inbox, cap: "story.view" },
  { href: "/calendar", label: "Calendar", icon: CalendarDays, cap: "story.view" },
  { href: "/sources", label: "Sources", icon: BookUser, cap: "story.view" },
  { href: "/digest", label: "Digest", icon: Mail, cap: "story.view" },
  { href: "/review", label: "Review Queue", icon: ClipboardList, cap: "review.complete" },
  { href: "/media", label: "Media Library", icon: ImageIcon, cap: "media.upload" },
  { href: "/published", label: "Published", icon: Newspaper, cap: "story.view" },
  { href: "/analytics", label: "Readership", icon: BarChart3, cap: "story.view" },
  { href: "/broadcast", label: "Broadcast", icon: Radio, cap: "broadcast.view", group: "Production" },
  { href: "/lens-reel", label: "Lens & Reel", icon: Film, cap: "story.view", group: "Production" },
  { href: "/social", label: "Social", icon: Share2, cap: "publish.toNews", group: "Production" },
  { href: "/notify", label: "Send Alert", icon: Bell, cap: "broadcast.view" },
  { href: "/standards", label: "Standards", icon: ScrollText, cap: "standards.edit", group: "Newsroom" },
  { href: "/accounts", label: "Accounts", icon: Users, cap: "admin.manageAccounts", group: "Admin" },
  { href: "/audit", label: "Audit Log", icon: ShieldCheck, cap: "admin.viewAudit" },
  { href: "/guide", label: "Guide", icon: BookOpen, cap: "story.view" },
];

export default function Shell({
  title,
  subtitle,
  children,
  actions,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}) {
  const { me, loading, can } = useMe();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
        <span className="mono muted tiny">Loading the newsroom…</span>
      </div>
    );
  }

  if (!me?.signedIn) {
    if (typeof window !== "undefined") router.replace("/login");
    return null;
  }

  const visible = NAV.filter((n) => !n.cap || can(n.cap));
  let lastGroup: string | undefined;

  const isActive = (href: string) => pathname === href || (href !== "/" && pathname.startsWith(href));
  const currentItem = visible
    .filter((n) => isActive(n.href))
    .sort((a, b) => b.href.length - a.href.length)[0];
  const currentLabel = currentItem?.label || title;

  async function logout() {
    await api("/api/auth/logout", { method: "POST" });
    router.replace("/login");
  }

  return (
    <div className="shell">
      <aside className={"side" + (open ? " open" : "")}>
        <div className="brand">
          <div>
            <div className="wm">
              DOT <img className="gmark" src="/brand/d1-mark-crimson.gif" alt="1" /> NEWS
            </div>
            <div className="s">EDITORIAL</div>
          </div>
        </div>
        <nav className="nav">
          {visible.map((n) => {
            const showGroup = n.group && n.group !== lastGroup;
            lastGroup = n.group || lastGroup;
            const active = pathname === n.href || (n.href !== "/" && pathname.startsWith(n.href));
            const Icon = n.icon;
            return (
              <div key={n.href}>
                {showGroup && <div className="grp">{n.group}</div>}
                <Link href={n.href} className={active ? "on" : ""} onClick={() => setOpen(false)}>
                  <Icon size={17} strokeWidth={2} />
                  {n.label}
                </Link>
              </div>
            );
          })}
        </nav>
        <div className="who">
          <div className="nm">{me.name || me.email}</div>
          <div className="rl">{me.role}</div>
          <button className="btn ghost sm" style={{ marginTop: 10, width: "100%" }} onClick={logout}>
            <LogOut size={14} /> Sign out
          </button>
        </div>
      </aside>

      <div className="main">
        <header className="top">
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div className="navdrop">
              <button className="navdrop-btn" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label="Navigate the newsroom">
                <Menu size={16} />
                <span>{currentLabel}</span>
                <ChevronDown size={15} className={"chev" + (open ? " up" : "")} />
              </button>
              {open && (
                <>
                  <div className="navdrop-scrim" onClick={() => setOpen(false)} />
                  <div className="navdrop-panel">
                    <nav className="navdrop-list">
                      {(() => {
                        let lg: string | undefined;
                        return visible.map((n) => {
                          const showGroup = n.group && n.group !== lg;
                          lg = n.group || lg;
                          const Icon = n.icon;
                          return (
                            <div key={n.href}>
                              {showGroup && <div className="grp">{n.group}</div>}
                              <Link href={n.href} className={isActive(n.href) ? "on" : ""} onClick={() => setOpen(false)}>
                                <Icon size={16} strokeWidth={2} />
                                {n.label}
                              </Link>
                            </div>
                          );
                        });
                      })()}
                    </nav>
                    <div className="navdrop-foot">
                      <div className="nm">{me.name || me.email}</div>
                      <div className="rl">{me.role}</div>
                      <button className="btn ghost sm" onClick={logout}>
                        <LogOut size={14} /> Sign out
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
            <div>
              <h1>{title}</h1>
              {subtitle && <div className="sub">{subtitle}</div>}
            </div>
          </div>
          {actions && <div style={{ display: "flex", gap: 10 }}>{actions}</div>}
        </header>
        <div className="content">{children}</div>
      </div>
    </div>
  );
}
