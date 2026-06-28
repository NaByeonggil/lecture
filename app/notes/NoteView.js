"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Mermaid from "./Mermaid";
import MarkdownFile from "./MarkdownFile";
import BottomNav from "../components/BottomNav";
import "./view.css";

const Icon = ({ name, fill }) => (
  <span
    className="material-symbols-outlined"
    style={fill ? { fontVariationSettings: "'FILL' 1" } : undefined}
  >
    {name}
  </span>
);

function fmtDate(d) {
  if (!d) return null;
  try {
    return new Date(d).toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return d;
  }
}

function fmtDateTime(d) {
  if (!d) return null;
  const t = new Date(d);
  const p = (x) => (x < 10 ? "0" + x : "" + x);
  return `${t.getFullYear()}.${p(t.getMonth() + 1)}.${p(t.getDate())} ${p(
    t.getHours()
  )}:${p(t.getMinutes())}`;
}

export default function NoteView({ note }) {
  const attachments = Array.isArray(note.attachments) ? note.attachments : [];
  const diagrams = Array.isArray(note.diagrams) ? note.diagrams : [];
  const [slideIndex, setSlideIndex] = useState(null);
  const [jumpDraft, setJumpDraft] = useState("");
  const [jumpErr, setJumpErr] = useState("");

  const isImage = (a) => (a.contentType || "").startsWith("image/");
  const isAudio = (a) =>
    (a.contentType || "").startsWith("audio/") ||
    /\.(m4a|mp3|wav|aac|ogg|oga|flac)$/i.test(a.name || "");
  const isMarkdown = (a) =>
    (a.contentType || "").includes("markdown") ||
    /\.(md|markdown|mdown|mkd)$/i.test(a.name || "");
  const openSlide = (i) => attachments.length && setSlideIndex(i);
  const closeSlide = () => setSlideIndex(null);
  const nextSlide = () => setSlideIndex((i) => (i + 1) % attachments.length);
  const prevSlide = () =>
    setSlideIndex((i) => (i - 1 + attachments.length) % attachments.length);

  function printAttachments() {
    if (typeof window !== "undefined") window.print();
  }

  function jumpToFile() {
    const num = parseInt(jumpDraft, 10);
    if (!Number.isInteger(num) || num < 1 || num > attachments.length) {
      setJumpErr(`1 ~ ${attachments.length} 사이 번호를 입력하세요.`);
      return;
    }
    setJumpErr("");
    setSlideIndex(num - 1);
  }

  useEffect(() => {
    if (slideIndex === null) return;
    function onKey(e) {
      if (e.key === "Escape") closeSlide();
      else if (e.key === "ArrowRight") nextSlide();
      else if (e.key === "ArrowLeft") prevSlide();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slideIndex, attachments.length]);

  return (
    <div className="vw">
      {/* 상단바 */}
      <header className="vw-top">
        <Link href="/notes" className="vw-iconbtn" aria-label="목록">
          <Icon name="arrow_back" />
        </Link>
        <span className="vw-brand">노트</span>
        <Link href={`/notes/${note.id}/edit`} className="vw-edit">
          <Icon name="edit" /> 편집
        </Link>
      </header>

      <main className="vw-main">
        {/* 메타 */}
        <div className="vw-metarow">
          <span className={`vw-status ${note.status === "supplement" ? "supp" : "final"}`}>
            {note.status === "supplement" ? "보충본" : "최종본"}
          </span>
          {note.note_date && (
            <span className="vw-meta">
              <Icon name="calendar_today" /> {fmtDate(note.note_date)}
            </span>
          )}
          {note.created_at && (
            <span className="vw-meta">
              <Icon name="schedule" /> {fmtDateTime(note.created_at)} 등록
            </span>
          )}
          {note.updated_at && (
            <span className="vw-meta dim">{fmtDateTime(note.updated_at)} 수정</span>
          )}
        </div>

        {/* 제목 */}
        <h1 className="vw-title">{note.title || "(제목 없음)"}</h1>

        {/* 강의 연결 / 과목 / 주제 */}
        {(note.lecture_title || note.subject || note.topic) && (
          <div className="vw-chips">
            {note.lecture_title && (
              <span className="vw-chip lecture">
                🎓 {note.lecture_subject} · {note.lecture_title}
              </span>
            )}
            {note.subject && !note.lecture_title && (
              <span className="vw-chip">{note.subject}</span>
            )}
            {note.topic && <span className="vw-chip ghost">{note.topic}</span>}
          </div>
        )}

        {/* 요약 */}
        {note.summary && (
          <section className="vw-summary">
            <div className="vw-summary-label">
              <Icon name="lightbulb" fill /> 요약
            </div>
            <p>{note.summary}</p>
          </section>
        )}

        {/* 본문 (마크다운) */}
        {note.content && (
          <article className="vw-content">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                a: ({ node, ...props }) => (
                  <a {...props} target="_blank" rel="noreferrer" />
                ),
                img: ({ node, ...props }) => (
                  // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
                  <img {...props} />
                ),
              }}
            >
              {note.content}
            </ReactMarkdown>
          </article>
        )}

        {/* 도해 (mermaid) */}
        {diagrams.length > 0 && (
          <section className="vw-dia-sec">
            <div className="vw-att-head">
              <span className="vw-att-title">
                <Icon name="account_tree" /> 도해 {diagrams.length}개
              </span>
            </div>
            <div className="vw-dia-list">
              {diagrams.map((d, i) => (
                <figure className="vw-dia" key={i}>
                  {d.title && <figcaption className="vw-dia-cap">{d.title}</figcaption>}
                  <Mermaid code={d.code} />
                </figure>
              ))}
            </div>
          </section>
        )}

        {/* 첨부 + 슬라이드 진입 */}
        {attachments.length > 0 && (
          <section className="vw-att-sec">
            <div className="vw-att-head">
              <span className="vw-att-title">
                <Icon name="attachment" /> 첨부 {attachments.length}개
              </span>
              <div className="vw-jump">
                <span>파일 번호</span>
                <input
                  type="number"
                  min={1}
                  max={attachments.length}
                  value={jumpDraft}
                  onChange={(e) => {
                    setJumpDraft(e.target.value);
                    setJumpErr("");
                  }}
                  onKeyDown={(e) => e.key === "Enter" && jumpToFile()}
                  placeholder="1"
                />
                <button type="button" onClick={jumpToFile}>
                  <Icon name="slideshow" /> 슬라이드 보기
                </button>
                <button
                  type="button"
                  className="vw-print-btn"
                  onClick={printAttachments}
                  title="첨부파일 인쇄"
                >
                  <Icon name="print" /> 프린트
                </button>
              </div>
            </div>
            {jumpErr && <div className="vw-jump-err">{jumpErr}</div>}
            <div className="vw-att-grid">
              {attachments.map((att, i) =>
                isAudio(att) ? (
                  <div className="vw-att vw-att-audio" key={att.url}>
                    <span className="vw-att-no">{i + 1}</span>
                    <span className="vw-att-audioname">
                      <Icon name="audiotrack" />
                      <span>{att.name}</span>
                    </span>
                    <audio controls preload="none" src={att.url} />
                  </div>
                ) : (
                  <button
                    type="button"
                    className="vw-att"
                    key={att.url}
                    onClick={() => openSlide(i)}
                    title={`${i + 1}번 파일 슬라이드로 보기`}
                  >
                    <span className="vw-att-no">{i + 1}</span>
                    {isImage(att) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={att.url} alt={att.name} />
                    ) : (
                      <span className="vw-att-file">
                        <Icon name={isMarkdown(att) ? "article" : "description"} />
                        <span>{att.name}</span>
                      </span>
                    )}
                  </button>
                )
              )}
            </div>
          </section>
        )}

        {/* 태그 */}
        {note.tags?.length > 0 && (
          <div className="vw-tags">
            {note.tags.map((t) => (
              <span className="vw-tag" key={t}>
                #{t}
              </span>
            ))}
          </div>
        )}
      </main>

      <BottomNav active="list" />

      {/* 슬라이드 오버레이 */}
      {slideIndex !== null && attachments[slideIndex] && (
        <div className="vw-slides" onClick={closeSlide}>
          <div className="vw-slides-top" onClick={(e) => e.stopPropagation()}>
            <span className="vw-slides-count">
              파일 {slideIndex + 1} / {attachments.length}
            </span>
            <span className="vw-slides-name">{attachments[slideIndex].name}</span>
            <button className="vw-slides-x" onClick={closeSlide} aria-label="닫기">
              <Icon name="close" />
            </button>
          </div>
          <button
            className="vw-slides-nav prev"
            onClick={(e) => {
              e.stopPropagation();
              prevSlide();
            }}
            aria-label="이전"
          >
            <Icon name="chevron_left" />
          </button>
          <div className="vw-slides-stage" onClick={(e) => e.stopPropagation()}>
            {isImage(attachments[slideIndex]) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={attachments[slideIndex].url} alt={attachments[slideIndex].name} />
            ) : isMarkdown(attachments[slideIndex]) ? (
              <div className="vw-slides-mdcard">
                <MarkdownFile url={attachments[slideIndex].url} />
              </div>
            ) : isAudio(attachments[slideIndex]) ? (
              <div className="vw-slides-audiocard">
                <Icon name="audiotrack" />
                <span>{attachments[slideIndex].name}</span>
                <audio controls autoPlay src={attachments[slideIndex].url} />
              </div>
            ) : (
              <a
                className="vw-slides-filecard"
                href={attachments[slideIndex].url}
                target="_blank"
                rel="noreferrer"
              >
                <Icon name="description" />
                <span>{attachments[slideIndex].name}</span>
                <small>새 탭에서 열기 ↗</small>
              </a>
            )}
          </div>
          <button
            className="vw-slides-nav next"
            onClick={(e) => {
              e.stopPropagation();
              nextSlide();
            }}
            aria-label="다음"
          >
            <Icon name="chevron_right" />
          </button>
          <div className="vw-slides-dots" onClick={(e) => e.stopPropagation()}>
            {attachments.map((_, i) => (
              <button
                key={i}
                className={`vw-dot ${i === slideIndex ? "on" : ""}`}
                onClick={() => setSlideIndex(i)}
                aria-label={`${i + 1}번 파일`}
              />
            ))}
          </div>
        </div>
      )}

      {/* 인쇄 전용 영역 (화면에는 숨김, window.print() 시에만 출력) */}
      {attachments.length > 0 && (
        <div className="vw-print" aria-hidden="true">
          <div className="vw-print-head">
            <h1>{note.title || "(제목 없음)"}</h1>
            <span>첨부 {attachments.length}개</span>
          </div>
          {attachments.map((att, i) => (
            <div className="vw-print-item" key={att.url}>
              <div className="vw-print-no">
                파일 {i + 1} / {attachments.length} · {att.name}
              </div>
              {isImage(att) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={att.url} alt={att.name} />
              ) : (
                <div className="vw-print-file">{att.url}</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
