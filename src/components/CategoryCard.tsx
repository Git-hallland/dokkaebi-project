import { CategoryIcon } from "./CategoryIcon";
import styles from "./CategoryCard.module.css";

type CategoryCardProps = Readonly<{
  title: string;
  description: string;
}>;

export function CategoryCard({ title, description }: CategoryCardProps) {
  return (
    <article className={styles.card}>
      <CategoryIcon className={styles.icon} title={title} />
      <h3>{title}</h3>
      <p>{description}</p>
    </article>
  );
}
