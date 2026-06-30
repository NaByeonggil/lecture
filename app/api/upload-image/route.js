import { put } from "@vercel/blob";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/upload-image  body: { dataUrl, filename? }
// 브라우저에서 축소(압축)한 라벨 사진(data URL)을 받아 Vercel Blob 에 저장.
export async function POST(request) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      { error: "Blob 저장소가 연결되지 않았습니다 (BLOB_READ_WRITE_TOKEN 없음)." },
      { status: 500 }
    );
  }
  try {
    const { dataUrl, filename } = await request.json();
    const m = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/.exec(
      (dataUrl ?? "").toString()
    );
    if (!m) {
      return NextResponse.json({ error: "이미지 데이터가 올바르지 않습니다." }, { status: 400 });
    }
    const mime = m[1];
    const buf = Buffer.from(m[2], "base64");
    if (buf.length > 6 * 1024 * 1024) {
      return NextResponse.json({ error: "이미지가 너무 큽니다(6MB 초과)." }, { status: 413 });
    }
    const ext = mime.split("/")[1].replace("jpeg", "jpg").replace("svg+xml", "svg");
    const safe = (filename ?? "label").toString().replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 60);
    const blob = await put(`labels/${safe}.${ext}`, buf, {
      access: "public",
      addRandomSuffix: true,
      contentType: mime,
    });
    return NextResponse.json({ url: blob.url });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
