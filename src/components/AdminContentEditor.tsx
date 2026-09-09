"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import {
  CMS_CONTENT_STATUSES,
  CMS_SOURCE_TYPES,
  createCmsSlug,
  type CmsBoardType,
  type CmsContentStatus,
  type CmsSourceType,
} from "@/lib/admin-content";
import { CMS_BOARD_CONFIG } from "@/lib/cms-boards";
import { CMS_IMAGE_ACCEPT, createCmsImageMarkdown, createCmsLinkMarkdown, insertCmsBodyMarkup, normalizeCmsLinkUrl, validateCmsImageFile } from "@/lib/cms-content-format";
import { CmsContentBody } from "@/components/CmsContentBody";
import { CMS_EVENT_STATUSES, CMS_EVENT_STATUS_LABELS, type CmsEventStatus } from "@/lib/cms-event-status";
import { CMS_ITEM_CATEGORIES, CMS_SKILL_CATEGORIES } from "@/lib/cms-entity";
import { CMS_DETAIL_STATUSES, CMS_DETAIL_STATUS_LABELS, type CmsDetailStatus } from "@/lib/cms-entity";
import styles from "./AdminContentEditor.module.css";

type SourceRow = {
  checkedAt: string;
  key: string;
  publisher: string;
  sourceType: CmsSourceType;
  title: string;
  url: string;
};

type SkillMetadataRow = { key: string; name: string; value: string };
type SkillLevelRow = { description: string; id: string | null; key: string; label: string; metadata: SkillMetadataRow[] };

export type AdminContentEditorValue = Readonly<{
  body: string;
  coverImageUrl: string;
  iconImageUrl: string;
  entityCategory: string;
  detailStatus: CmsDetailStatus | null;
  entityMetadata: Readonly<Record<string, string>>;
  entitySortOrder: number | null;
  eventStatus: CmsEventStatus | null;
  id?: string;
  slug: string;
  sources: readonly Omit<SourceRow, "key">[];
  status: CmsContentStatus;
  skillLevels: readonly Readonly<{ description: string; id: string; label: string; metadata: Readonly<Record<string, string>>; order: number }>[];
  summary: string;
  title: string;
  type: CmsBoardType;
}>;

type ImageUploadSignature = Readonly<{ allowedFormats: string; apiKey: string; folder: string; overwrite: string; publicId: string; signature: string; timestamp: number; uploadPreset: string; uploadUrl: string }>;

async function uploadCmsImage(file: File) {
  await validateCmsImageFile(file);
  const signatureResponse = await fetch("/api/admin/content/images/signature", { method: "POST" });
  const signature = await signatureResponse.json().catch(() => null) as (ImageUploadSignature & { message?: string }) | null;
  if (!signatureResponse.ok || !signature) throw new Error(signature?.message ?? "이미지 업로드를 시작하지 못했습니다.");

  const form = new FormData();
  form.append("file", file);
  form.append("api_key", signature.apiKey);
  form.append("timestamp", String(signature.timestamp));
  form.append("signature", signature.signature);
  form.append("folder", signature.folder);
  form.append("overwrite", signature.overwrite);
  form.append("public_id", signature.publicId);
  form.append("allowed_formats", signature.allowedFormats);
  form.append("upload_preset", signature.uploadPreset);
  const uploadResponse = await fetch(signature.uploadUrl, { body: form, method: "POST" });
  const upload = await uploadResponse.json().catch(() => null) as Record<string, unknown> | null;
  if (!uploadResponse.ok || !upload) throw new Error("Cloudinary에 이미지를 업로드하지 못했습니다.");

  const verifyResponse = await fetch("/api/admin/content/images/verify", {
    body: JSON.stringify({ upload: { bytes: upload.bytes, format: upload.format, height: upload.height, publicId: upload.public_id, resourceType: upload.resource_type, secureUrl: upload.secure_url, signature: upload.signature, version: upload.version, width: upload.width } }),
    headers: { "content-type": "application/json" },
    method: "POST",
  });
  const verified = await verifyResponse.json().catch(() => null) as { message?: string; secureUrl?: string } | null;
  if (!verifyResponse.ok || !verified?.secureUrl) throw new Error(verified?.message ?? "업로드한 이미지를 검증하지 못했습니다.");
  return verified.secureUrl;
}

const statusLabels: Record<CmsContentStatus, string> = {
  ARCHIVED: "보관됨",
  DRAFT: "초안",
  PUBLISHED: "공개",
  REVIEW: "검수 대기",
};

const sourceTypeLabels: Record<CmsSourceType, string> = {
  notice: "공식 공지",
  official_page: "공식 페이지",
  press_release: "보도자료",
  video: "공식 영상",
  official_screenshot: "공식 화면 캡처",
};

function todayInSeoul() {
  const parts = new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Asia/Seoul",
    year: "numeric",
  }).formatToParts(new Date());
  const value = (type: "day" | "month" | "year") => parts.find((part) => part.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

function emptySource(index: number): SourceRow {
  return { checkedAt: todayInSeoul(), key: `new-${index}`, publisher: "", sourceType: "official_page", title: "", url: "" };
}

function emptySkillLevel(index: number): SkillLevelRow {
  return { description: "", id: null, key: `level-${index}`, label: "", metadata: [] };
}

export function AdminContentEditor({ initial }: Readonly<{ initial?: AdminContentEditorValue }>) {
  const router = useRouter();
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const coverFileRef = useRef<HTMLInputElement>(null);
  const iconFileRef = useRef<HTMLInputElement>(null);
  const bodyFileRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState(initial?.title ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(initial?.slug));
  const [type, setType] = useState<CmsBoardType>(initial?.type ?? "skills");
  const [status, setStatus] = useState<CmsContentStatus>(initial?.status ?? "DRAFT");
  const [summary, setSummary] = useState(initial?.summary ?? "");
  const [body, setBody] = useState(initial?.body ?? "");
  const [coverImageUrl, setCoverImageUrl] = useState(initial?.coverImageUrl ?? "");
  const [iconImageUrl, setIconImageUrl] = useState(initial?.iconImageUrl ?? "");
  const [entityCategory, setEntityCategory] = useState(initial?.entityCategory ?? "");
  const [detailStatus, setDetailStatus] = useState<CmsDetailStatus>(initial?.detailStatus ?? "PUBLISHED");
  const [entitySortOrder, setEntitySortOrder] = useState(initial?.entitySortOrder ? String(initial.entitySortOrder) : "");
  const [entityMetadata, setEntityMetadata] = useState<SkillMetadataRow[]>(Object.entries(initial?.entityMetadata ?? {}).map(([name, value], index) => ({ key: `entity-metadata-${index}`, name, value })));
  const [eventStatus, setEventStatus] = useState<CmsEventStatus>(initial?.eventStatus ?? "ONGOING");
  const [sources, setSources] = useState<SourceRow[]>(
    initial?.sources.length
      ? initial.sources.map((source, index) => ({ ...source, key: `saved-${index}` }))
      : [emptySource(0)],
  );
  const [skillLevels, setSkillLevels] = useState<SkillLevelRow[]>(
    initial?.skillLevels.map((level, levelIndex) => ({
      description: level.description,
      id: level.id,
      key: `saved-level-${levelIndex}`,
      label: level.label,
      metadata: Object.entries(level.metadata).map(([name, value], metadataIndex) => ({ key: `saved-metadata-${levelIndex}-${metadataIndex}`, name, value })),
    })) ?? [],
  );
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState<"body" | "cover" | "icon" | null>(null);
  const [message, setMessage] = useState("");
  const [showPreview, setShowPreview] = useState(false);

  const save = async (nextStatus = status) => {
    if (busy || uploading) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(initial?.id ? `/api/admin/content/${initial.id}` : "/api/admin/content", {
        method: initial?.id ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          body,
          coverImageUrl,
          detailStatus,
          entityCategory,
          entityMetadata: Object.fromEntries(entityMetadata.map((item) => [item.name, item.value])),
          entitySortOrder: entitySortOrder ? Number(entitySortOrder) : null,
          eventStatus,
          iconImageUrl,
          skillLevels: type === "skills" ? skillLevels.map((level, index) => ({ description: level.description, id: level.id, label: level.label, metadata: level.metadata.map((item) => ({ key: item.name, value: item.value })), order: index + 1 })) : [],
          slug,
          sources,
          status: nextStatus,
          summary,
          title,
          type,
        }),
      });
      const result = await response.json().catch(() => null) as { id?: string; message?: string } | null;
      if (!response.ok || !result?.id) throw new Error(result?.message ?? "콘텐츠를 저장하지 못했습니다.");
      setStatus(nextStatus);
      setMessage(nextStatus === "ARCHIVED" ? "콘텐츠를 보관 처리했습니다." : "콘텐츠를 저장했습니다.");
      if (!initial?.id) router.replace(`/admin/content/${result.id}?saved=1`);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "콘텐츠를 저장하지 못했습니다.");
    } finally {
      setBusy(false);
    }
  };

  const uploadCover = async (file: File) => {
    setUploading("cover");
    setMessage("대표 이미지 업로드 중…");
    try {
      setCoverImageUrl(await uploadCmsImage(file));
      setMessage("대표 이미지를 추가했습니다. 저장 버튼을 눌러 반영하세요.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "대표 이미지를 업로드하지 못했습니다.");
    } finally {
      setUploading(null);
    }
  };

  const uploadIcon = async (file: File) => {
    setUploading("icon");
    setMessage("아이콘 이미지 업로드 중…");
    try {
      setIconImageUrl(await uploadCmsImage(file));
      setMessage("아이콘 이미지를 추가했습니다. 저장 버튼을 눌러 반영하세요.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "아이콘 이미지를 업로드하지 못했습니다.");
    } finally {
      setUploading(null);
    }
  };

  const moveSkillLevel = (index: number, direction: -1 | 1) => {
    setSkillLevels((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const uploadBodyImage = async (file: File) => {
    const textarea = bodyRef.current;
    const selectionStart = textarea?.selectionStart ?? body.length;
    const selectionEnd = textarea?.selectionEnd ?? selectionStart;
    const selectedText = body.slice(selectionStart, selectionEnd).trim();
    setUploading("body");
    setMessage("본문 이미지 업로드 중…");
    try {
      const url = await uploadCmsImage(file);
      const alt = selectedText || file.name.replace(/\.[^.]+$/u, "");
      const marker = createCmsImageMarkdown(url, alt);
      const inserted = insertCmsBodyMarkup(body, selectionStart, selectionEnd, marker, true);
      setBody(inserted.body);
      requestAnimationFrame(() => { bodyRef.current?.focus(); bodyRef.current?.setSelectionRange(inserted.cursor, inserted.cursor); });
      setMessage("본문 이미지를 커서 위치에 추가했습니다. 저장 버튼을 눌러 반영하세요.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "본문 이미지를 업로드하지 못했습니다.");
    } finally {
      setUploading(null);
    }
  };

  const addLink = () => {
    const textarea = bodyRef.current;
    if (!textarea) return;
    const selectionStart = textarea.selectionStart;
    const selectionEnd = textarea.selectionEnd;
    const selectedText = body.slice(selectionStart, selectionEnd).trim();
    const enteredUrl = window.prompt("연결할 http 또는 https URL을 입력하세요.", "https://");
    if (enteredUrl === null) return;
    const url = normalizeCmsLinkUrl(enteredUrl.trim());
    if (!url) {
      setMessage("http 또는 https로 시작하는 올바른 URL을 입력해 주세요.");
      return;
    }
    const marker = createCmsLinkMarkdown(url, selectedText || url);
    const inserted = insertCmsBodyMarkup(body, selectionStart, selectionEnd, marker);
    setBody(inserted.body);
    setMessage(selectedText ? "선택한 텍스트에 링크를 추가했습니다." : "커서 위치에 링크를 추가했습니다.");
    requestAnimationFrame(() => { bodyRef.current?.focus(); bodyRef.current?.setSelectionRange(inserted.cursor, inserted.cursor); });
  };

  return (
    <div className={styles.editor}>
      <div className={styles.fields}>
        <label><span>게시판 종류</span><select value={type} onChange={(event) => setType(event.target.value as CmsBoardType)}>{CMS_BOARD_CONFIG.map((board) => <option key={board.key} value={board.key}>{board.label}</option>)}</select></label>
        <label><span>상태</span><select value={status} onChange={(event) => setStatus(event.target.value as CmsContentStatus)}>{CMS_CONTENT_STATUSES.map((value) => <option key={value} value={value}>{statusLabels[value]}</option>)}</select></label>
        {type === "events" ? <label><span>이벤트 상태</span><select value={eventStatus} onChange={(event) => setEventStatus(event.target.value as CmsEventStatus)}>{CMS_EVENT_STATUSES.map((value) => <option key={value} value={value}>{CMS_EVENT_STATUS_LABELS[value]}</option>)}</select></label> : null}
        <label className={styles.wide}><span>{type === "skills" ? "도술명" : type === "items" ? "아이템명" : "제목"}</span><input value={title} maxLength={120} onChange={(event) => { const value = event.target.value; setTitle(value); if (!slugTouched) setSlug(createCmsSlug(value)); }} /></label>
        <label className={styles.wide}><span>slug</span><input value={slug} maxLength={100} placeholder="제목에서 자동 생성되며 수정할 수 있습니다" onChange={(event) => { setSlugTouched(true); setSlug(createCmsSlug(event.target.value)); }} /></label>
        <label className={styles.wide}><span>요약</span><textarea value={summary} maxLength={300} rows={3} onChange={(event) => setSummary(event.target.value)} /></label>
        {type === "skills" || type === "items" ? <label><span>{type === "skills" ? "도술 분류" : "아이템 카테고리"}</span><input value={entityCategory} maxLength={80} list={`${type}-category-options`} placeholder={type === "skills" ? "예: 강타" : "예: 재료"} onChange={(event) => setEntityCategory(event.target.value)} /><datalist id={`${type}-category-options`}>{(type === "skills" ? CMS_SKILL_CATEGORIES : CMS_ITEM_CATEGORIES).map((category) => <option key={category} value={category} />)}</datalist></label> : null}
        {type === "skills" || type === "items" ? <><label><span>상세 공개 상태</span><select value={detailStatus} onChange={(event) => setDetailStatus(event.target.value as CmsDetailStatus)}>{CMS_DETAIL_STATUSES.map((value) => <option key={value} value={value}>{CMS_DETAIL_STATUS_LABELS[value]}</option>)}</select></label><label><span>도감 정렬 순서</span><input type="number" min="1" max="100000" value={entitySortOrder} placeholder="숫자가 작을수록 먼저 표시" onChange={(event) => setEntitySortOrder(event.target.value)} /></label></> : null}
        {type === "skills" || type === "items" ? <section className={`${styles.wide} ${styles.imageField}`} aria-labelledby="icon-image-title"><div><strong id="icon-image-title">아이콘 이미지</strong><p>도감 카드와 상세 제목 옆에 표시됩니다. 없어도 저장할 수 있습니다.</p></div>{iconImageUrl ? <div className={styles.iconPreview}><Image src={iconImageUrl} alt="아이콘 이미지 미리보기" width={128} height={128} unoptimized /><div><button type="button" disabled={Boolean(uploading)} onClick={() => iconFileRef.current?.click()}>아이콘 교체</button><button className={styles.remove} type="button" disabled={Boolean(uploading)} onClick={() => setIconImageUrl("")}>아이콘 삭제</button></div></div> : <button type="button" disabled={Boolean(uploading)} onClick={() => iconFileRef.current?.click()}>{uploading === "icon" ? "업로드 중…" : "아이콘 이미지 선택"}</button>}<input ref={iconFileRef} className={styles.hiddenInput} type="file" accept={CMS_IMAGE_ACCEPT} onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; if (file) void uploadIcon(file); }} /></section> : null}
        <section className={`${styles.wide} ${styles.imageField}`} aria-labelledby="cover-image-title"><div><strong id="cover-image-title">대표 이미지</strong><p>목록과 상세 페이지 상단에 표시됩니다. PNG, JPEG, WEBP · 최대 5MB</p></div>{coverImageUrl ? <div className={styles.coverPreview}><Image src={coverImageUrl} alt="대표 이미지 미리보기" width={960} height={540} unoptimized /><div><button type="button" disabled={Boolean(uploading)} onClick={() => coverFileRef.current?.click()}>이미지 교체</button><button className={styles.remove} type="button" disabled={Boolean(uploading)} onClick={() => setCoverImageUrl("")}>이미지 삭제</button></div></div> : <button type="button" disabled={Boolean(uploading)} onClick={() => coverFileRef.current?.click()}>{uploading === "cover" ? "업로드 중…" : "대표 이미지 선택"}</button>}<input ref={coverFileRef} className={styles.hiddenInput} type="file" accept={CMS_IMAGE_ACCEPT} onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; if (file) void uploadCover(file); }} /></section>
        <section className={`${styles.wide} ${styles.bodyField}`} aria-labelledby="cms-body-title"><strong id="cms-body-title">본문</strong><div className={styles.bodyTools}><button type="button" disabled={Boolean(uploading)} onClick={() => bodyFileRef.current?.click()}>{uploading === "body" ? "업로드 중…" : "+ 이미지 추가"}</button><button type="button" disabled={Boolean(uploading)} onClick={addLink}>+ 링크 추가</button><button type="button" aria-pressed={showPreview} onClick={() => setShowPreview((current) => !current)}>{showPreview ? "미리보기 닫기" : "미리보기"}</button><small>텍스트를 선택하면 이미지 설명이나 링크 문구로 사용합니다.</small></div><textarea aria-label="본문" ref={bodyRef} value={body} readOnly={Boolean(uploading)} maxLength={100000} rows={18} placeholder="일반 텍스트와 제한된 이미지·링크 문법을 지원합니다. 문단은 빈 줄로 구분하세요." onChange={(event) => setBody(event.target.value)} /><input ref={bodyFileRef} className={styles.hiddenInput} type="file" accept={CMS_IMAGE_ACCEPT} onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; if (file) void uploadBodyImage(file); }} />{showPreview ? <div className={styles.bodyPreview}><h3>본문 미리보기</h3><div><CmsContentBody body={body} imageClassName={styles.previewImage} /></div></div> : null}</section>
      </div>

      {type === "skills" || type === "items" ? <section className={styles.skillLevels} aria-labelledby="entity-metadata-title"><div className={styles.sectionHeading}><div><h2 id="entity-metadata-title">기본 정보</h2><p>화면에서 확인된 항목과 값만 입력하세요.</p></div><button type="button" onClick={() => setEntityMetadata((current) => [...current, { key: `entity-metadata-${Date.now()}`, name: "", value: "" }])}>+ 정보 항목 추가</button></div><div className={styles.metadataRows}>{entityMetadata.map((metadata) => <div key={metadata.key} className={styles.metadataRow}><input aria-label="기본 정보 이름" value={metadata.name} maxLength={40} placeholder="예: 사거리" onChange={(event) => setEntityMetadata((current) => current.map((item) => item.key === metadata.key ? { ...item, name: event.target.value } : item))} /><input aria-label="기본 정보 값" value={metadata.value} maxLength={200} placeholder="예: 7.5" onChange={(event) => setEntityMetadata((current) => current.map((item) => item.key === metadata.key ? { ...item, value: event.target.value } : item))} /><button className={styles.remove} type="button" onClick={() => setEntityMetadata((current) => current.filter((item) => item.key !== metadata.key))}>삭제</button></div>)}</div>{entityMetadata.length === 0 ? <p className={styles.emptyHint}>확인된 기본 정보가 없다면 비워 두어도 됩니다.</p> : null}</section> : null}

      {type === "skills" ? <section className={styles.skillLevels} aria-labelledby="skill-levels-title">
        <div className={styles.sectionHeading}><div><h2 id="skill-levels-title">도술 강화 단계</h2><p>단계 이름과 실제로 확인된 수치만 자유롭게 입력하세요.</p></div><button type="button" onClick={() => setSkillLevels((current) => [...current, emptySkillLevel(Date.now())])}>+ 단계 추가</button></div>
        {skillLevels.length === 0 ? <p className={styles.emptyHint}>강화 정보가 확인되지 않았다면 비워 두어도 됩니다.</p> : null}
        {skillLevels.map((level, levelIndex) => <fieldset key={level.key} className={styles.skillLevelRow}>
          <legend>단계 {levelIndex + 1}</legend>
          <div className={styles.levelActions}><span>순서: {levelIndex + 1}</span><button type="button" disabled={levelIndex === 0} onClick={() => moveSkillLevel(levelIndex, -1)}>위로</button><button type="button" disabled={levelIndex === skillLevels.length - 1} onClick={() => moveSkillLevel(levelIndex, 1)}>아래로</button></div>
          <label><span>단계 이름</span><input value={level.label} maxLength={80} placeholder="예: Lv.1, 1단계 돌파" onChange={(event) => setSkillLevels((current) => current.map((item) => item.key === level.key ? { ...item, label: event.target.value } : item))} /></label>
          <label><span>단계 설명</span><textarea value={level.description} maxLength={5000} rows={4} onChange={(event) => setSkillLevels((current) => current.map((item) => item.key === level.key ? { ...item, description: event.target.value } : item))} /></label>
          <div className={styles.metadataHeading}><strong>수치 정보</strong><button type="button" onClick={() => setSkillLevels((current) => current.map((item) => item.key === level.key ? { ...item, metadata: [...item.metadata, { key: `metadata-${Date.now()}`, name: "", value: "" }] } : item))}>+ 수치 항목 추가</button></div>
          <div className={styles.metadataRows}>{level.metadata.map((metadata) => <div key={metadata.key} className={styles.metadataRow}><input aria-label="수치 항목 이름" value={metadata.name} maxLength={40} placeholder="예: 피해량" onChange={(event) => setSkillLevels((current) => current.map((item) => item.key === level.key ? { ...item, metadata: item.metadata.map((value) => value.key === metadata.key ? { ...value, name: event.target.value } : value) } : item))} /><input aria-label="수치 항목 값" value={metadata.value} maxLength={200} placeholder="예: 145%" onChange={(event) => setSkillLevels((current) => current.map((item) => item.key === level.key ? { ...item, metadata: item.metadata.map((value) => value.key === metadata.key ? { ...value, value: event.target.value } : value) } : item))} /><button className={styles.remove} type="button" onClick={() => setSkillLevels((current) => current.map((item) => item.key === level.key ? { ...item, metadata: item.metadata.filter((value) => value.key !== metadata.key) } : item))}>삭제</button></div>)}</div>
          <button className={styles.remove} type="button" onClick={() => setSkillLevels((current) => current.filter((item) => item.key !== level.key))}>단계 삭제</button>
        </fieldset>)}
      </section> : null}

      <section className={styles.sources} aria-labelledby="cms-sources-title">
        <div className={styles.sectionHeading}><div><h2 id="cms-sources-title">출처</h2><p>공개 콘텐츠에는 최소 한 개의 공식 출처가 필요합니다.</p></div><button type="button" onClick={() => setSources((current) => [...current, emptySource(Date.now())])}>+ 출처 추가</button></div>
        {sources.map((source, index) => (
          <fieldset key={source.key} className={styles.sourceRow}>
            <legend>출처 {index + 1}</legend>
            <label><span>출처 제목</span><input value={source.title} onChange={(event) => setSources((current) => current.map((item) => item.key === source.key ? { ...item, title: event.target.value } : item))} /></label>
            <label><span>출처 URL (화면 캡처는 선택)</span><input type="url" value={source.url} placeholder="https:// 또는 비워두기" onChange={(event) => setSources((current) => current.map((item) => item.key === source.key ? { ...item, url: event.target.value } : item))} /></label>
            <label><span>발행 주체</span><input value={source.publisher} placeholder="카카오게임즈" onChange={(event) => setSources((current) => current.map((item) => item.key === source.key ? { ...item, publisher: event.target.value } : item))} /></label>
            <label><span>출처 유형</span><select value={source.sourceType} onChange={(event) => setSources((current) => current.map((item) => item.key === source.key ? { ...item, sourceType: event.target.value as CmsSourceType } : item))}>{CMS_SOURCE_TYPES.map((value) => <option key={value} value={value}>{sourceTypeLabels[value]}</option>)}</select></label>
            <label><span>확인일</span><input type="date" value={source.checkedAt} onChange={(event) => setSources((current) => current.map((item) => item.key === source.key ? { ...item, checkedAt: event.target.value } : item))} /></label>
            <button className={styles.remove} type="button" disabled={sources.length === 1} onClick={() => setSources((current) => current.filter((item) => item.key !== source.key))}>출처 삭제</button>
          </fieldset>
        ))}
      </section>

      {message ? <p className={styles.message} role="status">{message}</p> : null}
      <div className={styles.actions}>
        {initial?.id && status !== "ARCHIVED" ? <button className={styles.archive} type="button" disabled={busy || Boolean(uploading)} onClick={() => save("ARCHIVED")}>보관 처리</button> : null}
        <button className={styles.save} type="button" disabled={busy || Boolean(uploading)} onClick={() => save()}>{uploading ? "이미지 업로드 중…" : busy ? "저장 중…" : "저장"}</button>
      </div>
    </div>
  );
}
