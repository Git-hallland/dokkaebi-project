import type { Metadata } from "next";
import Link from "next/link";

import { prisma } from "@/lib/prisma";
import { normalizeSearchQuery, SearchQueryError, searchSite } from "@/lib/site-search";

import styles from "./search.module.css";

export const metadata: Metadata = {
  robots: { follow: true, index: false },
  title: "통합 검색",
};

export default async function SearchPage({ searchParams }: Readonly<{ searchParams: Promise<{ q?: string }> }>) {
  const { q } = await searchParams;
  let query = "";
  let results = [] as Awaited<ReturnType<typeof searchSite>>;
  let errorMessage: string | null = null;

  try {
    query = normalizeSearchQuery(q);
    results = await searchSite(prisma, query);
  } catch (error) {
    errorMessage = error instanceof SearchQueryError
      ? error.message
      : "현재 검색할 수 없습니다. 잠시 후 다시 시도해 주세요.";
  }

  return (
    <section className={styles.page} aria-labelledby="search-title">
      <p className={styles.eyebrow}>위키 전체 검색</p>
      <h1 id="search-title">{query ? `“${query}” 검색 결과` : "통합 검색"}</h1>
      {errorMessage ? <p className={styles.status} role="alert">{errorMessage}</p> : null}
      {!query && !errorMessage ? <p className={styles.status}>헤더 검색창에 찾고 싶은 정보를 입력해 주세요.</p> : null}
      {query && !errorMessage ? <p className={styles.count}>총 {results.length}개 결과</p> : null}
      {query && results.length === 0 && !errorMessage ? <p className={styles.status}>검색 결과가 없습니다.</p> : null}
      {results.length > 0 ? (
        <ul className={styles.results}>
          {results.map((result) => (
            <li key={`${result.type}-${result.id}`}>
              <Link href={result.href}>
                <span className={styles.badge}>{result.typeLabel}</span>
                <strong>{result.title}</strong>
                {result.description ? <p>{result.description}</p> : null}
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
