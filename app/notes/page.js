import { sql, ensureSchema } from "@/lib/db";
import NotesList from "./NotesList";
import "./notes.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "내 노트 · 렉처 아카이브" };

export default async function NotesPage() {
  let notes = null;
  let error = null;
  try {
    await ensureSchema();
    const rows = await sql`
      SELECT n.id, n.title, n.subject, n.content, n.status,
             n.created_at, n.updated_at,
             COALESCE(jsonb_array_length(n.attachments), 0) AS att_count,
             l.title AS lecture_title, l.subject AS lecture_subject
      FROM notes n
      LEFT JOIN lectures l ON l.id = n.lecture_id
      ORDER BY n.updated_at DESC
    `;
    notes = rows.map((n) => ({
      id: String(n.id),
      title: n.title,
      subject: n.subject,
      content: n.content,
      status: n.status,
      att_count: Number(n.att_count) || 0,
      created_at: n.created_at ? new Date(n.created_at).toISOString() : null,
      updated_at: n.updated_at ? new Date(n.updated_at).toISOString() : null,
      lecture_title: n.lecture_title,
      lecture_subject: n.lecture_subject,
    }));
  } catch (e) {
    error = e.message;
  }

  if (error) {
    return (
      <div className="note-shell">
        <div className="list-head">
          <h1>내 노트</h1>
        </div>
        <div className="setup-warn">
          데이터베이스 연결에 문제가 있습니다.
          <br />
          <span style={{ opacity: 0.7 }}>({error})</span>
        </div>
      </div>
    );
  }

  return <NotesList initialNotes={notes} />;
}
