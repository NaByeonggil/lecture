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

// GET /api/notes        — 목록 (연결 강의 포함)
// GET /api/notes?q=키워드 — 제목·내용·과목·주제·요약·연결 강의에서 검색
export async function GET(request) {
  try {
    await ensureSchema();
    const q = (new URL(request.url).searchParams.get("q") ?? "").trim();
    let rows;
    if (q) {
      const like = `%${q}%`;
      rows = await sql`
        SELECT n.id, n.title, n.subject, n.content, n.lecture_id,
               n.note_date, n.topic, n.summary, n.tags, n.status, n.attachments, n.diagrams,
               n.created_at, n.updated_at,
               l.title AS lecture_title, l.subject AS lecture_subject
        FROM notes n LEFT JOIN lectures l ON l.id = n.lecture_id
        WHERE n.title ILIKE ${like} OR n.content ILIKE ${like}
           OR n.subject ILIKE ${like} OR n.topic ILIKE ${like}
           OR n.summary ILIKE ${like}
           OR l.title ILIKE ${like} OR l.subject ILIKE ${like}
        ORDER BY n.updated_at DESC
      `;
    } else {
      rows = await sql`
        SELECT n.id, n.title, n.subject, n.content, n.lecture_id,
               n.note_date, n.topic, n.summary, n.tags, n.status, n.attachments, n.diagrams,
               n.created_at, n.updated_at,
               l.title AS lecture_title, l.subject AS lecture_subject
        FROM notes n LEFT JOIN lectures l ON l.id = n.lecture_id
        ORDER BY n.updated_at DESC
      `;
    }
    return NextResponse.json({ notes: rows });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/notes  — 새 노트 저장
export async function POST(request) {
  try {
    await ensureSchema();
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

    if (!title && !content && !summary) {
      return NextResponse.json(
        { error: "제목·요약·내용 중 하나는 입력하세요." },
        { status: 400 }
      );
    }

    const rows = await sql`
      INSERT INTO notes
        (title, subject, content, lecture_id, note_date, topic, summary, tags, status, attachments, diagrams)
      VALUES
        (${title}, ${subject}, ${content}, ${lectureId}, ${noteDate},
         ${topic}, ${summary}, ${JSON.stringify(tags)}::jsonb, ${status},
         ${JSON.stringify(attachments)}::jsonb, ${JSON.stringify(diagrams)}::jsonb)
      RETURNING id, title, subject, content, lecture_id, note_date, topic,
                summary, tags, status, attachments, diagrams, created_at, updated_at
    `;
    return NextResponse.json({ note: rows[0] }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
