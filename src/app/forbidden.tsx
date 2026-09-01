import Link from "next/link";

export default function ForbiddenPage() {
  return <section style={{ padding: "3rem 1rem", textAlign: "center" }}>
    <h1>접근 권한이 없습니다</h1>
    <p>이 페이지는 Community 신고 검수 권한이 있는 운영자만 볼 수 있습니다.</p>
    <Link href="/">홈으로 돌아가기</Link>
  </section>;
}
