import Link from "next/link";

import { CategoryIcon } from "./CategoryIcon";
import styles from "./CategoryCard.module.css";

type CategoryCardProps = Readonly<{
  title: string;
  description: string;
  href?: string;
}>;

export function CategoryCard({ title, description, href }: CategoryCardProps) {
  const content = (
    <>
      <CategoryIcon className={styles.icon} title={title} />
      <h3>{title}</h3>
      <p>{description}</p>
    </>
  );

  if (href) {
    return (
      <Link className={`${styles.card} ${styles.linkCard}`} href={href}>
        {content}
      </Link>
    );
  }

  return <article className={styles.card}>{content}</article>;
}
