import Link from "next/link";
import { connection } from "next/server";
import type { BoardCategory } from "@/lib/board-categories";
import type { CmsBoardType } from "@/lib/admin-content";
import { getPublishedBoardContents } from "@/lib/editorial-content";
import { CMS_ITEM_CATEGORIES, CMS_SKILL_CATEGORIES } from "@/lib/cms-entity";
import { EntityCardGrid } from "@/components/EntityCardGrid";
import styles from "./EntityBoardPage.module.css";

export async function EntityBoardPage({ category }: Readonly<{ category: BoardCategory }>) {
  await connection();
  const type = category.key as CmsBoardType;
  const contents = await getPublishedBoardContents(type);
  const suggested: readonly string[] = type === "skills"
    ? CMS_SKILL_CATEGORIES
    : type === "items"
      ? CMS_ITEM_CATEGORIES
      : [];
  const categories = [...suggested, ...contents.map((content) => content.entityCategory || "미분류").filter((value) => !suggested.includes(value as never))];
  const uniqueCategories = [...new Set(categories)];

  return <div className={styles.page}>
    <nav className={styles.breadcrumbs} aria-label="현재 위치"><Link href="/">홈</Link><span aria-hidden="true">/</span><span aria-current="page">{category.title}</span></nav>
    <header className={styles.intro}><p className={styles.eyebrow}>게임 정보 도감</p><h1>{category.title}</h1><p>{category.description}</p></header>
    <EntityCardGrid
      boardKey={type}
      categories={uniqueCategories}
      contents={contents.map((content) => ({ detailStatus: content.detailStatus === "UNRELEASED" ? "UNRELEASED" : "PUBLISHED", entityCategory: content.entityCategory, iconImageUrl: content.iconImageUrl, id: content.id, slug: content.slug as string, summary: content.summary, title: content.title }))}
      searchPlaceholder={type === "skills" ? "도술 이름으로 검색" : "아이템 이름으로 검색"}
    />
  </div>;
}
