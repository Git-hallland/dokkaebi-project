import styles from "./CategoryCard.module.css";

type CategoryCardProps = Readonly<{
  title: string;
  description: string;
}>;

export function CategoryCard({ title, description }: CategoryCardProps) {
  return (
    <article className={styles.card}>
      <h3>{title}</h3>
      <p>{description}</p>
    </article>
  );
}
