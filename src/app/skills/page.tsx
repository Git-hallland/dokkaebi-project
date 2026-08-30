import type { Metadata } from "next";

import { BoardPage } from "@/components/BoardPage/BoardPage";
import { getBoardCategory } from "@/lib/board-categories";

const category = getBoardCategory("skills");

export const metadata: Metadata = {
  title: `${category.title} | 도깨비의세계 비공식 위키`,
  description: category.description,
};

export default function SkillsPage() {
  return <BoardPage category={category} />;
}
