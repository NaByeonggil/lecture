// /notes/* 전체에 Material Symbols 아이콘 폰트 로드 (에디터 서식 툴바/버튼용)
export default function NotesLayout({ children }) {
  return (
    <>
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
      />
      {children}
    </>
  );
}
