"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { upload } from "@vercel/blob/client";
import Mermaid from "./Mermaid";
import MarkdownFile from "./MarkdownFile";
import "./editor.css";

function todayStr() {
  // 로컬 기준 YYYY-MM-DD
  const d = new Date();
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().split("T")[0];
}

export default function NoteEditor({ initial }) {
  const router = useRouter();
  const editing = Boolean(initial?.id);

  const [title, setTitle] = useState(initial?.title ?? "");
  const [noteDate, setNoteDate] = useState(
    initial?.note_date ? String(initial.note_date).split("T")[0] : todayStr()
  );
  const [lectureId, setLectureId] = useState(
    initial?.lecture_id != null ? String(initial.lecture_id) : ""
  );
  const [subject, setSubject] = useState(initial?.subject ?? "");
  const [topic, setTopic] = useState(initial?.topic ?? "");
  const [summary, setSummary] = useState(initial?.summary ?? "");
  const [content, setContent] = useState(initial?.content ?? "");
  const [tags, setTags] = useState(
    Array.isArray(initial?.tags) ? initial.tags : []
  );
  const [tagDraft, setTagDraft] = useState("");

  // 도해(mermaid) — [{ title, code }]
  const [diagrams, setDiagrams] = useState(
    Array.isArray(initial?.diagrams) ? initial.diagrams : []
  );
  function addDiagram() {
    setDiagrams((d) => [
      ...d,
      { title: "", code: "graph TD\n  A[시작] --> B[끝]" },
    ]);
  }
  function updateDiagram(i, patch) {
    setDiagrams((d) => d.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  }
  function removeDiagram(i) {
    setDiagrams((d) => d.filter((_, j) => j !== i));
  }

  const [lectures, setLectures] = useState([]);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null); // {type, msg}

  // 첨부/이미지 업로드
  const [attachments, setAttachments] = useState(
    Array.isArray(initial?.attachments) ? initial.attachments : []
  );
  const [uploading, setUploading] = useState(false);
  const imageInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const audioInputRef = useRef(null);

  // 첨부 슬라이드 뷰어
  const [slideIndex, setSlideIndex] = useState(null); // null=닫힘
  const [jumpDraft, setJumpDraft] = useState("");

  useEffect(() => {
    let alive = true;
    fetch("/api/lectures")
      .then((r) => r.json())
      .then((d) => alive && d.lectures && setLectures(d.lectures))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  function onPickLecture(e) {
    const val = e.target.value;
    setLectureId(val);
    if (val) {
      const lec = lectures.find((l) => String(l.id) === val);
      if (lec && !subject.trim()) setSubject(lec.subject);
    }
  }

  function addTag() {
    const t = tagDraft.trim().replace(/^#/, "");
    if (t && !tags.includes(t)) setTags([...tags, t]);
    setTagDraft("");
  }
  function onTagKey(e) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag();
    } else if (e.key === "Backspace" && !tagDraft && tags.length) {
      setTags(tags.slice(0, -1));
    }
  }
  function removeTag(t) {
    setTags(tags.filter((x) => x !== t));
  }

  // --- 첨부/이미지 업로드 (Vercel Blob 클라이언트 직접 업로드) ---
  // 브라우저 → Blob 으로 바로 올려 서버리스 4.5MB 본문 한도를 우회한다.
  async function uploadFile(file, kind = "file") {
    if (!file) return;
    setUploading(true);
    setToast(null);
    try {
      const safe = (file.name || "upload").replace(/[^\w.\-가-힣]+/g, "_");
      const blob = await upload(`notes/${safe}`, file, {
        access: "public",
        handleUploadUrl: "/api/upload",
        contentType: file.type || undefined,
        // 4.5MB 초과 파일은 멀티파트로 안전하게 전송
        multipart: file.size > 4_400_000,
      });

      const att = {
        url: blob.url,
        name: file.name || "upload",
        contentType: file.type || "",
      };
      setAttachments((a) => [...a, att]);

      // 본문에 마크다운으로 삽입
      const label =
        kind === "image" ? "이미지" : kind === "audio" ? "음성" : "파일";
      const md =
        kind === "image"
          ? `\n![${att.name}](${att.url})\n`
          : kind === "audio"
          ? `\n[🎧 ${att.name}](${att.url})\n`
          : `\n[📎 ${att.name}](${att.url})\n`;
      setContent((c) => (c || "") + md);

      setToast({ type: "ok", msg: `${label} 업로드 완료 ✓` });
    } catch (e) {
      setToast({ type: "err", msg: e.message });
    } finally {
      setUploading(false);
    }
  }

  function removeAttachment(url) {
    setAttachments((a) => a.filter((x) => x.url !== url));
  }

  function isImage(att) {
    return (att.contentType || "").startsWith("image/");
  }
  function isAudio(att) {
    if ((att.contentType || "").startsWith("audio/")) return true;
    return /\.(m4a|mp3|wav|aac|ogg|oga|flac)$/i.test(att.name || "");
  }
  function isMarkdown(att) {
    if ((att.contentType || "").includes("markdown")) return true;
    return /\.(md|markdown|mdown|mkd)$/i.test(att.name || "");
  }

  // --- 슬라이드 뷰어 ---
  function openSlide(i) {
    if (!attachments.length) return;
    const n = ((i % attachments.length) + attachments.length) % attachments.length;
    setSlideIndex(n);
  }
  function closeSlide() {
    setSlideIndex(null);
  }
  function nextSlide() {
    setSlideIndex((i) => (i + 1) % attachments.length);
  }
  function prevSlide() {
    setSlideIndex((i) => (i - 1 + attachments.length) % attachments.length);
  }
  function jumpToFile() {
    const num = parseInt(jumpDraft, 10);
    if (!Number.isInteger(num) || num < 1 || num > attachments.length) {
      setToast({ type: "err", msg: `1 ~ ${attachments.length} 사이 번호를 입력하세요.` });
      return;
    }
    setSlideIndex(num - 1); // 파일 번호는 1부터
  }

  // 슬라이드 열렸을 때 키보드 조작
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

  const canSave = (title.trim() || content.trim() || summary.trim()) && !saving;

  async function save(status) {
    if (!canSave) return;
    setSaving(true);
    setToast(null);
    try {
      const url = editing ? `/api/notes/${initial.id}` : "/api/notes";
      const method = editing ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          subject,
          content,
          summary,
          topic,
          note_date: noteDate || null,
          lecture_id: lectureId || null,
          tags,
          status,
          attachments,
          diagrams,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "저장에 실패했습니다.");
      setToast({
        type: "ok",
        msg: status === "final" ? "최종 저장되었습니다 ✓" : "보충본으로 저장되었습니다 ✓",
      });
      setTimeout(
        () => router.push(editing ? `/notes/${initial.id}` : "/notes"),
        700
      );
    } catch (e) {
      setToast({ type: "err", msg: e.message });
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!editing) return;
    if (!confirm("이 노트를 삭제할까요?")) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/notes/${initial.id}`, { method: "DELETE" });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "삭제 실패");
      }
      router.push("/notes");
    } catch (e) {
      setToast({ type: "err", msg: e.message });
      setSaving(false);
    }
  }

  const Icon = ({ name, fill }) => (
    <span
      className="material-symbols-outlined"
      style={fill ? { fontVariationSettings: "'FILL' 1" } : undefined}
    >
      {name}
    </span>
  );

  return (
    <div className="ed">
      {/* 상단 앱바 */}
      <header className="ed-top">
        <div className="left">
          <button
            className="ed-iconbtn"
            onClick={() => router.push(editing ? `/notes/${initial.id}` : "/notes")}
            aria-label="닫기"
          >
            <Icon name="close" />
          </button>
          <h1 className="ed-brand">스터디 아카이브</h1>
        </div>
        <div className="right">
          <span className="ed-status">{editing ? "편집 중" : "새 노트"}</span>
          <div className="ed-avatar">JD</div>
        </div>
      </header>

      <main className="ed-main">
        {/* 제목 카드 */}
        <section className="ed-titlecard">
          <label className="ed-label" htmlFor="t">
            노트 제목
          </label>
          <input
            id="t"
            className="ed-title-input"
            placeholder="강의 제목을 입력하세요"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </section>

        {/* 메타데이터 (날짜 / 강의 연결 / 주제) */}
        <div className="ed-meta">
          <div className="ed-field">
            <label className="ed-label" htmlFor="d">
              날짜
            </label>
            <input
              id="d"
              type="date"
              value={noteDate}
              onChange={(e) => setNoteDate(e.target.value)}
            />
          </div>
          <div className="ed-field">
            <label className="ed-label" htmlFor="lec">
              강의 연결
            </label>
            <div className="ed-select-wrap">
              <select id="lec" value={lectureId} onChange={onPickLecture}>
                <option value="">연결 안 함</option>
                {lectures.map((l) => (
                  <option key={l.id} value={l.id}>
                    [{l.subject}] {l.title}
                  </option>
                ))}
              </select>
              <Icon name="expand_more" />
            </div>
          </div>
          <div className="ed-field">
            <label className="ed-label" htmlFor="tp">
              주제
            </label>
            <input
              id="tp"
              placeholder="예: 미분과 적분"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
            />
          </div>
        </div>

        {/* 요약 */}
        <div className="ed-field">
          <label className="ed-label" htmlFor="sm">
            요약 (Summary)
          </label>
          <textarea
            id="sm"
            rows={3}
            placeholder="강의의 핵심 내용을 간단히 요약하세요..."
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
          />
        </div>

        {/* 상세 내용 */}
        <div>
          <label className="ed-label" htmlFor="ct">
            상세 내용 (Detailed Notes)
          </label>
          <div className="ed-rich">
            <div className="ed-toolbar">
              <button className="ed-tool" type="button" onClick={() => wrap("**")} title="굵게">
                <Icon name="format_bold" />
              </button>
              <button className="ed-tool" type="button" onClick={() => wrap("_")} title="기울임">
                <Icon name="format_italic" />
              </button>
              <button className="ed-tool" type="button" onClick={() => prefix("- ")} title="목록">
                <Icon name="format_list_bulleted" />
              </button>
              <span className="ed-divider" />
              <button
                className="ed-tool"
                type="button"
                title="파일 첨부"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
              >
                <Icon name="attach_file" />
              </button>
              <button
                className="ed-tool"
                type="button"
                title="이미지 업로드"
                disabled={uploading}
                onClick={() => imageInputRef.current?.click()}
              >
                <Icon name="image" />
              </button>
              <button
                className="ed-tool"
                type="button"
                title="음성 파일 첨부"
                disabled={uploading}
                onClick={() => audioInputRef.current?.click()}
              >
                <Icon name="mic" />
              </button>
              <button className="ed-tool" type="button" onClick={() => prefix("[링크](url) ")} title="링크">
                <Icon name="link" />
              </button>
              {uploading && <span className="ed-uploading">업로드 중…</span>}
              {/* 숨김 파일 입력 */}
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  uploadFile(f, "image");
                }}
              />
              <input
                ref={fileInputRef}
                type="file"
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  uploadFile(f, "file");
                }}
              />
              <input
                ref={audioInputRef}
                type="file"
                accept="audio/*"
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  uploadFile(f, "audio");
                }}
              />
            </div>
            <textarea
              id="ct"
              rows={14}
              placeholder="학습 내용을 상세히 기록하세요..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          </div>
        </div>

        {/* 첨부파일 미리보기 + 슬라이드 */}
        {attachments.length > 0 && (
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <label className="ed-label" style={{ marginBottom: 0 }}>
                첨부 ({attachments.length})
              </label>
              <div className="ed-jump">
                <span>파일 번호</span>
                <input
                  type="number"
                  min={1}
                  max={attachments.length}
                  value={jumpDraft}
                  onChange={(e) => setJumpDraft(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && jumpToFile()}
                  placeholder="1"
                />
                <button type="button" onClick={jumpToFile}>
                  <Icon name="slideshow" /> 슬라이드 보기
                </button>
              </div>
            </div>
            <div className="ed-attachments" style={{ marginTop: 10 }}>
              {attachments.map((att, i) => (
                <div className="ed-att" key={att.url}>
                  <span className="ed-att-no">{i + 1}</span>
                  {isAudio(att) ? (
                    <div className="ed-att-audio">
                      <span className="ed-att-audioname">
                        <Icon name="audiotrack" />
                        <span>{att.name}</span>
                      </span>
                      <audio controls preload="none" src={att.url} />
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="ed-att-open"
                      onClick={() => openSlide(i)}
                      title={`${i + 1}번 파일 슬라이드로 보기`}
                    >
                      {isImage(att) ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={att.url} alt={att.name} />
                      ) : (
                        <span className="ed-att-file">
                          <Icon name={isMarkdown(att) ? "article" : "description"} />
                          <span>{att.name}</span>
                        </span>
                      )}
                    </button>
                  )}
                  <button
                    type="button"
                    className="ed-att-remove"
                    onClick={() => removeAttachment(att.url)}
                    aria-label="첨부 삭제"
                  >
                    <Icon name="close" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 도해 (mermaid) */}
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
            }}
          >
            <label className="ed-label" style={{ marginBottom: 0 }}>
              도해 (Mermaid){diagrams.length ? ` · ${diagrams.length}` : ""}
            </label>
            <button type="button" className="ed-dia-add" onClick={addDiagram}>
              <Icon name="add" /> 도해 추가
            </button>
          </div>

          <div className="ed-dia-list">
            {diagrams.map((d, i) => (
              <div className="ed-dia" key={i}>
                <div className="ed-dia-head">
                  <input
                    className="ed-dia-title"
                    placeholder={`도해 ${i + 1} 제목 (선택)`}
                    value={d.title}
                    onChange={(e) => updateDiagram(i, { title: e.target.value })}
                  />
                  <button
                    type="button"
                    className="ed-att-remove"
                    onClick={() => removeDiagram(i)}
                    aria-label="도해 삭제"
                  >
                    <Icon name="close" />
                  </button>
                </div>
                <div className="ed-dia-body">
                  <textarea
                    className="ed-dia-code"
                    rows={8}
                    spellCheck={false}
                    placeholder={"graph TD\n  A[개념] --> B[예시]"}
                    value={d.code}
                    onChange={(e) => updateDiagram(i, { code: e.target.value })}
                  />
                  <div className="ed-dia-preview">
                    <Mermaid code={d.code} />
                  </div>
                </div>
              </div>
            ))}
            {diagrams.length === 0 && (
              <p className="ed-dia-empty">
                강의 흐름·관계도를 mermaid 문법으로 추가하세요. (예: <code>graph TD</code>,{" "}
                <code>flowchart LR</code>, <code>sequenceDiagram</code>)
              </p>
            )}
          </div>
        </div>

        {/* 태그 */}
        <div>
          <label className="ed-label">태그</label>
          <div className="ed-tags" onClick={(e) => e.currentTarget.querySelector("input")?.focus()}>
            {tags.map((t) => (
              <span className="ed-chip" key={t}>
                #{t}
                <button type="button" onClick={() => removeTag(t)} aria-label="태그 삭제">
                  <Icon name="close" />
                </button>
              </span>
            ))}
            <input
              className="ed-tag-input"
              placeholder="태그 입력 후 Enter..."
              value={tagDraft}
              onChange={(e) => setTagDraft(e.target.value)}
              onKeyDown={onTagKey}
              onBlur={addTag}
            />
          </div>
        </div>
      </main>

      {/* 하단 액션바 */}
      <div className="ed-actions">
        <div className="ed-actions-inner">
          {editing && (
            <button
              className="ed-btn supplement"
              type="button"
              onClick={remove}
              disabled={saving}
              style={{ flex: "0 0 auto", width: 56 }}
              aria-label="삭제"
            >
              <Icon name="delete" />
            </button>
          )}
          <button
            className="ed-btn supplement"
            type="button"
            onClick={() => save("supplement")}
            disabled={!canSave}
          >
            <Icon name="description" />
            보충본 저장
          </button>
          <button
            className="ed-btn final"
            type="button"
            onClick={() => save("final")}
            disabled={!canSave}
          >
            <Icon name="check_circle" fill />
            {saving ? "저장 중…" : "최종 저장"}
          </button>
        </div>
      </div>

      {/* 슬라이드 뷰어 오버레이 */}
      {slideIndex !== null && attachments[slideIndex] && (
        <div className="ed-slides" onClick={closeSlide}>
          <div className="ed-slides-top" onClick={(e) => e.stopPropagation()}>
            <span className="ed-slides-count">
              파일 {slideIndex + 1} / {attachments.length}
            </span>
            <span className="ed-slides-name">{attachments[slideIndex].name}</span>
            <button className="ed-slides-x" onClick={closeSlide} aria-label="닫기">
              <Icon name="close" />
            </button>
          </div>

          <button
            className="ed-slides-nav prev"
            onClick={(e) => {
              e.stopPropagation();
              prevSlide();
            }}
            aria-label="이전"
          >
            <Icon name="chevron_left" />
          </button>

          <div className="ed-slides-stage" onClick={(e) => e.stopPropagation()}>
            {isImage(attachments[slideIndex]) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={attachments[slideIndex].url} alt={attachments[slideIndex].name} />
            ) : isMarkdown(attachments[slideIndex]) ? (
              <div className="ed-slides-mdcard">
                <MarkdownFile url={attachments[slideIndex].url} />
              </div>
            ) : isAudio(attachments[slideIndex]) ? (
              <div className="ed-slides-audiocard">
                <Icon name="audiotrack" />
                <span>{attachments[slideIndex].name}</span>
                <audio controls autoPlay src={attachments[slideIndex].url} />
              </div>
            ) : (
              <a
                className="ed-slides-filecard"
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
            className="ed-slides-nav next"
            onClick={(e) => {
              e.stopPropagation();
              nextSlide();
            }}
            aria-label="다음"
          >
            <Icon name="chevron_right" />
          </button>

          <div className="ed-slides-dots" onClick={(e) => e.stopPropagation()}>
            {attachments.map((_, i) => (
              <button
                key={i}
                className={`ed-dot ${i === slideIndex ? "on" : ""}`}
                onClick={() => setSlideIndex(i)}
                aria-label={`${i + 1}번 파일`}
              />
            ))}
          </div>
        </div>
      )}

      {toast && <div className={`ed-toast ${toast.type}`}>{toast.msg}</div>}
    </div>
  );

  // --- 간단 서식 헬퍼 (마크다운 삽입) ---
  function wrap(mark) {
    setContent((c) => `${c}${mark}텍스트${mark}`);
  }
  function prefix(p) {
    setContent((c) => (c.endsWith("\n") || c === "" ? c : c + "\n") + p);
  }
}
