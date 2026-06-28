import { notFound } from "next/navigation";
import { sql, ensureSchema } from "@/lib/db";
import NoteEditor from "../../NoteEditor";

export const dynamic = "force-dynamic";
export const metadata = { title: "노트 편집 · 렉처 아카이브" };

export default async function EditNotePage({ params }) {
  const { id } = await params;
  await ensureSchema();
  const rows = await sql`
    SELECT id, title, subject, content, lecture_id,
           note_date, topic, summary, tags, status, attachments
    FROM notes WHERE id = ${id}
  `;
  if (rows.length === 0) notFound();
  const r = rows[0];
  const note = {
    id: String(r.id),
    title: r.title,
    subject: r.subject,
    content: r.content,
    lecture_id: r.lecture_id != null ? Number(r.lecture_id) : null,
    note_date: r.note_date ? new Date(r.note_date).toISOString().split("T")[0] : null,
    topic: r.topic,
    summary: r.summary,
    tags: Array.isArray(r.tags) ? r.tags : [],
    status: r.status,
    attachments: Array.isArray(r.attachments) ? r.attachments : [],
  };
  return <NoteEditor initial={note} />;
}
