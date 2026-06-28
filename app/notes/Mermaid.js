"use client";

import { useEffect, useId, useRef, useState } from "react";

// mermaid 코드를 SVG 도해로 렌더링한다.
// 브라우저 DOM이 필요하므로 client 전용 + 동적 import (SSR 빌드 안전).
export default function Mermaid({ code }) {
  // mermaid render id 는 영숫자만 허용 → useId의 콜론 등 제거
  const rid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const ref = useRef(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    let cancelled = false;
    const src = (code || "").trim();
    if (!src) {
      if (ref.current) ref.current.innerHTML = "";
      setErr("");
      return;
    }
    (async () => {
      try {
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({
          startOnLoad: false,
          theme: "default",
          securityLevel: "strict",
        });
        const { svg } = await mermaid.render(`mmd-${rid}`, src);
        if (!cancelled && ref.current) ref.current.innerHTML = svg;
        if (!cancelled) setErr("");
      } catch (e) {
        if (!cancelled) {
          if (ref.current) ref.current.innerHTML = "";
          setErr(String(e?.message || e));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [code, rid]);

  if (err)
    return (
      <pre className="mmd-err">
        {"⚠ 도해 문법 오류\n"}
        {err}
      </pre>
    );
  return <div className="mmd" ref={ref} />;
}
