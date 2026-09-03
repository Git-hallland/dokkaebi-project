"use client";

import { Node as TiptapNode, mergeAttributes, type JSONContent } from "@tiptap/core";
import Image from "@tiptap/extension-image";
import LinkExtension from "@tiptap/extension-link";
import { TextStyleKit } from "@tiptap/extension-text-style";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { CommunityRichText } from "@/components/CommunityRichText";
import { COMMUNITY_COLORS, COMMUNITY_FONT_SIZES, EMPTY_COMMUNITY_DOCUMENT, normalizeCommunityLink, type CommunityDocument } from "@/lib/guide-community";
import { POST_VIDEO_ACCEPT, validatePostVideoFile, videoUploadResponseError } from "@/lib/community-video";
import { validateProfileImageFile } from "@/lib/profile-image";
import styles from "./CommunityPostEditor.module.css";

const Video = TiptapNode.create({
  name: "video", group: "block", atom: true,
  addAttributes: () => ({ src: { default: null } }),
  parseHTML: () => [{ tag: "div[data-video-src]", getAttrs: (element) => ({ src: (element as HTMLElement).dataset.videoSrc }) }],
  renderHTML: ({ HTMLAttributes }) => ["div", mergeAttributes({ "data-video-src": HTMLAttributes.src, class: "video-placeholder" }), "업로드된 동영상"],
});

type Signature = { allowedFormats: string; apiKey: string; folder: string; overwrite: string; publicId: string; signature: string; timestamp: number; uploadUrl: string; uploadPreset: string };
async function message(response: Response, fallback: string) { try { const body = await response.json(); return typeof body?.message === "string" ? body.message : fallback; } catch { return fallback; } }

async function uploadPostImage(file: File) {
  await validateProfileImageFile(file);
  const signed = await fetch("/api/community/images/signature", { method: "POST" });
  if (!signed.ok) throw new Error(await message(signed, "이미지 업로드를 시작하지 못했습니다."));
  const signature = await signed.json() as Signature;
  const form = new FormData();
  form.append("file", file); form.append("api_key", signature.apiKey); form.append("timestamp", String(signature.timestamp)); form.append("signature", signature.signature); form.append("folder", signature.folder); form.append("overwrite", signature.overwrite); form.append("public_id", signature.publicId); form.append("allowed_formats", signature.allowedFormats); form.append("upload_preset", signature.uploadPreset);
  const response = await fetch(signature.uploadUrl, { method: "POST", body: form });
  if (!response.ok) throw new Error("이미지를 업로드하지 못했습니다.");
  const upload = await response.json() as Record<string, unknown>;
  const verified = await fetch("/api/community/images/verify", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ upload: { bytes: upload.bytes, format: upload.format, height: upload.height, publicId: upload.public_id, resourceType: upload.resource_type, secureUrl: upload.secure_url, signature: upload.signature, version: upload.version, width: upload.width } }) });
  if (!verified.ok) throw new Error(await message(verified, "이미지를 검증하지 못했습니다."));
  return (await verified.json() as { secureUrl: string }).secureUrl;
}

async function uploadPostVideo(file: File) {
  await validatePostVideoFile(file);
  const signed = await fetch("/api/community/videos/signature", { method: "POST" });
  if (!signed.ok) throw new Error(await message(signed, "동영상 업로드를 시작하지 못했습니다."));
  const signature = await signed.json() as Signature;
  const form = new FormData();
  form.append("file", file); form.append("api_key", signature.apiKey); form.append("timestamp", String(signature.timestamp)); form.append("signature", signature.signature); form.append("folder", signature.folder); form.append("overwrite", signature.overwrite); form.append("public_id", signature.publicId); form.append("allowed_formats", signature.allowedFormats); form.append("upload_preset", signature.uploadPreset);
  const response = await fetch(signature.uploadUrl, { method: "POST", body: form });
  if (!response.ok) {
    let errorBody: unknown = null;
    try { errorBody = await response.json(); } catch { /* Cloudinary can return an empty error response. */ }
    throw new Error(videoUploadResponseError(response.status, errorBody));
  }
  const upload = await response.json() as Record<string, unknown>;
  const verified = await fetch("/api/community/videos/verify", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ upload: { bytes: upload.bytes, format: upload.format, height: upload.height, publicId: upload.public_id, resourceType: upload.resource_type, secureUrl: upload.secure_url, signature: upload.signature, version: upload.version, width: upload.width } }) });
  if (!verified.ok) throw new Error(await message(verified, "영상 업로드 검증에 실패했습니다."));
  return (await verified.json() as { secureUrl: string }).secureUrl;
}

type Props = Readonly<{ initialBody?: CommunityDocument; initialCategory?: "GUIDE" | "TIP"; initialTitle?: string; postId?: string; storageKey: string }>;
export function CommunityPostEditor({ initialBody = EMPTY_COMMUNITY_DOCUMENT, initialCategory = "GUIDE", initialTitle = "", postId, storageKey }: Props) {
  const router = useRouter();
  const [title, setTitle] = useState(initialTitle);
  const [category, setCategory] = useState(initialCategory);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [colorOpen, setColorOpen] = useState(false);
  const [preview, setPreview] = useState<{ body: CommunityDocument; category: "GUIDE" | "TIP"; title: string } | null>(null);
  const imageFileRef = useRef<HTMLInputElement>(null);
  const videoFileRef = useRef<HTMLInputElement>(null);
  const colorPickerRef = useRef<HTMLDivElement>(null);
  const previewDialogRef = useRef<HTMLDialogElement>(null);
  const editor = useEditor({
    immediatelyRender: false,
    content: initialBody as JSONContent,
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] }, link: false, code: false, codeBlock: false, strike: false }),
      LinkExtension.configure({ openOnClick: false, autolink: false, linkOnPaste: false, defaultProtocol: "https", protocols: [], shouldAutoLink: () => false, isAllowedUri: (url) => Boolean(normalizeCommunityLink(url)) }),
      Image.configure({ allowBase64: false }),
      TextStyleKit.configure({ backgroundColor: false, fontFamily: false, lineHeight: false }),
      Video,
    ],
  });

  useEffect(() => {
    if (!editor || initialTitle) return;
    try {
      const draft = JSON.parse(localStorage.getItem(storageKey) ?? "null") as { title?: string; category?: "GUIDE" | "TIP"; body?: CommunityDocument } | null;
      if (draft?.body) editor.commands.setContent(draft.body as JSONContent);
      const timer = window.setTimeout(() => {
        if (typeof draft?.title === "string") setTitle(draft.title);
        if (draft?.category === "GUIDE" || draft?.category === "TIP") setCategory(draft.category);
      }, 0);
      return () => window.clearTimeout(timer);
    } catch { localStorage.removeItem(storageKey); }
  }, [editor, initialTitle, storageKey]);

  useEffect(() => {
    if (!editor) return;
    const timer = window.setInterval(() => localStorage.setItem(storageKey, JSON.stringify({ title, category, body: editor.getJSON() })), 1_000);
    return () => window.clearInterval(timer);
  }, [category, editor, storageKey, title]);

  useEffect(() => {
    if (!colorOpen) return;
    const closeColorPicker = (event: PointerEvent) => {
      if (!colorPickerRef.current?.contains(event.target as Node)) setColorOpen(false);
    };
    const closeWithEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setColorOpen(false);
    };
    document.addEventListener("pointerdown", closeColorPicker);
    document.addEventListener("keydown", closeWithEscape);
    return () => {
      document.removeEventListener("pointerdown", closeColorPicker);
      document.removeEventListener("keydown", closeWithEscape);
    };
  }, [colorOpen]);

  useEffect(() => {
    if (preview && !previewDialogRef.current?.open) previewDialogRef.current?.showModal();
  }, [preview]);

  const addLink = () => { if (!editor) return; const value = window.prompt("연결할 http/https URL을 입력하세요."); if (value === null) return; const href = normalizeCommunityLink(value); if (!href) { setStatus("안전한 http/https URL만 사용할 수 있습니다."); return; } editor.chain().focus().extendMarkRange("link").setLink({ href }).run(); };
  const openPreview = () => {
    if (!editor) return;
    setPreview({ body: editor.getJSON() as CommunityDocument, category, title: title.trim() || "제목 없음" });
  };
  const applyColor = (color: (typeof COMMUNITY_COLORS)[number]) => {
    editor?.chain().focus().setColor(color).run();
    setColorOpen(false);
  };
  const submit = async () => {
    if (!editor || uploading) return;
    setBusy(true); setStatus("");
    const response = await fetch(postId ? `/api/community/posts/${postId}` : "/api/community/posts", { method: postId ? "PATCH" : "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ title, category, body: editor.getJSON() }) });
    if (!response.ok) { setStatus(await message(response, "게시물을 저장하지 못했습니다.")); setBusy(false); return; }
    const result = await response.json() as { id: string }; localStorage.removeItem(storageKey); router.push(`/community/${result.id}`); router.refresh();
  };

  return <div className={styles.editorShell}>
    <div className={styles.documentFields}>
      <label className={styles.categoryField}><span>게시판</span><select value={category} onChange={(event) => setCategory(event.target.value as "GUIDE" | "TIP")}><option value="GUIDE">공략</option><option value="TIP">팁</option></select></label>
      <label className={styles.titleField}><span>제목</span><input value={title} maxLength={80} onChange={(event) => setTitle(event.target.value)} placeholder="공략의 핵심이 드러나는 제목을 입력해 주세요" /></label>
    </div>
    <section className={styles.composer} aria-label="게시글 본문 작성">
      <div className={styles.toolbar} role="toolbar" aria-label="본문 서식">
        <div className={styles.toolGroup} aria-label="기본 서식">
          <button className={styles.iconButton} type="button" aria-label="굵게" title="굵게" onClick={() => editor?.chain().focus().toggleBold().run()}><strong>B</strong></button>
          <button className={styles.iconButton} type="button" aria-label="기울임" title="기울임" onClick={() => editor?.chain().focus().toggleItalic().run()}><em>I</em></button>
          <button className={styles.iconButton} type="button" aria-label="제목 2" title="큰 제목" onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}>H2</button>
          <button className={styles.iconButton} type="button" aria-label="제목 3" title="작은 제목" onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}>H3</button>
        </div>
        <div className={styles.toolGroup} aria-label="목록과 링크">
          <button type="button" aria-label="글머리 기호 목록" title="글머리 기호 목록" onClick={() => editor?.chain().focus().toggleBulletList().run()}>• 목록</button>
          <button type="button" aria-label="번호 목록" title="번호 목록" onClick={() => editor?.chain().focus().toggleOrderedList().run()}>1. 목록</button>
          <button type="button" aria-label="링크 추가" title="링크 추가" onClick={addLink}>🔗 링크</button>
          <button className={styles.iconButton} type="button" aria-label="링크 해제" title="링크 해제" onClick={() => editor?.chain().focus().unsetLink().run()}>⊘</button>
        </div>
        <div className={styles.toolGroup} aria-label="글자 모양">
          <select aria-label="글자 크기" defaultValue="" onChange={(event) => event.target.value && editor?.chain().focus().setFontSize(event.target.value).run()}><option value="">글자 크기</option>{COMMUNITY_FONT_SIZES.map((size) => <option key={size}>{size}</option>)}</select>
          <div className={styles.colorPicker} ref={colorPickerRef}>
            <button className={styles.colorTrigger} type="button" aria-expanded={colorOpen} aria-haspopup="dialog" onClick={() => setColorOpen((current) => !current)}><span aria-hidden="true">A</span> 글자 색상</button>
            {colorOpen ? <div className={styles.colorPopover} role="dialog" aria-label="글자 색상 팔레트"><div className={styles.palette}>{COMMUNITY_COLORS.map((color) => <button key={color} type="button" className={styles.swatch} style={{ backgroundColor: color }} aria-label={`글자 색상 ${color}`} title={color} onClick={() => applyColor(color)} />)}</div><button className={styles.resetColor} type="button" onClick={() => { editor?.chain().focus().unsetColor().run(); setColorOpen(false); }}>기본 글자색</button></div> : null}
          </div>
        </div>
        <div className={`${styles.toolGroup} ${styles.mediaGroup}`} aria-label="미디어 첨부">
          <button type="button" disabled={uploading} onClick={() => imageFileRef.current?.click()}>▧ 이미지</button>
          <button type="button" disabled={uploading} onClick={() => videoFileRef.current?.click()}>▶ 동영상</button>
        </div>
      <input ref={imageFileRef} className={styles.hiddenInput} type="file" accept="image/png,image/jpeg,image/webp" onChange={async (event) => { const file = event.target.files?.[0]; event.target.value = ""; if (!file || !editor) return; setUploading(true); setStatus("이미지 업로드 중…"); try { const src = await uploadPostImage(file); editor.chain().focus().setImage({ src, alt: "" }).run(); setStatus("이미지를 추가했습니다."); } catch (error) { setStatus(error instanceof Error ? error.message : "이미지를 업로드하지 못했습니다."); } finally { setUploading(false); } }} />
      <input ref={videoFileRef} className={styles.hiddenInput} type="file" accept={POST_VIDEO_ACCEPT} onChange={async (event) => { const file = event.target.files?.[0]; event.target.value = ""; if (!file || !editor) return; setUploading(true); setStatus("동영상 업로드 중… 파일 크기에 따라 시간이 걸릴 수 있습니다."); try { const src = await uploadPostVideo(file); editor.chain().focus().insertContent({ type: "video", attrs: { src } }).run(); setStatus("동영상을 추가했습니다."); } catch (error) { setStatus(error instanceof Error ? error.message : "동영상을 업로드하지 못했습니다."); } finally { setUploading(false); } }} />
      </div>
      <EditorContent editor={editor} className={styles.content} />
    </section>
    <p className={styles.note}>초안은 이 브라우저에 자동 저장됩니다. 이미지는 5MB 이하 PNG/JPEG/WEBP, 동영상은 50MB 이하 MP4/WEBM/MOV만 지원합니다.</p>
    {status ? <p role="status" className={styles.status}>{status}</p> : null}
    <div className={styles.actions}><button className={styles.previewButton} type="button" disabled={!editor || uploading} onClick={openPreview}>미리보기</button><button className={styles.submit} type="button" disabled={busy || uploading} onClick={submit}>{uploading ? "미디어 업로드 중…" : busy ? "저장 중…" : postId ? "수정 저장" : "게시하기"}</button></div>
    <dialog ref={previewDialogRef} className={styles.previewDialog} onClose={() => setPreview(null)} onClick={(event) => { if (event.target === event.currentTarget) event.currentTarget.close(); }}>
      {preview ? <article className={styles.previewArticle}><header className={styles.previewHeader}><div><span>{preview.category === "GUIDE" ? "공략" : "팁"}</span><h1>{preview.title}</h1><p>작성 중인 게시물 미리보기</p></div><button type="button" aria-label="미리보기 닫기" onClick={() => previewDialogRef.current?.close()}>닫기</button></header><section className={styles.previewBody}><CommunityRichText document={preview.body} /></section></article> : null}
    </dialog>
  </div>;
}
