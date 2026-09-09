"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { CmsBoardType } from "@/lib/admin-content";
import { filterEntityContents } from "@/lib/cms-entity";
import { CMS_DETAIL_STATUS_LABELS, type CmsDetailStatus } from "@/lib/cms-entity";
import styles from "./EntityBoardPage.module.css";

type EntityListItem = Readonly<{ detailStatus: CmsDetailStatus; entityCategory: string | null; iconImageUrl: string | null; id: string; slug: string; summary: string | null; title: string }>;

export function EntityCardGrid({ boardKey, categories, contents, searchPlaceholder }: Readonly<{ boardKey: CmsBoardType; categories: readonly string[]; contents: readonly EntityListItem[]; searchPlaceholder: string }>) {
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("전체");
  const filtered = useMemo(() => filterEntityContents(contents, query, selectedCategory), [contents, query, selectedCategory]);

  return <section className={styles.catalog} aria-labelledby={`${boardKey}-catalog-title`}>
    <h2 id={`${boardKey}-catalog-title`} className="sr-only">{boardKey === "skills" ? "도술 도감" : "아이템 도감"}</h2>
    <label className={styles.search}><span className="sr-only">{searchPlaceholder}</span><input type="search" value={query} placeholder={searchPlaceholder} onChange={(event) => setQuery(event.target.value)} /></label>
    <div className={styles.filters} aria-label="카테고리 필터">
      {["전체", ...categories].map((category) => <button key={category} type="button" className={selectedCategory === category ? styles.activeFilter : undefined} aria-pressed={selectedCategory === category} onClick={() => setSelectedCategory(category)}>{category}</button>)}
    </div>
    <div className={styles.resultHeading}><strong>{filtered.length}개 항목</strong><span>제목·요약·분류를 함께 검색합니다.</span></div>
    {filtered.length ? <ul className={styles.grid}>{filtered.map((content) => <li key={content.id}><Link href={`/${boardKey}/${encodeURIComponent(content.slug)}`}>
      {content.iconImageUrl ? <Image className={styles.icon} src={content.iconImageUrl} alt="" width={80} height={80} unoptimized /> : <span className={styles.placeholder} aria-hidden="true">{content.title.trim().slice(0, 1) || "?"}</span>}
      <span className={styles.cardContent}><strong>{content.title}</strong><span className={styles.badges}><span className={styles.badge}>{content.entityCategory || "미분류"}</span><span className={`${styles.statusBadge} ${content.detailStatus === "UNRELEASED" ? styles.unreleased : styles.published}`}>{CMS_DETAIL_STATUS_LABELS[content.detailStatus]}</span></span><span className={styles.summary}>{content.detailStatus === "UNRELEASED" ? "정보 미공개" : content.summary || "요약 정보가 준비되지 않았습니다."}</span></span>
    </Link></li>)}</ul> : <div className={styles.empty} role="status"><strong>조건에 맞는 항목이 없습니다.</strong><p>검색어나 카테고리 필터를 바꿔 보세요.</p></div>}
  </section>;
}
