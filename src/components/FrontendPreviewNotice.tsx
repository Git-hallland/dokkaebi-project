import styles from "./FrontendPreviewNotice.module.css";

type Props = Readonly<{
  description: string;
  heading: string;
  level?: 1 | 2;
}>;

export function FrontendPreviewNotice({ description, heading, level = 1 }: Props) {
  const Heading = level === 1 ? "h1" : "h2";
  return (
    <section className={styles.notice} aria-labelledby="frontend-preview-heading">
      <span className={styles.label}>Frontend Preview</span>
      <Heading id="frontend-preview-heading">{heading}</Heading>
      <p>{description}</p>
    </section>
  );
}
