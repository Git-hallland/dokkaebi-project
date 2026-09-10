"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import type { SiteSettings } from "@/lib/site-settings";
import styles from "./SiteSettingsForm.module.css";

const options = [
  { key: "guideWriteEnabled", label: "공략게시판 글쓰기", description: "OFF 시 일반 사용자의 신규 공략 작성 기능을 비활성화합니다." },
  { key: "rightAdEnabled", label: "우측 광고 배너", description: "OFF 시 사이트 우측 광고 영역을 표시하지 않습니다." },
  { key: "footerAdEnabled", label: "푸터 광고 배너", description: "OFF 시 페이지 하단 광고 배너를 표시하지 않습니다." },
  { key: "footerStickyAdEnabled", label: "푸터 접이식 광고", description: "OFF 시 화면 하단 접이식 광고를 표시하지 않습니다." },
] as const;

export function SiteSettingsForm({ initialSettings }: Readonly<{ initialSettings: SiteSettings }>) {
  const router = useRouter();
  const [settings, setSettings] = useState(initialSettings);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: "error" | "success"; message: string } | null>(null);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setFeedback(null);
    try {
      const response = await fetch("/api/admin/site-settings", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(settings),
      });
      const result = await response.json() as SiteSettings & { message?: string };
      if (!response.ok) throw new Error(result.message ?? "설정을 저장하지 못했습니다.");
      setSettings(result);
      setFeedback({ kind: "success", message: "사이트 운영 설정을 저장했습니다." });
      router.refresh();
    } catch (error) {
      setFeedback({ kind: "error", message: error instanceof Error ? error.message : "설정을 저장하지 못했습니다." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={save}>
      <div className={styles.options}>
        {options.map((option) => {
          const enabled = settings[option.key];
          return (
            <div className={styles.option} key={option.key}>
              <div>
                <strong>{option.label}</strong>
                <p>{option.description}</p>
              </div>
              <button
                className={styles.switch}
                type="button"
                role="switch"
                aria-checked={enabled}
                aria-label={`${option.label} ${enabled ? "켜짐" : "꺼짐"}`}
                disabled={saving}
                onClick={() => setSettings((current) => ({ ...current, [option.key]: !current[option.key] }))}
              >
                <span aria-hidden="true" />
                <b>{enabled ? "ON" : "OFF"}</b>
              </button>
            </div>
          );
        })}
      </div>
      <div className={styles.actions}>
        <button className={styles.save} type="submit" disabled={saving}>{saving ? "저장 중…" : "설정 저장"}</button>
        {feedback ? <p className={feedback.kind === "error" ? styles.error : styles.success} role={feedback.kind === "error" ? "alert" : "status"}>{feedback.message}</p> : null}
      </div>
    </form>
  );
}
