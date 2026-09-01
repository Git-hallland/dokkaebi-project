"use client";

import { Node, mergeAttributes, type JSONContent } from "@tiptap/core";
import Image from "@tiptap/extension-image";
import LinkExtension from "@tiptap/extension-link";
import { TextStyleKit } from "@tiptap/extension-text-style";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { COMMUNITY_COLORS, COMMUNITY_FONT_SIZES, EMPTY_COMMUNITY_DOCUMENT, normalizeCommunityLink, type CommunityDocument } from "@/lib/guide-community";
import { POST_VIDEO_ACCEPT, validatePostVideoFile, videoUploadResponseError } from "@/lib/community-video";
import { validateProfileImageFile } from "@/lib/profile-image";
import styles from "./CommunityPostEditor.module.css";

const Video = Node.create({
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
  const imageFileRef = useRef<HTMLInputElement>(null);
  const videoFileRef = useRef<HTMLInputElement>(null);
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

  const addLink = () => { if (!editor) return; const value = window.prompt("연결할 http/https URL을 입력하세요."); if (value === null) return; const href = normalizeCommunityLink(value); if (!href) { setStatus("안전한 http/https URL만 사용할 수 있습니다."); return; } editor.chain().focus().extendMarkRange("link").setLink({ href }).run(); };
  const submit = async () => {
    if (!editor || uploading) return;
    setBusy(true); setStatus("");
    const response = await fetch(postId ? `/api/community/posts/${postId}` : "/api/community/posts", { method: postId ? "PATCH" : "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ title, category, body: editor.getJSON() }) });
    if (!response.ok) { setStatus(await message(response, "게시물을 저장하지 못했습니다.")); setBusy(false); return; }
    const result = await response.json() as { id: string }; localStorage.removeItem(storageKey); router.push(`/community/${result.id}`); router.refresh();
  };

  return <div className={styles.editorShell}>
    <label>게시판<select value={category} onChange={(event) => setCategory(event.target.value as "GUIDE" | "TIP")}><option value="GUIDE">공략</option><option value="TIP">팁</option></select></label>
    <label>제목<input value={title} maxLength={80} onChange={(event) => setTitle(event.target.value)} placeholder="2~80자" /></label>
    <div className={styles.toolbar} role="toolbar" aria-label="본문 서식">
      <button type="button" onClick={() => editor?.chain().focus().toggleBold().run()}>굵게</button><button type="button" onClick={() => editor?.chain().focus().toggleItalic().run()}>기울임</button>
      <button type="button" onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}>제목 2</button><button type="button" onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}>제목 3</button>
      <button type="button" onClick={() => editor?.chain().focus().toggleBulletList().run()}>목록</button><button type="button" onClick={() => editor?.chain().focus().toggleOrderedList().run()}>번호</button><button type="button" onClick={addLink}>링크</button><button type="button" onClick={() => editor?.chain().focus().unsetLink().run()}>링크 해제</button>
      <select aria-label="글자 크기" defaultValue="" onChange={(event) => event.target.value && editor?.chain().focus().setFontSize(event.target.value).run()}><option value="">글자 크기</option>{COMMUNITY_FONT_SIZES.map((size) => <option key={size}>{size}</option>)}</select>
      <select aria-label="글자 색상" defaultValue="" onChange={(event) => event.target.value && editor?.chain().focus().setColor(event.target.value).run()}><option value="">글자 색상</option>{COMMUNITY_COLORS.map((color) => <option key={color} value={color}>{color}</option>)}</select>
      <button type="button" disabled={uploading} onClick={() => imageFileRef.current?.click()}>이미지</button><button type="button" disabled={uploading} onClick={() => videoFileRef.current?.click()}>동영상</button>
      <input ref={imageFileRef} className={styles.hiddenInput} type="file" accept="image/png,image/jpeg,image/webp" onChange={async (event) => { const file = event.target.files?.[0]; event.target.value = ""; if (!file || !editor) return; setUploading(true); setStatus("이미지 업로드 중…"); try { const src = await uploadPostImage(file); editor.chain().focus().setImage({ src, alt: "" }).run(); setStatus("이미지를 추가했습니다."); } catch (error) { setStatus(error instanceof Error ? error.message : "이미지를 업로드하지 못했습니다."); } finally { setUploading(false); } }} />
      <input ref={videoFileRef} className={styles.hiddenInput} type="file" accept={POST_VIDEO_ACCEPT} onChange={async (event) => { const file = event.target.files?.[0]; event.target.value = ""; if (!file || !editor) return; setUploading(true); setStatus("동영상 업로드 중… 파일 크기에 따라 시간이 걸릴 수 있습니다."); try { const src = await uploadPostVideo(file); editor.chain().focus().insertContent({ type: "video", attrs: { src } }).run(); setStatus("동영상을 추가했습니다."); } catch (error) { setStatus(error instanceof Error ? error.message : "동영상을 업로드하지 못했습니다."); } finally { setUploading(false); } }} />
    </div>
    <EditorContent editor={editor} className={styles.content} />
    <p className={styles.note}>초안은 이 브라우저에 자동 저장됩니다. 이미지는 5MB 이하 PNG/JPEG/WEBP, 동영상은 50MB 이하 MP4/WEBM/MOV만 지원합니다.</p>
    {status ? <p role="status" className={styles.status}>{status}</p> : null}
    <button className={styles.submit} type="button" disabled={busy || uploading} onClick={submit}>{uploading ? "미디어 업로드 중…" : busy ? "저장 중…" : postId ? "수정 저장" : "게시하기"}</button>
  </div>;
}
