import Link from "next/link";

import styles from "../community.module.css";

export default function CommunityWriteForbidden() {
  return (
    <div className={styles.empty}>
      <h1>공략 작성이 비활성화되어 있습니다</h1>
      <p>공략 작성은 정식 오픈 후 이용할 수 있습니다.</p>
      <Link className={styles.write} href="/community">공략게시판으로 돌아가기</Link>
    </div>
  );
}
