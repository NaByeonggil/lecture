import "./globals.css";

export const metadata = {
  title: "렉처 아카이브 (Lecture Archive)",
  description: "강의 노트 아카이빙 앱 프로토타입 — Stitch 디자인 시안",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
