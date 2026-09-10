import type { Metadata } from "next";

import { EntityBoardPage } from "@/components/EntityBoardPage";
import { getBoardCategory } from "@/lib/board-categories";

const category = getBoardCategory("items");

export const metadata: Metadata = {
  title: `${category.title} | 도깨비의세계 비공식 위키`,
  description: category.description,
};

export default function ItemsPage() {
  return <EntityBoardPage category={category} />;
}
