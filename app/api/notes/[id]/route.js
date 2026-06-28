import { NextResponse } from "next/server";
import { sql, ensureSchema } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseLectureId(v) {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : null;
}
function normTags(v) {
  if (!Array.isArray(v)) return [];
  return v.map((t) => String(t).trim()).filter(Boolean).slice(0, 30);
}
function normAttachments(v) {
  if (!Array.isArray(v)) return [];
  return v
    .filter((a) => a && typeof a.url === "string")
    .map((a) => ({
      url: String(a.url),
      name: String(a.name ?? ""),
      contentType: String(a.contentType ?? ""),
    }))
    .slice(0, 30);
}
function normDiagrams(v) {
  if (!Array.isArray(v)) return [];
  return v
    .map((d) => ({
      title: String(d?.title ?? "").trim().slice(0, 200),
      code: String(d?.code ?? ""),
    }))
    .filter((d) => d.code.trim())
    .slice(0, 30);
}

// GET /api/notes/:id
export async function GET(_request, { params }) {
  try {
    await ensureSchema();
    const { id } = await params;
    const rows = await sql`
      SELECT n.id, n.title, n.subject, n.content, n.lecture_id,
             n.note_date, n.topic, n.summary, n.tags, n.status, n.attachments, n.diagrams,
             n.created_at, n.updated_at,
             l.title AS lecture_title, l.subject AS lecture_subject
      FROM notes n LEFT JOIN lectures l ON l.id = n.lecture_id
      WHERE n.id = ${id}
    `;
    if (rows.length === 0) {
      return NextResponse.json({ error: "노트를 찾을 수 없습니다." }, { status: 404 });
    }
    return NextResponse.json({ note: rows[0] });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PUT /api/notes/:id
export async function PUT(request, { params }) {
  try {
    await ensureSchema();
    const { id } = await params;
    const body = await request.json();
    const title = (body.title ?? "").toString().trim();
    const subject = (body.subject ?? "").toString().trim();
    const content = (body.content ?? "").toString();
    const topic = (body.topic ?? "").toString().trim();
    const summary = (body.summary ?? "").toString();
    const status = body.status === "supplement" ? "supplement" : "final";
    const noteDate = body.note_date ? String(body.note_date) : null;
    const lectureId = parseLectureId(body.lecture_id);
    const tags = normTags(body.tags);
    const attachments = normAttachments(body.attachments);
    const diagrams = normDiagrams(body.diagrams);

    const rows = await sql`
      UPDATE notes SET
        title = ${title}, subject = ${subject}, content = ${content},
        lecture_id = ${lectureId}, note_date = ${noteDate}, topic = ${topic},
        summary = ${summary}, tags = ${JSON.stringify(tags)}::jsonb,
        status = ${status}, attachments = ${JSON.stringify(attachments)}::jsonb,
        diagrams = ${JSON.stringify(diagrams)}::jsonb,
        updated_at = now()
      WHERE id = ${id}
      RETURNING id, title, subject, content, lecture_id, note_date, topic,
                summary, tags, status, attachments, diagrams, created_at, updated_at
    `;
    if (rows.length === 0) {
      return NextResponse.json({ error: "노트를 찾을 수 없습니다." }, { status: 404 });
    }
    return NextResponse.json({ note: rows[0] });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE /api/notes/:id
export async function DELETE(_request, { params }) {
  try {
    await ensureSchema();
    const { id } = await params;
    const rows = await sql`DELETE FROM notes WHERE id = ${id} RETURNING id`;
    if (rows.length === 0) {
      return NextResponse.json({ error: "노트를 찾을 수 없습니다." }, { status: 404 });
    }
    return NextResponse.json({ ok: true, id: rows[0].id });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
