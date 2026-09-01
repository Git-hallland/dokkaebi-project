"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { authClient } from "@/lib/auth-client";
import { validateProfileImageFile } from "@/lib/profile-image";
import { normalizeProfileName } from "@/lib/profile-input";

import { SocialSignInButtons } from "./SocialSignInButtons";
import { UserAvatar } from "./UserAvatar";
import styles from "./ProfilePageClient.module.css";

const roleLabels = {
  USER: "일반 사용자",
  EDITOR: "작성자",
  REVIEWER: "검수자",
  ADMIN: "관리자",
} as const;

const providerLabels: Record<string, string> = {
  google: "Google",
  kakao: "Kakao",
};

const contentStatusLabels = {
  DRAFT: "초안",
  REVIEW: "검토 중",
  PUBLISHED: "게시됨",
  ARCHIVED: "보관됨",
} as const;

const koreanDateFormatter = new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium" });

type AuthoredContent = Readonly<{
  id: string;
  title: string;
  status: keyof typeof contentStatusLabels;
  createdAt: string;
  updatedAt: string;
}>;

type UploadSignature = Readonly<{
  allowedFormats: string;
  apiKey: string;
  folder: string;
  overwrite: string;
  publicId: string;
  signature: string;
  timestamp: number;
  uploadUrl: string;
  uploadPreset: string;
}>;

async function readResponseMessage(response: Response, fallback: string) {
  try {
    const body: unknown = await response.json();

    if (body && typeof body === "object" && "message" in body && typeof body.message === "string") {
      return body.message;
    }
  } catch {
    // Use the user-safe fallback when a third-party response is not JSON.
  }

  return fallback;
}

async function uploadProfileImage(file: File, name: string) {
  const signatureResponse = await fetch("/api/profile/image-signature", { method: "POST" });

  if (!signatureResponse.ok) {
    throw new Error(
      await readResponseMessage(signatureResponse, "이미지 업로드를 시작하지 못했습니다."),
    );
  }

  const signature = (await signatureResponse.json()) as UploadSignature;
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

  if (!uploadResponse.ok) {
    throw new Error("선택한 이미지를 업로드하지 못했습니다.");
  }

  const upload = (await uploadResponse.json()) as Record<string, unknown>;
  const finalizeResponse = await fetch("/api/profile/image", {
    body: JSON.stringify({
      name,
      upload: {
        bytes: upload.bytes,
        format: upload.format,
        height: upload.height,
        publicId: upload.public_id,
        resourceType: upload.resource_type,
        secureUrl: upload.secure_url,
        signature: upload.signature,
        version: upload.version,
        width: upload.width,
      },
    }),
    headers: { "content-type": "application/json" },
    method: "POST",
  });

  if (!finalizeResponse.ok) {
    throw new Error(
      await readResponseMessage(finalizeResponse, "업로드한 이미지를 프로필에 저장하지 못했습니다."),
    );
  }
}

function ConnectedProviders({ userId }: Readonly<{ userId: string }>) {
  const [providers, setProviders] = useState<string[] | null>(null);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let isActive = true;

    void authClient
      .listAccounts()
      .then((result) => {
        if (!isActive) {
          return;
        }

        if (result.error) {
          setHasError(true);
          return;
        }

        setProviders(
          [...new Set(result.data.map((account) => account.providerId))].map(
            (providerId) => providerLabels[providerId] ?? providerId,
          ),
        );
      })
      .catch(() => {
        if (isActive) {
          setHasError(true);
        }
      });

    return () => {
      isActive = false;
    };
  }, [userId]);

  if (hasError) {
    return <span>확인할 수 없음</span>;
  }

  if (!providers) {
    return <span role="status">확인 중…</span>;
  }

  return <span>{providers.length > 0 ? providers.join(", ") : "연결 정보 없음"}</span>;
}

type ProfilePageClientProps = Readonly<{
  authoredContents?: readonly AuthoredContent[];
  hasOAuthError?: boolean;
}>;

export function ProfilePageClient({
  authoredContents = [],
  hasOAuthError = false,
}: ProfilePageClientProps) {
  const router = useRouter();
  const { data: session, isPending, refetch } = authClient.useSession();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewImage) {
        URL.revokeObjectURL(previewImage);
      }
    };
  }, [previewImage]);

  async function signOut() {
    setIsSigningOut(true);
    setSignOutError(null);

    try {
      const result = await authClient.signOut();

      if (result.error) {
        setSignOutError("로그아웃하지 못했습니다. 잠시 후 다시 시도해 주세요.");
        setIsSigningOut(false);
        return;
      }

      await refetch();
      router.replace("/");
      router.refresh();
    } catch {
      setSignOutError("로그아웃하지 못했습니다. 잠시 후 다시 시도해 주세요.");
      setIsSigningOut(false);
    }
  }

  function startEditing() {
    if (!session) {
      return;
    }

    setDraftName(session.user.name);
    setSelectedImage(null);
    setPreviewImage(null);
    setSaveError(null);
    setIsEditing(true);
  }

  function cancelEditing() {
    setSaveError(null);
    setSelectedImage(null);
    setPreviewImage(null);
    setIsEditing(false);
  }

  async function selectProfileImage(file: File | undefined) {
    if (!file) {
      return;
    }

    setSaveError(null);

    try {
      await validateProfileImageFile(file);
      setSelectedImage(file);
      setPreviewImage(URL.createObjectURL(file));
    } catch (error) {
      setSelectedImage(null);
      setPreviewImage(null);
      setSaveError(error instanceof Error ? error.message : "이미지 파일을 확인해 주세요.");
    }
  }

  async function saveProfile() {
    let name: string;

    try {
      name = normalizeProfileName(draftName);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "프로필 입력값을 확인해 주세요.");
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      if (selectedImage) {
        await uploadProfileImage(selectedImage, name);
      } else {
        const result = await authClient.updateUser({ name });

        if (result.error) {
          setSaveError("프로필을 저장하지 못했습니다. 입력값을 확인한 뒤 다시 시도해 주세요.");
          return;
        }
      }

      await refetch();
      setDraftName(name);
      setSelectedImage(null);
      setPreviewImage(null);
      setIsEditing(false);
      router.refresh();
    } catch (error) {
      setSaveError(
        error instanceof Error
          ? error.message
          : "프로필을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  if (isPending) {
    return (
      <section className={styles.card} aria-labelledby="profile-loading-title">
        <p className={styles.eyebrow}>계정</p>
        <h1 id="profile-loading-title">프로필을 확인하고 있습니다</h1>
        <p className={styles.description} role="status">
          로그인 상태를 안전하게 불러오는 중입니다.
        </p>
      </section>
    );
  }

  if (!session) {
    return (
      <section className={`${styles.card} ${styles.signInCard}`} aria-labelledby="sign-in-title">
        <p className={styles.eyebrow}>계정</p>
        <h1 id="sign-in-title">소셜 계정으로 로그인</h1>
        <p className={styles.description}>
          별도의 회원가입 없이 카카오 또는 Google 계정으로 계속할 수 있습니다.
        </p>
        {hasOAuthError ? (
          <p className={styles.error} role="alert">
            소셜 로그인을 완료하지 못했습니다. Provider 설정과 동의 상태를 확인해 주세요.
          </p>
        ) : null}
        <SocialSignInButtons />
        <p className={styles.notice}>
          도깨비의세계 공식 서비스 계정과는 별개인 비공식 팬 위키 계정입니다.
        </p>
      </section>
    );
  }

  const roleLabel = roleLabels[session.user.role];

  return (
    <div className={styles.profileStack}>
      <section className={styles.card} aria-labelledby="profile-title">
        <p className={styles.eyebrow}>계정</p>
        {isEditing ? (
          <form
            className={styles.editForm}
            onSubmit={(event) => {
              event.preventDefault();
              void saveProfile();
            }}
          >
            <div className={styles.editPreview}>
              <UserAvatar
                image={previewImage ?? session.user.image}
                name={draftName || session.user.name}
              />
              <div>
                <h1 id="profile-title">프로필 수정</h1>
                <p className={styles.description}>닉네임과 프로필 사진을 변경할 수 있습니다.</p>
              </div>
            </div>

            <label className={styles.field}>
              <span>닉네임</span>
              <input
                type="text"
                value={draftName}
                onChange={(event) => setDraftName(event.target.value)}
                autoComplete="nickname"
                aria-describedby="profile-name-help"
                maxLength={8}
                minLength={2}
                disabled={isSaving}
              />
              <small id="profile-name-help">앞뒤 공백을 제외한 2~8글자로 입력해 주세요.</small>
            </label>

            <div className={styles.field}>
              <span>프로필 이미지</span>
              <label className={styles.fileButton}>
                <input
                  className={styles.fileInput}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(event) => {
                    void selectProfileImage(event.target.files?.[0]);
                    event.target.value = "";
                  }}
                  disabled={isSaving}
                />
                <span>{selectedImage ? "다른 사진 선택" : "사진 변경"}</span>
              </label>
              <small>PNG, JPEG, WEBP 파일만 가능하며 최대 크기는 5MB입니다.</small>
              {selectedImage ? (
                <small className={styles.selectedFile} aria-live="polite">
                  선택됨: {selectedImage.name}
                </small>
              ) : null}
            </div>

            {saveError ? (
              <p className={styles.error} role="alert">
                {saveError}
              </p>
            ) : null}

            <div className={styles.formActions}>
              <button type="submit" disabled={isSaving}>
                {isSaving ? "저장 중…" : "저장"}
              </button>
              <button
                className={styles.secondaryButton}
                type="button"
                onClick={cancelEditing}
                disabled={isSaving}
              >
                취소
              </button>
            </div>
          </form>
        ) : (
          <>
            <div className={styles.profileHeader}>
              <div className={styles.identity}>
                <UserAvatar image={session.user.image} name={session.user.name} />
                <div>
                  <h1 id="profile-title">{session.user.name}</h1>
                  <p className={styles.description}>로그인된 프로필입니다.</p>
                </div>
              </div>
              <button className={styles.editButton} type="button" onClick={startEditing}>
                프로필 수정
              </button>
            </div>

            <dl className={styles.details}>
              <div>
                <dt>로그인 제공자</dt>
                <dd>
                  <ConnectedProviders userId={session.user.id} />
                </dd>
              </div>
              <div>
                <dt>역할</dt>
                <dd>{roleLabel}</dd>
              </div>
            </dl>

            <button
              className={styles.signOut}
              type="button"
              onClick={() => void signOut()}
              disabled={isSigningOut}
            >
              {isSigningOut ? "로그아웃 중…" : "로그아웃"}
            </button>
            {signOutError ? (
              <p className={styles.error} role="alert">
                {signOutError}
              </p>
            ) : null}
          </>
        )}
      </section>

      <section className={styles.quickLinks} aria-label="내 커뮤니티">
        <Link href="/notifications">알림 보기</Link>
        <Link href="/favorites">즐겨찾기한 공략 보기</Link>
        <Link href="/community/write">새 공략 작성하기</Link>
      </section>

      <section className={`${styles.card} ${styles.authoredContent}`} aria-labelledby="my-content-title">
        <p className={styles.eyebrow}>콘텐츠</p>
        <h2 id="my-content-title">내가 작성한 글</h2>
        {authoredContents.length > 0 ? (
          <ul className={styles.contentList}>
            {authoredContents.map((content) => (
              <li key={content.id}>
                <div className={styles.contentSummary}>
                  <strong>{content.title}</strong>
                  <span className={styles.statusBadge} data-status={content.status.toLowerCase()}>
                    {contentStatusLabels[content.status]}
                  </span>
                </div>
                <div className={styles.contentDates}>
                  <time dateTime={content.createdAt}>
                    작성 {koreanDateFormatter.format(new Date(content.createdAt))}
                  </time>
                  <time dateTime={content.updatedAt}>
                    수정 {koreanDateFormatter.format(new Date(content.updatedAt))}
                  </time>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.emptyState}>작성한 글이 없습니다.</p>
        )}
      </section>
    </div>
  );
}
