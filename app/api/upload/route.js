import { handleUpload } from "@vercel/blob/client";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/upload  (Vercel Blob 클라이언트 업로드 토큰 교환)
// 브라우저가 Blob 저장소로 직접 업로드하므로 서버리스 4.5MB 본문 한도를 우회한다.
// 1) 업로드 직전: 브라우저가 토큰을 요청 → onBeforeGenerateToken 에서 발급
// 2) 업로드 완료: Blob 이 콜백 → onUploadCompleted
export async function POST(request) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      { error: "Blob 저장소가 연결되지 않았습니다 (BLOB_READ_WRITE_TOKEN 없음)." },
      { status: 500 }
    );
  }

  const body = await request.json();

  try {
    const json = await handleUpload({
      request,
      body,
      onBeforeGenerateToken: async (pathname) => ({
        // 허용 타입은 따로 제한하지 않음(강의 자료: pdf/이미지/문서 등 다양)
        addRandomSuffix: true,
        maximumSizeInBytes: 500 * 1024 * 1024, // 500MB 상한
        tokenPayload: JSON.stringify({ pathname }),
      }),
      onUploadCompleted: async () => {
        // 별도 후처리 없음. (DB 저장은 노트 저장 시 attachments 로 처리)
      },
    });

    return NextResponse.json(json);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
