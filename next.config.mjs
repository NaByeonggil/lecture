/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return {
      // 파일/라우트보다 먼저 적용 — 도메인 루트로 들어오면 홈 대시보드를 전체화면으로 서빙
      beforeFiles: [
        { source: "/", destination: "/screens/home-dashboard.html" },
      ],
    };
  },
};

export default nextConfig;
