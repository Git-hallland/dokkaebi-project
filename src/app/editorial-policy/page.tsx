import type { Metadata } from "next";
import Link from "next/link";

import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "위키 운영 원칙 | 도깨비의세계 비공식 위키",
  description: "도깨비의세계 비공식 위키가 정보를 확인하고 수정하는 공개 운영 원칙입니다.",
};

const principles = [
  {
    title: "공식 출처 우선",
    description: "공식 발표, 공식 공지와 직접 확인 가능한 자료를 우선해 정보를 정리합니다.",
  },
  {
    title: "사실과 해석 구분",
    description: "확인되지 않은 추측이나 유출 정보를 사실처럼 게시하지 않습니다.",
  },
  {
    title: "출처와 확인 시점 표시",
    description: "핵심 정보에는 근거가 된 출처와 확인 날짜를 함께 남기는 것을 원칙으로 합니다.",
  },
  {
    title: "수정과 검토",
    description: "정보가 바뀌거나 오류가 확인되면 근거를 다시 확인하고 수정·검토 이력을 보존합니다.",
  },
] as const;

export default function EditorialPolicyPage() {
  return (
    <article className={styles.page}>
      <nav className={styles.breadcrumbs} aria-label="현재 위치">
        <Link href="/">홈</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">위키 운영 원칙</span>
      </nav>

      <header className={styles.intro}>
        <p className={styles.eyebrow}>비공식 팬 위키</p>
        <h1>위키 운영 원칙</h1>
        <p>
          이 사이트는 카카오게임즈·슈퍼캣의 공식 서비스가 아닙니다. 이용자가 정보의 근거와
          최신성을 판단할 수 있도록 다음 원칙에 따라 운영합니다.
        </p>
      </header>

      <section className={styles.principles} aria-labelledby="principles-title">
        <h2 id="principles-title">정보를 다루는 기준</h2>
        <ul>
          {principles.map((principle) => (
            <li key={principle.title}>
              <h3>{principle.title}</h3>
              <p>{principle.description}</p>
            </li>
          ))}
        </ul>
      </section>
    </article>
  );
}
