"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import BottomNav from "../components/BottomNav";
import "./notes.css";

const Icon = ({ name }) => (
  <span className="material-symbols-outlined">{name}</span>
);

function fmtDateTime(d) {
  if (!d) return "";
  const t = new Date(d);
  const p = (x) => (x < 10 ? "0" + x : "" + x);
  return `${t.getFullYear()}.${p(t.getMonth() + 1)}.${p(t.getDate())} ${p(
    t.getHours()
  )}:${p(t.getMinutes())}`;
}

export default function NotesList({ initialNotes }) {
  const router = useRouter();
  const [notes, setNotes] = useState(initialNotes || []);
  const [busyId, setBusyId] = useState(null);
  const [toast, setToast] = useState(null);

  async function del(id, title) {
    if (!confirm(`"${title || "(제목 없음)"}" 노트를 삭제할까요?`)) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/notes/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "삭제 실패");
      }
      setNotes((arr) => arr.filter((n) => n.id !== id));
      setToast({ type: "ok", msg: "삭제되었습니다 ✓" });
    } catch (e) {
      setToast({ type: "err", msg: e.message });
    } finally {
      setBusyId(null);
      setTimeout(() => setToast(null), 2000);
    }
  }

  return (
    <div className="note-shell">
      <div className="list-head">
        <h1>내 노트</h1>
        <p>
          총 {notes.length}개 · 카드에서 바로 보기·편집·삭제할 수 있습니다.
        </p>
      </div>

      {notes.length === 0 && (
        <div className="empty">
          아직 저장된 노트가 없습니다.
          <br />
          오른쪽 아래 + 버튼으로 첫 노트를 작성해 보세요.
        </div>
      )}

      {notes.length > 0 && (
        <ul className="note-list">
          {notes.map((n) => (
            <li key={n.id} className={busyId === n.id ? "removing" : ""}>
              <div className="note-card">
                <div
                  className="note-card-body"
                  role="button"
                  tabIndex={0}
                  onClick={() => router.push(`/notes/${n.id}`)}
                  onKeyDown={(e) =>
                    e.key === "Enter" && router.push(`/notes/${n.id}`)
                  }
                >
                  <div className="note-card-toprow">
                    {n.subject && <span className="chip">{n.subject}</span>}
                    <span
                      className={`status-pill ${
                        n.status === "supplement" ? "supp" : "final"
                      }`}
                    >
                      {n.status === "supplement" ? "보충본" : "최종본"}
                    </span>
                    {n.att_count > 0 && (
                      <span className="att-badge">
                        <Icon name="attachment" />
                        {n.att_count}
                      </span>
                    )}
                  </div>
                  <h3>{n.title || "(제목 없음)"}</h3>
                  <p>{n.content || "내용 없음"}</p>
                  {n.lecture_title && (
                    <div className="linked-lecture">
                      🎓 {n.lecture_subject} · {n.lecture_title}
                    </div>
                  )}
                  <div className="time">
                    <Icon name="schedule" /> {fmtDateTime(n.created_at)} 등록
                  </div>
                </div>

                <div className="note-actions">
                  <Link href={`/notes/${n.id}`} className="note-act">
                    <Icon name="visibility" /> 보기
                  </Link>
                  <Link href={`/notes/${n.id}/edit`} className="note-act">
                    <Icon name="edit" /> 편집
                  </Link>
                  <button
                    className="note-act danger"
                    onClick={() => del(n.id, n.title)}
                    disabled={busyId === n.id}
                  >
                    <Icon name="delete" />
                    {busyId === n.id ? "삭제 중…" : "삭제"}
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {toast && <div className={`list-toast ${toast.type}`}>{toast.msg}</div>}

      <BottomNav active="list" />
    </div>
  );
}
