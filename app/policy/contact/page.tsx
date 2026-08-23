"use client";

import { useState } from "react";
import { Form } from "@/components/PublicForm";

export default function ContactPage() {
  const [f, setF] = useState({ subject: "", body: "", name: "", contact: "", location: "", anonymous: false, website: "" });
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [err, setErr] = useState("");

  function set(k: string, v: any) { setF((p) => ({ ...p, [k]: v })); }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!f.body.trim()) { setErr("Please include a message."); return; }
    setState("busy"); setErr("");
    try {
      const res = await fetch("/api/public/tip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...f, kind: "contact", source: "editorial" }),
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
        <h1 style={{ fontFamily: "'Bodoni Moda', serif", fontWeight: 700, fontSize: 34, marginBottom: 16 }}>Message received.</h1>
        <p style={{ fontFamily: "Archivo, sans-serif", fontSize: 16, lineHeight: 1.7 }}>Thank you for reaching out. We will respond if a reply is needed.</p>
      </div>
    );
  }

  return (
    <div>
      <h1 style={{ fontFamily: "'Bodoni Moda', serif", fontWeight: 700, fontSize: 38, marginBottom: 12 }}>Contact the Newsroom</h1>
      <p style={{ fontFamily: "Archivo, sans-serif", fontSize: 16, lineHeight: 1.7, marginBottom: 28 }}>
        Questions, feedback, or a correction to report? Send a note and it reaches the newsroom directly.
      </p>
      <Form f={f} set={set} submit={submit} err={err} busy={state === "busy"} showSubject />
    </div>
  );
}
