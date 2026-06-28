import { notFound } from "next/navigation";
import { sql, ensureSchema } from "@/lib/db";
import NoteView from "../NoteView";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { id } = await params;
  try {
    await ensureSchema();
    const rows = await sql`SELECT title FROM notes WHERE id = ${id}`;
    const t = rows[0]?.title || "노트";
    return { title: `${t} · 렉처 아카이브` };
  } catch {
    return { title: "노트 · 렉처 아카이브" };
  }
}

export default async function ViewNotePage({ params }) {
  const { id } = await params;
  await ensureSchema();
  const rows = await sql`
    SELECT n.id, n.title, n.subject, n.content, n.lecture_id,
           n.note_date, n.topic, n.summary, n.tags, n.status, n.attachments,
           n.created_at, n.updated_at,
           l.title AS lecture_title, l.subject AS lecture_subject
    FROM notes n LEFT JOIN lectures l ON l.id = n.lecture_id
    WHERE n.id = ${id}
  `;
  if (rows.length === 0) notFound();
  const r = rows[0];
  const note = {
    id: String(r.id),
    title: r.title,
    subject: r.subject,
    content: r.content,
    lecture_id: r.lecture_id != null ? Number(r.lecture_id) : null,
    lecture_title: r.lecture_title,
    lecture_subject: r.lecture_subject,
    note_date: r.note_date ? new Date(r.note_date).toISOString().split("T")[0] : null,
    topic: r.topic,
    summary: r.summary,
    tags: Array.isArray(r.tags) ? r.tags : [],
    status: r.status,
    attachments: Array.isArray(r.attachments) ? r.attachments : [],
    created_at: r.created_at ? new Date(r.created_at).toISOString() : null,
    updated_at: r.updated_at ? new Date(r.updated_at).toISOString() : null,
  };
  return <NoteView note={note} />;
}
