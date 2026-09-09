"use client";

import { useState } from "react";
import styles from "./EntityDetailPage.module.css";

export type SkillLevelView = Readonly<{ description: string | null; id: string; label: string; metadata: Readonly<Record<string, string>>; order: number }>;

export function SkillLevelViewer({ levels }: Readonly<{ levels: readonly SkillLevelView[] }>) {
  const [selectedId, setSelectedId] = useState(levels[0]?.id ?? "");
  const selected = levels.find((level) => level.id === selectedId) ?? levels[0];
  if (!selected) return null;
  const metadata = Object.entries(selected.metadata);

  return <section className={styles.levelSection} aria-labelledby="skill-level-title">
    <h2 id="skill-level-title">강화 정보</h2>
    {levels.length > 1 ? <div className={styles.levelTabs} role="tablist" aria-label="강화 단계">{levels.map((level) => <button key={level.id} type="button" role="tab" aria-selected={level.id === selected.id} className={level.id === selected.id ? styles.activeLevel : undefined} onClick={() => setSelectedId(level.id)}>{level.label}</button>)}</div> : null}
    <div className={styles.levelPanel} role="tabpanel"><h3>{selected.label}</h3>{metadata.length ? <dl>{metadata.map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{value}</dd></div>)}</dl> : null}{selected.description ? <p>{selected.description}</p> : null}</div>
  </section>;
}
