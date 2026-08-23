"use client";

import { useState } from "react";
import { Form } from "@/components/PublicForm";

// The public Submit a News Tip form. Posts to the same-origin public endpoint here on editorial;
// the cross-origin version of this form (embedded on news.dot1.media and dot1.media) posts to the
// same endpoint with CORS. Includes the honeypot field the endpoint checks.

export default function TipFormPage() {
  const [f, setF] = useState({ subject: "", body: "", name: "", contact: "", location: "", anonymous: false, website: "" });
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [err, setErr] = useState("");

  function set(k: string, v: any) { setF((p) => ({ ...p, [k]: v })); }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!f.body.trim()) { setErr("Please tell us what is happening."); return; }
    setState("busy"); setErr("");
    try {
      const res = await fetch("/api/public/tip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...f, kind: "tip", source: "editorial" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong.");
      setState("done");
    } catch (e: any) {
      setErr(e.message); setState("error");
    }
  }

  if (state === "done") {
    return (
      <div>
        <h1 style={{ fontFamily: "'Bodoni Moda', serif", fontWeight: 700, fontSize: 34, marginBottom: 16 }}>Thank you.</h1>
        <p style={{ fontFamily: "Archivo, sans-serif", fontSize: 16, lineHeight: 1.7 }}>
          Your tip reached the newsroom. We read every submission. If you left contact details and we
          need to follow up, someone will be in touch. We protect our sources.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 style={{ fontFamily: "'Bodoni Moda', serif", fontWeight: 700, fontSize: 38, marginBottom: 12 }}>Submit a News Tip</h1>
      <p style={{ fontFamily: "Archivo, sans-serif", fontSize: 16, lineHeight: 1.7, marginBottom: 28 }}>
        Know something we should look into? Tell us. You can submit anonymously. If you share contact
        details, we may reach out to verify. We take source protection seriously.
      </p>

      <Form f={f} set={set} submit={submit} err={err} busy={state === "busy"} showSubject />
    </div>
  );
}
