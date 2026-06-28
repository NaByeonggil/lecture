"use client";

import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// 첨부된 .md 파일(Blob URL)을 받아 텍스트를 가져와 렌더링한다.
export default function MarkdownFile({ url }) {
  const [text, setText] = useState("");
  const [state, setState] = useState("loading"); // loading | ok | error

  useEffect(() => {
    let cancelled = false;
    setState("loading");
    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.text();
      })
      .then((t) => {
        if (cancelled) return;
        setText(t);
        setState("ok");
      })
      .catch(() => {
        if (!cancelled) setState("error");
      });
    return () => {
      cancelled = true;
    };
  }, [url]);

  if (state === "loading")
    return <div className="mdfile-status">마크다운 불러오는 중…</div>;
  if (state === "error")
    return <div className="mdfile-status err">마크다운을 불러오지 못했습니다.</div>;

  return (
    <div className="mdfile markdown-body">
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
        {text}
      </ReactMarkdown>
    </div>
  );
}
