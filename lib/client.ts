"use client";

import { useEffect, useState, useCallback } from "react";
import { upload } from "@vercel/blob/client";
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

// Upload a File straight from the browser to Vercel Blob (via a short-lived token from
// /api/media/blob) and return its public URL. Going direct avoids the ~4.5 MB serverless
// request-body cap that made the old streaming /api/upload route fail for larger images.
export async function uploadFile(file: File, kind: string): Promise<string> {
  const ext = file.name.includes(".") ? file.name.split(".").pop() : "bin";
  const pathname = `${kind}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const blob = await upload(pathname, file, {
    access: "public",
    handleUploadUrl: "/api/media/blob",
    contentType: file.type || "application/octet-stream",
    multipart: file.size > 8 * 1024 * 1024,
  });
  return blob.url;
}

// Downscale an image File in the browser before upload, so photos stay reasonable in size. Returns
// a JPEG File no wider than maxW. Videos are uploaded as-is.
export async function downscaleImage(file: File, maxW = 2400, quality = 0.85): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  const dataUrl: string = await new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(new Error("read failed"));
    r.readAsDataURL(file);
  });
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = () => reject(new Error("image load failed"));
    i.src = dataUrl;
  });
  if (img.width <= maxW) return file;
  const scale = maxW / img.width;
  const canvas = document.createElement("canvas");
  canvas.width = maxW;
  canvas.height = Math.round(img.height * scale);
  canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
  const blob: Blob = await new Promise((resolve) => canvas.toBlob((b) => resolve(b!), "image/jpeg", quality));
  return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
}
