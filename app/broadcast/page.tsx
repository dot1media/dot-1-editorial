"use client";

import Shell from "@/components/Shell";
import { Radio } from "lucide-react";

export default function BroadcastPage() {
  return (
    <Shell title="Broadcast" subtitle="Rundown, teleprompter, graphics, and live control.">
      <div className="card pad" style={{ textAlign: "center", padding: "60px 20px" }}>
        <Radio size={40} color="var(--gold)" style={{ marginBottom: 16 }} />
        <div className="disp" style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Coming in the next pass</div>
        <div className="muted tiny" style={{ maxWidth: 440, margin: "0 auto", lineHeight: 1.6 }}>
          The broadcast control room, rundown builder, teleprompter, graphics manager, breaking-news mode, and live dashboard build on this same foundation and connect directly to Story Records. The workflow and publishing pipeline came first, methodically, as planned.
        </div>
      </div>
    </Shell>
  );
}
