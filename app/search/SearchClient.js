"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import BottomNav from "../components/BottomNav";
import "../notes/notes.css";

function timeAgo(date) {
  const d = new Date(date);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return "방금 전";
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  return d.toLocaleDateString("ko-KR", { month: "long", day: "numeric" });
}

export default function SearchClient() {
  const [q, setQ] = useState("");
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState(false);
  const timer = useRef(null);

  // 입력 디바운스 후 검색
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      if (!q.trim()) {
        setNotes([]);
        setTouched(false);
        return;
      }
      setLoading(true);
      setTouched(true);
      try {
        const res = await fetch(`/api/notes?q=${encodeURIComponent(q.trim())}`);
        const data = await res.json();
        setNotes(data.notes || []);
      } catch {
        setNotes([]);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => timer.current && clearTimeout(timer.current);
  }, [q]);

  return (
    <div className="note-shell">
      <div className="search-bar">
        <Link href="/notes" className="icon-btn muted" aria-label="뒤로">
          ←
        </Link>
        <div className="search-input-wrap">
          <span className="search-glass">🔍</span>
          <input
            className="search-input"
            placeholder="노트 검색 (제목·내용·과목·강의)"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            autoFocus
          />
          {q && (
            <button className="search-clear" onClick={() => setQ("")} aria-label="지우기">
              ×
            </button>
          )}
        </div>
      </div>

      {!touched && !q && (
        <div className="empty">
          키워드를 입력하면 저장된 노트를
          <br />
          제목·내용·과목·연결된 강의에서 검색합니다.
        </div>
      )}

      {touched && !loading && notes.length === 0 && (
        <div className="empty">
          “{q}” 에 대한 검색 결과가 없습니다.
        </div>
      )}

      {loading && <div className="empty">검색 중…</div>}

      {notes.length > 0 && (
        <>
          <div className="search-count">{notes.length}개 결과</div>
          <ul className="note-list" style={{ paddingTop: 4 }}>
            {notes.map((n) => (
              <li key={String(n.id)}>
                <Link href={`/notes/${n.id}`} className="note-card">
                  {n.subject && <span className="chip">{n.subject}</span>}
                  <h3>{n.title || "(제목 없음)"}</h3>
                  <p>{n.content || "내용 없음"}</p>
                  {n.lecture_title && (
                    <div className="linked-lecture">
                      🎓 {n.lecture_subject} · {n.lecture_title}
                    </div>
                  )}
                  <div className="time">{timeAgo(n.updated_at)} 수정</div>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}

      <BottomNav active="search" />
    </div>
  );
}
