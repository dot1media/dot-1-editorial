import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { requireCapability } from "@/lib/session";
import { IMAGE_MIME, VIDEO_MIME, MAX_VIDEO_BYTES } from "@/lib/newsroom";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Mints a short-lived token so the browser uploads the file straight to Vercel Blob, instead of
// streaming it through this function. Serverless request bodies are capped at ~4.5 MB on Vercel, so
// the old "POST the file to /api/media" path failed for anything but tiny files — videos never made
// it. The browser calls upload() (see MediaUploader) which hits this route for a token, uploads
// directly (multipart for big files), then registers the finished blob via POST /api/media.
export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;
  try {
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => {
        // Authorize with the caller's session before handing out an upload token.
        const gate = await requireCapability("media.upload");
        if ("response" in gate) throw new Error("You don't have permission to upload media.");
        return {
          allowedContentTypes: [...IMAGE_MIME, ...VIDEO_MIME],
          maximumSizeInBytes: MAX_VIDEO_BYTES,
          addRandomSuffix: true,
        };
      },
      // The DB row is created by the browser via POST /api/media once upload() resolves, so nothing
      // to do here. (This callback also runs server-to-server from Blob and carries no session.)
      onUploadCompleted: async () => {},
    });
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Could not start the upload." }, { status: 400 });
  }
}
