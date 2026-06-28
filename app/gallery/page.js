const screens = [
  {
    step: "01",
    title: "홈 대시보드",
    sub: "오늘의 학습 · 최근 노트 · 주제 바로가기",
    file: "home-dashboard.html",
  },
  {
    step: "02",
    title: "강의 목록",
    sub: "검색 / 필터 강화",
    file: "lecture-list.html",
  },
  {
    step: "03",
    title: "강의 상세 정보",
    sub: "지식 연결 강화",
    file: "lecture-detail.html",
  },
  {
    step: "04",
    title: "노트 작성 / 편집",
    sub: "실제 저장 동작 · Postgres",
    file: "note-edit.html",
    href: "/notes/new",
    live: true,
  },
  {
    step: "05",
    title: "주제별 허브",
    sub: "지식 누적 강화",
    file: "topic-hub.html",
  },
];

export const metadata = { title: "화면 갤러리 · 렉처 아카이브" };

export default function Gallery() {
  return (
    <main className="wrap">
      <section className="hero">
        <span className="eyebrow">Stitch Prototype</span>
        <h1>렉처 아카이브 (Lecture Archive)</h1>
        <p>
          강의 노트를 누적·연결해 지식으로 만드는 학습 아카이빙 앱.
          아래 5개 화면은 디자인 시안이며, 하단 탭과 + 버튼으로 화면 간 이동이
          가능합니다. <b>노트 작성은 Postgres에 실제로 저장</b>됩니다.
        </p>
        <div className="cta">
          <a className="cta-primary" href="/">앱 실행 (전체 화면) →</a>
          <a className="cta-secondary" href="/notes">저장된 노트 보기 →</a>
        </div>
      </section>

      <section className="grid">
        {screens.map((s) => (
          <div className="card" key={s.file}>
            <div className="phone">
              <div className="notch" />
              <iframe
                src={`/screens/${s.file}`}
                title={s.title}
                loading="lazy"
              />
            </div>
            <div className="meta">
              <div className="step">
                SCREEN {s.step} {s.live && <span className="live">● LIVE</span>}
              </div>
              <h2>{s.title}</h2>
              <p className="sub">{s.sub}</p>
              <a
                className="open"
                href={s.href ?? `/screens/${s.file}`}
                target={s.href ? "_self" : "_blank"}
                rel="noreferrer"
              >
                {s.href ? "실제 에디터 열기 →" : "전체화면으로 열기 ↗"}
              </a>
            </div>
          </div>
        ))}
      </section>

      <footer>
        © 2026 Lecture Archive · Built with Next.js · Deployed on Vercel
      </footer>
    </main>
  );
}
