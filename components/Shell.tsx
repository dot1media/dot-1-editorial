"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMe, api } from "@/lib/client";
import type { Capability } from "@/lib/permissions";
import {
  LayoutDashboard, FileText, Inbox, ScrollText, ShieldCheck,
  Users, ClipboardList, Radio, Menu, LogOut,
} from "lucide-react";

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
  { href: "/tips", label: "Tips", icon: Inbox, cap: "story.view" },
  { href: "/review", label: "Review Queue", icon: ClipboardList, cap: "review.complete" },
  { href: "/broadcast", label: "Broadcast", icon: Radio, cap: "broadcast.view", group: "Production" },
  { href: "/standards", label: "Standards", icon: ScrollText, cap: "standards.edit", group: "Newsroom" },
  { href: "/accounts", label: "Accounts", icon: Users, cap: "admin.manageAccounts", group: "Admin" },
  { href: "/audit", label: "Audit Log", icon: ShieldCheck, cap: "admin.viewAudit" },
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

  async function logout() {
    await api("/api/auth/logout", { method: "POST" });
    router.replace("/login");
  }

  return (
    <div className="shell">
      <aside className={"side" + (open ? " open" : "")}>
        <div className="brand">
          <img src="https://news.dot1.media/icon.png" alt="" onError={(e) => ((e.target as HTMLImageElement).style.display = "none")} />
          <div>
            <div className="t disp">Dot 1 News</div>
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
            <button className="btn ghost sm mobile-only" onClick={() => setOpen((o) => !o)} style={{ display: "none" }}>
              <Menu size={16} />
            </button>
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
