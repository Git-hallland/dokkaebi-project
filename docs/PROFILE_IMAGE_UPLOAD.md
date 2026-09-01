# 프로필 이미지 업로드 운영 결정

- 결정일: 2026-09-01
- 범위: 로그인 사용자의 프로필 이미지
- 저장소: Cloudinary signed direct upload

## 범위와 목적

Cloudinary는 사용자 프로필 이미지 업로드에만 사용한다. 일반 콘텐츠 이미지, 공식 게임 자산,
본문 첨부 파일의 저장소를 이 결정으로 확정하지 않는다.

사용자 파일은 브라우저에서 Cloudinary로 직접 전송한다. Netlify 함수, 로컬 파일시스템,
PostgreSQL에는 이미지 binary 또는 base64를 저장하지 않는다. `User.image`에는 검증된
Cloudinary HTTPS URL만 저장한다.

## 필요한 환경변수

다음 키를 로컬과 배포 환경에 설정한다. 실제 값은 저장소에 커밋하지 않는다.

- `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`
- `NEXT_PUBLIC_CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET` — 서버 전용
- `CLOUDINARY_UPLOAD_PRESET`

## Cloudinary signed preset

Cloudinary Console에서 signed upload preset을 생성하고 다음 제한을 설정한다.

- signed mode
- resource type: image
- allowed formats: `png`, `jpg`, `jpeg`, `webp`
- maximum file size: `5242880` bytes(5MB)
- SVG와 raw 파일 허용 안 함
- 원본 filename을 public ID로 사용하지 않음

애플리케이션 서버는 로그인 세션을 확인한 뒤 timestamp, 사용자 ID의 SHA-256 기반 비식별
prefix, UUID public ID와 허용 형식을 서명한다. API secret은 브라우저에 전달하지 않는다.

## 검증과 권한

- signature route와 profile finalize route는 모두 Better Auth session을 요구한다.
- request에서 user ID를 받지 않고 session user ID만 사용한다.
- 클라이언트에서 MIME, 5MB 제한, magic bytes와 실제 이미지 decode를 확인한다.
- Cloudinary preset에서도 형식과 크기를 제한한다.
- finalize route는 Cloudinary response signature, cloud name, namespace, HTTPS URL, format,
  byte size와 dimensions를 다시 확인한다.
- 일반 Better Auth update-user endpoint로 임의 image URL을 저장할 수 없도록 내부 HMAC proof를
  요구한다.

## 교체와 삭제

새 이미지가 프로필에 저장된 뒤, 이전 URL이 같은 Cloudinary cloud와 해당 사용자의 관리
namespace에 속할 때만 이전 asset을 삭제한다. OAuth provider 이미지와 로컬 기본 이미지는
삭제하지 않는다. 삭제 실패는 프로필 저장을 되돌리지 않으며 운영 로그로 확인한다.

## 기본 이미지

`User.image`가 없거나 이미지 로딩이 실패하면 `/brand/default-profile.png`를 UI fallback으로
사용한다. 기본 경로는 DB에 저장하지 않는다.

## 비용·개인정보·운영 영향

2026-09-01 확인 기준 Cloudinary Free 플랜은 월 25 credits를 제공하며 저장, 변환, 전송량이
같은 credit 한도를 사용한다. 운영 전 usage alert와 유료 전환 기준을 정한다. 사용자 이미지가
Cloudinary로 전송·보관되고 CDN에서 제공되므로 개인정보 처리방침과 계정 삭제 시 자산 삭제
절차에 이를 반영한다.

공식 참고 문서:

- https://cloudinary.com/documentation/nextjs_image_and_video_upload
- https://cloudinary.com/documentation/upload_presets
- https://cloudinary.com/documentation/client_side_uploading
- https://cloudinary.com/documentation/billing_and_plans
