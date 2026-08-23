"use client";

import { useEffect, useState } from "react";
import Shell from "@/components/Shell";
import { api } from "@/lib/client";
import { ROLES, ROLE_DEFAULTS, CAPABILITY_GROUPS, Capability, Role } from "@/lib/permissions";
import { Plus } from "lucide-react";

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [adding, setAdding] = useState(false);

  async function load() {
    const d = await api<{ accounts: any[] }>("/api/accounts");
    setAccounts(d.accounts || []);
    setLoaded(true);
  }
  useEffect(() => { load(); }, []);

  return (
    <Shell title="Accounts" subtitle="Roles set the defaults. Overrides tune any one person."
      actions={<button className="btn primary" onClick={() => setAdding(true)}><Plus size={15} /> Add account</button>}>
      {!loaded ? <span className="mono muted tiny">Loading…</span> : (
        <div className="card">
          <table className="grid-t">
            <thead><tr><th>Email</th><th>Name</th><th>Role</th><th>Overrides</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {accounts.map((a) => {
                const ovCount = Object.keys(a.overrides || {}).length;
                return (
                  <tr key={a.id}>
                    <td style={{ fontWeight: 600 }}>{a.email}</td>
                    <td className="muted">{a.name || "—"}</td>
                    <td><span className="chip gold">{a.role}</span></td>
                    <td className="tiny muted">{ovCount > 0 ? `${ovCount} custom` : "none"}</td>
                    <td>{a.disabled ? <span className="chip crimson">disabled</span> : <span className="chip ok">active</span>}</td>
                    <td><button className="btn ghost sm" onClick={() => setEditing(a)}>Edit</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {editing && <EditModal account={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
      {adding && <AddModal onClose={() => setAdding(false)} onSaved={() => { setAdding(false); load(); }} />}
    </Shell>
  );
}

function AddModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<Role>("reporter");
  const [err, setErr] = useState("");

  async function save() {
    try {
      await api("/api/accounts", { method: "POST", body: JSON.stringify({ email, name, role }) });
      onSaved();
    } catch (e: any) { setErr(e.message); }
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440 }}>
        <div className="pad stack">
          <div className="disp" style={{ fontSize: 22, fontWeight: 700 }}>Add account</div>
          <div><label className="f">Email (@dot1.media)</label><input className="in" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus /></div>
          <div><label className="f">Name</label><input className="in" value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div><label className="f">Role</label>
            <select className="in" value={role} onChange={(e) => setRole(e.target.value as Role)}>
              {ROLES.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
            </select>
            <div className="tiny muted" style={{ marginTop: 6 }}>{ROLES.find((r) => r.id === role)?.blurb}</div>
          </div>
          {err && <div className="tiny" style={{ color: "#ffb4b4" }}>{err}</div>}
          <div className="tiny muted" style={{ lineHeight: 1.5 }}>They sign in with Dot One SSO. No password is set here.</div>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button className="btn ghost" onClick={onClose}>Cancel</button>
            <button className="btn primary" onClick={save}>Add</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function EditModal({ account, onClose, onSaved }: { account: any; onClose: () => void; onSaved: () => void }) {
  const [role, setRole] = useState<Role>(account.role);
  const [overrides, setOverrides] = useState<Record<string, boolean>>(account.overrides || {});
  const [disabled, setDisabled] = useState(!!account.disabled);
  const [busy, setBusy] = useState(false);

  const roleDefaults = new Set<Capability>(ROLE_DEFAULTS[role] || []);
  const isOwner = role === "owner";

  function effective(cap: Capability): boolean {
    if (isOwner) return true;
    if (cap in overrides) return overrides[cap];
    return roleDefaults.has(cap);
  }
  function cycle(cap: Capability) {
    if (isOwner) return;
    // three-state: default → force on → force off → default
    setOverrides((prev) => {
      const next = { ...prev };
      const base = roleDefaults.has(cap);
      if (!(cap in next)) next[cap] = !base;
      else if (next[cap] !== base) delete next[cap];
      else next[cap] = !base;
      return next;
    });
  }

  async function save() {
    setBusy(true);
    try {
      await api(`/api/accounts/${account.id}`, { method: "PATCH", body: JSON.stringify({ role, overrides, disabled }) });
      onSaved();
    } finally { setBusy(false); }
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal card wide" onClick={(e) => e.stopPropagation()}>
        <div className="pad stack">
          <div className="row-between">
            <div className="disp" style={{ fontSize: 22, fontWeight: 700 }}>{account.email}</div>
            <label className="tiny" style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input type="checkbox" checked={disabled} onChange={(e) => setDisabled(e.target.checked)} /> Disabled
            </label>
          </div>

          <div>
            <label className="f">Role (sets the defaults)</label>
            <select className="in" value={role} onChange={(e) => { setRole(e.target.value as Role); setOverrides({}); }} style={{ maxWidth: 260 }}>
              {ROLES.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
            </select>
            <div className="tiny muted" style={{ marginTop: 6 }}>{ROLES.find((r) => r.id === role)?.blurb}</div>
          </div>

          {isOwner ? (
            <div className="card pad tiny muted">Owners have every capability and cannot be restricted.</div>
          ) : (
            <div>
              <div className="mini" style={{ marginBottom: 4 }}>CAPABILITIES</div>
              <div className="tiny muted" style={{ marginBottom: 12 }}>Click to toggle. Gold means granted, dim means denied. A dot marks an override that differs from the role default.</div>
              <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                {CAPABILITY_GROUPS.map((g) => (
                  <div key={g.label}>
                    <div className="mini" style={{ marginBottom: 8 }}>{g.label}</div>
                    <div className="stack" style={{ gap: 5 }}>
                      {g.caps.map((c) => {
                        const on = effective(c.id);
                        const overridden = c.id in overrides;
                        return (
                          <button key={c.id} onClick={() => cycle(c.id)}
                            className={"btn sm " + (on ? "gold" : "ghost")}
                            style={{ justifyContent: "space-between", opacity: on ? 1 : 0.55 }}>
                            <span>{c.label}</span>
                            {overridden && <span className="dot" style={{ background: "var(--crimson)" }} />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
            <button className="btn ghost" onClick={onClose}>Cancel</button>
            <button className="btn primary" onClick={save} disabled={busy}>{busy ? "Saving…" : "Save"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
