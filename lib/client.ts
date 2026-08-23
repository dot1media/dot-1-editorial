"use client";

import { useEffect, useState, useCallback } from "react";
import type { Capability } from "@/lib/permissions";

export interface Me {
  signedIn: boolean;
  email?: string;
  name?: string;
  role?: string;
  capabilities?: Capability[];
}

// Client-side JSON fetch that always sends cookies and surfaces API errors as thrown Errors.
export async function api<T = any>(path: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetch(path, {
    ...opts,
    headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
    credentials: "include",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);
  return data as T;
}

export function useMe() {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await api<Me>("/api/auth/me");
      setMe(data);
    } catch {
      setMe({ signedIn: false });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const can = useCallback(
    (cap: Capability) => !!me?.capabilities?.includes(cap),
    [me]
  );

  return { me, loading, can, refresh };
}
